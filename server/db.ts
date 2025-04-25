import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import * as rcmSchema from "@shared/rcm-schema";

// Configure Neon for serverless environment
neonConfig.webSocketConstructor = ws;
neonConfig.fetchConnectionCache = true; // Enable connection caching for better performance

// Add retry logic for database connections
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // 1 second

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with additional options
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of clients 
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection could not be established
});

// Add error handler to the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1); // Exit the application when we have a critical database error
});

// Merge the schemas
const mergedSchema = { ...schema, ...rcmSchema };
export const db = drizzle(pool, { schema: mergedSchema });

// Helper to check database connection
export async function testDatabaseConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log("Database connection successful", result.rows[0]);
    return true;
  } catch (error) {
    console.error("Database connection error:", error);
    return false;
  }
}