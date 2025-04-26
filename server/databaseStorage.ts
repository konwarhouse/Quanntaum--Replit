import { eq, desc } from "drizzle-orm";
import { db, executeWithRetry } from "./db";
import { IStorage } from "./storage";
import {
  users, messages, equipmentClasses, assets, maintenanceEvents, failureModes, failureHistory,
  User, InsertUser, Message, InsertMessage,
  EquipmentClass, InsertEquipmentClass,
  Asset, InsertAsset, MaintenanceEvent, InsertMaintenanceEvent,
  FailureMode, InsertFailureMode, FailureHistory, InsertFailureHistory
} from "@shared/schema";
import {
  assetFmeca, systemFmeca, assetFmecaHistory, systemFmecaHistory,
  AssetFmeca, InsertAssetFmeca,
  SystemFmeca, InsertSystemFmeca,
  AssetFmecaHistory, InsertAssetFmecaHistory, 
  SystemFmecaHistory, InsertSystemFmecaHistory,
  FmecaHistoryStatus
} from "@shared/fmeca-schema";

/**
 * Database storage implementation using Drizzle ORM
 */
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Message operations
  async getMessagesByUsername(username: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.username, username));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  // Equipment Class operations
  async getEquipmentClass(id: number): Promise<EquipmentClass | undefined> {
    const [equipmentClass] = await db.select().from(equipmentClasses).where(eq(equipmentClasses.id, id));
    return equipmentClass;
  }

  async getEquipmentClasses(): Promise<EquipmentClass[]> {
    return db.select().from(equipmentClasses);
  }

  async createEquipmentClass(insertEquipmentClass: InsertEquipmentClass): Promise<EquipmentClass> {
    const [equipmentClass] = await db.insert(equipmentClasses).values(insertEquipmentClass).returning();
    return equipmentClass;
  }

  async deleteEquipmentClass(id: number): Promise<boolean> {
    const result = await db.delete(equipmentClasses).where(eq(equipmentClasses.id, id));
    return true; // Assume success if no error is thrown
  }

  // Asset operations
  async getAsset(id: number): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset;
  }

  async getAssets(): Promise<Asset[]> {
    return db.select().from(assets);
  }

  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    // Handle empty date fields
    const processedAsset = {...insertAsset};
    
    if (processedAsset.installationDate === '') {
      processedAsset.installationDate = null;
    }
    
    if (processedAsset.lastReplacementDate === '') {
      processedAsset.lastReplacementDate = null;
    }
    
    const [asset] = await db.insert(assets).values(processedAsset).returning();
    return asset;
  }

  async updateAsset(id: number, assetUpdate: Partial<InsertAsset>): Promise<Asset | undefined> {
    // Handle empty date fields
    const processedUpdate = {...assetUpdate};
    
    if (processedUpdate.installationDate === '') {
      processedUpdate.installationDate = null;
    }
    
    if (processedUpdate.lastReplacementDate === '') {
      processedUpdate.lastReplacementDate = null;
    }
    
    const [updatedAsset] = await db
      .update(assets)
      .set(processedUpdate)
      .where(eq(assets.id, id))
      .returning();
    return updatedAsset;
  }

  async deleteAsset(id: number): Promise<boolean> {
    const result = await db.delete(assets).where(eq(assets.id, id));
    return true; // Assume success if no error is thrown
  }

  // Maintenance Event operations
  async getMaintenanceEvent(id: number): Promise<MaintenanceEvent | undefined> {
    const [event] = await db.select().from(maintenanceEvents).where(eq(maintenanceEvents.id, id));
    return event;
  }

  async getMaintenanceEventsByAssetId(assetId: number): Promise<MaintenanceEvent[]> {
    return db.select().from(maintenanceEvents).where(eq(maintenanceEvents.assetId, assetId));
  }

  async createMaintenanceEvent(insertEvent: InsertMaintenanceEvent): Promise<MaintenanceEvent> {
    const [event] = await db.insert(maintenanceEvents).values(insertEvent).returning();
    return event;
  }

  async deleteMaintenanceEvent(id: number): Promise<boolean> {
    const result = await db.delete(maintenanceEvents).where(eq(maintenanceEvents.id, id));
    return true; // Assume success if no error is thrown
  }

  // Failure Mode operations
  async getFailureMode(id: number): Promise<FailureMode | undefined> {
    const [failureMode] = await db.select().from(failureModes).where(eq(failureModes.id, id));
    return failureMode;
  }

  async getFailureModesByAssetId(assetId: number): Promise<FailureMode[]> {
    return db.select().from(failureModes).where(eq(failureModes.assetId, assetId));
  }
  
  async getFailureModesByEquipmentClass(equipmentClass: string): Promise<FailureMode[]> {
    return db.select().from(failureModes).where(eq(failureModes.equipmentClass, equipmentClass));
  }

  async createFailureMode(insertFailureMode: InsertFailureMode): Promise<FailureMode> {
    const [failureMode] = await db.insert(failureModes).values(insertFailureMode).returning();
    return failureMode;
  }

  async updateFailureMode(id: number, failureModeUpdate: Partial<InsertFailureMode>): Promise<FailureMode | undefined> {
    const [updatedFailureMode] = await db
      .update(failureModes)
      .set(failureModeUpdate)
      .where(eq(failureModes.id, id))
      .returning();
    return updatedFailureMode;
  }

  async deleteFailureMode(id: number): Promise<boolean> {
    const result = await db.delete(failureModes).where(eq(failureModes.id, id));
    return true; // Assume success if no error is thrown
  }
  
  // Failure History operations
  async getFailureHistory(id: number): Promise<FailureHistory | undefined> {
    const [record] = await db.select().from(failureHistory).where(eq(failureHistory.id, id));
    return record;
  }
  
  async getFailureHistoryByAssetId(assetId: number): Promise<FailureHistory[]> {
    return db.select().from(failureHistory).where(eq(failureHistory.assetId, assetId));
  }
  
  async getFailureHistoryByFailureModeId(failureModeId: number): Promise<FailureHistory[]> {
    return db.select().from(failureHistory).where(eq(failureHistory.failureModeId, failureModeId));
  }
  
  async createFailureHistory(insertFailureHistory: InsertFailureHistory): Promise<FailureHistory> {
    // Process empty date fields
    const processedData = {...insertFailureHistory} as any;
    
    // Set the record date to current date
    processedData.recordDate = new Date();
    
    // Process date fields that might be empty strings
    if (typeof processedData.installationDate === 'string' && processedData.installationDate === '') {
      processedData.installationDate = null;
    }
    
    if (typeof processedData.lastFailureDate === 'string' && processedData.lastFailureDate === '') {
      processedData.lastFailureDate = null;
    }
    
    if (typeof processedData.repairCompleteDate === 'string' && processedData.repairCompleteDate === '') {
      processedData.repairCompleteDate = null;
    }
    
    const [record] = await db.insert(failureHistory).values(processedData).returning();
    return record;
  }
  
  async updateFailureHistory(id: number, failureHistoryUpdate: Partial<InsertFailureHistory>): Promise<FailureHistory | undefined> {
    // Process empty date fields
    const processedUpdate = {...failureHistoryUpdate} as any;
    
    // Process date fields that might be empty strings
    if (typeof processedUpdate.installationDate === 'string' && processedUpdate.installationDate === '') {
      processedUpdate.installationDate = null;
    }
    
    if (typeof processedUpdate.lastFailureDate === 'string' && processedUpdate.lastFailureDate === '') {
      processedUpdate.lastFailureDate = null;
    }
    
    if (typeof processedUpdate.repairCompleteDate === 'string' && processedUpdate.repairCompleteDate === '') {
      processedUpdate.repairCompleteDate = null;
    }
    
    const [updatedRecord] = await db
      .update(failureHistory)
      .set(processedUpdate)
      .where(eq(failureHistory.id, id))
      .returning();
    return updatedRecord;
  }
  
  async deleteFailureHistory(id: number): Promise<boolean> {
    const result = await db.delete(failureHistory).where(eq(failureHistory.id, id));
    return true; // Assume success if no error is thrown
  }

  // Asset FMECA operations
  async getAssetFmecaByTagNumber(tagNumber: string): Promise<AssetFmeca[]> {
    console.log("Getting asset FMECA by tag number:", tagNumber);
    
    return executeWithRetry(
      async () => {
        const results = await db.select().from(assetFmeca).where(eq(assetFmeca.tagNumber, tagNumber));
        console.log(`Found ${results.length} asset FMECA records for tag ${tagNumber}`);
        return results;
      },
      `Get asset FMECA for tag ${tagNumber}`
    );
  }

  async getAllAssetFmeca(): Promise<AssetFmeca[]> {
    console.log("Getting all asset FMECA records");
    
    return executeWithRetry(
      async () => {
        const results = await db.select().from(assetFmeca);
        console.log(`Found ${results.length} total asset FMECA records`);
        return results;
      },
      "Get all asset FMECA records"
    );
  }

  async createAssetFmeca(insertFmeca: InsertAssetFmeca): Promise<AssetFmeca> {
    console.log("Creating new asset FMECA record:", JSON.stringify(insertFmeca, null, 2));
    
    // Process nullable string fields
    const processedData = {...insertFmeca};
    if (processedData.completionDate === '') processedData.completionDate = undefined;
    if (processedData.verifiedBy === '') processedData.verifiedBy = undefined;
    if (processedData.effectivenessVerified === '') processedData.effectivenessVerified = undefined;
    if (processedData.comments === '') processedData.comments = undefined;
    
    console.log("After processing:", JSON.stringify(processedData, null, 2));
    
    return executeWithRetry(
      async () => {
        const [record] = await db.insert(assetFmeca).values(processedData).returning();
        console.log("Asset FMECA record created with ID:", record.id);
        return record;
      },
      "Create asset FMECA record"
    );
  }

  async updateAssetFmeca(id: number, fmecaUpdate: Partial<InsertAssetFmeca>): Promise<AssetFmeca | undefined> {
    console.log(`Updating asset FMECA with ID ${id}:`, JSON.stringify(fmecaUpdate, null, 2));
    
    // Process nullable string fields
    const processedData = {...fmecaUpdate};
    if (processedData.completionDate === '') processedData.completionDate = undefined;
    if (processedData.verifiedBy === '') processedData.verifiedBy = undefined;
    if (processedData.effectivenessVerified === '') processedData.effectivenessVerified = undefined;
    if (processedData.comments === '') processedData.comments = undefined;
    
    return executeWithRetry(
      async () => {
        const [updatedRecord] = await db
          .update(assetFmeca)
          .set(processedData)
          .where(eq(assetFmeca.id, id))
          .returning();
        
        if (updatedRecord) {
          console.log("Asset FMECA record updated successfully");
        } else {
          console.log("No asset FMECA record found to update");
        }
        
        return updatedRecord;
      },
      `Update asset FMECA with ID ${id}`
    );
  }

  async deleteAssetFmeca(id: number): Promise<boolean> {
    console.log(`Deleting asset FMECA with ID ${id}`);
    
    return executeWithRetry(
      async () => {
        await db.delete(assetFmeca).where(eq(assetFmeca.id, id));
        console.log("Asset FMECA record deleted successfully");
        return true;
      },
      `Delete asset FMECA with ID ${id}`
    );
  }

  // System FMECA operations
  async getSystemFmecaBySystemName(systemName: string): Promise<SystemFmeca[]> {
    console.log("Getting system FMECA by system name:", systemName);
    
    return executeWithRetry(
      async () => {
        const results = await db.select().from(systemFmeca).where(eq(systemFmeca.systemName, systemName));
        console.log(`Found ${results.length} system FMECA records for system ${systemName}`);
        return results;
      },
      `Get system FMECA for system ${systemName}`
    );
  }

  async getAllSystemFmeca(): Promise<SystemFmeca[]> {
    console.log("Getting all system FMECA records");
    
    return executeWithRetry(
      async () => {
        const results = await db.select().from(systemFmeca);
        console.log(`Found ${results.length} total system FMECA records`);
        return results;
      },
      "Get all system FMECA records"
    );
  }

  async createSystemFmeca(insertFmeca: InsertSystemFmeca): Promise<SystemFmeca> {
    console.log("Creating new system FMECA record:", JSON.stringify(insertFmeca, null, 2));
    
    // Process nullable string fields
    const processedData = {...insertFmeca};
    if (processedData.completionDate === '') processedData.completionDate = undefined;
    if (processedData.verifiedBy === '') processedData.verifiedBy = undefined;
    if (processedData.effectivenessVerified === '') processedData.effectivenessVerified = undefined;
    if (processedData.comments === '') processedData.comments = undefined;
    
    console.log("After processing:", JSON.stringify(processedData, null, 2));
    
    return executeWithRetry(
      async () => {
        const [record] = await db.insert(systemFmeca).values(processedData).returning();
        console.log("System FMECA record created with ID:", record.id);
        return record;
      },
      "Create system FMECA record"
    );
  }

  async updateSystemFmeca(id: number, fmecaUpdate: Partial<InsertSystemFmeca>): Promise<SystemFmeca | undefined> {
    console.log(`Updating system FMECA with ID ${id}:`, JSON.stringify(fmecaUpdate, null, 2));
    
    // Process nullable string fields
    const processedData = {...fmecaUpdate};
    if (processedData.completionDate === '') processedData.completionDate = undefined;
    if (processedData.verifiedBy === '') processedData.verifiedBy = undefined;
    if (processedData.effectivenessVerified === '') processedData.effectivenessVerified = undefined;
    if (processedData.comments === '') processedData.comments = undefined;
    
    return executeWithRetry(
      async () => {
        const [updatedRecord] = await db
          .update(systemFmeca)
          .set(processedData)
          .where(eq(systemFmeca.id, id))
          .returning();
        
        if (updatedRecord) {
          console.log("System FMECA record updated successfully");
        } else {
          console.log("No system FMECA record found to update");
        }
        
        return updatedRecord;
      },
      `Update system FMECA with ID ${id}`
    );
  }

  async deleteSystemFmeca(id: number): Promise<boolean> {
    console.log(`Deleting system FMECA with ID ${id}`);
    
    return executeWithRetry(
      async () => {
        await db.delete(systemFmeca).where(eq(systemFmeca.id, id));
        console.log("System FMECA record deleted successfully");
        return true;
      },
      `Delete system FMECA with ID ${id}`
    );
  }

  // Asset FMECA History operations
  async getAssetFmecaHistory(id: number): Promise<AssetFmecaHistory | undefined> {
    console.log("Getting asset FMECA history with ID:", id);
    
    return executeWithRetry(
      async () => {
        const [record] = await db.select().from(assetFmecaHistory).where(eq(assetFmecaHistory.id, id));
        if (record) {
          console.log("Asset FMECA history record found");
        } else {
          console.log("No asset FMECA history record found with that ID");
        }
        return record;
      },
      `Get asset FMECA history with ID ${id}`
    );
  }

  async getAssetFmecaHistoryByFmecaId(assetFmecaId: number): Promise<AssetFmecaHistory[]> {
    console.log("Getting asset FMECA history records for FMECA ID:", assetFmecaId);
    
    return executeWithRetry(
      async () => {
        const results = await db
          .select()
          .from(assetFmecaHistory)
          .where(eq(assetFmecaHistory.assetFmecaId, assetFmecaId))
          .orderBy(assetFmecaHistory.version, "desc"); // Newest versions first
        
        console.log(`Found ${results.length} history records for asset FMECA ID ${assetFmecaId}`);
        return results;
      },
      `Get asset FMECA history records for FMECA ID ${assetFmecaId}`
    );
  }

  async getAssetFmecaHistoryByTagNumber(tagNumber: string): Promise<AssetFmecaHistory[]> {
    console.log("Getting asset FMECA history records for tag number:", tagNumber);
    
    return executeWithRetry(
      async () => {
        const results = await db
          .select()
          .from(assetFmecaHistory)
          .where(eq(assetFmecaHistory.tagNumber, tagNumber))
          .orderBy(assetFmecaHistory.version, "desc"); // Newest versions first
        
        console.log(`Found ${results.length} history records for tag number ${tagNumber}`);
        return results;
      },
      `Get asset FMECA history records for tag ${tagNumber}`
    );
  }

  async createAssetFmecaHistory(insertHistory: InsertAssetFmecaHistory): Promise<AssetFmecaHistory> {
    console.log("Creating new asset FMECA history record");
    
    // Process nullable string fields
    const processedData = {...insertHistory};
    if (processedData.completionDate === '') processedData.completionDate = undefined;
    if (processedData.verifiedBy === '') processedData.verifiedBy = undefined;
    if (processedData.effectivenessVerified === '') processedData.effectivenessVerified = undefined;
    if (processedData.comments === '') processedData.comments = undefined;
    
    // Set default values if not provided
    const now = new Date();
    if (!processedData.createdAt) processedData.createdAt = now;
    if (!processedData.updatedAt) processedData.updatedAt = now;
    if (!processedData.status) processedData.status = FmecaHistoryStatus.ACTIVE;
    if (!processedData.historyReason) processedData.historyReason = "Manual update";
    if (!processedData.version) processedData.version = 1;
    
    return executeWithRetry(
      async () => {
        const [record] = await db.insert(assetFmecaHistory).values(processedData).returning();
        console.log("Asset FMECA history record created with ID:", record.id);
        return record;
      },
      "Create asset FMECA history record"
    );
  }

  async getLatestAssetFmecaHistory(assetFmecaId: number): Promise<AssetFmecaHistory | undefined> {
    console.log("Getting latest asset FMECA history for FMECA ID:", assetFmecaId);
    
    return executeWithRetry(
      async () => {
        // Fall back to using direct Drizzle ORM methods
        console.log(`Executing query using Drizzle ORM with simple ordering`);
        
        try {
          // Get all records for this FMECA ID and sort them in JavaScript
          const records = await db
            .select()
            .from(assetFmecaHistory)
            .where(eq(assetFmecaHistory.assetFmecaId, assetFmecaId));
          
          // Sort by version in descending order using JavaScript
          records.sort((a, b) => b.version - a.version);
          
          // Get the first record (highest version)
          const record = records.length > 0 ? records[0] : undefined;
          
          if (record) {
            console.log(`Found latest history record (version ${record.version}) for asset FMECA ID ${assetFmecaId}`);
            // Debug the record
            console.log('Record details (Drizzle ORM with JS sorting):', JSON.stringify(record, null, 2));
          } else {
            console.log(`No history records found for asset FMECA ID ${assetFmecaId}`);
          }
          
          return record;
        } catch (error) {
          console.error('Error in Drizzle query:', error);
          throw error;
        }
      },
      `Get latest asset FMECA history for FMECA ID ${assetFmecaId}`
    );
  }

  // System FMECA History operations
  async getSystemFmecaHistory(id: number): Promise<SystemFmecaHistory | undefined> {
    console.log("Getting system FMECA history with ID:", id);
    
    return executeWithRetry(
      async () => {
        const [record] = await db.select().from(systemFmecaHistory).where(eq(systemFmecaHistory.id, id));
        if (record) {
          console.log("System FMECA history record found");
        } else {
          console.log("No system FMECA history record found with that ID");
        }
        return record;
      },
      `Get system FMECA history with ID ${id}`
    );
  }

  async getSystemFmecaHistoryByFmecaId(systemFmecaId: number): Promise<SystemFmecaHistory[]> {
    console.log("Getting system FMECA history records for FMECA ID:", systemFmecaId);
    
    return executeWithRetry(
      async () => {
        const results = await db
          .select()
          .from(systemFmecaHistory)
          .where(eq(systemFmecaHistory.systemFmecaId, systemFmecaId))
          .orderBy(systemFmecaHistory.version, "desc"); // Newest versions first
        
        console.log(`Found ${results.length} history records for system FMECA ID ${systemFmecaId}`);
        return results;
      },
      `Get system FMECA history records for FMECA ID ${systemFmecaId}`
    );
  }

  async getSystemFmecaHistoryBySystemName(systemName: string): Promise<SystemFmecaHistory[]> {
    console.log("Getting system FMECA history records for system name:", systemName);
    
    return executeWithRetry(
      async () => {
        const results = await db
          .select()
          .from(systemFmecaHistory)
          .where(eq(systemFmecaHistory.systemName, systemName))
          .orderBy(systemFmecaHistory.version, "desc"); // Newest versions first
        
        console.log(`Found ${results.length} history records for system name ${systemName}`);
        return results;
      },
      `Get system FMECA history records for system ${systemName}`
    );
  }

  async createSystemFmecaHistory(insertHistory: InsertSystemFmecaHistory): Promise<SystemFmecaHistory> {
    console.log("Creating new system FMECA history record");
    
    // Process nullable string fields
    const processedData = {...insertHistory};
    if (processedData.completionDate === '') processedData.completionDate = undefined;
    if (processedData.verifiedBy === '') processedData.verifiedBy = undefined;
    if (processedData.effectivenessVerified === '') processedData.effectivenessVerified = undefined;
    if (processedData.comments === '') processedData.comments = undefined;
    
    // Set default values if not provided
    const now = new Date();
    if (!processedData.createdAt) processedData.createdAt = now;
    if (!processedData.updatedAt) processedData.updatedAt = now;
    if (!processedData.status) processedData.status = FmecaHistoryStatus.ACTIVE;
    if (!processedData.historyReason) processedData.historyReason = "Manual update";
    if (!processedData.version) processedData.version = 1;
    
    return executeWithRetry(
      async () => {
        const [record] = await db.insert(systemFmecaHistory).values(processedData).returning();
        console.log("System FMECA history record created with ID:", record.id);
        return record;
      },
      "Create system FMECA history record"
    );
  }

  async getLatestSystemFmecaHistory(systemFmecaId: number): Promise<SystemFmecaHistory | undefined> {
    console.log("Getting latest system FMECA history for FMECA ID:", systemFmecaId);
    
    return executeWithRetry(
      async () => {
        // Use the same approach as with asset FMECA history
        console.log(`Executing query using Drizzle ORM with simple ordering`);
        
        try {
          // Get all records for this FMECA ID and sort them in JavaScript
          const records = await db
            .select()
            .from(systemFmecaHistory)
            .where(eq(systemFmecaHistory.systemFmecaId, systemFmecaId));
          
          // Sort by version in descending order using JavaScript
          records.sort((a, b) => b.version - a.version);
          
          // Get the first record (highest version)
          const record = records.length > 0 ? records[0] : undefined;
          
          if (record) {
            console.log(`Found latest history record (version ${record.version}) for system FMECA ID ${systemFmecaId}`);
            // Debug the record
            console.log('Record details (Drizzle ORM with JS sorting):', JSON.stringify(record, null, 2));
          } else {
            console.log(`No history records found for system FMECA ID ${systemFmecaId}`);
          }
          
          return record;
        } catch (error) {
          console.error('Error in Drizzle query:', error);
          throw error;
        }
      },
      `Get latest system FMECA history for FMECA ID ${systemFmecaId}`
    );
  }
}