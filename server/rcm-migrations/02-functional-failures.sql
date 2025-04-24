-- Create functional failures table (RCM Step 2)
CREATE TABLE IF NOT EXISTS "functional_failures" (
  "id" SERIAL PRIMARY KEY,
  "system_function_id" INTEGER REFERENCES "system_functions"("id") ON DELETE CASCADE,
  "failure_description" TEXT NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_functional_failures_system_function_id" ON "functional_failures"("system_function_id");