/**
 * Utility functions for handling ID conversions and generating database-safe IDs
 */

/**
 * Generates a PostgreSQL-safe integer ID
 * PostgreSQL integers have a maximum value of 2147483647 (2^31-1)
 * This function creates unique IDs within that range
 */
export function generateSafeId(): number {
  // Create a timestamp component (last 9 digits to stay within int range)
  const timestamp = Date.now() % 1000000000; 
  
  // Add some randomness while keeping within PostgreSQL integer limits
  const random = Math.floor(Math.random() * 1000);
  
  // Combine them but ensure we stay below PostgreSQL's integer max value
  const safeId = timestamp * 1000 + random;
  
  // Final safety check
  return safeId % 2147483647; // PostgreSQL integer max value (2^31 - 1)
}

/**
 * Ensures an ID is safe for PostgreSQL integer columns
 * If the ID is too large, it will be mapped to a safe range
 */
export function ensureSafeId(id: number | string): number {
  // Convert string IDs to number
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  
  // If parsing failed or ID is too large, generate a new one
  if (isNaN(numId) || numId > 2147483647) {
    return generateSafeId();
  }
  
  return numId;
}

/**
 * For display purposes - gets a safe string representation of any ID
 */
export function getSafeIdString(id: number | string): string {
  return String(id).slice(0, 10); // Limit displayed length
}