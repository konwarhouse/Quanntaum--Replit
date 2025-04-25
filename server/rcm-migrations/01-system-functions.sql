-- This table already exists, no need to recreate
-- Just checking if any columns need to be added

-- Add any missing columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'system_functions' AND column_name = 'performance_standard') THEN
    ALTER TABLE "system_functions" ADD COLUMN "performance_standard" TEXT;
  END IF;
END $$;