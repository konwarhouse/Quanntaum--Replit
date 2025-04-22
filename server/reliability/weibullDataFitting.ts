/**
 * Weibull Data Fitting Module - Using Maximum Likelihood Estimation (MLE)
 * This module fits Weibull parameters to actual failure data
 */
import { FailureHistory } from "../../shared/schema";

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
  
  // Need at least 3 data points for meaningful analysis
  if (!failureHistoryRecords || failureHistoryRecords.length < 3) {
    return null;
  }
  
  // Extract time data based on setting (TBF in days or operating hours)
  const filteredRecords = failureHistoryRecords.filter(record => useOperatingHours 
    ? record.operatingHoursAtFailure != null && record.operatingHoursAtFailure > 0
    : record.tbfDays != null && record.tbfDays > 0);
  
  console.log('Filtered time data records:', filteredRecords.length, 'out of', failureHistoryRecords.length);
  console.log('Filtered records:', JSON.stringify(filteredRecords, null, 2));
  
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