-- Create effects table (RCM Step 4)
CREATE TABLE IF NOT EXISTS "failure_effects" (
  "id" SERIAL PRIMARY KEY,
  "failure_mode_id" INTEGER REFERENCES "failure_modes"("id") ON DELETE CASCADE,
  "local_effect" TEXT,
  "system_effect" TEXT,
  "end_effect" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_failure_effects_failure_mode_id" ON "failure_effects"("failure_mode_id");