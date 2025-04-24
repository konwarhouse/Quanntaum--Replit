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
 * Uses TBF data (implicitly through Weibull parameters) to determine optimal PM interval
 * Implements the cost-based approach described in the TBF specification:
 * Cost Rate = (PM Cost × Reliability + Failure Cost × (1-Reliability)) / Interval
 * 
 * @param params - Maintenance optimization parameters
 * @returns Optimization results with detailed cost information
 */
export function optimizeMaintenanceInterval(params: MaintenanceOptimizationParameters) {
  const {
    beta,
    eta,
    preventiveMaintenanceCost,
    correctiveMaintenanceCost,
    timeHorizon,
    maximumAcceptableDowntime,
    targetReliabilityThreshold
  } = params;
  
  // Case 1: If maximum acceptable downtime is 0, preventive maintenance is mandatory regardless of beta
  if (maximumAcceptableDowntime === 0) {
    // Calculate MTBF for a conservative maintenance interval
    const mtbf = calculateMTBF(beta, eta);
    const optimalInterval = mtbf * 0.5; // Use 50% of MTBF as a conservative interval
    
    const pmCost = calculateTotalCost(
      optimalInterval,
      beta,
      eta,
      preventiveMaintenanceCost,
      correctiveMaintenanceCost,
      timeHorizon
    );
    
    // Generate cost curve
    const numPoints = 50;
    const maxInterval = eta * 2;
    const intervalStep = maxInterval / numPoints;
    const costCurve = [];
    
    // Calculate reliability at optimal interval for transparency
    const reliabilityAtOptimal = calculateReliability(optimalInterval, beta, eta);
    const failureProbAtOptimal = 1 - reliabilityAtOptimal;
    
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
    }
    
    // Method 1: Cost-Based Approach (primary method we're using)
    const costBasedInterval = optimalInterval;
    
    // Method 2: Reliability Threshold Approach
    // For zero downtime, use a higher reliability target (95%)
    const reliabilityTarget = 0.95; 
    const reliabilityBasedInterval = eta * Math.pow(-Math.log(reliabilityTarget), 1/beta);
    
    return {
      optimalInterval,
      optimalCost: pmCost,
      costCurve,
      maintenanceStrategy: 'Preventive Maintenance',
      recommendationReason: 'Zero tolerance for downtime requires preventive maintenance before failure occurs',
      calculationDetails: {
        mtbf,
        reliabilityAtOptimal: reliabilityAtOptimal * 100, // Convert to percentage
        failureProbability: failureProbAtOptimal * 100,   // Convert to percentage
        alternativeMethods: {
          method1: {
            name: "Cost-Based Approach with Zero Downtime Constraint",
            interval: costBasedInterval,
            description: "Conservative PM interval (50% of MTBF) to ensure zero downtime",
            formula: "Interval = MTBF × 0.5"
          },
          method2: {
            name: "Reliability Threshold Approach",
            interval: reliabilityBasedInterval,
            targetReliability: reliabilityTarget * 100, // Convert to percentage
            description: "Sets PM interval where reliability is 95% or higher",
            formula: "t = η · (-ln(R))^(1/β) where R = 0.95"
          }
        },
        decisionFactors: {
          betaValue: beta,
          etaValue: eta,
          maximumDowntime: maximumAcceptableDowntime,
          decisionRule: 'Zero downtime tolerance overrides standard beta-based decision'
        },
        dataUsage: {
          tbfDataRole: 'TBF/TTF data is used to estimate Weibull parameters (β, η)',
          interpretationGuide: 'Zero downtime constraint makes beta value less relevant for strategy selection',
          dataSources: 'Derived from failure history records (Time Between Failures or Time To Failure values)',
          dataDefinitions: {
            TTF: 'Time To Failure - Used primarily for non-repairable items that are replaced after failure',
            TBF: 'Time Between Failures - Used for repairable items that can experience multiple failures over their lifetime'
          },
          applicationNotes: 'First failure uses TTF (from installation to first failure), subsequent failures use TBF (between consecutive failures)'
        }
      }
    };
  }
  
  // Case 2: If there is limited acceptable downtime but still critical (≤ 24 hours) for beta ≤ 1
  // This handles real-world cases where some downtime is acceptable but still needs preventive action
  if (maximumAcceptableDowntime > 0 && maximumAcceptableDowntime <= 24 && beta <= 1) {
    // Calculate a suitable maintenance interval based on the MTBF and acceptable downtime
    const mtbf = calculateMTBF(beta, eta);
    // Use a reliability-based interval that ensures failures are rare within the acceptable downtime window
    // More conservative for lower acceptable downtime values
    const reliabilityFactor = Math.max(0.6, 1 - (maximumAcceptableDowntime / 24));
    const optimalInterval = mtbf * reliabilityFactor;
    
    const pmCost = calculateTotalCost(
      optimalInterval,
      beta,
      eta,
      preventiveMaintenanceCost,
      correctiveMaintenanceCost,
      timeHorizon
    );
    
    // Generate cost curve
    const numPoints = 50;
    const maxInterval = eta * 2;
    const intervalStep = maxInterval / numPoints;
    const costCurve = [];
    
    // Calculate reliability at optimal interval for transparency
    const reliabilityAtOptimal = calculateReliability(optimalInterval, beta, eta);
    const failureProbAtOptimal = 1 - reliabilityAtOptimal;
    
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
    }
    
    // Method 1: Cost-Based Approach modified for limited downtime
    const costBasedInterval = optimalInterval;
    
    // Method 2: Reliability Threshold Approach
    // For limited downtime, calculate based on downtime percentage
    const reliabilityTarget = Math.max(0.8, 1 - (maximumAcceptableDowntime / 48)); // Higher reliability for lower allowable downtime
    const reliabilityBasedInterval = eta * Math.pow(-Math.log(reliabilityTarget), 1/beta);
    
    // Method 3: Availability Maximization (simplified for this case)
    const availabilityTarget = 1 - (maximumAcceptableDowntime / (24 * 30)); // Target monthly availability
    const availabilityBasedInterval = mtbf * availabilityTarget;
    
    return {
      optimalInterval,
      optimalCost: pmCost,
      costCurve,
      maintenanceStrategy: 'Preventive Maintenance',
      recommendationReason: 'Despite random failures (β ≤ 1), limited acceptable downtime requires preventive maintenance',
      calculationDetails: {
        mtbf,
        reliabilityAtOptimal: reliabilityAtOptimal * 100, // Convert to percentage
        failureProbability: failureProbAtOptimal * 100,   // Convert to percentage
        reliabilityFactor: reliabilityFactor,
        adjustedForDowntime: true,
        alternativeMethods: {
          method1: {
            name: "Modified Cost-Based Approach",
            interval: costBasedInterval,
            description: `Adjusted for limited downtime (${maximumAcceptableDowntime} hours)`,
            formula: `Interval = MTBF × ${reliabilityFactor.toFixed(2)} (reliability factor)`
          },
          method2: {
            name: "Reliability Threshold Approach",
            interval: reliabilityBasedInterval,
            targetReliability: reliabilityTarget * 100, // Convert to percentage
            description: "Sets PM interval to maintain minimum required reliability",
            formula: "t = η · (-ln(R))^(1/β) where R is target reliability"
          },
          method3: {
            name: "Availability Maximization",
            interval: availabilityBasedInterval,
            description: "Optimizes interval to meet availability requirements",
            formula: "Interval ≈ MTBF × Target Availability"
          }
        },
        decisionFactors: {
          betaValue: beta,
          etaValue: eta,
          maximumDowntime: maximumAcceptableDowntime,
          decisionRule: 'Limited downtime tolerance (≤24 hours) overrides standard beta-based decision'
        },
        dataUsage: {
          tbfDataRole: 'TBF/TTF data is used to estimate Weibull parameters (β, η)',
          interpretationGuide: 'Despite β ≤ 1 suggesting random failures, downtime constraints require preventive action',
          dataSources: 'Derived from failure history records (Time Between Failures or Time To Failure values)',
          dataDefinitions: {
            TTF: 'Time To Failure - Used primarily for non-repairable items that are replaced after failure',
            TBF: 'Time Between Failures - Used for repairable items that can experience multiple failures over their lifetime'
          },
          applicationNotes: 'First failure uses TTF (from installation to first failure), subsequent failures use TBF (between consecutive failures)'
        }
      }
    };
  }
  
  // If beta <= 1 AND maximumAcceptableDowntime is greater than 24 hours, run-to-failure may be optimal based on cost
  if (beta <= 1 && maximumAcceptableDowntime > 24) {
    const runToFailureCost = calculateTotalCost(
      Infinity,
      beta,
      eta,
      preventiveMaintenanceCost,
      correctiveMaintenanceCost,
      timeHorizon
    );
    
    // Calculate MTBF for information purposes
    const mtbf = calculateMTBF(beta, eta);
    
    return {
      optimalInterval: Infinity,
      optimalCost: runToFailureCost,
      costCurve: [{ interval: eta, cost: runToFailureCost }],
      maintenanceStrategy: 'Run-to-Failure',
      recommendationReason: 'For beta <= 1, failures occur early or randomly, making preventive maintenance suboptimal',
      calculationDetails: {
        mtbf,
        decisionFactors: {
          betaValue: beta,
          etaValue: eta,
          maximumDowntime: maximumAcceptableDowntime,
          decisionRule: 'When beta <= 1 and acceptable downtime > 24 hours, run-to-failure is usually more cost-effective'
        },
        costCalculation: {
          preventiveCost: preventiveMaintenanceCost,
          failureCost: correctiveMaintenanceCost,
          tbfDataUsed: 'TBF/TTF data incorporated through Weibull parameters (β, η)',
          costFormula: 'For run-to-failure, total cost = number of failures × failure cost'
        },
        dataUsage: {
          tbfDataRole: 'TBF/TTF data is used to estimate Weibull parameters (β, η)',
          interpretationGuide: 'β ≤ 1 indicates random or early-life failures, making run-to-failure more economical',
          dataSources: 'Derived from failure history records (Time Between Failures or Time To Failure values)',
          dataDefinitions: {
            TTF: 'Time To Failure - Used primarily for non-repairable items that are replaced after failure',
            TBF: 'Time Between Failures - Used for repairable items that can experience multiple failures over their lifetime'
          },
          applicationNotes: 'For early-life failures (β < 1), run-to-failure combined with proper burn-in testing is often optimal'
        }
      }
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
  
  // Calculate reliability at optimal interval for transparency
  const reliabilityAtOptimal = calculateReliability(optimalInterval, beta, eta);
  const failureProbAtOptimal = 1 - reliabilityAtOptimal;
  const mtbf = calculateMTBF(beta, eta);
  
  // Method 1: Cost-Based Approach (primary method we're using)
  const costBasedInterval = optimalInterval;
  
  // Method 2: Reliability Threshold Approach
  // For example, calculate at 90% reliability target if not specified
  const reliabilityTarget = targetReliabilityThreshold || 0.9;
  const reliabilityBasedInterval = eta * Math.pow(-Math.log(reliabilityTarget), 1/beta);
  
  return {
    optimalInterval,
    optimalCost: minCost,
    costCurve,
    maintenanceStrategy: 'Preventive Maintenance',
    recommendationReason: 'For beta > 1, wear-out failures are predictable, making preventive maintenance optimal',
    calculationDetails: {
      mtbf,
      reliabilityAtOptimal: reliabilityAtOptimal * 100, // Convert to percentage
      failureProbability: failureProbAtOptimal * 100,   // Convert to percentage
      alternativeMethods: {
        method1: {
          name: "Cost-Based Approach",
          interval: costBasedInterval,
          description: "Minimizes total cost rate by balancing PM and failure costs",
          formula: "Cost Rate = (PM Cost × Reliability + Failure Cost × (1-Reliability)) / Interval"
        },
        method2: {
          name: "Reliability Threshold Approach",
          interval: reliabilityBasedInterval,
          targetReliability: reliabilityTarget * 100, // Convert to percentage
          description: "Sets PM interval where reliability drops below target",
          formula: "t = η · (-ln(R))^(1/β) where R is target reliability"
        }
      },
      decisionFactors: {
        betaValue: beta,
        etaValue: eta,
        maximumDowntime: maximumAcceptableDowntime,
        decisionRule: 'When beta > 1, component shows wear-out pattern, favoring preventive maintenance'
      },
      dataUsage: {
        tbfDataRole: 'TBF/TTF data is used to estimate Weibull parameters (β, η)',
        interpretationGuide: 'β > 1 indicates wear-out failures; β < 1 indicates early-life failures; β ≈ 1 indicates random failures',
        dataSources: 'Derived from failure history records (Time Between Failures or Time To Failure values)',
        dataDefinitions: {
          TTF: 'Time To Failure - Used primarily for non-repairable items that are replaced after failure',
          TBF: 'Time Between Failures - Used for repairable items that can experience multiple failures over their lifetime'
        },
        applicationNotes: 'First failure uses TTF (from installation to first failure), subsequent failures use TBF (between consecutive failures)'
      }
    }
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