import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, User, InsertUser } from "@shared/schema";
import { UserRole } from "@shared/auth";
// Use memory-based session store instead of PostgreSQL
import memorystore from "memorystore";

// For type augmentation with express-session
declare module "express-session" {
  interface SessionData {
    passport: any;
  }
}

// Augment Express.Request type
declare global {
  namespace Express {
    // Extend Express User interface with our application-specific User type
    interface User {
      id: number;
      username: string;
      password: string;
      fullName: string | null;
      email: string | null;
      role: string;
      createdAt: Date | null;
      createdBy: number | null;
      lastLoginAt: Date | null;
      isActive: boolean;
    }
  }
}

// Promisify crypto functions
const scryptAsync = promisify(scrypt);

// Password hashing functions
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  return `${derivedKey.toString("hex")}.${salt}`;
}

export async function comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
  try {
    const [hashedKey, salt] = hashedPassword.split(".");
    const derivedKey = await scryptAsync(plainPassword, salt, 64) as Buffer;
    const storedKey = Buffer.from(hashedKey, "hex");
    return timingSafeEqual(derivedKey, storedKey);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

// Initialize memory store session instead of PostgreSQL to avoid connection issues
const MemStore = memorystore(session);

export function setupAuth(app: express.Express) {
  // Session configuration with enhanced settings for better persistence
  app.use(session({
    store: new MemStore({
      checkPeriod: 86400000, // prune expired entries every 24h
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      stale: false, // don't return stale sessions
    }),
    secret: process.env.SESSION_SECRET || "change-me-in-production",
    resave: true, // Keep as true to ensure session is saved on every request
    saveUninitialized: true, // Keep as true to save new sessions
    name: 'quanntaum.sid', // Custom name to avoid conflicts
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: false, // Keep as false for development
      sameSite: "lax",
      path: '/',
    },
    rolling: true, // Reset cookie expiration on each response
  }));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure LocalStrategy
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      // Find user in database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        return done(null, false, { message: "Incorrect username or password" });
      }

      if (!user.isActive) {
        return done(null, false, { message: "Account is disabled" });
      }

      // Verify password
      const isValid = await comparePasswords(password, user.password);
      if (!isValid) {
        return done(null, false, { message: "Incorrect username or password" });
      }

      // Update last login timestamp
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  // Serialize user to session
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return done(null, false);
      }

      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication middleware with development bypass
  const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
    // Check if already authenticated
    if (req.isAuthenticated()) {
      return next();
    }
    
    // For development, allow a bypass using a query parameter for testing
    const bypassAuth = process.env.NODE_ENV === 'development' && 
                        (req.query.bypass_auth === 'true' || 
                        req.headers['x-bypass-auth'] === 'true');
    
    if (bypassAuth) {
      console.log('DEV AUTH BYPASS: Allowing access without authentication');
      return next();
    }
    
    res.status(401).json({ error: "Authentication required" });
  };

  // Role-based middleware
  const requireRole = (role: UserRole) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      if (req.user.role !== role && req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      
      next();
    };
  };

  // Admin role middleware with detailed logging
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    console.log("Admin check - Auth status:", req.isAuthenticated());
    console.log("Admin check - User:", req.user);
    
    if (!req.isAuthenticated()) {
      console.log("Admin check failed: Not authenticated");
      return res.status(401).json({ error: "Authentication required" });
    }
    
    if (req.user.role !== UserRole.ADMIN) {
      console.log(`Admin check failed: User role is ${req.user.role}, not ${UserRole.ADMIN}`);
      return res.status(403).json({ error: "Admin privileges required" });
    }
    
    console.log("Admin check passed");
    next();
  };

  // Auth routes
  app.post("/api/auth/register", requireAdmin, async (req, res) => {
    try {
      const { username, password, fullName, email, role, isActive } = req.body;
      
      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      
      if (existingUser) {
        return res.status(409).json({ error: "Username already exists" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Insert new user
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          fullName: fullName || null,
          email: email || null,
          role: role || UserRole.VIEWER,
          isActive: isActive !== undefined ? isActive : true,
          createdBy: req.user?.id || null,
          createdAt: new Date(),
        })
        .returning();
      
      // Don't return the password hash
      const { password: _, ...userWithoutPassword } = newUser;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: { message?: string } | undefined) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ error: info?.message || "Authentication failed" });
      }
      
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        
        // Don't return the password hash
        const { password, ...userWithoutPassword } = user;
        
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      // For development only - check if we should use dev bypass
      if (process.env.NODE_ENV === 'development' && 
          (req.query.auto_login === 'true' || req.headers['x-auto-login'] === 'true')) {
        // Find admin user
        db.select()
          .from(users)
          .where(eq(users.username, 'admin'))
          .limit(1)
          .then(([adminUser]) => {
            if (adminUser) {
              // Auto-login as admin for development
              req.login(adminUser, (err) => {
                if (err) {
                  console.error('Dev auto-login error:', err);
                  return res.status(401).json({ error: "Not authenticated" });
                }
                const { password, ...userWithoutPassword } = adminUser;
                console.log('DEV AUTO-LOGIN: Automatically logged in as admin');
                return res.json(userWithoutPassword);
              });
            } else {
              return res.status(401).json({ error: "Not authenticated" });
            }
          })
          .catch(err => {
            console.error('Dev auto-login query error:', err);
            return res.status(401).json({ error: "Not authenticated" });
          });
        return;
      }
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    // Don't return the password hash
    const { password, ...userWithoutPassword } = req.user;
    
    res.json(userWithoutPassword);
  });

  app.get("/api/auth/users", requireAdmin, async (req, res) => {
    try {
      const allUsers = await db
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt, 
          createdBy: users.createdBy,
          lastLoginAt: users.lastLoginAt,
          isActive: users.isActive,
        })
        .from(users);
      
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/auth/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          createdBy: users.createdBy,
          lastLoginAt: users.lastLoginAt,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error(`Error fetching user ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.put("/api/auth/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { username, password, fullName, email, role, isActive } = req.body;
      
      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if username is taken by another user
      if (username && username !== existingUser.username) {
        const [usernameCheck] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);
        
        if (usernameCheck) {
          return res.status(409).json({ error: "Username already exists" });
        }
      }
      
      // Build update object
      const updateData: Partial<InsertUser & { lastLoginAt: Date }> = {};
      
      if (username) updateData.username = username;
      if (password) updateData.password = await hashPassword(password);
      if (fullName !== undefined) updateData.fullName = fullName || null;
      if (email !== undefined) updateData.email = email || null;
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      // Update user
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          createdBy: users.createdBy,
          lastLoginAt: users.lastLoginAt,
          isActive: users.isActive,
        });
      
      res.json(updatedUser);
    } catch (error) {
      console.error(`Error updating user ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/auth/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Prevent deleting oneself
      if (req.user && id === req.user.id) {
        return res.status(400).json({ error: "Cannot delete yourself" });
      }
      
      const result = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning({ id: users.id });
      
      if (result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error(`Error deleting user ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  
  // Return middleware for protecting routes
  return {
    authenticateUser,
    requireRole,
    requireAdmin
  };
}

// Create initial admin user if none exists
export async function ensureAdminExists() {
  try {
    // Check if any users exist
    const [existingUser] = await db
      .select()
      .from(users)
      .limit(1);
    
    if (!existingUser) {
      // Create default admin user
      const defaultAdmin = {
        username: "admin",
        password: await hashPassword("adminpassword"),
        fullName: "System Administrator",
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: new Date(),
      };
      
      await db.insert(users).values(defaultAdmin);
      console.log("Created default admin user. Username: admin, Password: adminpassword");
    }
  } catch (error) {
    console.error("Error ensuring admin exists:", error);
  }
}