import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, boolean, timestamp, varchar, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { components, systems } from "./rcm-schema";

// Asset FMECA table
export const assetFmeca = pgTable("asset_fmeca", {
  id: serial("id").primaryKey(),
  tagNumber: text("tag_number").notNull(),
  assetDescription: text("asset_description").notNull(),
  assetFunction: text("asset_function").notNull(),
  component: text("component").notNull(),
  failureMode: text("failure_mode").notNull(),
  cause: text("cause").notNull(),
  effect: text("effect").notNull(),
  severity: integer("severity").notNull(),
  severityJustification: text("severity_justification").notNull(),
  probability: integer("probability").notNull(),
  probabilityJustification: text("probability_justification").notNull(),
  detection: integer("detection").notNull(),
  detectionJustification: text("detection_justification").notNull(),
  rpn: integer("rpn").notNull(),
  action: text("action").notNull(),
  responsibility: text("responsibility").notNull(),
  targetDate: text("target_date").notNull(), // storing as ISO string
  completionDate: text("completion_date"),
  verifiedBy: text("verified_by"),
  effectivenessVerified: text("effectiveness_verified"), // 'yes', 'no', 'partial' or ''
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by")
});

// System FMECA table
export const systemFmeca = pgTable("system_fmeca", {
  id: serial("id").primaryKey(),
  systemId: text("system_id").notNull(),
  systemName: text("system_name").notNull(),
  systemFunction: text("system_function").notNull(),
  subsystem: text("subsystem").notNull(),
  failureMode: text("failure_mode").notNull(),
  cause: text("cause").notNull(),
  effect: text("effect").notNull(),
  severity: integer("severity").notNull(),
  severityJustification: text("severity_justification").notNull(),
  probability: integer("probability").notNull(),
  probabilityJustification: text("probability_justification").notNull(),
  detection: integer("detection").notNull(),
  detectionJustification: text("detection_justification").notNull(),
  rpn: integer("rpn").notNull(),
  action: text("action").notNull(),
  responsibility: text("responsibility").notNull(),
  targetDate: text("target_date").notNull(), // storing as ISO string
  completionDate: text("completion_date"),
  verifiedBy: text("verified_by"),
  effectivenessVerified: text("effectiveness_verified"), // 'yes', 'no', 'partial' or ''
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by")
});

// Insert schemas
export const insertAssetFmecaSchema = createInsertSchema(assetFmeca, {
  tagNumber: z.string().min(1, "Tag number is required"),
  assetDescription: z.string().min(1, "Asset description is required"),
  assetFunction: z.string().min(1, "Asset function is required"),
  component: z.string().min(1, "Component is required"),
  failureMode: z.string().min(1, "Failure mode is required"),
  cause: z.string().min(1, "Cause is required"),
  effect: z.string().min(1, "Effect is required"),
  severity: z.number().int().min(1).max(10),
  severityJustification: z.string().min(1, "Severity justification is required"),
  probability: z.number().int().min(1).max(10),
  probabilityJustification: z.string().min(1, "Probability justification is required"),
  detection: z.number().int().min(1).max(10),
  detectionJustification: z.string().min(1, "Detection justification is required"),
  rpn: z.number().int(),
  action: z.string().min(1, "Action is required"),
  responsibility: z.string().min(1, "Responsibility is required"),
  targetDate: z.string().min(1, "Target date is required"),
  completionDate: z.string().optional(),
  verifiedBy: z.string().optional(),
  effectivenessVerified: z.string().optional(),
  comments: z.string().optional(),
  createdBy: z.number().int().optional()
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertSystemFmecaSchema = createInsertSchema(systemFmeca, {
  systemId: z.string().min(1, "System ID is required"),
  systemName: z.string().min(1, "System name is required"),
  systemFunction: z.string().min(1, "System function is required"),
  subsystem: z.string().min(1, "Subsystem is required"),
  failureMode: z.string().min(1, "Failure mode is required"),
  cause: z.string().min(1, "Cause is required"),
  effect: z.string().min(1, "Effect is required"),
  severity: z.number().int().min(1).max(10),
  severityJustification: z.string().min(1, "Severity justification is required"),
  probability: z.number().int().min(1).max(10),
  probabilityJustification: z.string().min(1, "Probability justification is required"),
  detection: z.number().int().min(1).max(10),
  detectionJustification: z.string().min(1, "Detection justification is required"),
  rpn: z.number().int(),
  action: z.string().min(1, "Action is required"),
  responsibility: z.string().min(1, "Responsibility is required"),
  targetDate: z.string().min(1, "Target date is required"),
  completionDate: z.string().optional(),
  verifiedBy: z.string().optional(),
  effectivenessVerified: z.string().optional(),
  comments: z.string().optional(),
  createdBy: z.number().int().optional()
}).omit({ id: true, createdAt: true, updatedAt: true });

// Types for database operations
export type AssetFmeca = typeof assetFmeca.$inferSelect;
export type InsertAssetFmeca = z.infer<typeof insertAssetFmecaSchema>;
export type SystemFmeca = typeof systemFmeca.$inferSelect;
export type InsertSystemFmeca = z.infer<typeof insertSystemFmecaSchema>;