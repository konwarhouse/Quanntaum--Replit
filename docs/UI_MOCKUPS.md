# UI Mockups for Reliability Module

## Main Dashboard

```
+-----------------------------------------------------------------------+
|                                                                       |
| [Logo] AI Chat with Reliability Analysis           [User: admin ▼]    |
|                                                                       |
+-----------------------------------------------------------------------+
|                                                                       |
| [Assets] [Weibull Analysis] [Maintenance] [RCM] [Simulation]          |
|                                                                       |
+-----------------------------------------------------------------------+
|                                                                       |
|  Asset Management                                   [+ Add Asset]     |
|                                                                       |
|  +-------------------+  +-------------------+  +-------------------+  |
|  | Pump #1           |  | Motor #2          |  | Compressor #3     |  |
|  | Critical          |  | Medium            |  | Low               |  |
|  |                   |  |                   |  |                   |  |
|  | β=2.1, η=5000 hrs |  | β=1.5, η=8000 hrs |  | β=3.2, η=3000 hrs |  |
|  |                   |  |                   |  |                   |  |
|  | [Edit]  [Delete]  |  | [Edit]  [Delete]  |  | [Edit]  [Delete]  |  |
|  +-------------------+  +-------------------+  +-------------------+  |
|                                                                       |
+-----------------------------------------------------------------------+
```

## Weibull Analysis Form

```
+-----------------------------------------------------------------------+
|                                                                       |
| Weibull Reliability Analysis                                          |
|                                                                       |
+-----------------------------------------------------------------------+
|                                |                                      |
| Parameters                     | Results                              |
| +--------------------------+   | +------------------------------+     |
| | Asset: [Pump #1      ▼]  |   | | MTBF: 4,432 hours           |     |
| |                          |   | +------------------------------+     |
| | Shape Parameter (β):     |   |                                      |
| | [2.1]                    |   | Reliability Function                 |
| |                          |   | +------------------------------+     |
| | Scale Parameter (η):     |   | |                              |     |
| | [5000]                   |   | |    \                         |     |
| |                          |   | |     \                        |     |
| | Time Units:              |   | |      \                       |     |
| | [Hours     ▼]            |   | |       \__                    |     |
| |                          |   | |          ----____            |     |
| | Time Horizon:            |   | |                 -----_______ |     |
| | [25000]                  |   | +------------------------------+     |
| |                          |   | Time (Hours)                         |
| | [Perform Analysis]       |   |                                      |
| +--------------------------+   | Failure Rate Function                |
|                                | +------------------------------+     |
|                                | |                /             |     |
|                                | |              /              |     |
|                                | |            /                |     |
|                                | |          /                  |     |
|                                | |        /                    |     |
|                                | |      /                      |     |
|                                | |    /                        |     |
|                                | |  /                          |     |
|                                | +------------------------------+     |
|                                | Time (Hours)                         |
|                                |                                      |
+-----------------------------------------------------------------------+
```

## Maintenance Optimization Form

```
+-----------------------------------------------------------------------+
|                                                                       |
| Maintenance Interval Optimization                                     |
|                                                                       |
+-----------------------------------------------------------------------+
|                                |                                      |
| Parameters                     | Results                              |
| +--------------------------+   | +------------------------------+     |
| | Asset: [Pump #1      ▼]  |   | | Recommended Strategy:        |     |
| |                          |   | | [Preventive Maintenance]      |     |
| | Weibull Parameters       |   | |                              |     |
| | β: [2.1]  η: [5000]      |   | | Optimal Interval: 3,535 hours|     |
| |                          |   | | Expected Cost: $28,450       |     |
| | PM Cost ($): [500]       |   | +------------------------------+     |
| | Failure Cost ($): [5000] |   |                                      |
| |                          |   | Cost vs. Interval                    |
| | Target Reliability: [90]%|   | +------------------------------+     |
| | Max Downtime: [48] hours |   | |            |                 |     |
| | Time Horizon: [25000] hrs|   | |            |                 |     |
| |                          |   | |           _/|\_               |     |
| | [Optimize Interval]      |   | |        _/    | \__            |     |
| +--------------------------+   | |     _/       |    \___        |     |
|                                | |  _/          |        \____   |     |
|                                | +------------------------------+     |
|                                | Maintenance Interval (Hours)         |
|                                |                                      |
|                                | Interpretation:                      |
|                                | • Optimal interval minimizes total   |
|                                |   cost                               |
|                                | • With β > 1, performing regular     |
|                                |   maintenance is beneficial          |
|                                |                                      |
+-----------------------------------------------------------------------+
```

## RCM Analysis Form

```
+-----------------------------------------------------------------------+
|                                                                       |
| Reliability-Centered Maintenance Analysis                             |
|                                                                       |
+-----------------------------------------------------------------------+
|                                |                                      |
| Parameters                     | Results                              |
| +--------------------------+   | +------------------------------+     |
| | Asset: [Pump #1      ▼]  |   | | Recommended Strategy:        |     |
| |                          |   | | [Predictive Maintenance]      |     |
| | Asset Criticality:       |   | |                              |     |
| | [High      ▼]            |   | | Analysis Inputs:             |     |
| |                          |   | | Criticality: High            |     |
| | [✓] Failures Predictable |   | | Predictable: Yes             |     |
| |                          |   | | Failure Cost: $8,500         |     |
| | Cost of Failure: [$8500] |   | +------------------------------+     |
| |                          |   |                                      |
| | Failure Modes:           |   | Recommended Tasks:                   |
| | [Bearing failure       ] |   | • Implement vibration monitoring     |
| | [Seal leakage          ] |   | • Develop condition-based            |
| | [+ Add Mode]             |   |   maintenance program                |
| |                          |   | • Establish regular oil analysis     |
| | Failure Consequences:    |   | • Create detailed inspection         |
| | [Production downtime   ] |   |   procedures                         |
| | [Safety hazard         ] |   | • Document all failures for future   |
| | [+ Add Consequence]      |   |   analysis                           |
| |                          |   |                                      |
| | Current Practices:       |   | Strategy Explanation:                |
| | [Time-based replacement] |   | Predictive Maintenance is            |
| |                          |   | recommended when asset is highly     |
| | [Perform RCM Analysis]   |   | critical, failures are predictable   |
| +--------------------------+   | and failure costs are significant.   |
|                                |                                      |
+-----------------------------------------------------------------------+
```

## Simulation Form

```
+-----------------------------------------------------------------------+
|                                                                       |
| Monte Carlo Simulation                                                |
|                                                                       |
+-----------------------------------------------------------------------+
|                                |                                      |
| Parameters                     | Results                              |
| +--------------------------+   | +------------------------------+     |
| | Asset: [Pump #1      ▼]  |   | | Average Total Cost: $27,835  |     |
| |                          |   | | Average Failures: 5.2         |     |
| | Weibull Parameters       |   | +------------------------------+     |
| | β: [2.1]  η: [5000]      |   |                                      |
| |                          |   | Failure Time Distribution            |
| | Number of Runs: [1000]   |   | +------------------------------+     |
| | Time Horizon: [25000]    |   | |                              |     |
| |                          |   | |    ■                         |     |
| | [✓] Preventive Maintenance|   | |    ■  ■                     |     |
| | PM Interval: [3500]      |   | |    ■  ■  ■                   |     |
| |                          |   | |    ■  ■  ■  ■                |     |
| | PM Cost ($): [500]       |   | |    ■  ■  ■  ■  ■             |     |
| | Failure Cost ($): [5000] |   | |    ■  ■  ■  ■  ■  ■  ■  ■    |     |
| |                          |   | +------------------------------+     |
| | [Run Simulation]         |   | Time (Hours)                         |
| +--------------------------+   |                                      |
|                                | Simulation Summary:                  |
|                                | • 1,000 simulated runs               |
|                                | • PM interval: 3,500 hours           |
|                                | • With β > 1, PM reduces overall     |
|                                |   cost compared to run-to-failure    |
|                                |                                      |
+-----------------------------------------------------------------------+
```