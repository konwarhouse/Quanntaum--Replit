import { pool } from "./db";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

/**
 * Runs all migration scripts sequentially
 */
async function runMigrationsSequentially() {
  console.log("Starting RCM migrations sequentially...");
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const migrationsDir = path.join(__dirname, "rcm-migrations");
    const migrationFiles = fs.readdirSync(migrationsDir).sort();
    
    console.log(`Found ${migrationFiles.length} migration files.`);
    
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, "utf8");
      
      try {
        await pool.query(sql);
        console.log(`Successfully applied migration: ${file}`);
      } catch (error) {
        console.error(`Error applying migration ${file}:`, error);
        // Continue with other migrations even if one fails
      }
    }
    
    console.log("All migrations completed.");

  } catch (error) {
    console.error("Error running migrations:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrationsSequentially();