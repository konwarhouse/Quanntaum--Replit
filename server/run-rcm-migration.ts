import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runRcmMigration() {
  try {
    console.log('Starting RCM module database migration...');
    
    // Read the migration SQL file
    const migrationSql = fs.readFileSync(
      path.join(__dirname, 'migration-rcm.sql'),
      'utf8'
    );
    
    // Run the migration SQL
    await pool.query(migrationSql);
    
    console.log('RCM module database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error running RCM module migration:', error);
    process.exit(1);
  }
}

runRcmMigration();