-- Create system functions table (RCM Step 1)
CREATE TABLE IF NOT EXISTS "system_functions" (
  "id" SERIAL PRIMARY KEY,
  "system_id" INTEGER REFERENCES "systems"("id") ON DELETE CASCADE,
  "component_id" INTEGER REFERENCES "components"("id") ON DELETE CASCADE,
  "function_description" TEXT NOT NULL,
  "performance_standard" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_system_functions_system_id" ON "system_functions"("system_id");
CREATE INDEX IF NOT EXISTS "idx_system_functions_component_id" ON "system_functions"("component_id");