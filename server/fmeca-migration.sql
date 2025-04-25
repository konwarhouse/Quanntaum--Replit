-- Add new columns to failure_criticality table for the enhanced FMECA features
ALTER TABLE failure_criticality 
ADD COLUMN IF NOT EXISTS severity_justification TEXT,
ADD COLUMN IF NOT EXISTS occurrence_justification TEXT,
ADD COLUMN IF NOT EXISTS detection_justification TEXT,
ADD COLUMN IF NOT EXISTS responsibility VARCHAR(100),
ADD COLUMN IF NOT EXISTS completion_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS verified_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS effectiveness_verification VARCHAR(50);