import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { isElectronMode } from './electron-mode';

// Set the WebSocket constructor for NeonDB
neonConfig.webSocketConstructor = ws;

export function isPostgresEnabled(): boolean {
  return process.env.DATABASE_URL !== undefined && !isElectronMode();
}

export async function testDatabaseConnection(): Promise<boolean> {
  // In Electron mode, we don't need a database connection
  if (isElectronMode()) {
    return true;
  }
  
  console.log('Initializing database connection...');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    return false;
  }
  
  try {
    const testPool = new Pool({ connectionString: process.env.DATABASE_URL });
    const result = await testPool.query('SELECT NOW()');
    await testPool.end();
    
    console.log('Database connection initialized successfully');
    
    if (result.rows && result.rows.length > 0) {
      console.log('Database connection successful', result.rows[0]);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to connect to database:', error);
    return false;
  }
}

// Only initialize the pool and drizzle if not in Electron mode
export const pool = !isElectronMode() && process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL }) 
  : null;

export const db = pool
  ? drizzle({ client: pool, schema })
  : null;