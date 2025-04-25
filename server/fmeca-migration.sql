-- Migration for Enhanced FMECA module

-- Create asset FMECA table
CREATE TABLE IF NOT EXISTS "asset_fmeca" (
  "id" SERIAL PRIMARY KEY,
  "tag_number" TEXT NOT NULL,
  "asset_description" TEXT NOT NULL,
  "asset_function" TEXT NOT NULL,
  "component" TEXT NOT NULL,
  "failure_mode" TEXT NOT NULL,
  "cause" TEXT NOT NULL,
  "effect" TEXT NOT NULL,
  "severity" INTEGER NOT NULL,
  "severity_justification" TEXT NOT NULL,
  "probability" INTEGER NOT NULL,
  "probability_justification" TEXT NOT NULL,
  "detection" INTEGER NOT NULL,
  "detection_justification" TEXT NOT NULL,
  "rpn" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "responsibility" TEXT NOT NULL,
  "target_date" TEXT NOT NULL,
  "completion_date" TEXT,
  "verified_by" TEXT,
  "effectiveness_verified" TEXT,
  "comments" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW(),
  "created_by" INTEGER
);

-- Create system FMECA table
CREATE TABLE IF NOT EXISTS "system_fmeca" (
  "id" SERIAL PRIMARY KEY,
  "system_id" TEXT NOT NULL,
  "system_name" TEXT NOT NULL,
  "system_function" TEXT NOT NULL,
  "subsystem" TEXT NOT NULL,
  "failure_mode" TEXT NOT NULL,
  "cause" TEXT NOT NULL,
  "effect" TEXT NOT NULL,
  "severity" INTEGER NOT NULL,
  "severity_justification" TEXT NOT NULL,
  "probability" INTEGER NOT NULL,
  "probability_justification" TEXT NOT NULL,
  "detection" INTEGER NOT NULL,
  "detection_justification" TEXT NOT NULL,
  "rpn" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "responsibility" TEXT NOT NULL,
  "target_date" TEXT NOT NULL,
  "completion_date" TEXT,
  "verified_by" TEXT,
  "effectiveness_verified" TEXT,
  "comments" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW(),
  "created_by" INTEGER
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_asset_fmeca_tag_number ON asset_fmeca (tag_number);
CREATE INDEX IF NOT EXISTS idx_system_fmeca_system_name ON system_fmeca (system_name);