import * as schema from "@shared/schema";
import * as rcmSchema from "@shared/rcm-schema";
import * as fmecaSchema from "@shared/fmeca-schema";

// Merge the schemas
const mergedSchema = { ...schema, ...rcmSchema, ...fmecaSchema };

// In Electron mode, we don't use a real database
export let pool: any = null;
export let db: any = null;

// Electron mode detection
export const isElectronMode = (): boolean => {
  return process.env.ELECTRON_RUN === 'true';
};

// Add retry logic for database connections
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // 1 second

// Initialize database if not in Electron mode
const initDatabase = async (): Promise<void> => {
  // Skip database initialization in Electron mode
  if (isElectronMode()) {
    console.log('Running in Electron mode - no database connection needed');
    return;
  }

  try {
    // Import database dependencies only when needed
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const wsModule = await import("ws");

    // Configure Neon for serverless environment
    neonConfig.webSocketConstructor = wsModule.default;
    neonConfig.fetchConnectionCache = true;

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
    }

    console.log("Initializing database connection...");

    // Create pool with additional options
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      maxUses: 100,
      keepAlive: true,
    });

    // Add error handler to the pool
    pool.on('error', (err: any) => {
      console.error('Unexpected error on idle database client', err);
      console.error('Database connection error occurred. The application will try to reconnect automatically.');
    });

    // Initialize drizzle ORM with the pool
    db = drizzle(pool, { schema: mergedSchema });
    
    console.log("Database connection initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
};

// Helper to check database connection with retries
export const testDatabaseConnection = async (): Promise<boolean> => {
  // In Electron mode, pretend the connection is successful
  if (isElectronMode()) {
    console.log("Running in Electron mode with in-memory storage");
    return true;
  }
  
  // Ensure database is initialized
  if (!pool) {
    await initDatabase();
  }
  
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      const result = await pool.query('SELECT NOW()');
      console.log("Database connection successful", result.rows[0]);
      return true;
    } catch (error) {
      retries++;
      console.error(`Database connection error (attempt ${retries}/${MAX_RETRIES}):`, error);
      
      if (retries >= MAX_RETRIES) {
        console.error("Maximum database connection retries reached.");
        return false;
      }
      
      // Wait before retrying
      console.log(`Retrying database connection in ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  
  return false;
};

// Helper function to execute database queries with retry logic
export const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  operationName: string = 'Database operation'
): Promise<T> => {
  // Ensure database is initialized if not in Electron mode
  if (!isElectronMode() && !pool) {
    await initDatabase();
  }
  
  let retries = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      retries++;
      console.error(`${operationName} error (attempt ${retries}/${MAX_RETRIES}):`, error);
      
      if (retries >= MAX_RETRIES) {
        console.error(`Maximum retries reached for ${operationName}.`);
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      const delay = RETRY_DELAY * Math.pow(2, retries - 1);
      console.log(`Retrying ${operationName} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Initialize the database connection (but not in Electron mode)
if (!isElectronMode()) {
  initDatabase().catch(err => {
    console.error("Database initialization failed:", err);
  });
}