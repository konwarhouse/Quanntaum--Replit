import { WeibullAnalysisResponse as BaseWeibullAnalysisResponse, FailureHistory as BaseFailureHistory } from "@shared/schema";

// Extended Weibull Analysis Response with data-driven analysis fields
export interface ExtendedWeibullAnalysisResponse extends BaseWeibullAnalysisResponse {
  fallbackCalculation?: boolean;  // Flag to indicate fallback MTBF calculation was used
  calculationMethod?: 'operatingHours' | 'tbfDays' | null;  // Method used for calculation
  calculationMethodDisplay?: string;  // User-friendly display of calculation method
  dataPoints?: number[];  // Data points (values) used in the MTBF calculation
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
  weibullDataPoints?: {
    time: number;
    rank: number;
    adjusted: boolean;
  }[];  // Data points used in Weibull fitting 
  assetDetails?: {
    assetType: 'specific' | 'class' | 'failureMode' | 'all';
    id: number | null;
    label: string;
  };  // Information about what asset/component is being analyzed
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