import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { testDatabaseConnection, isElectronMode } from "./db";
import { setupAuth, ensureAdminExists } from "./auth";
import cors from "cors";
import { setupElectronDemoData } from "./electron-mode";
import { storage } from "./storage";

const app = express();

// Setup CORS with proper settings for credentials
app.use(cors({
  origin: true, // Allow the current origin
  credentials: true, // Allow credentials (cookies, authorization headers)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  if (isElectronMode()) {
    log("Running in Electron mode with in-memory storage");
    
    // Setup authentication first (needed for the demo data)
    setupAuth(app);
    
    // Set up demo data for Electron mode
    try {
      await setupElectronDemoData(storage);
      log("Electron demo data setup complete");
    } catch (error) {
      log(`Error setting up Electron demo data: ${error}`);
    }
  } else {
    // Test database connection before starting the server
    try {
      const isConnected = await testDatabaseConnection();
      if (!isConnected) {
        log("Warning: Database connection failed. Some features may not work properly.");
      } else {
        log("Database connection successful.");
      }
    } catch (error) {
      log(`Database connection error: ${error}`);
    }
    
    // Setup authentication
    setupAuth(app);
    
    // Create default admin user if none exists
    await ensureAdminExists();
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
