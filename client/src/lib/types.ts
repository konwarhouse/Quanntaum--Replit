// Message types
export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: number;
  content: string;
  role: MessageRole;
  username: string;
  timestamp: Date;
}

// Reliability types
export interface Asset {
  id: number;
  name: string;
  description: string | null;
  criticality: string;
  installationDate: string | null;
  weibullBeta: number;
  weibullEta: number;
  timeUnit: string;
}

export interface MaintenanceEvent {
  id: number;
  assetId: number;
  eventType: string;
  eventDate: string;
  cost: number;
  downtime: number;
  description: string | null;
}

export interface FailureMode {
  id: number;
  assetId: number;
  description: string;
  consequences: string;
  detectionMethod: string | null;
  currentControl: string | null;
  isPredictable: boolean | null;
  costOfFailure: number | null;
}

// Weibull analysis types
export interface WeibullParameters {
  beta: number;
  eta: number;
  timeUnits: 'hours' | 'days' | 'months' | 'years';
  timeHorizon: number;
}

export interface WeibullAnalysisResponse {
  reliabilityCurve: { time: number; reliability: number }[];
  failureRateCurve: { time: number; failureRate: number }[];
  mtbf: number;
  cumulativeFailureProbability: { time: number; probability: number }[];
}

// Maintenance optimization types
export interface MaintenanceOptimizationParameters {
  beta: number;
  eta: number;
  preventiveMaintenanceCost: number;
  correctiveMaintenanceCost: number;
  targetReliabilityThreshold: number;
  maximumAcceptableDowntime: number;
  timeHorizon: number;
}

export interface MaintenanceOptimizationResponse {
  optimalInterval: number;
  optimalCost: number;
  costCurve: { interval: number; cost: number }[];
}

// RCM analysis types
export interface RCMParameters {
  assetCriticality: 'High' | 'Medium' | 'Low';
  isPredictable: boolean;
  costOfFailure: number;
  failureModeDescriptions: string[];
  failureConsequences: string[];
  currentMaintenancePractices: string;
}

export interface RCMAnalysisResponse {
  maintenanceStrategy: string;
  taskRecommendations: string[];
  analysisInputs: {
    assetCriticality: string;
    isPredictable: boolean;
    costOfFailure: number;
  };
}

// Simulation types
export interface SimulationParameters {
  beta: number;
  eta: number;
  numberOfRuns: number;
  timeHorizon: number;
  pmInterval?: number;
  pmCost: number;
  failureCost: number;
}

export interface SimulationResponse {
  totalCost: number;
  averageFailures: number;
  histogram: { binStart: number; binEnd: number; count: number }[];
}