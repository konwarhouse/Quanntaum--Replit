import { pgTable, text, serial, integer, boolean, timestamp, real, date, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  username: text("username").notNull().references(() => users.username, { onDelete: 'cascade' }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  role: true,
  username: true,
});

// Reliability Models - Assets table
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  assetNumber: text("asset_number").notNull().unique(), // Alphanumeric asset identifier, up to 20 chars
  name: text("name").notNull(),
  equipmentClass: text("equipment_class"), // ISO 14224 equipment class (pump, motor, compressor, etc.)
  description: text("description").notNull(), // Text fields can hold long descriptions by default
  criticality: text("criticality").notNull(), // High, Medium, Low
  installationDate: date("installation_date"),
  weibullBeta: real("weibull_beta").notNull(), // Shape parameter
  weibullEta: real("weibull_eta").notNull(), // Scale parameter
  timeUnit: text("time_unit").notNull(), // hours, days, months, years
});

export const insertAssetSchema = createInsertSchema(assets).pick({
  assetNumber: true,
  name: true,
  equipmentClass: true,
  description: true,
  criticality: true,
  installationDate: true,
  weibullBeta: true,
  weibullEta: true,
  timeUnit: true,
});

// Maintenance Events table
export const maintenanceEvents = pgTable("maintenance_events", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull().references(() => assets.id, { onDelete: 'cascade' }),
  eventType: text("event_type").notNull(), // PM (Preventive Maintenance) or CM (Corrective Maintenance)
  eventDate: date("event_date").notNull(),
  cost: real("cost").notNull(),
  downtime: real("downtime").notNull(), // in hours
  description: text("description"),
});

export const insertMaintenanceEventSchema = createInsertSchema(maintenanceEvents).pick({
  assetId: true,
  eventType: true,
  eventDate: true,
  cost: true,
  downtime: true,
  description: true,
});

// Failure Modes table
export const failureModes = pgTable("failure_modes", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").references(() => assets.id, { onDelete: 'cascade' }), // Made optional
  description: text("description").notNull(),
  consequences: text("consequences").notNull(),
  detectionMethod: text("detection_method"),
  currentControl: text("current_control"),
  isPredictable: boolean("is_predictable").default(false),
  costOfFailure: real("cost_of_failure"),
  equipmentClass: text("equipment_class").notNull(), // ISO 14224 equipment class reference - required
});

export const insertFailureModeSchema = createInsertSchema(failureModes)
.pick({
  assetId: true,
  description: true,
  consequences: true,
  detectionMethod: true,
  currentControl: true, 
  isPredictable: true,
  costOfFailure: true,
  equipmentClass: true,
})
.partial({ assetId: true }); // Make assetId optional in the schema

// Failure History table - Comprehensive version for reliability analysis
export const failureHistory = pgTable("failure_history", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull().references(() => assets.id, { onDelete: 'cascade' }),
  failureModeId: integer("failure_mode_id").references(() => failureModes.id),
  
  // Essential timing fields
  failureDate: timestamp("failure_date").notNull(),
  repairCompleteDate: timestamp("repair_complete_date").notNull(),
  
  // Duration metrics
  downtimeHours: real("downtime_hours").notNull(), // Total unavailable time
  repairTimeHours: real("repair_time_hours").notNull(), // Actual hands-on repair time
  operatingHoursAtFailure: real("operating_hours_at_failure"), // Operating time since installation or last overhaul
  
  // Failure details
  failureDescription: text("failure_description").notNull(), // What happened
  failureMechanism: text("failure_mechanism"), // How it failed physically/chemically
  failureCause: text("failure_cause").notNull(), // Root cause
  
  // Classification fields for analysis
  failureClassification: text("failure_classification"), // Per ISO 14224 (mechanical, electrical, etc.)
  failureDetectionMethod: text("failure_detection_method").notNull(), // How it was discovered
  
  // Impact assessment
  safetyImpact: text("safety_impact"), // None, Minor, Major, Critical
  environmentalImpact: text("environmental_impact"), // None, Minor, Major, Critical
  productionImpact: text("production_impact"), // None, Minor, Major, Critical
  
  // Financial data
  repairCost: real("repair_cost"), // Direct cost of repairs
  consequentialCost: real("consequential_cost"), // Business impact costs
  
  // Repair details
  partsReplaced: text("parts_replaced"), // Components replaced
  repairActions: text("repair_actions").notNull(), // What was done
  repairTechnician: text("repair_technician"), // Who performed the work
  
  // Operating conditions
  operatingConditions: text("operating_conditions"), // Conditions at time of failure
  
  // RCM and prevention
  preventability: text("preventability"), // Preventable or non-preventable
  recommendedPreventiveAction: text("recommended_preventive_action"), // For future prevention
  needsRCA: text("needs_rca"), // Whether a Root Cause Analysis is required (yes/no)
  
  // Statistical analysis
  weibullBeta: real("weibull_beta"), // Shape parameter (if calculated)
  weibullEta: real("weibull_eta"), // Scale parameter (if calculated)
  
  // Metadata
  recordedBy: text("recorded_by"), // Who recorded this entry
  verifiedBy: text("verified_by"), // Who verified the analysis
  recordDate: timestamp("record_date").defaultNow().notNull(), // When this record was created
});

export const insertFailureHistorySchema = createInsertSchema(failureHistory)
.pick({
  assetId: true,
  failureModeId: true,
  failureDate: true,
  repairCompleteDate: true,
  downtimeHours: true,
  repairTimeHours: true,
  operatingHoursAtFailure: true,
  failureDescription: true,
  failureMechanism: true,
  failureCause: true,
  failureClassification: true,
  failureDetectionMethod: true,
  safetyImpact: true,
  environmentalImpact: true,
  productionImpact: true,
  repairCost: true,
  consequentialCost: true,
  partsReplaced: true,
  repairActions: true,
  repairTechnician: true,
  operatingConditions: true,
  preventability: true,
  recommendedPreventiveAction: true,
  needsRCA: true,
  weibullBeta: true,
  weibullEta: true,
  recordedBy: true,
  verifiedBy: true,
})
.transform((data) => {
  // Convert string dates to Date objects if they're provided as strings
  return {
    ...data,
    failureDate: typeof data.failureDate === 'string' ? new Date(data.failureDate) : data.failureDate,
    repairCompleteDate: data.repairCompleteDate && typeof data.repairCompleteDate === 'string' 
      ? new Date(data.repairCompleteDate) 
      : data.repairCompleteDate,
  };
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;

export type MaintenanceEvent = typeof maintenanceEvents.$inferSelect;
export type InsertMaintenanceEvent = z.infer<typeof insertMaintenanceEventSchema>;

export type FailureMode = typeof failureModes.$inferSelect;
export type InsertFailureMode = z.infer<typeof insertFailureModeSchema>;

export type FailureHistory = typeof failureHistory.$inferSelect;
export type InsertFailureHistory = z.infer<typeof insertFailureHistorySchema>;

// Chat completion request type
export interface ChatCompletionRequest {
  username: string;
  message: string;
}

// Weibull calculation input parameters
export interface WeibullParameters {
  beta: number; // shape parameter
  eta: number; // scale parameter
  timeUnits: 'hours' | 'days' | 'months' | 'years';
  timeHorizon: number;
}

// Maintenance optimization input parameters
export interface MaintenanceOptimizationParameters {
  beta: number;
  eta: number;
  preventiveMaintenanceCost: number;
  correctiveMaintenanceCost: number;
  targetReliabilityThreshold: number; // percentage 0-100
  maximumAcceptableDowntime: number;
  timeHorizon: number;
}

// RCM analysis input parameters
export interface RCMParameters {
  assetCriticality: 'High' | 'Medium' | 'Low';
  isPredictable: boolean;
  costOfFailure: number;
  failureModeDescriptions: string[];
  failureConsequences: string[];
  currentMaintenancePractices: string;
}

// Simulation input parameters
export interface SimulationParameters {
  beta: number;
  eta: number;
  numberOfRuns: number;
  timeHorizon: number;
  pmInterval?: number;
  pmCost: number;
  failureCost: number;
}

// Weibull calculation response
export interface WeibullAnalysisResponse {
  reliabilityCurve: { time: number; reliability: number }[];
  failureRateCurve: { time: number; failureRate: number }[];
  mtbf: number;
  cumulativeFailureProbability: { time: number; probability: number }[];
}

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  user: one(users, {
    fields: [messages.username],
    references: [users.username],
  }),
}));

export const assetsRelations = relations(assets, ({ many }) => ({
  maintenanceEvents: many(maintenanceEvents),
  failureModes: many(failureModes),
  failureHistory: many(failureHistory),
}));

export const maintenanceEventsRelations = relations(maintenanceEvents, ({ one }) => ({
  asset: one(assets, {
    fields: [maintenanceEvents.assetId],
    references: [assets.id],
  }),
}));

export const failureModesRelations = relations(failureModes, ({ one, many }) => ({
  asset: one(assets, {
    fields: [failureModes.assetId],
    references: [assets.id],
  }),
  failureHistory: many(failureHistory),
}));

export const failureHistoryRelations = relations(failureHistory, ({ one }) => ({
  asset: one(assets, {
    fields: [failureHistory.assetId],
    references: [assets.id],
  }),
  failureMode: one(failureModes, {
    fields: [failureHistory.failureModeId],
    references: [failureModes.id],
  }),
}));
