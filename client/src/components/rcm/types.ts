// RCM Module Types

export interface System {
  id: number;
  name: string;
  purpose?: string;
  boundaries?: string;
  operatingContext?: string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Component {
  id: number;
  name: string;
  description?: string;
  function?: string;
  criticality?: string;
  systemId: number;
  parentId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  // Additional properties from API
  equipmentClass?: string | null;
}

export interface FailureMode {
  id: number;
  name: string;
  description: string;
  equipmentClass?: string;
  assetId?: number;
  componentId?: number;
  functionalFailureId?: number;
  cause?: string;
  localEffect?: string;
  systemEffect?: string;
  endEffect?: string;
  currentControl?: string;
  consequences?: string;
  detectMethod?: string;
  costOfFailure?: number;
  isPredictable?: boolean;
  recommendedActions?: string;
  failureRate?: number;
  mttr?: number;
}

export interface FailureCriticality {
  id: number;
  failureModeId: number;
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number;
  criticalityIndex: string;
  consequenceType: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FmecaFormValues {
  failureModeId: number;
  severity: number;
  occurrence: number;
  detection: number;
  consequenceType: string;
}

export interface MaintenanceTask {
  id: number;
  failureModeId: number;
  description: string;
  taskType?: string;
  interval?: number;
  intervalUnit?: string;
  effectiveness?: number;
  rationale?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RamMetric {
  id: number;
  componentId: number;
  mtbf?: number;
  mttr?: number;
  failureRate?: number;
  availability?: number;
  calculatedReliability?: number;
  timeHorizon?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SystemFunction {
  id: number;
  systemId: number;
  componentId?: number;
  functionDescription: string;
  performanceStandard?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FunctionalFailure {
  id: number;
  componentId: number;
  description: string;
  failureImpact?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FailureEffect {
  id: number;
  failureModeId: number;
  localEffect?: string;
  systemEffect?: string;
  endEffect?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RcmDecisionLogic {
  id: number;
  failureModeId: number;
  hiddenFunction: boolean;
  safetyConsequence: boolean;
  environmentalConsequence: boolean;
  operationalConsequence: boolean;
  economicConsequence: boolean;
  failureEvident: boolean;
  pmTechnicallyFeasible: boolean;
  cmTechnicallyFeasible: boolean;
  ffTechnicallyFeasible: boolean;
  rtfAcceptable: boolean;
  decisionPath?: string;
  createdAt?: string;
  updatedAt?: string;
}