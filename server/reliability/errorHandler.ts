import { ErrorType, APIError } from "../../shared/auth";

/**
 * Creates an API error object with structured information
 * @param type Error type
 * @param message Human-readable error message
 * @param details Additional error details for debugging
 * @param code Optional HTTP status code
 * @returns Structured API error
 */
export function createApiError(
  type: ErrorType,
  message: string,
  details?: any,
  code?: number
): APIError {
  return {
    type,
    message,
    details,
    code
  };
}

/**
 * Validates Weibull parameters for common error cases
 * @param beta Shape parameter
 * @param eta Scale parameter
 */
export function validateWeibullParameters(beta: number, eta: number): void {
  if (isNaN(beta) || beta <= 0) {
    throw createApiError(
      ErrorType.VALIDATION_ERROR,
      "Shape parameter β must be a positive number",
      { beta },
      400
    );
  }

  if (isNaN(eta) || eta <= 0) {
    throw createApiError(
      ErrorType.VALIDATION_ERROR,
      "Scale parameter η must be a positive number",
      { eta },
      400
    );
  }
}

/**
 * Validates time-related parameters
 * @param timeHorizon Time horizon for analysis
 */
export function validateTimeParameters(timeHorizon: number): void {
  if (isNaN(timeHorizon) || timeHorizon <= 0) {
    throw createApiError(
      ErrorType.VALIDATION_ERROR,
      "Time horizon must be a positive number",
      { timeHorizon },
      400
    );
  }
}

/**
 * Validates cost parameters for optimization
 * @param preventiveCost Preventive maintenance cost
 * @param correctiveCost Corrective maintenance cost
 */
export function validateCostParameters(
  preventiveCost: number,
  correctiveCost: number
): void {
  if (isNaN(preventiveCost) || preventiveCost < 0) {
    throw createApiError(
      ErrorType.VALIDATION_ERROR,
      "Preventive maintenance cost must be a non-negative number",
      { preventiveCost },
      400
    );
  }

  if (isNaN(correctiveCost) || correctiveCost <= 0) {
    throw createApiError(
      ErrorType.VALIDATION_ERROR,
      "Corrective maintenance cost must be a positive number",
      { correctiveCost },
      400
    );
  }
}

/**
 * Validates simulation parameters
 * @param numberOfRuns Number of simulation runs
 * @param pmInterval Optional PM interval
 */
export function validateSimulationParameters(
  numberOfRuns: number,
  pmInterval?: number
): void {
  if (isNaN(numberOfRuns) || numberOfRuns <= 0 || !Number.isInteger(numberOfRuns)) {
    throw createApiError(
      ErrorType.VALIDATION_ERROR,
      "Number of simulation runs must be a positive integer",
      { numberOfRuns },
      400
    );
  }

  if (pmInterval !== undefined && (isNaN(pmInterval) || pmInterval <= 0)) {
    throw createApiError(
      ErrorType.VALIDATION_ERROR,
      "Preventive maintenance interval must be a positive number",
      { pmInterval },
      400
    );
  }
}

/**
 * Validates RCM parameters
 * @param assetCriticality Asset criticality level
 * @param costOfFailure Cost of failure
 * @param failureModes Array of failure mode descriptions
 * @param failureConsequences Array of failure consequences
 */
export function validateRCMParameters(
  assetCriticality: string,
  costOfFailure: number,
  failureModes: string[],
  failureConsequences: string[]
): void {
  const validCriticalities = ["High", "Medium", "Low"];
  if (!validCriticalities.includes(assetCriticality)) {
    throw createApiError(
      ErrorType.VALIDATION_ERROR,
      "Asset criticality must be 'High', 'Medium', or 'Low'",
      { assetCriticality },
      400
    );
  }

  if (isNaN(costOfFailure) || costOfFailure < 0) {
    throw createApiError(
      ErrorType.VALIDATION_ERROR,
      "Cost of failure must be a non-negative number",
      { costOfFailure },
      400
    );
  }

  if (!Array.isArray(failureModes) || failureModes.length === 0) {
    throw createApiError(
      ErrorType.VALIDATION_ERROR,
      "At least one failure mode must be provided",
      { failureModes },
      400
    );
  }

  if (!Array.isArray(failureConsequences) || failureConsequences.length === 0) {
    throw createApiError(
      ErrorType.VALIDATION_ERROR,
      "At least one failure consequence must be provided",
      { failureConsequences },
      400
    );
  }
}

/**
 * Handles calculation errors with structured responses
 * @param error The caught error
 * @returns Structured API error
 */
export function handleCalculationError(error: any): APIError {
  // If it's already our APIError type, just return it
  if (error && error.type && Object.values(ErrorType).includes(error.type)) {
    return error as APIError;
  }

  // Otherwise, create a server error
  return createApiError(
    ErrorType.CALCULATION_ERROR,
    "Error in reliability calculation",
    { message: error.message, stack: error.stack },
    500
  );
}

/**
 * Checks if a resource exists
 * @param resource The resource to check
 * @param resourceType Type of resource (e.g., "Asset", "Maintenance Event")
 * @param id Resource ID
 */
export function validateResourceExists(
  resource: any,
  resourceType: string,
  id: number
): void {
  if (!resource) {
    throw createApiError(
      ErrorType.RESOURCE_NOT_FOUND,
      `${resourceType} with ID ${id} not found`,
      { id },
      404
    );
  }
}