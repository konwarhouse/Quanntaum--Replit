-- Add new columns to failure_modes table for FMECA analysis
ALTER TABLE "failure_modes" 
ADD COLUMN IF NOT EXISTS "name" TEXT,
ADD COLUMN IF NOT EXISTS "cause" TEXT,
ADD COLUMN IF NOT EXISTS "local_effect" TEXT,
ADD COLUMN IF NOT EXISTS "system_effect" TEXT,
ADD COLUMN IF NOT EXISTS "end_effect" TEXT,
ADD COLUMN IF NOT EXISTS "recommended_actions" TEXT,
ADD COLUMN IF NOT EXISTS "component_id" INTEGER;

-- Add foreign key to components table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'components') THEN
        ALTER TABLE "failure_modes" 
        ADD CONSTRAINT "failure_modes_component_id_fk" 
        FOREIGN KEY ("component_id") 
        REFERENCES "components"("id") ON DELETE SET NULL;
    END IF;
END
$$;