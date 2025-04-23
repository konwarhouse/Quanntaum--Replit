import {
  WeibullParameters,
  MaintenanceOptimizationParameters,
  RCMParameters,
  SimulationParameters
} from "../types";

import { gamma } from "./weibullDataFitting";

/**
 * Calculate reliability function R(t) = e^-(t/η)^β
 * @param t - Time
 * @param beta - Shape parameter
 * @param eta - Scale parameter
 * @returns Reliability value (between 0 and 1)
 */
export function calculateReliability(t: number, beta: number, eta: number): number {
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
  const gammaInput = 1 + 1/beta;
  const gammaResult = gamma(gammaInput);
  console.log(`[DEBUG] Accurate Weibull MTBF calculation: beta=${beta}, eta=${eta}, Γ(1+1/β)=${gammaResult}`);
  return eta * gammaResult;
}

/**
 * Stirling's approximation of the logarithm of the gamma function
 * @param x - Input value
 * @returns Approximate value of log(Γ(x))
 */
function approximateLogGamma(x: number): number {
  // Lanczos approximation
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - approximateLogGamma(1 - x);
  }

  // Coefficients for the Lanczos approximation
  const c = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.1208650973866179e-2,
    -0.5395239384953e-5
  ];

  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  
  let sum = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    sum += c[j] / ++y;
  }
  
  return -tmp + Math.log(2.5066282746310005 * sum / x);
}

/**
 * Calculate optimal preventive maintenance interval
 * t = η*(1-(1/β)^(1/β))
 * @param beta - Shape parameter
 * @param eta - Scale parameter
 * @returns Optimal PM interval
 */
export function calculateOptimalPMInterval(beta: number, eta: number): number {
  if (beta <= 1) {
    // For β ≤ 1, run-to-failure is optimal
    return Infinity;
  }

  return eta * Math.pow(1 - Math.pow(1 / beta, 1 / beta), 1 / beta);
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
    return Infinity;
  }

  if (interval === Infinity) {
    // Run-to-failure cost calculation
    const expectedFailures = timeHorizon / calculateMTBF(beta, eta);
    return failureCost * expectedFailures;
  }

  // Number of preventive maintenance actions within time horizon
  const numPM = Math.floor(timeHorizon / interval);
  
  // For each PM interval, calculate the probability of failure
  const failureProbability = calculateFailureProbability(interval, beta, eta);
  
  // Estimate the number of failures
  const expectedFailures = numPM * failureProbability;
  
  // Calculate total cost
  const totalPMCost = numPM * pmCost;
  const totalFailureCost = expectedFailures * failureCost;
  
  return totalPMCost + totalFailureCost;
}

/**
 * Generate reliability analysis results for a range of time values
 * @param params - Weibull parameters
 * @returns Analysis results
 */
export function generateWeibullAnalysis(params: WeibullParameters) {
  const { beta, eta, timeHorizon } = params;
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
    cumulativeFailureProbability
  };
}

/**
 * Find optimal maintenance interval by evaluating a range of intervals
 * @param params - Maintenance optimization parameters
 * @returns Optimization results
 */
export function optimizeMaintenanceInterval(params: MaintenanceOptimizationParameters) {
  const {
    beta,
    eta,
    preventiveMaintenanceCost,
    correctiveMaintenanceCost,
    timeHorizon
  } = params;
  
  // If beta <= 1, run-to-failure is optimal
  if (beta <= 1) {
    const runToFailureCost = calculateTotalCost(
      Infinity,
      beta,
      eta,
      preventiveMaintenanceCost,
      correctiveMaintenanceCost,
      timeHorizon
    );
    
    return {
      optimalInterval: Infinity,
      optimalCost: runToFailureCost,
      costCurve: [{ interval: eta, cost: runToFailureCost }]
    };
  }
  
  // Generate range of intervals to evaluate
  const numPoints = 50;
  const maxInterval = eta * 2; // Evaluate up to 2x the characteristic life
  const intervalStep = maxInterval / numPoints;
  
  const costCurve = [];
  let minCost = Infinity;
  let optimalInterval = 0;
  
  for (let i = 1; i <= numPoints; i++) {
    const interval = i * intervalStep;
    const cost = calculateTotalCost(
      interval,
      beta,
      eta,
      preventiveMaintenanceCost,
      correctiveMaintenanceCost,
      timeHorizon
    );
    
    costCurve.push({ interval, cost });
    
    if (cost < minCost) {
      minCost = cost;
      optimalInterval = interval;
    }
  }
  
  // Also check analytical solution
  const analyticalOptimal = calculateOptimalPMInterval(beta, eta);
  const analyticalCost = calculateTotalCost(
    analyticalOptimal,
    beta,
    eta,
    preventiveMaintenanceCost,
    correctiveMaintenanceCost,
    timeHorizon
  );
  
  if (analyticalCost < minCost) {
    minCost = analyticalCost;
    optimalInterval = analyticalOptimal;
  }
  
  return {
    optimalInterval,
    optimalCost: minCost,
    costCurve
  };
}

/**
 * Determine the optimal maintenance strategy based on RCM principles
 * @param params - RCM parameters
 * @returns Recommended maintenance strategy
 */
export function determineMaintenanceStrategy(params: RCMParameters) {
  const {
    assetCriticality,
    isPredictable,
    costOfFailure,
    failureModeDescriptions,
    failureConsequences,
    currentMaintenancePractices
  } = params;
  
  // Decision logic based on criticality and failure predictability
  let maintenanceStrategy = "";
  const taskRecommendations = [];
  
  // Main strategy selection logic
  if (isPredictable) {
    if (assetCriticality === "High") {
      maintenanceStrategy = "Predictive Maintenance";
      taskRecommendations.push(
        "Implement condition monitoring to detect early signs of failure",
        "Develop threshold limits for key parameters indicating degradation",
        "Create response procedures for different severity levels of degradation",
        "Train staff on proper use of predictive technologies"
      );
    } else if (costOfFailure > 5000) {
      maintenanceStrategy = "Preventive Maintenance";
      taskRecommendations.push(
        "Establish time-based maintenance intervals",
        "Develop detailed maintenance procedures for each task",
        "Create checklist for preventive maintenance activities"
      );
    } else {
      maintenanceStrategy = "Condition-Based Maintenance";
      taskRecommendations.push(
        "Implement basic condition monitoring",
        "Establish threshold alerts for maintenance actions",
        "Develop response procedures for alerts"
      );
    }
  } else {
    if (assetCriticality === "High") {
      maintenanceStrategy = "Redesign";
      taskRecommendations.push(
        "Analyze failure modes to identify opportunities for design improvements",
        "Consider redundant systems to improve reliability",
        "Evaluate alternative technologies or materials",
        "Conduct engineering analysis to address root causes of failures"
      );
    } else if (costOfFailure > 3000) {
      maintenanceStrategy = "Preventive Maintenance";
      taskRecommendations.push(
        "Establish conservative time-based maintenance intervals",
        "Document detailed maintenance procedures",
        "Track effectiveness and adjust intervals based on results"
      );
    } else {
      maintenanceStrategy = "Run-to-Failure";
      taskRecommendations.push(
        "Ensure spare parts are available for quick replacement",
        "Document repair procedures to minimize downtime",
        "Train staff on quick response and repair techniques"
      );
    }
  }
  
  // Additional recommendations based on current practices
  if (currentMaintenancePractices.toLowerCase().includes("reactive") || 
      currentMaintenancePractices.toLowerCase().includes("run to fail")) {
    taskRecommendations.push(
      "Transition from reactive to planned maintenance approach",
      "Document all failures to build historical data for analysis"
    );
  }
  
  // Recommendations based on failure modes
  if (failureModeDescriptions.some((fm: string) => fm.toLowerCase().includes("wear"))) {
    taskRecommendations.push(
      "Implement lubrication program to reduce wear-related failures",
      "Consider surface treatments or hardening to improve wear resistance"
    );
  }
  
  if (failureConsequences.some((fc: string) => fc.toLowerCase().includes("safety"))) {
    taskRecommendations.push(
      "Develop emergency response procedures for safety-critical failures",
      "Implement additional safety controls and monitoring"
    );
  }
  
  return {
    maintenanceStrategy,
    taskRecommendations,
    analysisInputs: {
      assetCriticality,
      isPredictable,
      costOfFailure
    }
  };
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
  return eta * Math.pow(-Math.log(1 - p), 1 / beta);
}

/**
 * Run a Monte Carlo simulation to estimate failure statistics
 * @param params - Simulation parameters
 * @returns Simulation results
 */
export function runSimulation(params: SimulationParameters) {
  const {
    beta,
    eta,
    numberOfRuns,
    timeHorizon,
    pmInterval,
    pmCost,
    failureCost
  } = params;
  
  const allFailureTimes: number[] = [];
  let totalCost = 0;
  let totalFailures = 0;
  
  // Run the simulation multiple times
  for (let run = 0; run < numberOfRuns; run++) {
    let time = 0;
    let runCost = 0;
    let runFailures = 0;
    const runFailureTimes: number[] = [];
    
    // If using preventive maintenance
    if (pmInterval !== undefined) {
      // Simulate until reaching the time horizon
      while (time < timeHorizon) {
        // Generate random failure time
        const u = Math.random();
        const ttf = weibullInverseCDF(u, beta, eta);
        
        if (time + ttf < time + pmInterval && time + ttf < timeHorizon) {
          // Failure occurs before next PM and before time horizon
          time += ttf;
          runCost += failureCost;
          runFailures++;
          runFailureTimes.push(time);
          
          // Reset component age (as good as new)
          time = Math.floor(time / pmInterval) * pmInterval + pmInterval;
          runCost += pmCost;
        } else if (time + pmInterval < timeHorizon) {
          // PM occurs before failure and before time horizon
          time += pmInterval;
          runCost += pmCost;
        } else {
          // Reached time horizon
          break;
        }
      }
    } else {
      // Run-to-failure strategy
      while (time < timeHorizon) {
        // Generate random failure time
        const u = Math.random();
        const ttf = weibullInverseCDF(u, beta, eta);
        
        if (time + ttf < timeHorizon) {
          // Failure occurs before time horizon
          time += ttf;
          runCost += failureCost;
          runFailures++;
          runFailureTimes.push(time);
        } else {
          // Reached time horizon
          break;
        }
      }
    }
    
    totalCost += runCost;
    totalFailures += runFailures;
    allFailureTimes.push(...runFailureTimes);
  }
  
  // Calculate average cost and failures
  const avgCost = totalCost / numberOfRuns;
  const avgFailures = totalFailures / numberOfRuns;
  
  // Create histogram of failure times
  const numBins = 20;
  const binWidth = timeHorizon / numBins;
  const histogram = Array(numBins).fill(0).map((_, i) => ({
    binStart: i * binWidth,
    binEnd: (i + 1) * binWidth,
    count: 0
  }));
  
  allFailureTimes.forEach(time => {
    const binIndex = Math.min(Math.floor(time / binWidth), numBins - 1);
    histogram[binIndex].count++;
  });
  
  return {
    totalCost: avgCost,
    averageFailures: avgFailures,
    histogram
  };
}