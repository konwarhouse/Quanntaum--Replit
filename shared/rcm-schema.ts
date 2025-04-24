import { pgTable, text, serial, integer, boolean, timestamp, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users, failureModes } from "./schema";

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
  parentId: integer("parent_id"),
  criticality: text("criticality").notNull(), // High, Medium, Low
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// The self-reference for parent-child relationship is already handled by 
// the reference in the components table definition (parentId references components.id)

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

// Types
export type System = typeof systems.$inferSelect;
export type InsertSystem = z.infer<typeof insertSystemSchema>;

export type Component = typeof components.$inferSelect;
export type InsertComponent = z.infer<typeof insertComponentSchema>;

export type PerformanceStandard = typeof performanceStandards.$inferSelect;
export type InsertPerformanceStandard = z.infer<typeof insertPerformanceStandardSchema>;

export type FunctionalFailure = typeof functionalFailures.$inferSelect;
export type InsertFunctionalFailure = z.infer<typeof insertFunctionalFailureSchema>;

export type FmecaRating = typeof fmecaRatings.$inferSelect;
export type InsertFmecaRating = z.infer<typeof insertFmecaRatingSchema>;

export type RcmConsequence = typeof rcmConsequences.$inferSelect;
export type InsertRcmConsequence = z.infer<typeof insertRcmConsequenceSchema>;

export type MaintenanceTask = typeof maintenanceTasks.$inferSelect;
export type InsertMaintenanceTask = z.infer<typeof insertMaintenanceTaskSchema>;

export type RamMetric = typeof ramMetrics.$inferSelect;
export type InsertRamMetric = z.infer<typeof insertRamMetricSchema>;

// Relations
export const systemsRelations = relations(systems, ({ many, one }) => ({
  components: many(components),
  performanceStandards: many(performanceStandards),
  createdByUser: one(users, {
    fields: [systems.createdBy],
    references: [users.id],
  }),
}));

export const componentsRelations = relations(components, ({ many, one }) => ({
  system: one(systems, {
    fields: [components.systemId],
    references: [systems.id],
  }),
  parentComponent: one(components, {
    fields: [components.parentId],
    references: [components.id],
  }),
  childComponents: many(components),
  functionalFailures: many(functionalFailures),
  performanceStandards: many(performanceStandards),
  ramMetrics: many(ramMetrics),
}));

export const performanceStandardsRelations = relations(performanceStandards, ({ one }) => ({
  system: one(systems, {
    fields: [performanceStandards.systemId],
    references: [systems.id],
  }),
  component: one(components, {
    fields: [performanceStandards.componentId],
    references: [components.id],
  }),
}));

export const functionalFailuresRelations = relations(functionalFailures, ({ one }) => ({
  component: one(components, {
    fields: [functionalFailures.componentId],
    references: [components.id],
  }),
}));

export const fmecaRatingsRelations = relations(fmecaRatings, ({ one }) => ({
  failureMode: one(failureModes, {
    fields: [fmecaRatings.failureModeId],
    references: [failureModes.id],
  }),
}));

export const rcmConsequencesRelations = relations(rcmConsequences, ({ one }) => ({
  failureMode: one(failureModes, {
    fields: [rcmConsequences.failureModeId],
    references: [failureModes.id],
  }),
}));

export const maintenanceTasksRelations = relations(maintenanceTasks, ({ one }) => ({
  failureMode: one(failureModes, {
    fields: [maintenanceTasks.failureModeId],
    references: [failureModes.id],
  }),
}));

export const ramMetricsRelations = relations(ramMetrics, ({ one }) => ({
  component: one(components, {
    fields: [ramMetrics.componentId],
    references: [components.id],
  }),
}));

// RCM interfaces
export interface FMECAAnalysisResponse {
  criticalFailureModes: {
    id: number;
    description: string;
    rpn: number;
    criticality: string;
  }[];
  riskMatrix: {
    severity: number;
    occurrence: number;
    count: number;
  }[];
  paretoAnalysis: {
    failureMode: string;
    rpn: number;
  }[];
  recommendations: string[];
}

export interface RCMAnalysisResponse {
  maintenanceStrategy: string;
  taskRecommendations: {
    taskType: string;
    description: string;
    interval: number;
    intervalUnit: string;
    rationale: string;
  }[];
  consequenceAnalysis: {
    safety: boolean;
    environmental: boolean;
    operational: boolean;
    economic: boolean;
    consequenceType: string;
  };
  defaultActions: string[];
}

export interface RAMAnalysisResponse {
  systemReliability: number;
  systemAvailability: number;
  mtbf: number;
  mttr: number;
  reliabilityCurve: { time: number; reliability: number }[];
  availabilityHeatmap: {
    componentId: number;
    componentName: string;
    availability: number;
    criticality: string;
  }[];
  maintenanceImpact: {
    currentAvailability: number;
    potentialAvailability: number;
    improvementPercentage: number;
  };
}