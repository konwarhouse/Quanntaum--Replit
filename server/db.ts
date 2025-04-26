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

/**
 * Helper function to retry database operations with exponential backoff
 * This helps with intermittent connection issues when using serverless databases
 * @param operation The database operation function to execute
 * @param operationName Name of the operation for logging
 * @param maxRetries Maximum number of retry attempts
 * @returns Result of the database operation
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = 3
): Promise<T> {
  let retryCount = 0;
  let lastError: any;
  
  while (retryCount < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      retryCount++;
      
      // Log the error
      console.error(`${operationName} failed (attempt ${retryCount}/${maxRetries}):`, error.message);
      
      // Don't retry if we're in Electron mode or if we've reached max retries
      if (isElectronMode() || retryCount >= maxRetries) {
        break;
      }
      
      // Exponential backoff with jitter
      const baseDelay = 200; // 200ms base delay
      const maxDelay = 2000; // 2 second max delay
      const exponentialDelay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
      const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
      const delay = exponentialDelay + jitter;
      
      console.log(`Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, all retries failed
  console.error(`${operationName} failed after ${maxRetries} attempts.`);
  throw lastError;
}