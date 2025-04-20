import { z } from "zod";

// User roles
export enum UserRole {
  ADMIN = "admin",
  ANALYST = "analyst",
  TECHNICIAN = "technician",
  VIEWER = "viewer"
}

// Role-based permissions
export const RolePermissions = {
  [UserRole.ADMIN]: {
    canCreateAsset: true,
    canEditAsset: true,
    canDeleteAsset: true,
    canCreateUser: true,
    canConfigureSystem: true,
    canPerformAnalysis: true,
    canGenerateReports: true,
    canViewReports: true
  },
  [UserRole.ANALYST]: {
    canCreateAsset: true,
    canEditAsset: true,
    canDeleteAsset: false,
    canCreateUser: false,
    canConfigureSystem: false,
    canPerformAnalysis: true,
    canGenerateReports: true,
    canViewReports: true
  },
  [UserRole.TECHNICIAN]: {
    canCreateAsset: false,
    canEditAsset: true,
    canDeleteAsset: false,
    canCreateUser: false,
    canConfigureSystem: false,
    canPerformAnalysis: false,
    canGenerateReports: false,
    canViewReports: true
  },
  [UserRole.VIEWER]: {
    canCreateAsset: false,
    canEditAsset: false,
    canDeleteAsset: false,
    canCreateUser: false,
    canConfigureSystem: false,
    canPerformAnalysis: false,
    canGenerateReports: false,
    canViewReports: true
  }
};

// Extended user schema with roles
export const extendedUserSchema = z.object({
  id: z.number().optional(),
  username: z.string().min(3).max(50),
  role: z.nativeEnum(UserRole).default(UserRole.VIEWER),
  email: z.string().email().optional(),
  organization: z.string().optional(),
  department: z.string().optional(),
  lastLogin: z.date().optional()
});

export type ExtendedUser = z.infer<typeof extendedUserSchema>;

// Define API endpoints for the reliability module
export const ReliabilityAPIEndpoints = {
  // Asset endpoints
  assets: "/api/assets",
  assetById: (id: number) => `/api/assets/${id}`,
  
  // Analysis endpoints
  weibullAnalysis: "/api/weibull-analysis",
  maintenanceOptimization: "/api/maintenance-optimization",
  rcmAnalysis: "/api/rcm-analysis",
  simulation: "/api/simulation",
  
  // Maintenance events
  maintenanceEvents: "/api/maintenance-events",
  maintenanceEventsByAsset: (assetId: number) => `/api/assets/${assetId}/maintenance-events`,
  
  // Failure modes
  failureModes: "/api/failure-modes",
  failureModesByAsset: (assetId: number) => `/api/assets/${assetId}/failure-modes`,
  
  // Reports
  reports: "/api/reports",
  reportById: (id: number) => `/api/reports/${id}`
};

// Error handling types
export enum ErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  DATA_CONFLICT = "DATA_CONFLICT",
  CALCULATION_ERROR = "CALCULATION_ERROR",
  SERVER_ERROR = "SERVER_ERROR"
}

export interface APIError {
  type: ErrorType;
  message: string;
  details?: any;
  code?: number;
}

// Request validation schemas
export const weibullValidationSchema = z.object({
  beta: z.number().positive().min(0.1).max(100),
  eta: z.number().positive().min(1),
  timeUnits: z.enum(["hours", "days", "months", "years"]),
  timeHorizon: z.number().positive().min(1)
});

export const optimizationValidationSchema = z.object({
  beta: z.number().positive().min(0.1).max(100),
  eta: z.number().positive().min(1),
  preventiveMaintenanceCost: z.number().nonnegative(),
  correctiveMaintenanceCost: z.number().positive(),
  targetReliabilityThreshold: z.number().min(0).max(100),
  maximumAcceptableDowntime: z.number().nonnegative(),
  timeHorizon: z.number().positive().min(1)
});

export const rcmValidationSchema = z.object({
  assetCriticality: z.enum(["High", "Medium", "Low"]),
  isPredictable: z.boolean(),
  costOfFailure: z.number().nonnegative(),
  failureModeDescriptions: z.array(z.string()).min(1),
  failureConsequences: z.array(z.string()).min(1),
  currentMaintenancePractices: z.string()
});

export const simulationValidationSchema = z.object({
  beta: z.number().positive().min(0.1).max(100),
  eta: z.number().positive().min(1),
  numberOfRuns: z.number().int().positive().max(10000),
  timeHorizon: z.number().positive().min(1),
  pmInterval: z.number().positive().optional(),
  pmCost: z.number().nonnegative(),
  failureCost: z.number().positive()
});