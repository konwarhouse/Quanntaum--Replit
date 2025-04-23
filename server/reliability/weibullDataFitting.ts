/**
 * Weibull Data Fitting Module - Using Maximum Likelihood Estimation (MLE)
 * This module fits Weibull parameters to actual failure data
 */
import { FailureHistory } from "../../shared/schema";

/**
 * Gamma function for calculating Weibull MTBF
 * Implementation of the Lanczos approximation for the gamma function
 * @param z - Input value
 * @returns Gamma function result
 */
export function gamma(z: number): number {
  // Constants for Lanczos approximation
  const p = [
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];
  
  // Reflection formula for z < 0.5
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  }
  
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) {
    x += p[i] / (z + i + 1);
  }
  
  const t = z + p.length - 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

export interface WeibullFitResult {
  beta: number;   // Shape parameter
  eta: number;    // Scale parameter
  r2: number;     // R-squared (goodness of fit)
  dataPoints: WeibullDataPoint[];
}

export interface WeibullDataPoint {
  time: number;
  rank: number;
  adjusted: boolean;
}

/**
 * Calculate median rank for Weibull plotting
 * @param position - Position of the failure (1, 2, 3, ...)
 * @param total - Total number of failures
 * @returns Median rank value (probability)
 */
export function calculateMedianRank(position: number, total: number): number {
  return (position - 0.3) / (total + 0.4);
}

/**
 * Fit Weibull parameters to failure history data using MLE
 * @param failureHistoryRecords - Array of failure history records
 * @param useOperatingHours - Whether to use operating hours instead of calendar days
 * @returns Fitted Weibull parameters and goodness of fit
 */
export function fitWeibullToFailureData(
  failureHistoryRecords: FailureHistory[],
  useOperatingHours: boolean = false
): WeibullFitResult | null {
  
  // Log total number of records for debugging
  console.log(`[DEBUG] Total failure history records: ${failureHistoryRecords.length}`);
  
  // Need at least 3 data points for meaningful analysis
  if (!failureHistoryRecords || failureHistoryRecords.length < 3) {
    console.log(`[DEBUG] Insufficient data points for Weibull analysis: ${failureHistoryRecords.length} < 3`);
    return null;
  }
  
  // Log the raw records for debugging
  console.log('[DEBUG] Raw records:');
  failureHistoryRecords.forEach((record, i) => {
    console.log(`[DEBUG] Record ${i+1}: assetId=${record.assetId}, tbfDays=${record.tbfDays}, operatingHours=${record.operatingHoursAtFailure}`);
  });
  
  // Extract time data based on setting (TBF in days or operating hours)
  const filteredRecords = failureHistoryRecords.filter(record => useOperatingHours 
    ? record.operatingHoursAtFailure != null && record.operatingHoursAtFailure > 0
    : record.tbfDays != null && record.tbfDays > 0);
  
  console.log('[DEBUG] Filtered time data records:', filteredRecords.length, 'out of', failureHistoryRecords.length);
  
  // If we have fewer than 3 records after filtering, we can't continue
  if (filteredRecords.length < 3) {
    console.log('[DEBUG] Insufficient filtered data points for Weibull analysis. Need at least 3 valid records.');
    return null;
  }
  
  const timeData: number[] = filteredRecords
    .map(record => useOperatingHours 
      ? record.operatingHoursAtFailure as number 
      : record.tbfDays as number)
    .sort((a, b) => a - b); // Sort in ascending order
    
  console.log('Time data values:', timeData);
  
  // Create ranking of data points
  const dataPoints: WeibullDataPoint[] = timeData.map((time, index) => ({
    time,
    rank: calculateMedianRank(index + 1, timeData.length),
    adjusted: false
  }));
  
  // Linear regression on ln(time) vs ln(ln(1/(1-rank)))
  const xValues: number[] = dataPoints.map(point => Math.log(point.time));
  const yValues: number[] = dataPoints.map(point => Math.log(-Math.log(1 - point.rank)));
  
  // Calculate regression coefficients
  const n = xValues.length;
  const sumX = xValues.reduce((sum, x) => sum + x, 0);
  const sumY = yValues.reduce((sum, y) => sum + y, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
  
  console.log('Regression inputs:', { n, sumX, sumY, sumXY, sumX2 });
  console.log('X values:', xValues);
  console.log('Y values:', yValues);
  
  // Slope is beta (shape parameter)
  const denominator = (n * sumX2 - sumX * sumX);
  if (denominator === 0) {
    console.log('ERROR: Division by zero in beta calculation');
    return null;
  }
  
  const beta = (n * sumXY - sumX * sumY) / denominator;
  console.log('Beta calculated:', beta);
  
  // Calculate eta (scale parameter) from the intercept
  if (beta === 0) {
    console.log('ERROR: Division by zero in eta calculation (beta is zero)');
    return null;
  }
  
  const intercept = (sumY - beta * sumX) / n;
  const eta = Math.exp(-intercept / beta);
  console.log('Intercept:', intercept, 'Eta calculated:', eta);
  
  // Calculate R-squared value to measure goodness of fit
  const yMean = sumY / n;
  const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const ssResidual = yValues.reduce((sum, y, i) => {
    const yPredicted = beta * xValues[i] + intercept;
    return sum + Math.pow(y - yPredicted, 2);
  }, 0);
  
  if (ssTotal === 0) {
    console.log('ERROR: Division by zero in R² calculation (ssTotal is zero)');
    return null;
  }
  
  const r2 = 1 - (ssResidual / ssTotal);
  console.log('R² calculated:', r2);
  
  return {
    beta,
    eta,
    r2,
    dataPoints
  };
}

/**
 * Calculate the B-Life value (time at which X% of units will fail)
 * @param beta - Shape parameter
 * @param eta - Scale parameter
 * @param percentage - Percentage of failures (e.g., 10 for B10 life)
 * @returns Time at which the specified percentage of units will fail
 */
export function calculateBLife(beta: number, eta: number, percentage: number): number {
  const probability = percentage / 100;
  return eta * Math.pow(-Math.log(1 - probability), 1 / beta);
}

/**
 * Calculate Mean Time Between Failures (MTBF) using the proper Weibull formula
 * MTBF = η · Γ(1 + 1/β)
 * @param beta - Shape parameter
 * @param eta - Scale parameter
 * @returns MTBF value
 */
export function calculateWeibullMTBF(beta: number, eta: number): number {
  if (beta <= 0 || eta <= 0) {
    throw new Error("Beta and eta must be positive values");
  }
  
  // MTBF = η · Γ(1 + 1/β)
  const gammaInput = 1 + 1/beta;
  const gammaResult = gamma(gammaInput);
  
  console.log(`[DEBUG] Calculating Weibull MTBF with beta=${beta}, eta=${eta}, Γ(1+1/β)=${gammaResult}`);
  
  const mtbf = eta * gammaResult;
  return mtbf;
}

/**
 * Determine whether the Weibull model indicates early failures, random failures, or wear-out failures
 * @param beta - Shape parameter
 * @returns Classification of failure pattern
 */
export function classifyFailurePattern(beta: number): 'early-life' | 'random' | 'wear-out' {
  if (beta < 0.95) {
    return 'early-life';
  } else if (beta >= 0.95 && beta <= 1.05) {
    return 'random';
  } else {
    return 'wear-out';
  }
}

/**
 * Analyze whether grouped failure records suggest common failure mechanisms
 * @param failureHistoryRecords - Array of failure history records
 * @returns Analysis of common failure mechanisms
 */
export function analyzeFailureMechanisms(failureHistoryRecords: FailureHistory[]): Record<string, number> {
  // Count occurrences of each failure mechanism
  const mechanismCounts: Record<string, number> = {};
  
  failureHistoryRecords.forEach(record => {
    const mechanism = record.failureMechanism || 'Unknown';
    mechanismCounts[mechanism] = (mechanismCounts[mechanism] || 0) + 1;
  });
  
  return mechanismCounts;
}

/**
 * Calculate Mean Time Between Failures (MTBF) from raw failure history data
 * @param failureHistoryRecords - Array of failure history records
 * @param useOperatingHours - Whether to use operating hours instead of calendar days
 * @returns Object containing the calculated MTBF value and metadata
 */
export function calculateMTBF(
  failureHistoryRecords: FailureHistory[],
  useOperatingHours: boolean = false
): { mtbf: number | null; calculationMethod: 'operatingHours' | 'tbfDays' | null; dataPoints: number[] } {
  // Need at least 1 data point for MTBF
  if (!failureHistoryRecords || failureHistoryRecords.length < 1) {
    console.log('[DEBUG] No records for MTBF calculation');
    return { mtbf: null, calculationMethod: null, dataPoints: [] };
  }
  
  // First try with operating hours if that's what was requested
  if (useOperatingHours) {
    // Filter records to only include those with valid operating hours values
    // Note: We now accept zero values for operating hours if they are explicitly set
    const validOperatingHoursRecords = failureHistoryRecords.filter(record => 
      record.operatingHoursAtFailure !== null && record.operatingHoursAtFailure !== undefined);
    
    console.log(`[DEBUG] Valid operating hours records: ${validOperatingHoursRecords.length} out of ${failureHistoryRecords.length}`);
    validOperatingHoursRecords.forEach((record, i) => {
      console.log(`[DEBUG] Operating Hours Record ${i+1}: assetId=${record.assetId}, operatingHoursAtFailure=${record.operatingHoursAtFailure}`);
    });
    
    // If we have enough operating hours data, use it
    if (validOperatingHoursRecords.length >= 2) {
      const timeValues = validOperatingHoursRecords.map(record => record.operatingHoursAtFailure as number);
      const sumTime = timeValues.reduce((sum, time) => sum + time, 0);
      const mtbf = sumTime / timeValues.length;
      console.log(`[DEBUG] MTBF calculation using operating hours: sum=${sumTime}, count=${timeValues.length}, mtbf=${mtbf}`);
      return { 
        mtbf, 
        calculationMethod: 'operatingHours', 
        dataPoints: timeValues 
      };
    } else {
      console.log(`[DEBUG] Not enough valid operating hours records (${validOperatingHoursRecords.length}). Falling back to calendar days.`);
    }
  }
  
  // If operating hours wasn't requested or there weren't enough valid records, fall back to tbfDays
  const validTbfRecords = failureHistoryRecords.filter(record => 
    record.tbfDays !== null && record.tbfDays !== undefined);
  
  console.log(`[DEBUG] Valid TBF days records: ${validTbfRecords.length} out of ${failureHistoryRecords.length}`);
  validTbfRecords.forEach((record, i) => {
    console.log(`[DEBUG] TBF Days Record ${i+1}: assetId=${record.assetId}, tbfDays=${record.tbfDays}`);
  });
  
  if (validTbfRecords.length === 0) {
    console.log('[DEBUG] No valid records for MTBF calculation after filtering');
    return { mtbf: null, calculationMethod: null, dataPoints: [] };
  }
  
  // Extract tbfDays values
  const timeValues = validTbfRecords.map(record => record.tbfDays as number);
  
  // Calculate sum of all time values
  const sumTime = timeValues.reduce((sum, time) => sum + time, 0);
  
  // MTBF = Sum of all time values / number of failures
  const mtbf = sumTime / timeValues.length;
  console.log(`[DEBUG] MTBF calculation using tbfDays: sum=${sumTime}, count=${timeValues.length}, mtbf=${mtbf}`);
  
  return { 
    mtbf, 
    calculationMethod: 'tbfDays', 
    dataPoints: timeValues 
  };
}