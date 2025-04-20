import { 
  users, type User, type InsertUser, 
  messages, type Message, type InsertMessage,
  assets, type Asset, type InsertAsset,
  maintenanceEvents, type MaintenanceEvent, type InsertMaintenanceEvent,
  failureModes, type FailureMode, type InsertFailureMode
} from "@shared/schema";

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
  createFailureMode(failureMode: InsertFailureMode): Promise<FailureMode>;
  updateFailureMode(id: number, failureMode: Partial<InsertFailureMode>): Promise<FailureMode | undefined>;
  deleteFailureMode(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private messages: Map<number, Message>;
  private assetsMap: Map<number, Asset>;
  private maintenanceEventsMap: Map<number, MaintenanceEvent>;
  private failureModesMap: Map<number, FailureMode>;
  
  private userCurrentId: number;
  private messageCurrentId: number;
  private assetCurrentId: number;
  private maintenanceEventCurrentId: number;
  private failureModeCurrentId: number;

  constructor() {
    this.users = new Map();
    this.messages = new Map();
    this.assetsMap = new Map();
    this.maintenanceEventsMap = new Map();
    this.failureModesMap = new Map();
    
    this.userCurrentId = 1;
    this.messageCurrentId = 1;
    this.assetCurrentId = 1;
    this.maintenanceEventCurrentId = 1;
    this.failureModeCurrentId = 1;
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
}

export const storage = new MemStorage();
