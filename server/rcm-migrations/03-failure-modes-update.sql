-- Enhance existing Failure Modes table with RCM fields (RCM Step 3)
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

-- Create index for the new column
CREATE INDEX IF NOT EXISTS "idx_failure_modes_functional_failure_id" ON "failure_modes"("functional_failure_id");