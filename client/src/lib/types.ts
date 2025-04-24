import { WeibullAnalysisResponse as BaseWeibullAnalysisResponse, FailureHistory as BaseFailureHistory } from "@shared/schema";

// Extended Weibull Analysis Response with data-driven analysis fields
export interface ExtendedWeibullAnalysisResponse extends Omit<BaseWeibullAnalysisResponse, 'dataPoints'> {
  fallbackCalculation?: boolean;  // Flag to indicate fallback MTBF calculation was used
  calculationMethod?: 'operatingHours' | 'tbfDays' | null;  // Method used for calculation
  calculationMethodDisplay?: string;  // User-friendly display of calculation method
  mtbfDataPoints?: number[];  // Data points (values) used in the MTBF calculation
  dataPoints?: WeibullDataPoint[];  // For compatibility with original API response
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
  assetDetails?: {
    assetType: 'specific' | 'class' | 'failureMode' | 'all';
    id: number | null;
    label: string;
  };  // Information about what asset/component is being analyzed
  // New verification data for cross-checking MTBF calculations
  verification?: {
    weibullMTBF: number;       // MTBF calculated with Weibull formula η · Γ(1 + 1/β)
    simpleMTBF: number | null; // MTBF calculated with simple average method
    mtbfDataPoints: number[];  // Data points used in simple MTBF calculation
    calculationMethod: 'operatingHours' | 'tbfDays' | null;
    calculationMethodDisplay: string;
  };
}

// Define maintenance optimization types
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
  maintenanceStrategy: string;
  recommendationReason: string;
  calculationDetails?: {
    mtbf: number;
    reliabilityAtOptimal: number;
    failureProbability: number;
    alternativeMethods?: {
      method1: {
        name: string;
        interval: number;
        description: string;
        formula: string;
        applicability?: string;
      };
      method2: {
        name: string;
        interval: number;
        description: string;
        formula: string;
        applicability?: string;
      };
      method3?: {
        name: string;
        interval: number;
        targetReliability?: number;
        description: string;
        formula: string;
      };
    };
    decisionFactors?: {
      betaValue: number;
      etaValue: number;
      maximumDowntime: number;
      decisionRule: string;
    };
    dataUsage?: {
      tbfDataRole: string;
      interpretationGuide: string;
      dataSources: string;
      dataDefinitions?: {
        TTF: string;
        TBF: string;
      };
      applicationNotes?: string;
    };
  };
}

// Asset interface
export interface Asset {
  id: number;
  assetNumber: string;
  name: string;
  description?: string;
  installationDate?: Date | string | null;
  equipmentClass?: string | null;
  criticality?: string | null;
  weibullBeta: number;
  weibullEta: number;
  timeUnit: string;
}

// Re-export types from schema
export { type BaseWeibullAnalysisResponse as WeibullAnalysisResponse };
export { type BaseFailureHistory as FailureHistory };

// Export other types used in the client
export interface WeibullDataPoint {
  time: number;
  rank: number;
  adjusted: boolean;
}