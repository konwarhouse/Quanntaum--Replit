import { 
  users, type User, type InsertUser, 
  messages, type Message, type InsertMessage,
  equipmentClasses, type EquipmentClass, type InsertEquipmentClass,
  assets, type Asset, type InsertAsset,
  maintenanceEvents, type MaintenanceEvent, type InsertMaintenanceEvent,
  failureModes, type FailureMode, type InsertFailureMode,
  failureHistory, type FailureHistory, type InsertFailureHistory
} from "@shared/schema";
import {
  type AssetFmeca, type InsertAssetFmeca,
  type SystemFmeca, type InsertSystemFmeca,
  type AssetFmecaHistory, type InsertAssetFmecaHistory,
  type SystemFmecaHistory, type InsertSystemFmecaHistory,
  FmecaHistoryStatus
} from "@shared/fmeca-schema";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Message operations
  getMessagesByUsername(username: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Equipment Class operations
  getEquipmentClass(id: number): Promise<EquipmentClass | undefined>;
  getEquipmentClasses(): Promise<EquipmentClass[]>;
  createEquipmentClass(equipmentClass: InsertEquipmentClass): Promise<EquipmentClass>;
  deleteEquipmentClass(id: number): Promise<boolean>;
  
  // Asset operations
  getAsset(id: number): Promise<Asset | undefined>;
  getAssets(): Promise<Asset[]>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(id: number): Promise<boolean>;
  
  // Maintenance Event operations
  getMaintenanceEvent(id: number): Promise<MaintenanceEvent | undefined>;
  getMaintenanceEventsByAssetId(assetId: number): Promise<MaintenanceEvent[]>;
  createMaintenanceEvent(event: InsertMaintenanceEvent): Promise<MaintenanceEvent>;
  deleteMaintenanceEvent(id: number): Promise<boolean>;
  
  // Failure Mode operations
  getFailureMode(id: number): Promise<FailureMode | undefined>;
  getFailureModesByAssetId(assetId: number): Promise<FailureMode[]>;
  getFailureModesByEquipmentClass(equipmentClass: string): Promise<FailureMode[]>;
  createFailureMode(failureMode: InsertFailureMode): Promise<FailureMode>;
  updateFailureMode(id: number, failureMode: Partial<InsertFailureMode>): Promise<FailureMode | undefined>;
  deleteFailureMode(id: number): Promise<boolean>;
  
  // Failure History operations
  getFailureHistory(id: number): Promise<FailureHistory | undefined>;
  getFailureHistoryByAssetId(assetId: number): Promise<FailureHistory[]>;
  getFailureHistoryByFailureModeId(failureModeId: number): Promise<FailureHistory[]>;
  createFailureHistory(failureHistory: InsertFailureHistory): Promise<FailureHistory>;
  updateFailureHistory(id: number, failureHistory: Partial<InsertFailureHistory>): Promise<FailureHistory | undefined>;
  deleteFailureHistory(id: number): Promise<boolean>;
  
  // Asset FMECA operations
  getAssetFmecaByTagNumber(tagNumber: string): Promise<AssetFmeca[]>;
  getAllAssetFmeca(): Promise<AssetFmeca[]>;
  createAssetFmeca(fmeca: InsertAssetFmeca): Promise<AssetFmeca>;
  updateAssetFmeca(id: number, fmeca: Partial<InsertAssetFmeca>): Promise<AssetFmeca | undefined>;
  deleteAssetFmeca(id: number): Promise<boolean>;
  
  // System FMECA operations
  getSystemFmecaBySystemName(systemName: string): Promise<SystemFmeca[]>;
  getAllSystemFmeca(): Promise<SystemFmeca[]>;
  createSystemFmeca(fmeca: InsertSystemFmeca): Promise<SystemFmeca>;
  updateSystemFmeca(id: number, fmeca: Partial<InsertSystemFmeca>): Promise<SystemFmeca | undefined>;
  deleteSystemFmeca(id: number): Promise<boolean>;
  
  // Asset FMECA History operations
  getAssetFmecaHistory(id: number): Promise<AssetFmecaHistory | undefined>;
  getAssetFmecaHistoryByFmecaId(assetFmecaId: number): Promise<AssetFmecaHistory[]>;
  getAssetFmecaHistoryByTagNumber(tagNumber: string): Promise<AssetFmecaHistory[]>;
  createAssetFmecaHistory(fmecaHistory: InsertAssetFmecaHistory): Promise<AssetFmecaHistory>;
  getLatestAssetFmecaHistory(assetFmecaId: number): Promise<AssetFmecaHistory | undefined>;
  
  // System FMECA History operations
  getSystemFmecaHistory(id: number): Promise<SystemFmecaHistory | undefined>;
  getSystemFmecaHistoryByFmecaId(systemFmecaId: number): Promise<SystemFmecaHistory[]>;
  getSystemFmecaHistoryBySystemName(systemName: string): Promise<SystemFmecaHistory[]>;
  createSystemFmecaHistory(fmecaHistory: InsertSystemFmecaHistory): Promise<SystemFmecaHistory>;
  getLatestSystemFmecaHistory(systemFmecaId: number): Promise<SystemFmecaHistory | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private messages: Map<number, Message>;
  private equipmentClassesMap: Map<number, EquipmentClass>;
  private assetsMap: Map<number, Asset>;
  private maintenanceEventsMap: Map<number, MaintenanceEvent>;
  private failureModesMap: Map<number, FailureMode>;
  private failureHistoryMap: Map<number, FailureHistory>;
  private assetFmecaMap: Map<number, AssetFmeca>;
  private systemFmecaMap: Map<number, SystemFmeca>;
  private assetFmecaHistoryMap: Map<number, AssetFmecaHistory>;
  private systemFmecaHistoryMap: Map<number, SystemFmecaHistory>;
  
  private userCurrentId: number;
  private messageCurrentId: number;
  private equipmentClassCurrentId: number;
  private assetCurrentId: number;
  private maintenanceEventCurrentId: number;
  private failureModeCurrentId: number;
  private failureHistoryCurrentId: number;
  private assetFmecaCurrentId: number;
  private systemFmecaCurrentId: number;
  private assetFmecaHistoryCurrentId: number;
  private systemFmecaHistoryCurrentId: number;

  constructor() {
    this.users = new Map();
    this.messages = new Map();
    this.equipmentClassesMap = new Map();
    this.assetsMap = new Map();
    this.maintenanceEventsMap = new Map();
    this.failureModesMap = new Map();
    this.failureHistoryMap = new Map();
    this.assetFmecaMap = new Map();
    this.systemFmecaMap = new Map();
    this.assetFmecaHistoryMap = new Map();
    this.systemFmecaHistoryMap = new Map();
    
    this.userCurrentId = 1;
    this.messageCurrentId = 1;
    this.equipmentClassCurrentId = 1;
    this.assetCurrentId = 1;
    this.maintenanceEventCurrentId = 1;
    this.failureModeCurrentId = 1;
    this.failureHistoryCurrentId = 1;
    this.assetFmecaCurrentId = 1;
    this.systemFmecaCurrentId = 1;
    this.assetFmecaHistoryCurrentId = 1;
    this.systemFmecaHistoryCurrentId = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Message operations
  async getMessagesByUsername(username: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.username === username)
      .sort((a, b) => Number(a.id) - Number(b.id));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageCurrentId++;
    const timestamp = new Date();
    const message: Message = { ...insertMessage, id, timestamp };
    this.messages.set(id, message);
    return message;
  }

  // Equipment Class operations
  async getEquipmentClass(id: number): Promise<EquipmentClass | undefined> {
    return this.equipmentClassesMap.get(id);
  }

  async getEquipmentClasses(): Promise<EquipmentClass[]> {
    return Array.from(this.equipmentClassesMap.values());
  }

  async createEquipmentClass(insertEquipmentClass: InsertEquipmentClass): Promise<EquipmentClass> {
    const id = this.equipmentClassCurrentId++;
    const equipmentClass: EquipmentClass = { 
      ...insertEquipmentClass, 
      id,
      description: insertEquipmentClass.description || null
    };
    this.equipmentClassesMap.set(id, equipmentClass);
    return equipmentClass;
  }

  async deleteEquipmentClass(id: number): Promise<boolean> {
    return this.equipmentClassesMap.delete(id);
  }
  
  // Asset operations
  async getAsset(id: number): Promise<Asset | undefined> {
    return this.assetsMap.get(id);
  }
  
  async getAssets(): Promise<Asset[]> {
    return Array.from(this.assetsMap.values());
  }
  
  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    const id = this.assetCurrentId++;
    // Ensure null values for optional fields
    const asset: Asset = { 
      ...insertAsset, 
      id,
      description: insertAsset.description || null,
      installationDate: insertAsset.installationDate || null
    };
    this.assetsMap.set(id, asset);
    return asset;
  }
  
  async updateAsset(id: number, assetUpdate: Partial<InsertAsset>): Promise<Asset | undefined> {
    const existingAsset = this.assetsMap.get(id);
    if (!existingAsset) return undefined;
    
    // Preserve null values for optional fields
    const updatedAsset: Asset = { 
      ...existingAsset,
      ...assetUpdate,
      description: assetUpdate.description !== undefined ? assetUpdate.description : existingAsset.description,
      installationDate: assetUpdate.installationDate !== undefined ? assetUpdate.installationDate : existingAsset.installationDate
    };
    this.assetsMap.set(id, updatedAsset);
    return updatedAsset;
  }
  
  async deleteAsset(id: number): Promise<boolean> {
    return this.assetsMap.delete(id);
  }
  
  // Maintenance Event operations
  async getMaintenanceEvent(id: number): Promise<MaintenanceEvent | undefined> {
    return this.maintenanceEventsMap.get(id);
  }
  
  async getMaintenanceEventsByAssetId(assetId: number): Promise<MaintenanceEvent[]> {
    return Array.from(this.maintenanceEventsMap.values())
      .filter(event => event.assetId === assetId)
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  }
  
  async createMaintenanceEvent(insertEvent: InsertMaintenanceEvent): Promise<MaintenanceEvent> {
    const id = this.maintenanceEventCurrentId++;
    // Ensure null values for optional fields
    const event: MaintenanceEvent = { 
      ...insertEvent, 
      id,
      description: insertEvent.description || null
    };
    this.maintenanceEventsMap.set(id, event);
    return event;
  }
  
  async deleteMaintenanceEvent(id: number): Promise<boolean> {
    return this.maintenanceEventsMap.delete(id);
  }
  
  // Failure Mode operations
  async getFailureMode(id: number): Promise<FailureMode | undefined> {
    return this.failureModesMap.get(id);
  }
  
  async getFailureModesByAssetId(assetId: number): Promise<FailureMode[]> {
    return Array.from(this.failureModesMap.values())
      .filter(failureMode => failureMode.assetId === assetId);
  }
  
  async getFailureModesByEquipmentClass(equipmentClass: string): Promise<FailureMode[]> {
    return Array.from(this.failureModesMap.values())
      .filter(failureMode => failureMode.equipmentClass === equipmentClass);
  }
  
  async createFailureMode(insertFailureMode: InsertFailureMode): Promise<FailureMode> {
    const id = this.failureModeCurrentId++;
    // Ensure null values for optional fields
    const failureMode: FailureMode = { 
      ...insertFailureMode, 
      id,
      detectionMethod: insertFailureMode.detectionMethod || null,
      currentControl: insertFailureMode.currentControl || null,
      isPredictable: insertFailureMode.isPredictable ?? null,
      costOfFailure: insertFailureMode.costOfFailure || null
    };
    this.failureModesMap.set(id, failureMode);
    return failureMode;
  }
  
  async updateFailureMode(id: number, failureModeUpdate: Partial<InsertFailureMode>): Promise<FailureMode | undefined> {
    const existingFailureMode = this.failureModesMap.get(id);
    if (!existingFailureMode) return undefined;
    
    // Preserve null values for optional fields
    const updatedFailureMode: FailureMode = { 
      ...existingFailureMode,
      ...failureModeUpdate,
      detectionMethod: failureModeUpdate.detectionMethod !== undefined ? failureModeUpdate.detectionMethod : existingFailureMode.detectionMethod,
      currentControl: failureModeUpdate.currentControl !== undefined ? failureModeUpdate.currentControl : existingFailureMode.currentControl,
      isPredictable: failureModeUpdate.isPredictable !== undefined ? failureModeUpdate.isPredictable : existingFailureMode.isPredictable,
      costOfFailure: failureModeUpdate.costOfFailure !== undefined ? failureModeUpdate.costOfFailure : existingFailureMode.costOfFailure
    };
    this.failureModesMap.set(id, updatedFailureMode);
    return updatedFailureMode;
  }
  
  async deleteFailureMode(id: number): Promise<boolean> {
    return this.failureModesMap.delete(id);
  }
  
  // Failure History operations
  async getFailureHistory(id: number): Promise<FailureHistory | undefined> {
    return this.failureHistoryMap.get(id);
  }
  
  async getFailureHistoryByAssetId(assetId: number): Promise<FailureHistory[]> {
    return Array.from(this.failureHistoryMap.values())
      .filter(record => record.assetId === assetId)
      .sort((a, b) => new Date(a.failureDate).getTime() - new Date(b.failureDate).getTime());
  }
  
  async getFailureHistoryByFailureModeId(failureModeId: number): Promise<FailureHistory[]> {
    return Array.from(this.failureHistoryMap.values())
      .filter(record => record.failureModeId === failureModeId)
      .sort((a, b) => new Date(a.failureDate).getTime() - new Date(b.failureDate).getTime());
  }
  
  async createFailureHistory(insertFailureHistory: InsertFailureHistory): Promise<FailureHistory> {
    const id = this.failureHistoryCurrentId++;
    const recordDate = new Date();
    
    // Set default values for optional fields
    const failureHistory: FailureHistory = {
      ...insertFailureHistory,
      id,
      recordDate,
      failureModeId: insertFailureHistory.failureModeId || null,
      operatingHoursAtFailure: insertFailureHistory.operatingHoursAtFailure || null,
      failureMechanism: insertFailureHistory.failureMechanism || null,
      failureClassification: insertFailureHistory.failureClassification || null,
      safetyImpact: insertFailureHistory.safetyImpact || null,
      environmentalImpact: insertFailureHistory.environmentalImpact || null,
      productionImpact: insertFailureHistory.productionImpact || null,
      repairCost: insertFailureHistory.repairCost || null,
      consequentialCost: insertFailureHistory.consequentialCost || null,
      partsReplaced: insertFailureHistory.partsReplaced || null,
      repairTechnician: insertFailureHistory.repairTechnician || null,
      operatingConditions: insertFailureHistory.operatingConditions || null,
      preventability: insertFailureHistory.preventability || null,
      recommendedPreventiveAction: insertFailureHistory.recommendedPreventiveAction || null,
      weibullBeta: insertFailureHistory.weibullBeta || null,
      weibullEta: insertFailureHistory.weibullEta || null,
      recordedBy: insertFailureHistory.recordedBy || null,
      verifiedBy: insertFailureHistory.verifiedBy || null
    };
    
    this.failureHistoryMap.set(id, failureHistory);
    return failureHistory;
  }
  
  async updateFailureHistory(id: number, failureHistoryUpdate: Partial<InsertFailureHistory>): Promise<FailureHistory | undefined> {
    const existingRecord = this.failureHistoryMap.get(id);
    if (!existingRecord) return undefined;
    
    // Preserve existing values for fields not included in the update
    const updatedRecord: FailureHistory = {
      ...existingRecord,
      ...failureHistoryUpdate,
      // Explicitly handle each optional field
      failureModeId: failureHistoryUpdate.failureModeId !== undefined ? failureHistoryUpdate.failureModeId : existingRecord.failureModeId,
      operatingHoursAtFailure: failureHistoryUpdate.operatingHoursAtFailure !== undefined ? failureHistoryUpdate.operatingHoursAtFailure : existingRecord.operatingHoursAtFailure,
      failureMechanism: failureHistoryUpdate.failureMechanism !== undefined ? failureHistoryUpdate.failureMechanism : existingRecord.failureMechanism,
      failureClassification: failureHistoryUpdate.failureClassification !== undefined ? failureHistoryUpdate.failureClassification : existingRecord.failureClassification,
      safetyImpact: failureHistoryUpdate.safetyImpact !== undefined ? failureHistoryUpdate.safetyImpact : existingRecord.safetyImpact,
      environmentalImpact: failureHistoryUpdate.environmentalImpact !== undefined ? failureHistoryUpdate.environmentalImpact : existingRecord.environmentalImpact,
      productionImpact: failureHistoryUpdate.productionImpact !== undefined ? failureHistoryUpdate.productionImpact : existingRecord.productionImpact,
      repairCost: failureHistoryUpdate.repairCost !== undefined ? failureHistoryUpdate.repairCost : existingRecord.repairCost,
      consequentialCost: failureHistoryUpdate.consequentialCost !== undefined ? failureHistoryUpdate.consequentialCost : existingRecord.consequentialCost,
      partsReplaced: failureHistoryUpdate.partsReplaced !== undefined ? failureHistoryUpdate.partsReplaced : existingRecord.partsReplaced,
      repairTechnician: failureHistoryUpdate.repairTechnician !== undefined ? failureHistoryUpdate.repairTechnician : existingRecord.repairTechnician,
      operatingConditions: failureHistoryUpdate.operatingConditions !== undefined ? failureHistoryUpdate.operatingConditions : existingRecord.operatingConditions,
      preventability: failureHistoryUpdate.preventability !== undefined ? failureHistoryUpdate.preventability : existingRecord.preventability,
      recommendedPreventiveAction: failureHistoryUpdate.recommendedPreventiveAction !== undefined ? failureHistoryUpdate.recommendedPreventiveAction : existingRecord.recommendedPreventiveAction,
      weibullBeta: failureHistoryUpdate.weibullBeta !== undefined ? failureHistoryUpdate.weibullBeta : existingRecord.weibullBeta,
      weibullEta: failureHistoryUpdate.weibullEta !== undefined ? failureHistoryUpdate.weibullEta : existingRecord.weibullEta,
      recordedBy: failureHistoryUpdate.recordedBy !== undefined ? failureHistoryUpdate.recordedBy : existingRecord.recordedBy,
      verifiedBy: failureHistoryUpdate.verifiedBy !== undefined ? failureHistoryUpdate.verifiedBy : existingRecord.verifiedBy
    };
    
    this.failureHistoryMap.set(id, updatedRecord);
    return updatedRecord;
  }
  
  async deleteFailureHistory(id: number): Promise<boolean> {
    return this.failureHistoryMap.delete(id);
  }
  
  // Asset FMECA operations
  async getAssetFmecaByTagNumber(tagNumber: string): Promise<AssetFmeca[]> {
    return Array.from(this.assetFmecaMap.values())
      .filter(record => record.tagNumber === tagNumber);
  }

  async getAllAssetFmeca(): Promise<AssetFmeca[]> {
    return Array.from(this.assetFmecaMap.values());
  }

  async createAssetFmeca(insertFmeca: InsertAssetFmeca): Promise<AssetFmeca> {
    const id = this.assetFmecaCurrentId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    
    const assetFmeca: AssetFmeca = {
      ...insertFmeca,
      id,
      createdAt,
      updatedAt
    };
    
    this.assetFmecaMap.set(id, assetFmeca);
    return assetFmeca;
  }

  async updateAssetFmeca(id: number, fmecaUpdate: Partial<InsertAssetFmeca>): Promise<AssetFmeca | undefined> {
    const existingRecord = this.assetFmecaMap.get(id);
    if (!existingRecord) return undefined;
    
    const updatedAt = new Date();
    
    const updatedRecord: AssetFmeca = {
      ...existingRecord,
      ...fmecaUpdate,
      updatedAt
    };
    
    this.assetFmecaMap.set(id, updatedRecord);
    return updatedRecord;
  }

  async deleteAssetFmeca(id: number): Promise<boolean> {
    return this.assetFmecaMap.delete(id);
  }

  // System FMECA operations
  async getSystemFmecaBySystemName(systemName: string): Promise<SystemFmeca[]> {
    return Array.from(this.systemFmecaMap.values())
      .filter(record => record.systemName === systemName);
  }

  async getAllSystemFmeca(): Promise<SystemFmeca[]> {
    return Array.from(this.systemFmecaMap.values());
  }

  async createSystemFmeca(insertFmeca: InsertSystemFmeca): Promise<SystemFmeca> {
    const id = this.systemFmecaCurrentId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    
    const systemFmeca: SystemFmeca = {
      ...insertFmeca,
      id,
      createdAt,
      updatedAt
    };
    
    this.systemFmecaMap.set(id, systemFmeca);
    return systemFmeca;
  }

  async updateSystemFmeca(id: number, fmecaUpdate: Partial<InsertSystemFmeca>): Promise<SystemFmeca | undefined> {
    const existingRecord = this.systemFmecaMap.get(id);
    if (!existingRecord) return undefined;
    
    const updatedAt = new Date();
    
    const updatedRecord: SystemFmeca = {
      ...existingRecord,
      ...fmecaUpdate,
      updatedAt
    };
    
    this.systemFmecaMap.set(id, updatedRecord);
    return updatedRecord;
  }

  async deleteSystemFmeca(id: number): Promise<boolean> {
    return this.systemFmecaMap.delete(id);
  }
}

// Import the DatabaseStorage implementation
import { DatabaseStorage } from "./databaseStorage";

// Choose the storage implementation based on environment
// For production, use database storage
export const storage = new DatabaseStorage();
