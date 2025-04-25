import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import * as rcmSchema from "@shared/rcm-schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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