import {
  WeibullParameters,
  WeibullAnalysisResponse,
  MaintenanceOptimizationParameters,
  RCMParameters,
  SimulationParameters,
} from "@shared/schema";

/**
 * Calculate reliability function R(t) = e^-(t/η)^β
 * @param t - Time
 * @param beta - Shape parameter
 * @param eta - Scale parameter
 * @returns Reliability value (between 0 and 1)
 */
export function calculateReliability(t: number, beta: number, eta: number): number {
  if (t < 0 || beta <= 0 || eta <= 0) {
    throw new Error("Invalid parameters: t must be non-negative, beta and eta must be positive");
  }
  
  return Math.exp(-Math.pow(t / eta, beta));
}

/**
 * Calculate failure rate function h(t) = (β/η)*(t/η)^(β-1)
 * @param t - Time
 * @param beta - Shape parameter
 * @param eta - Scale parameter
 * @returns Failure rate
 */
export function calculateFailureRate(t: number, beta: number, eta: number): number {
  if (t < 0 || beta <= 0 || eta <= 0) {
    throw new Error("Invalid parameters: t must be non-negative, beta and eta must be positive");
  }
  
  return (beta / eta) * Math.pow(t / eta, beta - 1);
}

/**
 * Calculate cumulative failure probability F(t) = 1 - R(t)
 * @param t - Time
 * @param beta - Shape parameter
 * @param eta - Scale parameter
 * @returns Failure probability (between 0 and 1)
 */
export function calculateFailureProbability(t: number, beta: number, eta: number): number {
  return 1 - calculateReliability(t, beta, eta);
}

/**
 * Calculate Mean Time Between Failures (MTBF)
 * For Weibull distribution, MTBF = η * Γ(1 + 1/β)
 * Where Γ is the gamma function
 * @param beta - Shape parameter
 * @param eta - Scale parameter
 * @returns MTBF value
 */
export function calculateMTBF(beta: number, eta: number): number {
  if (beta <= 0 || eta <= 0) {
    throw new Error("Invalid parameters: beta and eta must be positive");
  }
  
  // Approximate gamma function for (1 + 1/beta)
  // For simple cases, we'll use the fact that:
  // If beta = 1, MTBF = eta (exponential distribution)
  // If beta = 2, MTBF = eta * sqrt(PI)/2
  // If beta = 3, MTBF = eta * Γ(4/3)
  // For other values, we'll use a simple approximation
  
  if (beta === 1) {
    return eta;
  } else if (beta === 2) {
    return eta * Math.sqrt(Math.PI) / 2;
  } else if (beta === 3) {
    // Gamma(4/3) ≈ 0.8930
    return eta * 0.8930;
  } else {
    // Simple approximation of gamma function
    // This is valid for common beta values in reliability (0.5 to 5)
    const x = 1 + 1 / beta;
    return eta * Math.exp(approximateLogGamma(x));
  }
}

/**
 * Stirling's approximation of the logarithm of the gamma function
 * @param x - Input value
 * @returns Approximate value of log(Γ(x))
 */
function approximateLogGamma(x: number): number {
  if (x <= 0) {
    throw new Error("Input must be positive");
  }
  
  // Stirling's approximation: log(Γ(x)) ≈ (x - 0.5) * log(x) - x + 0.5 * log(2π)
  return (x - 0.5) * Math.log(x) - x + 0.5 * Math.log(2 * Math.PI);
}

/**
 * Calculate optimal preventive maintenance interval
 * t = η*(1-(1/β)^(1/β))
 * @param beta - Shape parameter
 * @param eta - Scale parameter
 * @returns Optimal PM interval
 */
export function calculateOptimalPMInterval(beta: number, eta: number): number {
  if (beta <= 1 || eta <= 0) {
    // For beta <= 1, failure rate is decreasing, so run-to-failure is optimal
    return Infinity;
  }
  
  return eta * (1 - Math.pow(1 / beta, 1 / beta));
}

/**
 * Calculate total cost based on PM interval
 * C_total = C_PM * f_PM + C_failure * (1 - R(t_PM))
 * @param interval - PM interval
 * @param beta - Shape parameter
 * @param eta - Scale parameter
 * @param pmCost - Preventive maintenance cost
 * @param failureCost - Corrective maintenance (failure) cost
 * @param timeHorizon - Total time period for calculation
 * @returns Total maintenance cost
 */
export function calculateTotalCost(
  interval: number,
  beta: number,
  eta: number,
  pmCost: number,
  failureCost: number,
  timeHorizon: number
): number {
  if (interval <= 0) {
    throw new Error("Interval must be positive");
  }
  
  // Number of PM activities in the time horizon
  const pmCount = timeHorizon / interval;
  
  // Probability of failure between PM intervals
  const failureProbability = calculateFailureProbability(interval, beta, eta);
  
  // Expected number of failures in the time horizon
  const expectedFailures = pmCount * failureProbability;
  
  // Total cost = PM cost + Failure cost
  return pmCost * pmCount + failureCost * expectedFailures;
}

/**
 * Generate reliability analysis results for a range of time values
 * @param params - Weibull parameters
 * @returns Analysis results
 */
export function generateWeibullAnalysis(params: WeibullParameters): WeibullAnalysisResponse {
  const { beta, eta, timeHorizon } = params;
  
  // Generate points for plotting curves
  const numPoints = 100;
  const timeStep = timeHorizon / numPoints;
  
  const reliabilityCurve = [];
  const failureRateCurve = [];
  const cumulativeFailureProbability = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const time = i * timeStep;
    const reliability = calculateReliability(time, beta, eta);
    const failureRate = calculateFailureRate(time, beta, eta);
    const probability = calculateFailureProbability(time, beta, eta);
    
    reliabilityCurve.push({ time, reliability });
    failureRateCurve.push({ time, failureRate });
    cumulativeFailureProbability.push({ time, probability });
  }
  
  const mtbf = calculateMTBF(beta, eta);
  
  return {
    reliabilityCurve,
    failureRateCurve,
    mtbf,
    cumulativeFailureProbability,
  };
}

/**
 * Determine the optimal maintenance strategy based on RCM principles
 * @param params - RCM parameters
 * @returns Recommended maintenance strategy
 */
export function determineMaintenanceStrategy(
  assetCriticality: string,
  isPredictable: boolean,
  costOfFailure: number,
  threshold: number = 1000
): string {
  if (assetCriticality === 'High') {
    if (isPredictable) {
      return 'Predictive Maintenance';
    } else {
      return 'Redesign';
    }
  } else if (costOfFailure > threshold) {
    return 'Preventive Maintenance';
  } else {
    return 'Run-to-Failure';
  }
}

/**
 * Calculate the inverse CDF of the Weibull distribution
 * t = η*(-ln(1-U))^(1/β) where U is uniform random [0,1]
 * @param p - Probability (0 to 1)
 * @param beta - Shape parameter
 * @param eta - Scale parameter
 * @returns Time to failure
 */
export function weibullInverseCDF(p: number, beta: number, eta: number): number {
  if (p < 0 || p > 1) {
    throw new Error("Probability must be between 0 and 1");
  }
  
  return eta * Math.pow(-Math.log(1 - p), 1 / beta);
}

/**
 * Run a Monte Carlo simulation to estimate failure statistics
 * @param params - Simulation parameters
 * @param beta - Shape parameter
 * @param eta - Scale parameter
 * @param pmInterval - Preventive maintenance interval (if any)
 * @param pmCost - Preventive maintenance cost
 * @param failureCost - Corrective maintenance (failure) cost
 * @returns Simulation results
 */
export function runSimulation(
  params: SimulationParameters,
  beta: number,
  eta: number,
  pmInterval: number | null = null,
  pmCost: number = 0,
  failureCost: number = 0
): {
  totalCost: number;
  averageFailures: number;
  failureTimes: number[];
} {
  const { numberOfRuns, timeHorizon } = params;
  
  let totalFailures = 0;
  let totalCost = 0;
  const allFailureTimes: number[] = [];
  
  for (let run = 0; run < numberOfRuns; run++) {
    let time = 0;
    let runFailures = 0;
    let runCost = 0;
    
    // If using PM, calculate scheduled PM events
    if (pmInterval && pmInterval > 0 && pmInterval < Infinity) {
      const numPMs = Math.floor(timeHorizon / pmInterval);
      runCost += numPMs * pmCost;
      
      // For each PM interval, check if failure occurs before PM
      for (let i = 0; i < numPMs; i++) {
        const intervalStart = i * pmInterval;
        const intervalEnd = (i + 1) * pmInterval;
        
        // Generate a random failure time within this interval
        const p = Math.random();
        const failureTime = intervalStart + weibullInverseCDF(p, beta, eta);
        
        if (failureTime < intervalEnd) {
          // Failure occurs before the next PM
          runFailures++;
          runCost += failureCost;
          allFailureTimes.push(failureTime);
        }
      }
      
      // Check for failures in remaining time
      const remainingTime = timeHorizon - (numPMs * pmInterval);
      if (remainingTime > 0) {
        const p = Math.random();
        const failureTime = numPMs * pmInterval + weibullInverseCDF(p, beta, eta);
        
        if (failureTime < timeHorizon) {
          runFailures++;
          runCost += failureCost;
          allFailureTimes.push(failureTime);
        }
      }
    } else {
      // No PM, just simulate failures until timeHorizon
      let currentTime = 0;
      
      while (currentTime < timeHorizon) {
        const p = Math.random();
        const timeToFailure = weibullInverseCDF(p, beta, eta);
        currentTime += timeToFailure;
        
        if (currentTime < timeHorizon) {
          runFailures++;
          runCost += failureCost;
          allFailureTimes.push(currentTime);
        }
      }
    }
    
    totalFailures += runFailures;
    totalCost += runCost;
  }
  
  return {
    totalCost: totalCost / numberOfRuns,
    averageFailures: totalFailures / numberOfRuns,
    failureTimes: allFailureTimes,
  };
}