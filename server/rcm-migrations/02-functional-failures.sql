-- This table already exists, this migration is for checking if fields need to be added
-- Check if any columns need to be added to the existing table

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'functional_failures' AND column_name = 'failure_impact') THEN
    ALTER TABLE "functional_failures" ADD COLUMN "failure_impact" TEXT;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_functional_failures_component_id" ON "functional_failures"("component_id");