import { pool } from "./db";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

/**
 * Runs the SQL migration for FMECA analysis
 */
async function runFmecaMigration() {
  console.log("Starting FMECA module migration...");
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const sqlPath = path.join(__dirname, "rcm-migration.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    
    // Execute the migration script
    await pool.query(sql);
    console.log("FMECA module migration completed successfully!");

  } catch (error) {
    console.error("Error running FMECA migration:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runFmecaMigration();