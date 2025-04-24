-- Create maintenance tasks table (RCM Steps 6-7)
CREATE TABLE IF NOT EXISTS "maintenance_tasks" (
  "id" SERIAL PRIMARY KEY,
  "failure_mode_id" INTEGER REFERENCES "failure_modes"("id") ON DELETE CASCADE,
  "task_description" TEXT NOT NULL,
  "task_type" VARCHAR(50),
  "interval" VARCHAR(50),
  "effectiveness" FLOAT,
  "default_action" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_maintenance_tasks_failure_mode_id" ON "maintenance_tasks"("failure_mode_id");