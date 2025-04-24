-- RCM Full Migration Script
-- This script creates all tables needed for comprehensive RCM, FMECA, and RAM analysis

-- Execute tables in correct order to prevent dependency issues

-- 1. First create the system functions table (RCM Step 1)
CREATE TABLE IF NOT EXISTS "system_functions" (
  "id" SERIAL PRIMARY KEY,
  "system_id" INTEGER REFERENCES "systems"("id") ON DELETE CASCADE,
  "component_id" INTEGER REFERENCES "components"("id") ON DELETE CASCADE,
  "function_description" TEXT NOT NULL,
  "performance_standard" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create functional failures table (RCM Step 2)
CREATE TABLE IF NOT EXISTS "functional_failures" (
  "id" SERIAL PRIMARY KEY,
  "system_function_id" INTEGER REFERENCES "system_functions"("id") ON DELETE CASCADE,
  "failure_description" TEXT NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Enhance existing Failure Modes table with RCM fields (RCM Step 3)
-- First check if columns exist to avoid errors
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'failure_modes' AND column_name = 'functional_failure_id') THEN
    ALTER TABLE "failure_modes" ADD COLUMN "functional_failure_id" INTEGER REFERENCES "functional_failures"("id") ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'failure_modes' AND column_name = 'failure_rate') THEN
    ALTER TABLE "failure_modes" ADD COLUMN "failure_rate" FLOAT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'failure_modes' AND column_name = 'mttr') THEN
    ALTER TABLE "failure_modes" ADD COLUMN "mttr" FLOAT;
  END IF;
END $$;

-- 4. Create effects table (RCM Step 4)
CREATE TABLE IF NOT EXISTS "failure_effects" (
  "id" SERIAL PRIMARY KEY,
  "failure_mode_id" INTEGER REFERENCES "failure_modes"("id") ON DELETE CASCADE,
  "local_effect" TEXT,
  "system_effect" TEXT,
  "end_effect" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create criticality table (RCM Step 5)
CREATE TABLE IF NOT EXISTS "failure_criticality" (
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

-- 6. Create maintenance tasks table (RCM Steps 6-7)
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

-- 7. Create RAM metrics table
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

-- 8. Create decision logic table (for RCM decision tree)
CREATE TABLE IF NOT EXISTS "rcm_decision_logic" (
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

-- Create indexes to improve query performance - only after all tables are created
CREATE INDEX IF NOT EXISTS "idx_system_functions_system_id" ON "system_functions"("system_id");
CREATE INDEX IF NOT EXISTS "idx_system_functions_component_id" ON "system_functions"("component_id");
CREATE INDEX IF NOT EXISTS "idx_functional_failures_system_function_id" ON "functional_failures"("system_function_id");
CREATE INDEX IF NOT EXISTS "idx_failure_modes_functional_failure_id" ON "failure_modes"("functional_failure_id");
CREATE INDEX IF NOT EXISTS "idx_failure_effects_failure_mode_id" ON "failure_effects"("failure_mode_id");
CREATE INDEX IF NOT EXISTS "idx_failure_criticality_failure_mode_id" ON "failure_criticality"("failure_mode_id");
CREATE INDEX IF NOT EXISTS "idx_maintenance_tasks_failure_mode_id" ON "maintenance_tasks"("failure_mode_id");
CREATE INDEX IF NOT EXISTS "idx_ram_metrics_system_id" ON "ram_metrics"("system_id");
CREATE INDEX IF NOT EXISTS "idx_ram_metrics_component_id" ON "ram_metrics"("component_id");
CREATE INDEX IF NOT EXISTS "idx_rcm_decision_logic_failure_mode_id" ON "rcm_decision_logic"("failure_mode_id");