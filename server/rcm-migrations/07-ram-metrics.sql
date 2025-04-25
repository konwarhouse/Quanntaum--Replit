-- Update RAM metrics table if it exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'ram_metrics' AND column_name = 'calculated_reliability') THEN
    ALTER TABLE "ram_metrics" ADD COLUMN "calculated_reliability" FLOAT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'ram_metrics' AND column_name = 'time_horizon') THEN
    ALTER TABLE "ram_metrics" ADD COLUMN "time_horizon" FLOAT;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "idx_ram_metrics_component_id" ON "ram_metrics"("component_id");