-- Add the missing columns to the failure_history table
ALTER TABLE failure_history 
ADD COLUMN IF NOT EXISTS work_order_number TEXT,
ADD COLUMN IF NOT EXISTS installation_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_failure_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS tbf_days REAL,
ADD COLUMN IF NOT EXISTS failed_part TEXT,
ADD COLUMN IF NOT EXISTS potential_root_cause TEXT,
ADD COLUMN IF NOT EXISTS equipment_status TEXT,
ADD COLUMN IF NOT EXISTS equipment_location TEXT,
ADD COLUMN IF NOT EXISTS verified_by TEXT;