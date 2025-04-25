import { pool } from "./db";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

/**
 * Runs the SQL migration for Enhanced FMECA module
 */
async function runEnhancedFmecaMigration() {
  console.log("Starting Enhanced FMECA module migration...");
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const sqlPath = path.join(__dirname, "fmeca-migration.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    
    // Execute the migration script
    await pool.query(sql);
    console.log("Enhanced FMECA module migration completed successfully!");

  } catch (error) {
    console.error("Error running Enhanced FMECA migration:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runEnhancedFmecaMigration();