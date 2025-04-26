import { hashPassword } from './auth';
import { 
  insertAssetSchema, 
  insertEquipmentClassSchema,
  insertFailureModeSchema,
  insertFailureHistorySchema,
  insertMaintenanceEventSchema,
  type User,
  type EquipmentClass,
  type Asset,
  type FailureMode,
  type FailureHistory,
  type MaintenanceEvent,
} from '@shared/schema';
import { IStorage } from './storage';

const ISO_EQUIPMENT_CLASSES = [
  { name: 'pump', description: 'Pumping equipment' },
  { name: 'motor', description: 'Electric motors' },
  { name: 'compressor', description: 'Gas compression equipment' },
  { name: 'valve', description: 'Control and isolation valves' },
  { name: 'heat_exchanger', description: 'Heat transfer equipment' },
  { name: 'vessel', description: 'Pressure vessels and tanks' },
  { name: 'instrumentation', description: 'Measurement and control devices' },
  { name: 'piping', description: 'Fluid transport systems' },
  { name: 'electrical', description: 'Electrical distribution equipment' },
  { name: 'rotating', description: 'General rotating equipment' },
];

const SAMPLE_ASSETS = [
  { assetNumber: 'PUMP-101', name: 'Cooling Water Pump', description: 'Primary cooling water circulation pump', criticality: 'high', location: 'Cooling Tower Area', equipmentClass: 'pump', installationDate: new Date('2022-01-15') },
  { assetNumber: 'MTR-203', name: 'Conveyor Motor', description: 'Main conveyor drive motor', criticality: 'medium', location: 'Production Line 2', equipmentClass: 'motor', installationDate: new Date('2021-08-10') },
  { assetNumber: 'VLV-305', name: 'Steam Control Valve', description: 'Main steam header control valve', criticality: 'high', location: 'Boiler Room', equipmentClass: 'valve', installationDate: new Date('2023-02-20') },
  { assetNumber: 'COMP-102', name: 'Air Compressor', description: 'Plant air supply compressor', criticality: 'high', location: 'Utility Room', equipmentClass: 'compressor', installationDate: new Date('2022-05-18') },
];

const FAILURE_MODES = [
  { description: 'Bearing Failure', equipmentClass: 'motor', consequence: 'Motor stops running, production interruption', detectionMethod: 'Vibration analysis, temperature monitoring' },
  { description: 'Seal Leakage', equipmentClass: 'pump', consequence: 'Fluid leakage, potential environmental impact', detectionMethod: 'Visual inspection, pressure drop' },
  { description: 'Impeller Wear', equipmentClass: 'pump', consequence: 'Reduced flow rate, inefficient operation', detectionMethod: 'Performance testing, flow monitoring' },
  { description: 'Winding Insulation Breakdown', equipmentClass: 'motor', consequence: 'Electrical failure, potential fire hazard', detectionMethod: 'Insulation resistance testing, thermography' },
  { description: 'Valve Seat Erosion', equipmentClass: 'valve', consequence: 'Valve leakage, process control issues', detectionMethod: 'Leak testing, flow verification' },
  { description: 'Gasket Failure', equipmentClass: 'vessel', consequence: 'Pressure loss, product leakage', detectionMethod: 'Pressure testing, visual inspection' },
];

/**
 * Sets up the memory storage with demo data when running in Electron mode
 */
export async function setupElectronDemoData(storage: IStorage): Promise<void> {
  console.log('Setting up demo data for Electron mode...');
  
  // Create admin user
  const adminPassword = await hashPassword('adminpassword');
  await storage.createUser({
    username: 'admin',
    password: adminPassword,
    fullName: 'Administrator',
    email: 'admin@example.com',
    role: 'admin',
    isActive: true
  });
  
  // Create equipment classes
  for (const eqClass of ISO_EQUIPMENT_CLASSES) {
    const validatedData = insertEquipmentClassSchema.parse(eqClass);
    await storage.createEquipmentClass(validatedData);
  }
  
  // Create sample assets
  for (const asset of SAMPLE_ASSETS) {
    const validatedData = insertAssetSchema.parse(asset);
    await storage.createAsset(validatedData);
  }
  
  // Create failure modes
  for (const failureMode of FAILURE_MODES) {
    const validatedData = insertFailureModeSchema.parse({
      ...failureMode,
      assetId: null,  // Generic failure mode not tied to a specific asset
    });
    await storage.createFailureMode(validatedData);
  }
  
  // Create some maintenance events and failure history for the first asset
  const assets = await storage.getAssets();
  if (assets.length > 0) {
    const asset = assets[0];
    
    // Add maintenance events
    await storage.createMaintenanceEvent(insertMaintenanceEventSchema.parse({
      assetId: asset.id,
      eventType: 'preventive',
      eventDate: new Date('2023-06-15'),
      description: 'Quarterly preventive maintenance',
      technicianName: 'John Smith',
      hoursSpent: 4,
      partsCost: 250.00,
      laborCost: 320.00
    }));
    
    await storage.createMaintenanceEvent(insertMaintenanceEventSchema.parse({
      assetId: asset.id,
      eventType: 'corrective',
      eventDate: new Date('2023-09-23'),
      description: 'Emergency repair of leaking seal',
      technicianName: 'Michael Brown',
      hoursSpent: 6,
      partsCost: 420.00,
      laborCost: 480.00
    }));
    
    // Add failure history if we have failure modes
    // We can now directly pass the equipment class to the method
    // The method will handle string or number
    const failureModes = await storage.getFailureModesByEquipmentClass(asset.equipmentClass || 0);
    if (failureModes.length > 0) {
      await storage.createFailureHistory(insertFailureHistorySchema.parse({
        assetId: asset.id,
        failureModeId: failureModes[0].id,
        failureDate: new Date('2023-09-20'),
        repairCompleteDate: new Date('2023-09-21'),
        failureDescription: 'Unexpected leakage from pump seal during operation',
        failureCause: 'Wear and tear',
        downtimeHours: 12,
        repairTimeHours: 8,
        operatingHoursAtFailure: 4230,
        failureDetectionMethod: 'Operator Observation',
        failureMechanism: 'Wear and tear',
        failureClassification: 'Degraded'
      }));
    }
  }
  
  console.log('Demo data setup complete for Electron mode');
}

/**
 * Determines if the application is running in Electron mode
 */
export function isElectronMode(): boolean {
  return process.env.ELECTRON_RUN === 'true';
}