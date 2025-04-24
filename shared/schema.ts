import { pgTable, text, serial, integer, boolean, timestamp, real, date, foreignKey, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { UserRole } from "./auth";

// Equipment Classes table for ISO 14224 categories
export const equipmentClasses = pgTable("equipment_classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const insertEquipmentClassSchema = createInsertSchema(equipmentClasses).pick({
  name: true,
  description: true,
});

// Using UserRole enum from shared/auth.ts

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  email: text("email"),
  role: text("role").notNull().default(UserRole.VIEWER),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by"),
  lastLoginAt: timestamp("last_login_at"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  role: true,
  createdBy: true,
  isActive: true,
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
  lastReplacementDate: date("last_replacement_date"), // Date of last major replacement
  isReplacement: boolean("is_replacement").default(false), // Flag indicating if the asset has been replaced
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
  lastReplacementDate: true,
  isReplacement: true,
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
  
  // Reference information
  workOrderNumber: text("work_order_number"), // Reference WO Number
  
  // Essential timing fields
  installationDate: timestamp("installation_date"), // Equipment Installation date
  lastFailureDate: timestamp("last_failure_date"), // Last Failure Date before this occurrence
  failureDate: timestamp("failure_date").notNull(), // Current Failure Date
  repairCompleteDate: timestamp("repair_complete_date").notNull(), // When repair was completed
  
  // Time Between Failures
  tbfDays: real("tbf_days"), // Time Between Failures in Days
  
  // Duration metrics
  downtimeHours: real("downtime_hours").notNull(), // Total unavailable time
  repairTimeHours: real("repair_time_hours").notNull(), // Actual hands-on repair time
  operatingHoursAtFailure: real("operating_hours_at_failure"), // Operating time since installation or last overhaul
  
  // Failure details
  failedPart: text("failed_part"), // Specific part that failed
  failureDescription: text("failure_description").notNull(), // What happened
  failureMechanism: text("failure_mechanism"), // How it failed physically/chemically
  failureCause: text("failure_cause").notNull(), // Root cause
  potentialRootCause: text("potential_root_cause"), // Potential root cause if not fully determined
  
  // Equipment status
  equipmentStatus: text("equipment_status"), // Status: running, failed, censored
  equipmentLocation: text("equipment_location"), // Location information
  
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
  // References
  assetId: true,
  failureModeId: true,
  workOrderNumber: true,
  
  // Timing and dates
  installationDate: true,
  lastFailureDate: true,
  failureDate: true,
  repairCompleteDate: true,
  tbfDays: true,
  
  // Duration metrics
  downtimeHours: true,
  repairTimeHours: true,
  operatingHoursAtFailure: true,
  
  // Failure details
  failedPart: true,
  failureDescription: true,
  failureMechanism: true,
  failureCause: true,
  potentialRootCause: true,
  
  // Equipment status
  equipmentStatus: true,
  equipmentLocation: true,
  
  // Classification and impact
  failureClassification: true,
  failureDetectionMethod: true,
  safetyImpact: true,
  environmentalImpact: true,
  productionImpact: true,
  
  // Financial data
  repairCost: true,
  consequentialCost: true,
  
  // Repair details
  partsReplaced: true,
  repairActions: true,
  repairTechnician: true,
  operatingConditions: true,
  
  // RCM and prevention
  preventability: true,
  recommendedPreventiveAction: true,
  needsRCA: true,
  
  // Statistical analysis
  weibullBeta: true,
  weibullEta: true,
  
  // Metadata
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
    installationDate: data.installationDate && typeof data.installationDate === 'string' 
      ? new Date(data.installationDate) 
      : data.installationDate,
    lastFailureDate: data.lastFailureDate && typeof data.lastFailureDate === 'string' 
      ? new Date(data.lastFailureDate) 
      : data.lastFailureDate,
  };
});

// Types
export type EquipmentClass = typeof equipmentClasses.$inferSelect;
export type InsertEquipmentClass = z.infer<typeof insertEquipmentClassSchema>;

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
  // Optional fields for data-driven analysis
  fittedParameters?: {
    beta: number;
    eta: number;
    r2: number;  // R-squared (goodness of fit)
  };
  bLifeValues?: {
    b10Life: number;  // Time at which 10% of components fail
    b50Life: number;  // Time at which 50% of components fail
  };
  failurePattern?: 'early-life' | 'random' | 'wear-out';  // Classification based on beta
  failureCount?: number;  // Number of failure records used
  mechanismAnalysis?: Record<string, number>;  // Counts of each failure mechanism
  dataPoints?: {
    time: number;
    rank: number;
    adjusted: boolean;
  }[];  // Data points used in fitting
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

// RCM Module - Systems table
export const systems = pgTable("systems", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  purpose: text("purpose").notNull(),
  operatingContext: text("operating_context").notNull(),
  boundaries: text("boundaries").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSystemSchema = createInsertSchema(systems).pick({
  name: true,
  purpose: true,
  operatingContext: true,
  boundaries: true,
  createdBy: true,
});

// RCM Module - Components table
export const components = pgTable("components", {
  id: serial("id").primaryKey(),
  systemId: integer("system_id").notNull().references(() => systems.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  function: text("function").notNull(),
  description: text("description"),
  parentId: integer("parent_id").references(() => components.id),
  criticality: text("criticality").notNull(), // High, Medium, Low
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertComponentSchema = createInsertSchema(components).pick({
  systemId: true,
  name: true,
  function: true,
  description: true,
  parentId: true,
  criticality: true,
});

// RCM Module - Performance Standards table
export const performanceStandards = pgTable("performance_standards", {
  id: serial("id").primaryKey(),
  systemId: integer("system_id").notNull().references(() => systems.id, { onDelete: 'cascade' }),
  componentId: integer("component_id").references(() => components.id, { onDelete: 'cascade' }),
  metricName: text("metric_name").notNull(),
  targetValue: text("target_value").notNull(),
  unit: text("unit"),
  tolerance: text("tolerance"),
  isRequired: boolean("is_required").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPerformanceStandardSchema = createInsertSchema(performanceStandards).pick({
  systemId: true,
  componentId: true,
  metricName: true,
  targetValue: true,
  unit: true,
  tolerance: true,
  isRequired: true,
});

// RCM Module - Functional Failures table
export const functionalFailures = pgTable("functional_failures", {
  id: serial("id").primaryKey(),
  componentId: integer("component_id").notNull().references(() => components.id, { onDelete: 'cascade' }),
  description: text("description").notNull(),
  failureImpact: text("failure_impact").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFunctionalFailureSchema = createInsertSchema(functionalFailures).pick({
  componentId: true,
  description: true,
  failureImpact: true,
});

// RCM Module - FMECA Ratings table
export const fmecaRatings = pgTable("fmeca_ratings", {
  id: serial("id").primaryKey(),
  failureModeId: integer("failure_mode_id").notNull().references(() => failureModes.id, { onDelete: 'cascade' }),
  severity: integer("severity").notNull(), // 1-10
  occurrence: integer("occurrence").notNull(), // 1-10
  detection: integer("detection").notNull(), // 1-10
  rpn: integer("rpn").notNull(), // Risk Priority Number (calculated)
  criticality: text("criticality").notNull(), // High, Medium, Low
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFmecaRatingSchema = createInsertSchema(fmecaRatings).pick({
  failureModeId: true,
  severity: true,
  occurrence: true,
  detection: true,
  rpn: true,
  criticality: true,
});

// RCM Module - RCM Consequences table
export const rcmConsequences = pgTable("rcm_consequences", {
  id: serial("id").primaryKey(),
  failureModeId: integer("failure_mode_id").notNull().references(() => failureModes.id, { onDelete: 'cascade' }),
  safety: boolean("safety").default(false),
  environmental: boolean("environmental").default(false),
  operational: boolean("operational").default(false),
  economic: boolean("economic").default(false),
  consequenceType: text("consequence_type").notNull(), // Safety, Environmental, Operational, Economic, Hidden
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRcmConsequenceSchema = createInsertSchema(rcmConsequences).pick({
  failureModeId: true,
  safety: true,
  environmental: true,
  operational: true,
  economic: true,
  consequenceType: true,
});

// RCM Module - Maintenance Tasks table
export const maintenanceTasks = pgTable("maintenance_tasks", {
  id: serial("id").primaryKey(),
  failureModeId: integer("failure_mode_id").notNull().references(() => failureModes.id, { onDelete: 'cascade' }),
  description: text("description").notNull(),
  taskType: text("task_type").notNull(), // Predictive, Preventive, Detective, Run-to-failure, Redesign
  interval: real("interval"),
  intervalUnit: text("interval_unit"), // Hours, Days, Weeks, Months, Years
  rationale: text("rationale").notNull(),
  effectiveness: integer("effectiveness"), // 0-100
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMaintenanceTaskSchema = createInsertSchema(maintenanceTasks).pick({
  failureModeId: true,
  description: true,
  taskType: true,
  interval: true,
  intervalUnit: true,
  rationale: true,
  effectiveness: true,
});

// RCM Module - RAM Metrics table
export const ramMetrics = pgTable("ram_metrics", {
  id: serial("id").primaryKey(),
  componentId: integer("component_id").notNull().references(() => components.id, { onDelete: 'cascade' }),
  failureRate: real("failure_rate").notNull(),
  mtbf: real("mtbf").notNull(),
  mttr: real("mttr").notNull(),
  availability: real("availability").notNull(),
  calculatedReliability: real("calculated_reliability").notNull(),
  timeHorizon: real("time_horizon").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRamMetricSchema = createInsertSchema(ramMetrics).pick({
  componentId: true,
  failureRate: true,
  mtbf: true,
  mttr: true,
  availability: true,
  calculatedReliability: true,
  timeHorizon: true,
});
