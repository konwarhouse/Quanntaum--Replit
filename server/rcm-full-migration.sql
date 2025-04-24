-- RCM Full Migration Script
-- This script creates all tables needed for comprehensive RCM, FMECA, and RAM analysis

-- Functions Table (RCM Step 1)
CREATE TABLE IF NOT EXISTS "functions" (
  "id" SERIAL PRIMARY KEY,
  "system_id" INTEGER REFERENCES "systems"("id") ON DELETE CASCADE,
  "component_id" INTEGER REFERENCES "components"("id") ON DELETE CASCADE,
  "function_description" TEXT NOT NULL,
  "performance_standard" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Functional Failures Table (RCM Step 2)
CREATE TABLE IF NOT EXISTS "functional_failures" (
  "id" SERIAL PRIMARY KEY,
  "function_id" INTEGER REFERENCES "functions"("id") ON DELETE CASCADE,
  "failure_description" TEXT NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhance existing Failure Modes table with RCM fields (RCM Step 3)
ALTER TABLE "failure_modes" 
  ADD COLUMN IF NOT EXISTS "functional_failure_id" INTEGER REFERENCES "functional_failures"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "failure_rate" FLOAT,
  ADD COLUMN IF NOT EXISTS "mttr" FLOAT;

-- Effects Table (RCM Step 4)
CREATE TABLE IF NOT EXISTS "effects" (
  "id" SERIAL PRIMARY KEY,
  "failure_mode_id" INTEGER REFERENCES "failure_modes"("id") ON DELETE CASCADE,
  "local_effect" TEXT,
  "system_effect" TEXT,
  "end_effect" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criticality Table (RCM Step 5)
CREATE TABLE IF NOT EXISTS "criticality" (
  "id" SERIAL PRIMARY KEY,
  "failure_mode_id" INTEGER REFERENCES "failure_modes"("id") ON DELETE CASCADE,
  "severity" INTEGER CHECK (severity BETWEEN 1 AND 10),
  "occurrence" INTEGER CHECK (occurrence BETWEEN 1 AND 10),
  "detection" INTEGER CHECK (detection BETWEEN 1 AND 10),
  "rpn" INTEGER,
  "criticality_index" VARCHAR(20),
  "consequence_type" VARCHAR(50),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Tasks Table (RCM Steps 6-7)
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

-- RAM Metrics Table
CREATE TABLE IF NOT EXISTS "ram_metrics" (
  "id" SERIAL PRIMARY KEY,
  "system_id" INTEGER REFERENCES "systems"("id") ON DELETE CASCADE,
  "component_id" INTEGER REFERENCES "components"("id") ON DELETE SET NULL,
  "mtbf" FLOAT,
  "availability" FLOAT,
  "maintainability" FLOAT,
  "calculation_date" DATE DEFAULT CURRENT_DATE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Decision Logic Table (for RCM decision tree)
CREATE TABLE IF NOT EXISTS "decision_logic" (
  "id" SERIAL PRIMARY KEY,
  "failure_mode_id" INTEGER REFERENCES "failure_modes"("id") ON DELETE CASCADE,
  "hidden_function" BOOLEAN DEFAULT FALSE,
  "safety_consequence" BOOLEAN DEFAULT FALSE,
  "environmental_consequence" BOOLEAN DEFAULT FALSE,
  "operational_consequence" BOOLEAN DEFAULT FALSE,
  "economic_consequence" BOOLEAN DEFAULT FALSE,
  "failure_evident" BOOLEAN DEFAULT FALSE,
  "pm_technically_feasible" BOOLEAN DEFAULT FALSE,
  "cm_technically_feasible" BOOLEAN DEFAULT FALSE,
  "ff_technically_feasible" BOOLEAN DEFAULT FALSE,
  "rtf_acceptable" BOOLEAN DEFAULT FALSE,
  "decision_path" VARCHAR(100),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes to improve query performance
CREATE INDEX IF NOT EXISTS "idx_functions_system_id" ON "functions"("system_id");
CREATE INDEX IF NOT EXISTS "idx_functions_component_id" ON "functions"("component_id");
CREATE INDEX IF NOT EXISTS "idx_functional_failures_function_id" ON "functional_failures"("function_id");
CREATE INDEX IF NOT EXISTS "idx_failure_modes_functional_failure_id" ON "failure_modes"("functional_failure_id");
CREATE INDEX IF NOT EXISTS "idx_effects_failure_mode_id" ON "effects"("failure_mode_id");
CREATE INDEX IF NOT EXISTS "idx_criticality_failure_mode_id" ON "criticality"("failure_mode_id");
CREATE INDEX IF NOT EXISTS "idx_maintenance_tasks_failure_mode_id" ON "maintenance_tasks"("failure_mode_id");
CREATE INDEX IF NOT EXISTS "idx_ram_metrics_system_id" ON "ram_metrics"("system_id");
CREATE INDEX IF NOT EXISTS "idx_ram_metrics_component_id" ON "ram_metrics"("component_id");
CREATE INDEX IF NOT EXISTS "idx_decision_logic_failure_mode_id" ON "decision_logic"("failure_mode_id");