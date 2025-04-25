import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, boolean, timestamp, varchar, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// SYSTEMS
export const systems = pgTable("systems", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  purpose: text("purpose"),
  boundaries: text("boundaries"),
  operatingContext: text("operating_context"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// COMPONENTS
export const components = pgTable("components", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  function: text("function"),
  criticality: text("criticality"),
  systemId: integer("system_id").references(() => systems.id),
  parentId: integer("parent_id").references(() => components.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const componentsRelations = relations(components, ({ one, many }) => ({
  system: one(systems, {
    fields: [components.systemId],
    references: [systems.id]
  }),
  parent: one(components, {
    fields: [components.parentId],
    references: [components.id]
  }),
  children: many(components),
  systemFunctions: many(systemFunctions),
  functionalFailures: many(functionalFailures),
  failureModes: many(failureModes),
  ramMetrics: many(ramMetrics),
  performanceStandards: many(performanceStandards)
}));

// SYSTEM FUNCTIONS
export const systemFunctions = pgTable("system_functions", {
  id: serial("id").primaryKey(),
  systemId: integer("system_id").references(() => systems.id),
  componentId: integer("component_id").references(() => components.id),
  functionDescription: text("function_description").notNull(),
  performanceStandard: text("performance_standard"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const systemFunctionsRelations = relations(systemFunctions, ({ one, many }) => ({
  system: one(systems, {
    fields: [systemFunctions.systemId],
    references: [systems.id]
  }),
  component: one(components, {
    fields: [systemFunctions.componentId],
    references: [components.id]
  }),
  functionalFailures: many(functionalFailures)
}));

// FUNCTIONAL FAILURES
export const functionalFailures = pgTable("functional_failures", {
  id: serial("id").primaryKey(),
  componentId: integer("component_id").references(() => components.id),
  description: text("description").notNull(),
  failureImpact: text("failure_impact"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const functionalFailuresRelations = relations(functionalFailures, ({ one, many }) => ({
  component: one(components, {
    fields: [functionalFailures.componentId],
    references: [components.id]
  }),
  failureModes: many(failureModes)
}));

// FAILURE MODES (enhanced with RCM fields)
export const failureModes = pgTable("failure_modes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  equipmentClass: text("equipment_class"),
  assetId: integer("asset_id"),
  componentId: integer("component_id").references(() => components.id),
  functionalFailureId: integer("functional_failure_id").references(() => functionalFailures.id),
  cause: text("cause"),
  localEffect: text("local_effect"),
  systemEffect: text("system_effect"),
  endEffect: text("end_effect"),
  currentControl: text("current_control"),
  consequences: text("consequences"),
  detectMethod: text("detection_method"),
  costOfFailure: real("cost_of_failure"),
  isPredictable: boolean("is_predictable"),
  recommendedActions: text("recommended_actions"),
  failureRate: real("failure_rate"),
  mttr: real("mttr")
});

export const failureModesRelations = relations(failureModes, ({ one, many }) => ({
  component: one(components, {
    fields: [failureModes.componentId],
    references: [components.id]
  }),
  functionalFailure: one(functionalFailures, {
    fields: [failureModes.functionalFailureId],
    references: [functionalFailures.id]
  }),
  failureEffects: many(failureEffects),
  failureCriticality: many(failureCriticality),
  failureHistory: many(failureHistory),
  maintenanceTasks: many(maintenanceTasks),
  rcmDecisionLogic: many(rcmDecisionLogic)
}));

// FAILURE EFFECTS
export const failureEffects = pgTable("failure_effects", {
  id: serial("id").primaryKey(),
  failureModeId: integer("failure_mode_id").references(() => failureModes.id, { onDelete: "cascade" }),
  localEffect: text("local_effect"),
  systemEffect: text("system_effect"),
  endEffect: text("end_effect"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const failureEffectsRelations = relations(failureEffects, ({ one }) => ({
  failureMode: one(failureModes, {
    fields: [failureEffects.failureModeId],
    references: [failureModes.id]
  })
}));

// FAILURE CRITICALITY (FMECA)
export const failureCriticality = pgTable("failure_criticality", {
  id: serial("id").primaryKey(),
  failureModeId: integer("failure_mode_id").references(() => failureModes.id, { onDelete: "cascade" }),
  severity: integer("severity").notNull(),
  occurrence: integer("occurrence").notNull(),
  detection: integer("detection").notNull(),
  rpn: integer("rpn"),
  criticalityIndex: varchar("criticality_index", { length: 20 }),
  consequenceType: varchar("consequence_type", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const failureCriticalityRelations = relations(failureCriticality, ({ one }) => ({
  failureMode: one(failureModes, {
    fields: [failureCriticality.failureModeId],
    references: [failureModes.id]
  })
}));

// MAINTENANCE TASKS
export const maintenanceTasks = pgTable("maintenance_tasks", {
  id: serial("id").primaryKey(),
  failureModeId: integer("failure_mode_id").references(() => failureModes.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  taskType: varchar("task_type", { length: 50 }),
  interval: real("interval"),
  intervalUnit: text("interval_unit"),
  effectiveness: integer("effectiveness"),
  rationale: text("rationale"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const maintenanceTasksRelations = relations(maintenanceTasks, ({ one }) => ({
  failureMode: one(failureModes, {
    fields: [maintenanceTasks.failureModeId],
    references: [failureModes.id]
  })
}));

// RAM METRICS
export const ramMetrics = pgTable("ram_metrics", {
  id: serial("id").primaryKey(),
  componentId: integer("component_id").references(() => components.id),
  mtbf: real("mtbf"),
  mttr: real("mttr"),
  failureRate: real("failure_rate"),
  availability: real("availability"),
  calculatedReliability: real("calculated_reliability"),
  timeHorizon: real("time_horizon"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const ramMetricsRelations = relations(ramMetrics, ({ one }) => ({
  component: one(components, {
    fields: [ramMetrics.componentId],
    references: [components.id]
  })
}));

// PERFORMANCE STANDARDS
export const performanceStandards = pgTable("performance_standards", {
  id: serial("id").primaryKey(),
  systemId: integer("system_id").references(() => systems.id),
  componentId: integer("component_id").references(() => components.id),
  metricName: text("metric_name").notNull(),
  targetValue: text("target_value"),
  tolerance: text("tolerance"),
  unit: text("unit"),
  isRequired: boolean("is_required").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const performanceStandardsRelations = relations(performanceStandards, ({ one }) => ({
  system: one(systems, {
    fields: [performanceStandards.systemId],
    references: [systems.id]
  }),
  component: one(components, {
    fields: [performanceStandards.componentId],
    references: [components.id]
  })
}));

// RCM DECISION LOGIC
export const rcmDecisionLogic = pgTable("rcm_decision_logic", {
  id: serial("id").primaryKey(),
  failureModeId: integer("failure_mode_id").references(() => failureModes.id, { onDelete: "cascade" }),
  hiddenFunction: boolean("hidden_function").default(false),
  safetyConsequence: boolean("safety_consequence").default(false),
  environmentalConsequence: boolean("environmental_consequence").default(false),
  operationalConsequence: boolean("operational_consequence").default(false),
  economicConsequence: boolean("economic_consequence").default(false),
  failureEvident: boolean("failure_evident").default(false),
  pmTechnicallyFeasible: boolean("pm_technically_feasible").default(false),
  cmTechnicallyFeasible: boolean("cm_technically_feasible").default(false),
  ffTechnicallyFeasible: boolean("ff_technically_feasible").default(false),
  rtfAcceptable: boolean("rtf_acceptable").default(false),
  decisionPath: varchar("decision_path", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const rcmDecisionLogicRelations = relations(rcmDecisionLogic, ({ one }) => ({
  failureMode: one(failureModes, {
    fields: [rcmDecisionLogic.failureModeId],
    references: [failureModes.id]
  })
}));

// FAILURE HISTORY (reference to existing schema)
export const failureHistory = pgTable("failure_history", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull(),
  failureModeId: integer("failure_mode_id").references(() => failureModes.id),
  recordDate: timestamp("record_date").defaultNow(),
  workOrderNumber: text("work_order_number"),
  failureDate: timestamp("failure_date"),
  failureDescription: text("failure_description"),
  failureCause: text("failure_cause"),
  failureMechanism: text("failure_mechanism"),
  failureClassification: text("failure_classification"),
  failureDetectionMethod: text("failure_detection_method"),
  operatingHoursAtFailure: real("operating_hours_at_failure"),
  tbfDays: real("tbf_days"),
  installationDate: timestamp("installation_date"),
  lastFailureDate: timestamp("last_failure_date"),
  repairCompleteDate: timestamp("repair_complete_date"),
  repairTimeHours: real("repair_time_hours"),
  downtimeHours: real("downtime_hours"),
  repairCost: real("repair_cost"),
  consequentialCost: real("consequential_cost"),
  repairActions: text("repair_actions"),
  partsReplaced: text("parts_replaced"),
  repairTechnician: text("repair_technician"),
  recordedBy: text("recorded_by"),
  verifiedBy: text("verified_by"),
  equipmentStatus: text("equipment_status"),
  equipmentLocation: text("equipment_location"),
  operatingConditions: text("operating_conditions"),
  safetyImpact: text("safety_impact"),
  environmentalImpact: text("environmental_impact"),
  productionImpact: text("production_impact"),
  potentialRootCause: text("potential_root_cause"),
  recommendedPreventiveAction: text("recommended_preventive_action"),
  needsRca: text("needs_rca"),
  preventability: text("preventability"),
  weibullBeta: real("weibull_beta"),
  weibullEta: real("weibull_eta"),
  failedPart: text("failed_part")
});

export const failureHistoryRelations = relations(failureHistory, ({ one }) => ({
  failureMode: one(failureModes, {
    fields: [failureHistory.failureModeId],
    references: [failureModes.id]
  })
}));

// Create insert schemas using drizzle-zod
export const insertSystemSchema = createInsertSchema(systems, {
  name: z.string().min(1, "System name is required"),
  purpose: z.string().optional(),
  boundaries: z.string().optional(),
  operatingContext: z.string().optional()
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertComponentSchema = createInsertSchema(components, {
  name: z.string().min(1, "Component name is required"),
  description: z.string().optional(),
  function: z.string().optional(),
  criticality: z.string().optional(),
  systemId: z.number().int().positive().optional(),
  parentId: z.number().int().positive().nullable().optional()
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertSystemFunctionSchema = createInsertSchema(systemFunctions, {
  systemId: z.number().int().positive(),
  componentId: z.number().int().positive().nullable().optional(),
  functionDescription: z.string().min(1, "Function description is required"),
  performanceStandard: z.string().optional()
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertFunctionalFailureSchema = createInsertSchema(functionalFailures, {
  componentId: z.number().int().positive(),
  description: z.string().min(1, "Failure description is required"),
  failureImpact: z.string().optional()
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertFailureModeSchema = createInsertSchema(failureModes, {
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  equipmentClass: z.string().optional(),
  assetId: z.number().int().positive().optional(),
  componentId: z.number().int().positive().optional(),
  functionalFailureId: z.number().int().positive().optional(),
  cause: z.string().optional(),
  localEffect: z.string().optional(),
  systemEffect: z.string().optional(),
  endEffect: z.string().optional(),
  currentControl: z.string().optional(),
  consequences: z.string().optional(),
  detectMethod: z.string().optional(),
  costOfFailure: z.number().optional(),
  isPredictable: z.boolean().optional(),
  recommendedActions: z.string().optional(),
  failureRate: z.number().optional(),
  mttr: z.number().optional()
}).omit({ id: true });

export const insertFailureEffectSchema = createInsertSchema(failureEffects, {
  failureModeId: z.number().int().positive(),
  localEffect: z.string().optional(),
  systemEffect: z.string().optional(),
  endEffect: z.string().optional()
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertFailureCriticalitySchema = createInsertSchema(failureCriticality, {
  failureModeId: z.number().int().positive(),
  severity: z.number().int().min(1).max(10),
  occurrence: z.number().int().min(1).max(10),
  detection: z.number().int().min(1).max(10),
  rpn: z.number().int().optional(),
  criticalityIndex: z.string().optional(),
  consequenceType: z.string().optional()
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertMaintenanceTaskSchema = createInsertSchema(maintenanceTasks, {
  failureModeId: z.number().int().positive(),
  description: z.string().min(1, "Task description is required"),
  taskType: z.string().optional(),
  interval: z.number().optional(),
  intervalUnit: z.string().optional(),
  effectiveness: z.number().int().optional(),
  rationale: z.string().optional()
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertRamMetricSchema = createInsertSchema(ramMetrics, {
  componentId: z.number().int().positive(),
  mtbf: z.number().optional(),
  mttr: z.number().optional(),
  failureRate: z.number().optional(),
  availability: z.number().optional(),
  calculatedReliability: z.number().optional(),
  timeHorizon: z.number().optional()
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertPerformanceStandardSchema = createInsertSchema(performanceStandards, {
  systemId: z.number().int().positive().optional(),
  componentId: z.number().int().positive().optional(),
  metricName: z.string().min(1, "Metric name is required"),
  targetValue: z.string().optional(),
  tolerance: z.string().optional(),
  unit: z.string().optional(),
  isRequired: z.boolean().optional()
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertRcmDecisionLogicSchema = createInsertSchema(rcmDecisionLogic, {
  failureModeId: z.number().int().positive(),
  hiddenFunction: z.boolean().optional(),
  safetyConsequence: z.boolean().optional(),
  environmentalConsequence: z.boolean().optional(),
  operationalConsequence: z.boolean().optional(),
  economicConsequence: z.boolean().optional(),
  failureEvident: z.boolean().optional(),
  pmTechnicallyFeasible: z.boolean().optional(),
  cmTechnicallyFeasible: z.boolean().optional(),
  ffTechnicallyFeasible: z.boolean().optional(),
  rtfAcceptable: z.boolean().optional(),
  decisionPath: z.string().optional()
}).omit({ id: true, createdAt: true, updatedAt: true });

// Define types
export type System = typeof systems.$inferSelect;
export type InsertSystem = z.infer<typeof insertSystemSchema>;

export type Component = typeof components.$inferSelect;
export type InsertComponent = z.infer<typeof insertComponentSchema>;

export type SystemFunction = typeof systemFunctions.$inferSelect;
export type InsertSystemFunction = z.infer<typeof insertSystemFunctionSchema>;

export type FunctionalFailure = typeof functionalFailures.$inferSelect;
export type InsertFunctionalFailure = z.infer<typeof insertFunctionalFailureSchema>;

export type FailureMode = typeof failureModes.$inferSelect;
export type InsertFailureMode = z.infer<typeof insertFailureModeSchema>;

export type FailureEffect = typeof failureEffects.$inferSelect;
export type InsertFailureEffect = z.infer<typeof insertFailureEffectSchema>;

export type FailureCriticality = typeof failureCriticality.$inferSelect;
export type InsertFailureCriticality = z.infer<typeof insertFailureCriticalitySchema>;

export type MaintenanceTask = typeof maintenanceTasks.$inferSelect;
export type InsertMaintenanceTask = z.infer<typeof insertMaintenanceTaskSchema>;

export type RamMetric = typeof ramMetrics.$inferSelect;
export type InsertRamMetric = z.infer<typeof insertRamMetricSchema>;

export type PerformanceStandard = typeof performanceStandards.$inferSelect;
export type InsertPerformanceStandard = z.infer<typeof insertPerformanceStandardSchema>;

export type RcmDecisionLogic = typeof rcmDecisionLogic.$inferSelect;
export type InsertRcmDecisionLogic = z.infer<typeof insertRcmDecisionLogicSchema>;