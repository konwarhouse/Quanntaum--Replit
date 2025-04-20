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
  name: text("name").notNull(),
  description: text("description"),
  criticality: text("criticality").notNull(), // High, Medium, Low
  installationDate: date("installation_date"),
  weibullBeta: real("weibull_beta").notNull(), // Shape parameter
  weibullEta: real("weibull_eta").notNull(), // Scale parameter
  timeUnit: text("time_unit").notNull(), // hours, days, months, years
});

export const insertAssetSchema = createInsertSchema(assets).pick({
  name: true,
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
  assetId: integer("asset_id").notNull().references(() => assets.id, { onDelete: 'cascade' }),
  description: text("description").notNull(),
  consequences: text("consequences").notNull(),
  detectionMethod: text("detection_method"),
  currentControl: text("current_control"),
  isPredictable: boolean("is_predictable").default(false),
  costOfFailure: real("cost_of_failure"),
});

export const insertFailureModeSchema = createInsertSchema(failureModes).pick({
  assetId: true,
  description: true,
  consequences: true,
  detectionMethod: true,
  currentControl: true,
  isPredictable: true,
  costOfFailure: true,
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
}));

export const maintenanceEventsRelations = relations(maintenanceEvents, ({ one }) => ({
  asset: one(assets, {
    fields: [maintenanceEvents.assetId],
    references: [assets.id],
  }),
}));

export const failureModesRelations = relations(failureModes, ({ one }) => ({
  asset: one(assets, {
    fields: [failureModes.assetId],
    references: [assets.id],
  }),
}));
