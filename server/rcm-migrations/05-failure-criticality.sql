-- Create criticality table (RCM Step 5)
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

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_failure_criticality_failure_mode_id" ON "failure_criticality"("failure_mode_id");