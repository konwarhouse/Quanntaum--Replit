import { 
  WeibullParameters as SharedWeibullParameters,
  MaintenanceOptimizationParameters as SharedMaintenanceOptimizationParameters,
  RCMParameters as SharedRCMParameters,
  SimulationParameters as SharedSimulationParameters
} from '../shared/schema';

export type WeibullParameters = SharedWeibullParameters;
export type MaintenanceOptimizationParameters = SharedMaintenanceOptimizationParameters;
export type RCMParameters = SharedRCMParameters;
export type SimulationParameters = SharedSimulationParameters;

export interface WeibullAnalysisResponse {
  reliabilityCurve: { time: number; reliability: number }[];
  failureRateCurve: { time: number; failureRate: number }[];
  mtbf: number;
  cumulativeFailureProbability: { time: number; probability: number }[];
}

export interface MaintenanceOptimizationResponse {
  optimalInterval: number;
  optimalCost: number;
  costCurve: { interval: number; cost: number }[];
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

export interface SimulationResponse {
  totalCost: number;
  averageFailures: number;
  histogram: { binStart: number; binEnd: number; count: number }[];
}