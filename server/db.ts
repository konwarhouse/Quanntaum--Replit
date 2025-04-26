import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import * as rcmSchema from "@shared/rcm-schema";
import * as fmecaSchema from "@shared/fmeca-schema";

// Configure Neon for serverless environment
neonConfig.webSocketConstructor = ws;
neonConfig.fetchConnectionCache = true; // Enable connection caching for better performance

// Add retry logic for database connections
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // 1 second
const RECONNECT_INTERVAL = 10000; // 10 seconds

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with additional options - using more conservative settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Reduce maximum number of clients to avoid overwhelming the connection
  idleTimeoutMillis: 10000, // Reduce idle timeout to close connections quicker
  connectionTimeoutMillis: 10000, // Give more time to establish the connection
  maxUses: 100, // Recycle connections after 100 uses
  keepAlive: true, // Enable TCP keepalive
});

// Add error handler to the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  // Don't exit the process, just log the error
  console.error('Database connection error occurred. The application will try to reconnect automatically.');
});

// Merge the schemas
const mergedSchema = { ...schema, ...rcmSchema, ...fmecaSchema };
export const db = drizzle(pool, { schema: mergedSchema });

// Helper function to execute database queries with retry logic
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string = 'Database operation'
): Promise<T> {
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
}

// Helper to check database connection with retries
export async function testDatabaseConnection() {
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
}