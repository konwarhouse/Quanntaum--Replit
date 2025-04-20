import {
  calculateReliability,
  calculateFailureRate,
  calculateFailureProbability,
  calculateMTBF,
  calculateOptimalPMInterval,
  calculateTotalCost,
  determineMaintenanceStrategy,
  weibullInverseCDF,
  runSimulation
} from '../server/reliability/calculations';

describe('Weibull Reliability Calculations', () => {
  // Test reliability function R(t)
  test('calculateReliability returns expected values', () => {
    // Known values for β=2 (Rayleigh distribution)
    expect(calculateReliability(0, 2, 1000)).toBeCloseTo(1.0, 6);
    expect(calculateReliability(1000, 2, 1000)).toBeCloseTo(0.3679, 4); // e^(-1)
    expect(calculateReliability(2000, 2, 1000)).toBeCloseTo(0.0183, 4); // e^(-4)
    
    // Known values for β=1 (exponential distribution)
    expect(calculateReliability(0, 1, 1000)).toBeCloseTo(1.0, 6);
    expect(calculateReliability(1000, 1, 1000)).toBeCloseTo(0.3679, 4); // e^(-1)
    expect(calculateReliability(2000, 1, 1000)).toBeCloseTo(0.1353, 4); // e^(-2)
    
    // Edge cases
    expect(calculateReliability(0, 0.5, 1000)).toBeCloseTo(1.0, 6);
    expect(calculateReliability(1000000, 3, 1000)).toBeCloseTo(0, 6); // approaching zero for large t
  });

  // Test failure rate function λ(t)
  test('calculateFailureRate returns expected values', () => {
    // For β=1 (constant failure rate)
    expect(calculateFailureRate(500, 1, 1000)).toBeCloseTo(0.001, 6); // 1/η for all t
    expect(calculateFailureRate(1500, 1, 1000)).toBeCloseTo(0.001, 6);
    
    // For β=2 (increasing failure rate)
    expect(calculateFailureRate(500, 2, 1000)).toBeCloseTo(0.001, 6); // (t/η) * (β/η)
    expect(calculateFailureRate(1000, 2, 1000)).toBeCloseTo(0.002, 6);
    expect(calculateFailureRate(2000, 2, 1000)).toBeCloseTo(0.004, 6);
    
    // For β=0.5 (decreasing failure rate)
    expect(calculateFailureRate(250, 0.5, 1000)).toBeCloseTo(0.001, 6);
    expect(calculateFailureRate(1000, 0.5, 1000)).toBeCloseTo(0.0005, 6);
    expect(calculateFailureRate(4000, 0.5, 1000)).toBeCloseTo(0.00025, 6);
  });

  // Test cumulative failure probability F(t)
  test('calculateFailureProbability returns expected values', () => {
    // F(t) = 1 - R(t)
    expect(calculateFailureProbability(0, 2, 1000)).toBeCloseTo(0, 6);
    expect(calculateFailureProbability(1000, 2, 1000)).toBeCloseTo(0.6321, 4); // 1 - e^(-1)
    expect(calculateFailureProbability(2000, 2, 1000)).toBeCloseTo(0.9817, 4); // 1 - e^(-4)
  });

  // Test MTBF calculation
  test('calculateMTBF returns expected values', () => {
    // MTBF = η * Γ(1 + 1/β)
    // For β=1, MTBF = η
    expect(calculateMTBF(1, 1000)).toBeCloseTo(1000, 1);
    // For β=2, MTBF = η * sqrt(π)/2
    expect(calculateMTBF(2, 1000)).toBeCloseTo(886.2, 1);
    // For β=0.5, MTBF = η * Γ(3) = 2η
    expect(calculateMTBF(0.5, 1000)).toBeCloseTo(2000, 1);
  });

  // Test optimal PM interval calculation
  test('calculateOptimalPMInterval returns expected values', () => {
    // For β≤1, should return Infinity (run-to-failure optimal)
    expect(calculateOptimalPMInterval(0.8, 1000)).toBe(Infinity);
    expect(calculateOptimalPMInterval(1, 1000)).toBe(Infinity);
    
    // For β>1, optimal interval is η * (1-(1/β)^(1/β))
    // For β=2, optimal interval ≈ 0.7071 * η
    expect(calculateOptimalPMInterval(2, 1000)).toBeCloseTo(707.1, 1);
    // For β=3, optimal interval ≈ 0.7937 * η
    expect(calculateOptimalPMInterval(3, 1000)).toBeCloseTo(793.7, 1);
  });

  // Test total cost calculation
  test('calculateTotalCost returns expected values', () => {
    // Define test parameters
    const beta = 2;
    const eta = 1000;
    const pmCost = 100;
    const failureCost = 1000;
    const timeHorizon = 10000;
    
    // Interval = η (characteristic life), should have total cost
    const cost1 = calculateTotalCost(1000, beta, eta, pmCost, failureCost, timeHorizon);
    
    // Interval = optimal interval, should have lower cost
    const optimalInterval = calculateOptimalPMInterval(beta, eta);
    const cost2 = calculateTotalCost(optimalInterval, beta, eta, pmCost, failureCost, timeHorizon);
    
    // Optimal interval should have lower cost
    expect(cost2).toBeLessThan(cost1);
    
    // Very short intervals should have high costs from frequent PMs
    const shortIntervalCost = calculateTotalCost(10, beta, eta, pmCost, failureCost, timeHorizon);
    expect(shortIntervalCost).toBeGreaterThan(cost2);
    
    // Very long intervals should approach run-to-failure cost
    const longIntervalCost = calculateTotalCost(10000, beta, eta, pmCost, failureCost, timeHorizon);
    expect(longIntervalCost).toBeGreaterThan(cost2);
    
    // For β≤1, cost should increase as interval decreases
    const betaLessThan1 = 0.8;
    const cost3 = calculateTotalCost(500, betaLessThan1, eta, pmCost, failureCost, timeHorizon);
    const cost4 = calculateTotalCost(1000, betaLessThan1, eta, pmCost, failureCost, timeHorizon);
    expect(cost3).toBeGreaterThan(cost4);
  });
});

describe('RCM Analysis', () => {
  test('determineMaintenanceStrategy returns expected strategy', () => {
    // High criticality, predictable -> Predictive Maintenance
    const result1 = determineMaintenanceStrategy({
      assetCriticality: 'High',
      isPredictable: true,
      costOfFailure: 5000,
      failureModeDescriptions: ['Bearing wear'],
      failureConsequences: ['Production loss'],
      currentMaintenancePractices: 'Visual inspection'
    });
    expect(result1.maintenanceStrategy).toBe('Predictive Maintenance');
    
    // Medium criticality, predictable -> Preventive Maintenance
    const result2 = determineMaintenanceStrategy({
      assetCriticality: 'Medium',
      isPredictable: true,
      costOfFailure: 2000,
      failureModeDescriptions: ['Belt wear'],
      failureConsequences: ['Minor production impact'],
      currentMaintenancePractices: 'Time-based replacement'
    });
    expect(result2.maintenanceStrategy).toBe('Preventive Maintenance');
    
    // Low criticality, not predictable -> Run-to-Failure
    const result3 = determineMaintenanceStrategy({
      assetCriticality: 'Low',
      isPredictable: false,
      costOfFailure: 500,
      failureModeDescriptions: ['Light bulb failure'],
      failureConsequences: ['Local lighting loss'],
      currentMaintenancePractices: 'Replace on failure'
    });
    expect(result3.maintenanceStrategy).toBe('Run-to-Failure');
    
    // High criticality, very high failure cost -> suggests redesign
    const result4 = determineMaintenanceStrategy({
      assetCriticality: 'High',
      isPredictable: false,
      costOfFailure: 100000,
      failureModeDescriptions: ['Catastrophic failure'],
      failureConsequences: ['Safety hazard', 'Environmental damage'],
      currentMaintenancePractices: 'Periodic inspection'
    });
    expect(result4.maintenanceStrategy).toBe('Redesign');
  });
});

describe('Monte Carlo Simulation', () => {
  test('weibullInverseCDF returns expected values', () => {
    // For known probabilities
    expect(weibullInverseCDF(0, 2, 1000)).toBeCloseTo(0, 1);
    expect(weibullInverseCDF(0.632, 1, 1000)).toBeCloseTo(1000, 1); // η for p=1-e^(-1)
    expect(weibullInverseCDF(0.865, 2, 1000)).toBeCloseTo(1500, 1); // For β=2, t for F(t)=0.865
  });

  test('runSimulation produces expected results', () => {
    const simParams = {
      beta: 2,
      eta: 1000,
      numberOfRuns: 100,
      timeHorizon: 5000,
      pmCost: 100,
      failureCost: 1000
    };
    
    // Run-to-failure simulation
    const rtfResults = runSimulation(simParams);
    expect(rtfResults.histogram.length).toBe(20);
    expect(rtfResults.averageFailures).toBeGreaterThan(0);
    expect(rtfResults.totalCost).toBeGreaterThan(0);
    
    // Preventive maintenance simulation
    const pmResults = runSimulation({
      ...simParams,
      pmInterval: 800
    });
    
    expect(pmResults.histogram.length).toBe(20);
    expect(pmResults.averageFailures).toBeGreaterThan(0);
    expect(pmResults.totalCost).toBeGreaterThan(0);
    
    // With optimal interval for β=2, PM simulation should be more cost-effective
    const optimalInterval = calculateOptimalPMInterval(2, 1000);
    const optimalResults = runSimulation({
      ...simParams,
      pmInterval: optimalInterval
    });
    
    // Optimal PM should have lower cost than run-to-failure for β>1
    expect(optimalResults.totalCost).toBeLessThan(rtfResults.totalCost);
  });
});