import { pool } from "./db";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

/**
 * Runs the SQL migration for the complete RCM, FMECA, and RAM modules
 */
async function runRcmFullMigration() {
  console.log("Starting full RCM module migration...");
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const sqlPath = path.join(__dirname, "rcm-full-migration.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    
    // Execute the migration script
    await pool.query(sql);
    console.log("RCM full migration completed successfully!");

  } catch (error) {
    console.error("Error running RCM full migration:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runRcmFullMigration();