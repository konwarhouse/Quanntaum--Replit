-- Create decision logic table (for RCM decision tree)
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

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_rcm_decision_logic_failure_mode_id" ON "rcm_decision_logic"("failure_mode_id");