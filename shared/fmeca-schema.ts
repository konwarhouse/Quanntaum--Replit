import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, boolean, timestamp, varchar, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { components, systems } from "./rcm-schema";

// FMECA History Status
export enum FmecaHistoryStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  ARCHIVED = "archived",
  SUPERSEDED = "superseded"
}

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

// Asset FMECA History table
export const assetFmecaHistory = pgTable("asset_fmeca_history", {
  id: serial("id").primaryKey(),
  assetFmecaId: integer("asset_fmeca_id").notNull(), // Reference to original FMECA record
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
  targetDate: text("target_date").notNull(),
  completionDate: text("completion_date"),
  verifiedBy: text("verified_by"),
  effectivenessVerified: text("effectiveness_verified"),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by"),
  status: text("status").notNull().default(FmecaHistoryStatus.ACTIVE),
  historyReason: text("history_reason"), // Reason for this history entry (e.g., "Logout", "Session ended", "User update")
  version: integer("version").notNull().default(1) // Version number, increments with each update
});

// System FMECA History table
export const systemFmecaHistory = pgTable("system_fmeca_history", {
  id: serial("id").primaryKey(),
  systemFmecaId: integer("system_fmeca_id").notNull(), // Reference to original FMECA record
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
  targetDate: text("target_date").notNull(),
  completionDate: text("completion_date"),
  verifiedBy: text("verified_by"),
  effectivenessVerified: text("effectiveness_verified"),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by"),
  status: text("status").notNull().default(FmecaHistoryStatus.ACTIVE),
  historyReason: text("history_reason"), // Reason for this history entry (e.g., "Logout", "Session ended", "User update")
  version: integer("version").notNull().default(1) // Version number, increments with each update
});

// Insert schemas for history tables
export const insertAssetFmecaHistorySchema = createInsertSchema(assetFmecaHistory, {
  assetFmecaId: z.number().int().positive("Asset FMECA ID is required"),
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
  createdBy: z.number().int().optional(),
  status: z.string().default(FmecaHistoryStatus.ACTIVE),
  historyReason: z.string().optional(),
  version: z.number().int().default(1)
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertSystemFmecaHistorySchema = createInsertSchema(systemFmecaHistory, {
  systemFmecaId: z.number().int().positive("System FMECA ID is required"),
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
  createdBy: z.number().int().optional(),
  status: z.string().default(FmecaHistoryStatus.ACTIVE),
  historyReason: z.string().optional(),
  version: z.number().int().default(1)
}).omit({ id: true, createdAt: true, updatedAt: true });

// Relations
export const assetFmecaRelations = relations(assetFmeca, ({ many }) => ({
  history: many(assetFmecaHistory)
}));

export const assetFmecaHistoryRelations = relations(assetFmecaHistory, ({ one }) => ({
  fmeca: one(assetFmeca, {
    fields: [assetFmecaHistory.assetFmecaId],
    references: [assetFmeca.id]
  })
}));

export const systemFmecaRelations = relations(systemFmeca, ({ many }) => ({
  history: many(systemFmecaHistory)
}));

export const systemFmecaHistoryRelations = relations(systemFmecaHistory, ({ one }) => ({
  fmeca: one(systemFmeca, {
    fields: [systemFmecaHistory.systemFmecaId],
    references: [systemFmeca.id]
  })
}));

// Types for database operations
export type AssetFmeca = typeof assetFmeca.$inferSelect;
export type InsertAssetFmeca = z.infer<typeof insertAssetFmecaSchema>;
export type SystemFmeca = typeof systemFmeca.$inferSelect;
export type InsertSystemFmeca = z.infer<typeof insertSystemFmecaSchema>;
export type AssetFmecaHistory = typeof assetFmecaHistory.$inferSelect;
export type InsertAssetFmecaHistory = z.infer<typeof insertAssetFmecaHistorySchema>;
export type SystemFmecaHistory = typeof systemFmecaHistory.$inferSelect;
export type InsertSystemFmecaHistory = z.infer<typeof insertSystemFmecaHistorySchema>;