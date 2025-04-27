import BetterSQLite3 from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Execute a database operation with retry logic and error handling for robustness
 */
async function executeWithRetry<T>(
  operation: () => T, 
  maxRetries = 3, 
  retryDelay = 200,
  errorContext = "database operation"
): Promise<T> {
  let lastError: unknown = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return operation();
    } catch (error: unknown) {
      lastError = error;
      console.error(`SQLite error during ${errorContext} (attempt ${attempt + 1}/${maxRetries}):`, error);
      
      // Handle specific error cases
      if (error instanceof Error && error.message && (
        error.message.includes('disk full') || 
        error.message.includes('disk I/O error') ||
        error.message.includes('permission denied')
      )) {
        console.error('Critical SQLite error - storage issue detected:', error.message);
        // For critical errors, we might want to break early and not retry
        break;
      }
      
      if (attempt < maxRetries - 1) {
        // Wait before retrying with exponential backoff
        const backoffDelay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  
  console.error(`SQLite operation failed after ${maxRetries} attempts:`, lastError);
  const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
  throw new Error(`Failed to execute SQLite ${errorContext}: ${errorMessage}`);
}
import { IStorage } from './storage';
import {
  User, InsertUser,
  Message, InsertMessage,
  EquipmentClass, InsertEquipmentClass,
  Asset, InsertAsset,
  MaintenanceEvent, InsertMaintenanceEvent,
  FailureMode, InsertFailureMode,
  FailureHistory, InsertFailureHistory
} from '@shared/schema';

// Add a process exit handler to ensure clean SQLite shutdown
let _sqliteInstance: any = null; // Store reference locally for cleanup
process.on('exit', () => {
  // Global instance cleanup will happen via the database instance
  console.log('Process exit - cleaning up SQLite connections');
  if (_sqliteInstance) {
    try {
      _sqliteInstance.cleanup();
    } catch (error) {
      console.error('Error during SQLite cleanup:', error);
    }
  }
});

// Import FMECA types from fmeca-schema
import {
  AssetFmeca, InsertAssetFmeca,
  SystemFmeca, InsertSystemFmeca,
  AssetFmecaHistory, InsertAssetFmecaHistory,
  SystemFmecaHistory, InsertSystemFmecaHistory
} from '@shared/fmeca-schema';

/**
 * SQLite implementation of the storage interface for Electron mode
 */
export class SQLiteStorage implements IStorage {
  private db: BetterSQLite3.Database | any; // Using any as a temporary workaround for type issues
  private dbPath: string;
  private static instance: SQLiteStorage | null = null;
  
  constructor(dbFilePath?: string) {
    if (SQLiteStorage.instance) {
      console.log('Returning existing SQLiteStorage instance');
      return SQLiteStorage.instance;
    }
    
    SQLiteStorage.instance = this;
    // Store for external cleanup reference
    _sqliteInstance = this;
    try {
      // Default path is in the user's home directory
      const userDataPath = this.getUserDataPath();
      fs.mkdirSync(userDataPath, { recursive: true });
      
      this.dbPath = dbFilePath || path.join(userDataPath, 'quanntaum-predict.db');
      console.log(`Initializing SQLite database at: ${this.dbPath}`);
      
      // Check if the directory is writable
      try {
        fs.accessSync(path.dirname(this.dbPath), fs.constants.W_OK);
      } catch (error) {
        console.error(`Database directory is not writable: ${path.dirname(this.dbPath)}`, error);
        throw new Error(`Cannot write to database location: ${path.dirname(this.dbPath)}`);
      }
      
      // Create or open the database with proper error handling
      this.db = new BetterSQLite3(this.dbPath, {
        verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
        fileMustExist: false // Don't require the file to exist
      });
      
      // Ensure the database is functioning correctly
      try {
        // Enable foreign keys
        this.db.pragma('foreign_keys = ON');
        // Quick test query to verify connection
        this.db.prepare('SELECT 1').get();
      } catch (error) {
        console.error('Failed to initialize SQLite database:', error);
        throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Initialize database schema
      this.initializeDatabase();
      console.log('SQLite database initialized successfully');
    } catch (error) {
      console.error('Fatal error initializing SQLite database:', error);
      throw new Error(`Failed to initialize SQLite database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get the appropriate user data path based on the operating system
   */
  private getUserDataPath(): string {
    let appDataPath: string;
    
    switch (process.platform) {
      case 'win32':
        appDataPath = process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming');
        break;
      case 'darwin':
        appDataPath = path.join(process.env.HOME || '', 'Library', 'Application Support');
        break;
      case 'linux':
        appDataPath = process.env.XDG_DATA_HOME || path.join(process.env.HOME || '', '.local', 'share');
        break;
      default:
        appDataPath = path.join(process.env.HOME || '', '.quanntaum-predict');
    }
    
    return path.join(appDataPath, 'Quanntaum-Predict');
  }
  
  /**
   * Safely close the database connection and clean up resources
   */
  public cleanup(): void {
    try {
      if (this.db) {
        // Make sure any pending transactions are committed
        try {
          const inTransaction = this.db.inTransaction;
          if (inTransaction) {
            console.log('Committing pending transaction before close');
            this.db.exec('COMMIT');
          }
        } catch (error) {
          console.error('Error checking transaction status:', error);
        }
        
        // Close the database connection
        console.log(`Closing SQLite database connection: ${this.dbPath}`);
        this.db.close();
        
        // Clear the static instance
        SQLiteStorage.instance = null;
      }
    } catch (error) {
      console.error('Error during SQLite cleanup:', error);
    }
  }
  
  /**
   * Initialize the database schema with required tables
   * Creates tables for users, messages, equipment_classes, assets, maintenance_events,
   * failure_modes, failure_history, asset_fmeca, system_fmeca, and related history tables
   */
  private initializeDatabase() {
    // Create users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        fullName TEXT,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        createdBy INTEGER,
        lastLoginAt TIMESTAMP,
        isActive INTEGER NOT NULL DEFAULT 1
      );
    `);
    
    // Create messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create equipment_classes table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS equipment_classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT
      );
    `);
    
    // Create assets table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assetNumber TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        criticality TEXT,
        location TEXT,
        equipmentClass TEXT,
        installationDate TIMESTAMP,
        manufacturer TEXT,
        model TEXT,
        serialNumber TEXT
      );
    `);
    
    // Create maintenance_events table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS maintenance_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assetId INTEGER NOT NULL,
        eventType TEXT NOT NULL,
        eventDate TIMESTAMP NOT NULL,
        description TEXT,
        technicianName TEXT,
        hoursSpent REAL,
        partsCost REAL,
        laborCost REAL,
        FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
      );
    `);
    
    // Create failure_modes table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS failure_modes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        description TEXT NOT NULL,
        equipmentClass TEXT NOT NULL,
        assetId INTEGER,
        consequences TEXT,
        detectionMethod TEXT,
        currentControl TEXT,
        isPredictable INTEGER,
        costOfFailure REAL,
        componentId INTEGER,
        FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
      );
    `);
    
    // Create failure_history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS failure_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assetId INTEGER NOT NULL,
        failureModeId INTEGER,
        failureDate TIMESTAMP NOT NULL,
        repairCompleteDate TIMESTAMP,
        failureDescription TEXT,
        failureCause TEXT,
        downtimeHours REAL,
        repairTimeHours REAL,
        operatingHoursAtFailure REAL,
        operatingHoursTotal REAL,
        workOrderNumber TEXT,
        priority TEXT,
        comments TEXT,
        recordDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        weibullBeta REAL,
        weibullEta REAL,
        installationDate TIMESTAMP,
        failureDetectionMethod TEXT,
        failureMechanism TEXT,
        failureClassification TEXT,
        needsRCA TEXT,
        FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE,
        FOREIGN KEY (failureModeId) REFERENCES failure_modes(id) ON DELETE SET NULL
      );
    `);
    
    // Create asset_fmeca table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS asset_fmeca (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tagNumber TEXT NOT NULL,
        assetDescription TEXT NOT NULL,
        assetFunction TEXT NOT NULL,
        component TEXT NOT NULL,
        failureMode TEXT NOT NULL,
        cause TEXT NOT NULL,
        effect TEXT NOT NULL,
        severity INTEGER NOT NULL,
        severityJustification TEXT NOT NULL,
        probability INTEGER NOT NULL,
        probabilityJustification TEXT NOT NULL,
        detection INTEGER NOT NULL,
        detectionJustification TEXT NOT NULL,
        rpn INTEGER NOT NULL,
        action TEXT NOT NULL,
        responsibility TEXT NOT NULL,
        targetDate TEXT NOT NULL,
        completionDate TEXT,
        verifiedBy TEXT,
        effectivenessVerified TEXT,
        comments TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        createdBy INTEGER,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create system_fmeca table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS system_fmeca (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        systemId TEXT NOT NULL,
        systemName TEXT NOT NULL,
        systemFunction TEXT NOT NULL,
        subsystem TEXT NOT NULL,
        failureMode TEXT NOT NULL,
        cause TEXT NOT NULL,
        effect TEXT NOT NULL,
        severity INTEGER NOT NULL,
        severityJustification TEXT NOT NULL,
        probability INTEGER NOT NULL,
        probabilityJustification TEXT NOT NULL,
        detection INTEGER NOT NULL,
        detectionJustification TEXT NOT NULL,
        rpn INTEGER NOT NULL,
        action TEXT NOT NULL,
        responsibility TEXT NOT NULL,
        targetDate TEXT NOT NULL,
        completionDate TEXT,
        verifiedBy TEXT,
        effectivenessVerified TEXT,
        comments TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        createdBy INTEGER,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create asset_fmeca_history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS asset_fmeca_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assetFmecaId INTEGER NOT NULL,
        status TEXT NOT NULL,
        historyReason TEXT NOT NULL,
        version INTEGER NOT NULL,
        tagNumber TEXT NOT NULL,
        assetDescription TEXT NOT NULL,
        assetFunction TEXT NOT NULL,
        component TEXT NOT NULL,
        failureMode TEXT NOT NULL,
        cause TEXT NOT NULL,
        effect TEXT NOT NULL,
        severity INTEGER NOT NULL,
        severityJustification TEXT NOT NULL,
        probability INTEGER NOT NULL,
        probabilityJustification TEXT NOT NULL,
        detection INTEGER NOT NULL,
        detectionJustification TEXT NOT NULL,
        rpn INTEGER NOT NULL,
        action TEXT NOT NULL,
        responsibility TEXT NOT NULL,
        targetDate TEXT NOT NULL,
        completionDate TEXT,
        verifiedBy TEXT,
        effectivenessVerified TEXT,
        comments TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        createdBy INTEGER,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assetFmecaId) REFERENCES asset_fmeca(id) ON DELETE CASCADE
      );
    `);
    
    // Create system_fmeca_history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS system_fmeca_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        systemFmecaId INTEGER NOT NULL,
        status TEXT NOT NULL,
        historyReason TEXT NOT NULL,
        version INTEGER NOT NULL,
        systemId TEXT NOT NULL,
        systemName TEXT NOT NULL,
        systemFunction TEXT NOT NULL,
        subsystem TEXT NOT NULL,
        failureMode TEXT NOT NULL,
        cause TEXT NOT NULL,
        effect TEXT NOT NULL,
        severity INTEGER NOT NULL,
        severityJustification TEXT NOT NULL,
        probability INTEGER NOT NULL,
        probabilityJustification TEXT NOT NULL,
        detection INTEGER NOT NULL,
        detectionJustification TEXT NOT NULL,
        rpn INTEGER NOT NULL,
        action TEXT NOT NULL,
        responsibility TEXT NOT NULL,
        targetDate TEXT NOT NULL,
        completionDate TEXT,
        verifiedBy TEXT,
        effectivenessVerified TEXT,
        comments TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        createdBy INTEGER,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (systemFmecaId) REFERENCES system_fmeca(id) ON DELETE CASCADE
      );
    `);
  }
  
  // User operations
  
  async getUser(id: number): Promise<User | undefined> {
    return executeWithRetry(() => {
      const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
      const user = stmt.get(id) as User | undefined;
      return user;
    }, 3, 200, "get user by ID");
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return executeWithRetry(() => {
      const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
      const user = stmt.get(username) as User | undefined;
      return user;
    }, 3, 200, "get user by username");
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = await executeWithRetry(() => {
      const stmt = this.db.prepare(`
        INSERT INTO users (username, password, fullName, email, role, isActive, createdBy)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const info = stmt.run(
        insertUser.username,
        insertUser.password,
        insertUser.fullName || null,
        insertUser.email || null,
        insertUser.role || 'user',
        insertUser.isActive !== undefined ? insertUser.isActive ? 1 : 0 : 1,
        insertUser.createdBy || null
      );
      
      return info.lastInsertRowid as number;
    }, 3, 200, "create user");
    
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`Failed to retrieve created user with ID ${id}`);
    }
    return user;
  }
  
  // Message operations
  
  async getMessagesByUsername(username: string): Promise<Message[]> {
    const stmt = this.db.prepare('SELECT * FROM messages WHERE username = ? ORDER BY timestamp DESC');
    const messages = stmt.all(username) as Message[];
    return messages;
  }
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const stmt = this.db.prepare('INSERT INTO messages (username, message) VALUES (?, ?)');
    const info = stmt.run(insertMessage.username, insertMessage.message);
    
    const id = info.lastInsertRowid as number;
    const getStmt = this.db.prepare('SELECT * FROM messages WHERE id = ?');
    const message = getStmt.get(id) as Message;
    return message;
  }
  
  // Equipment Class operations
  
  async getEquipmentClass(id: number): Promise<EquipmentClass | undefined> {
    const stmt = this.db.prepare('SELECT * FROM equipment_classes WHERE id = ?');
    const equipmentClass = stmt.get(id) as EquipmentClass | undefined;
    return equipmentClass;
  }
  
  async getEquipmentClasses(): Promise<EquipmentClass[]> {
    const stmt = this.db.prepare('SELECT * FROM equipment_classes ORDER BY name');
    const equipmentClasses = stmt.all() as EquipmentClass[];
    return equipmentClasses;
  }
  
  async createEquipmentClass(insertEquipmentClass: InsertEquipmentClass): Promise<EquipmentClass> {
    const stmt = this.db.prepare('INSERT INTO equipment_classes (name, description) VALUES (?, ?)');
    const info = stmt.run(insertEquipmentClass.name, insertEquipmentClass.description || null);
    
    const id = info.lastInsertRowid as number;
    return this.getEquipmentClass(id) as Promise<EquipmentClass>;
  }
  
  async deleteEquipmentClass(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM equipment_classes WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }
  
  // Asset operations
  
  async getAsset(id: number): Promise<Asset | undefined> {
    const stmt = this.db.prepare('SELECT * FROM assets WHERE id = ?');
    const asset = stmt.get(id) as Asset | undefined;
    return asset;
  }
  
  async getAssets(): Promise<Asset[]> {
    const stmt = this.db.prepare('SELECT * FROM assets ORDER BY assetNumber');
    const assets = stmt.all() as Asset[];
    return assets;
  }
  
  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    const stmt = this.db.prepare(`
      INSERT INTO assets (
        assetNumber, name, description, criticality, location, 
        equipmentClass, installationDate, manufacturer, model, serialNumber
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      insertAsset.assetNumber,
      insertAsset.name,
      insertAsset.description || null,
      insertAsset.criticality || null,
      insertAsset.location || null,
      insertAsset.equipmentClass || null,
      insertAsset.installationDate ? insertAsset.installationDate.toISOString() : null,
      insertAsset.manufacturer || null,
      insertAsset.model || null,
      insertAsset.serialNumber || null
    );
    
    const id = info.lastInsertRowid as number;
    return this.getAsset(id) as Promise<Asset>;
  }
  
  async updateAsset(id: number, assetUpdate: Partial<InsertAsset>): Promise<Asset | undefined> {
    const asset = await this.getAsset(id);
    if (!asset) return undefined;
    
    const updateFields = [];
    const updateValues = [];
    
    for (const [key, value] of Object.entries(assetUpdate)) {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        if (key === 'installationDate' && value instanceof Date) {
          updateValues.push(value.toISOString());
        } else {
          updateValues.push(value);
        }
      }
    }
    
    if (updateFields.length === 0) return asset;
    
    const stmt = this.db.prepare(`
      UPDATE assets SET ${updateFields.join(', ')} WHERE id = ?
    `);
    
    stmt.run(...updateValues, id);
    
    return this.getAsset(id);
  }
  
  async deleteAsset(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM assets WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }
  
  // Maintenance Event operations
  
  async getMaintenanceEvent(id: number): Promise<MaintenanceEvent | undefined> {
    const stmt = this.db.prepare('SELECT * FROM maintenance_events WHERE id = ?');
    const event = stmt.get(id) as MaintenanceEvent | undefined;
    return event;
  }
  
  async getMaintenanceEventsByAssetId(assetId: number): Promise<MaintenanceEvent[]> {
    const stmt = this.db.prepare('SELECT * FROM maintenance_events WHERE assetId = ? ORDER BY eventDate DESC');
    const events = stmt.all(assetId) as MaintenanceEvent[];
    return events;
  }
  
  async createMaintenanceEvent(insertEvent: InsertMaintenanceEvent): Promise<MaintenanceEvent> {
    const stmt = this.db.prepare(`
      INSERT INTO maintenance_events (
        assetId, eventType, eventDate, description, 
        technicianName, hoursSpent, partsCost, laborCost
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      insertEvent.assetId,
      insertEvent.eventType,
      insertEvent.eventDate ? insertEvent.eventDate.toISOString() : null,
      insertEvent.description || null,
      insertEvent.technicianName || null,
      insertEvent.hoursSpent || null,
      insertEvent.partsCost || null,
      insertEvent.laborCost || null
    );
    
    const id = info.lastInsertRowid as number;
    return this.getMaintenanceEvent(id) as Promise<MaintenanceEvent>;
  }
  
  async deleteMaintenanceEvent(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM maintenance_events WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }
  
  // Failure Mode operations
  
  async getFailureMode(id: number): Promise<FailureMode | undefined> {
    const stmt = this.db.prepare('SELECT * FROM failure_modes WHERE id = ?');
    const failureMode = stmt.get(id) as FailureMode | undefined;
    return failureMode;
  }
  
  async getFailureModesByAssetId(assetId: number): Promise<FailureMode[]> {
    const stmt = this.db.prepare('SELECT * FROM failure_modes WHERE assetId = ?');
    const failureModes = stmt.all(assetId) as FailureMode[];
    return failureModes;
  }
  
  async getFailureModesByEquipmentClass(equipmentClass: string): Promise<FailureMode[]> {
    const stmt = this.db.prepare('SELECT * FROM failure_modes WHERE equipmentClass = ?');
    const failureModes = stmt.all(equipmentClass) as FailureMode[];
    return failureModes;
  }
  
  async createFailureMode(insertFailureMode: InsertFailureMode): Promise<FailureMode> {
    const stmt = this.db.prepare(`
      INSERT INTO failure_modes (
        name, description, equipmentClass, assetId, consequences,
        detectionMethod, currentControl, isPredictable, costOfFailure, componentId
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      insertFailureMode.name || null,
      insertFailureMode.description,
      insertFailureMode.equipmentClass,
      insertFailureMode.assetId || null,
      insertFailureMode.consequences || null,
      insertFailureMode.detectionMethod || null,
      insertFailureMode.currentControl || null,
      insertFailureMode.isPredictable === true ? 1 : 0,
      insertFailureMode.costOfFailure || null,
      insertFailureMode.componentId || null
    );
    
    const id = info.lastInsertRowid as number;
    return this.getFailureMode(id) as Promise<FailureMode>;
  }
  
  async updateFailureMode(id: number, failureModeUpdate: Partial<InsertFailureMode>): Promise<FailureMode | undefined> {
    const failureMode = await this.getFailureMode(id);
    if (!failureMode) return undefined;
    
    const updateFields = [];
    const updateValues = [];
    
    for (const [key, value] of Object.entries(failureModeUpdate)) {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        if (key === 'isPredictable') {
          updateValues.push(value === true ? 1 : 0);
        } else {
          updateValues.push(value);
        }
      }
    }
    
    if (updateFields.length === 0) return failureMode;
    
    const stmt = this.db.prepare(`
      UPDATE failure_modes SET ${updateFields.join(', ')} WHERE id = ?
    `);
    
    stmt.run(...updateValues, id);
    
    return this.getFailureMode(id);
  }
  
  async deleteFailureMode(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM failure_modes WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }
  
  // Failure History operations
  
  async getFailureHistory(id: number): Promise<FailureHistory | undefined> {
    const stmt = this.db.prepare('SELECT * FROM failure_history WHERE id = ?');
    const failureHistory = stmt.get(id) as FailureHistory | undefined;
    
    if (failureHistory) {
      // Convert date strings to Date objects
      if (failureHistory.failureDate) {
        failureHistory.failureDate = new Date(failureHistory.failureDate as unknown as string);
      }
      if (failureHistory.repairCompleteDate) {
        failureHistory.repairCompleteDate = new Date(failureHistory.repairCompleteDate as unknown as string);
      }
      if (failureHistory.recordDate) {
        failureHistory.recordDate = new Date(failureHistory.recordDate as unknown as string);
      }
      if (failureHistory.installationDate) {
        failureHistory.installationDate = new Date(failureHistory.installationDate as unknown as string);
      }
    }
    
    return failureHistory;
  }
  
  async getFailureHistoryByAssetId(assetId: number): Promise<FailureHistory[]> {
    const stmt = this.db.prepare('SELECT * FROM failure_history WHERE assetId = ? ORDER BY failureDate DESC');
    const failureHistory = stmt.all(assetId) as FailureHistory[];
    
    // Convert date strings to Date objects
    failureHistory.forEach(history => {
      if (history.failureDate) {
        history.failureDate = new Date(history.failureDate as unknown as string);
      }
      if (history.repairCompleteDate) {
        history.repairCompleteDate = new Date(history.repairCompleteDate as unknown as string);
      }
      if (history.recordDate) {
        history.recordDate = new Date(history.recordDate as unknown as string);
      }
      if (history.installationDate) {
        history.installationDate = new Date(history.installationDate as unknown as string);
      }
    });
    
    return failureHistory;
  }
  
  async getFailureHistoryByFailureModeId(failureModeId: number): Promise<FailureHistory[]> {
    const stmt = this.db.prepare('SELECT * FROM failure_history WHERE failureModeId = ? ORDER BY failureDate DESC');
    const failureHistory = stmt.all(failureModeId) as FailureHistory[];
    
    // Convert date strings to Date objects
    failureHistory.forEach(history => {
      if (history.failureDate) {
        history.failureDate = new Date(history.failureDate as unknown as string);
      }
      if (history.repairCompleteDate) {
        history.repairCompleteDate = new Date(history.repairCompleteDate as unknown as string);
      }
      if (history.recordDate) {
        history.recordDate = new Date(history.recordDate as unknown as string);
      }
      if (history.installationDate) {
        history.installationDate = new Date(history.installationDate as unknown as string);
      }
    });
    
    return failureHistory;
  }
  
  async createFailureHistory(insertFailureHistory: InsertFailureHistory): Promise<FailureHistory> {
    const stmt = this.db.prepare(`
      INSERT INTO failure_history (
        assetId, failureModeId, failureDate, repairCompleteDate, failureDescription,
        failureCause, downtimeHours, repairTimeHours, operatingHoursAtFailure, operatingHoursTotal,
        workOrderNumber, priority, comments, weibullBeta, weibullEta, installationDate,
        failureDetectionMethod, failureMechanism, failureClassification, needsRCA
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      insertFailureHistory.assetId,
      insertFailureHistory.failureModeId || null,
      insertFailureHistory.failureDate ? insertFailureHistory.failureDate.toISOString() : null,
      insertFailureHistory.repairCompleteDate ? insertFailureHistory.repairCompleteDate.toISOString() : null,
      insertFailureHistory.failureDescription || null,
      insertFailureHistory.failureCause || null,
      insertFailureHistory.downtimeHours || null,
      insertFailureHistory.repairTimeHours || null,
      insertFailureHistory.operatingHoursAtFailure || null,
      insertFailureHistory.operatingHoursTotal || null,
      insertFailureHistory.workOrderNumber || null,
      insertFailureHistory.priority || null,
      insertFailureHistory.comments || null,
      insertFailureHistory.weibullBeta || null,
      insertFailureHistory.weibullEta || null,
      insertFailureHistory.installationDate ? insertFailureHistory.installationDate.toISOString() : null,
      insertFailureHistory.failureDetectionMethod || null,
      insertFailureHistory.failureMechanism || null,
      insertFailureHistory.failureClassification || null,
      insertFailureHistory.needsRCA || null
    );
    
    const id = info.lastInsertRowid as number;
    return this.getFailureHistory(id) as Promise<FailureHistory>;
  }
  
  async updateFailureHistory(id: number, failureHistoryUpdate: Partial<InsertFailureHistory>): Promise<FailureHistory | undefined> {
    const failureHistory = await this.getFailureHistory(id);
    if (!failureHistory) return undefined;
    
    const updateFields = [];
    const updateValues = [];
    
    for (const [key, value] of Object.entries(failureHistoryUpdate)) {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        if (value instanceof Date) {
          updateValues.push(value.toISOString());
        } else {
          updateValues.push(value);
        }
      }
    }
    
    if (updateFields.length === 0) return failureHistory;
    
    const stmt = this.db.prepare(`
      UPDATE failure_history SET ${updateFields.join(', ')} WHERE id = ?
    `);
    
    stmt.run(...updateValues, id);
    
    return this.getFailureHistory(id);
  }
  
  async deleteFailureHistory(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM failure_history WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }
  
  // Asset FMECA operations
  
  async getAssetFmecaByTagNumber(tagNumber: string): Promise<AssetFmeca[]> {
    const stmt = this.db.prepare('SELECT * FROM asset_fmeca WHERE tagNumber = ?');
    const assetFmeca = stmt.all(tagNumber) as AssetFmeca[];
    
    // Convert date strings to Date objects
    assetFmeca.forEach(fmeca => {
      if (fmeca.createdAt) {
        fmeca.createdAt = new Date(fmeca.createdAt as unknown as string);
      }
      if (fmeca.updatedAt) {
        fmeca.updatedAt = new Date(fmeca.updatedAt as unknown as string);
      }
    });
    
    return assetFmeca;
  }
  
  async getAllAssetFmeca(): Promise<AssetFmeca[]> {
    const stmt = this.db.prepare('SELECT * FROM asset_fmeca ORDER BY tagNumber');
    const assetFmeca = stmt.all() as AssetFmeca[];
    
    // Convert date strings to Date objects
    assetFmeca.forEach(fmeca => {
      if (fmeca.createdAt) {
        fmeca.createdAt = new Date(fmeca.createdAt as unknown as string);
      }
      if (fmeca.updatedAt) {
        fmeca.updatedAt = new Date(fmeca.updatedAt as unknown as string);
      }
    });
    
    return assetFmeca;
  }
  
  async createAssetFmeca(insertFmeca: InsertAssetFmeca): Promise<AssetFmeca> {
    const stmt = this.db.prepare(`
      INSERT INTO asset_fmeca (
        tagNumber, assetDescription, assetFunction, component, failureMode,
        cause, effect, severity, severityJustification, probability,
        probabilityJustification, detection, detectionJustification, rpn,
        action, responsibility, targetDate, completionDate, verifiedBy,
        effectivenessVerified, comments, createdBy
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = new Date();
    
    const info = stmt.run(
      insertFmeca.tagNumber,
      insertFmeca.assetDescription,
      insertFmeca.assetFunction,
      insertFmeca.component,
      insertFmeca.failureMode,
      insertFmeca.cause,
      insertFmeca.effect,
      insertFmeca.severity,
      insertFmeca.severityJustification,
      insertFmeca.probability,
      insertFmeca.probabilityJustification,
      insertFmeca.detection,
      insertFmeca.detectionJustification,
      insertFmeca.rpn,
      insertFmeca.action,
      insertFmeca.responsibility,
      insertFmeca.targetDate,
      insertFmeca.completionDate || null,
      insertFmeca.verifiedBy || null,
      insertFmeca.effectivenessVerified || null,
      insertFmeca.comments || null,
      insertFmeca.createdBy || null
    );
    
    const id = info.lastInsertRowid as number;
    const getStmt = this.db.prepare('SELECT * FROM asset_fmeca WHERE id = ?');
    const assetFmeca = getStmt.get(id) as AssetFmeca;
    
    // Convert date strings to Date objects
    if (assetFmeca.createdAt) {
      assetFmeca.createdAt = new Date(assetFmeca.createdAt as unknown as string);
    }
    if (assetFmeca.updatedAt) {
      assetFmeca.updatedAt = new Date(assetFmeca.updatedAt as unknown as string);
    }
    
    return assetFmeca;
  }
  
  async updateAssetFmeca(id: number, fmecaUpdate: Partial<InsertAssetFmeca>): Promise<AssetFmeca | undefined> {
    const getStmt = this.db.prepare('SELECT * FROM asset_fmeca WHERE id = ?');
    const assetFmeca = getStmt.get(id) as AssetFmeca | undefined;
    if (!assetFmeca) return undefined;
    
    const updateFields = ['updatedAt = CURRENT_TIMESTAMP'];
    const updateValues = [];
    
    for (const [key, value] of Object.entries(fmecaUpdate)) {
      if (value !== undefined && key !== 'id') {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }
    
    if (updateFields.length <= 1) return assetFmeca;
    
    const stmt = this.db.prepare(`
      UPDATE asset_fmeca SET ${updateFields.join(', ')} WHERE id = ?
    `);
    
    stmt.run(...updateValues, id);
    
    const updatedAssetFmeca = getStmt.get(id) as AssetFmeca;
    
    // Convert date strings to Date objects
    if (updatedAssetFmeca.createdAt) {
      updatedAssetFmeca.createdAt = new Date(updatedAssetFmeca.createdAt as unknown as string);
    }
    if (updatedAssetFmeca.updatedAt) {
      updatedAssetFmeca.updatedAt = new Date(updatedAssetFmeca.updatedAt as unknown as string);
    }
    
    return updatedAssetFmeca;
  }
  
  async deleteAssetFmeca(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM asset_fmeca WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }
  
  // System FMECA operations
  
  async getSystemFmecaBySystemName(systemName: string): Promise<SystemFmeca[]> {
    const stmt = this.db.prepare('SELECT * FROM system_fmeca WHERE systemName = ?');
    const systemFmeca = stmt.all(systemName) as SystemFmeca[];
    
    // Convert date strings to Date objects
    systemFmeca.forEach(fmeca => {
      if (fmeca.createdAt) {
        fmeca.createdAt = new Date(fmeca.createdAt as unknown as string);
      }
      if (fmeca.updatedAt) {
        fmeca.updatedAt = new Date(fmeca.updatedAt as unknown as string);
      }
    });
    
    return systemFmeca;
  }
  
  async getAllSystemFmeca(): Promise<SystemFmeca[]> {
    const stmt = this.db.prepare('SELECT * FROM system_fmeca ORDER BY systemName');
    const systemFmeca = stmt.all() as SystemFmeca[];
    
    // Convert date strings to Date objects
    systemFmeca.forEach(fmeca => {
      if (fmeca.createdAt) {
        fmeca.createdAt = new Date(fmeca.createdAt as unknown as string);
      }
      if (fmeca.updatedAt) {
        fmeca.updatedAt = new Date(fmeca.updatedAt as unknown as string);
      }
    });
    
    return systemFmeca;
  }
  
  async createSystemFmeca(insertFmeca: InsertSystemFmeca): Promise<SystemFmeca> {
    const stmt = this.db.prepare(`
      INSERT INTO system_fmeca (
        systemId, systemName, systemFunction, subsystem, failureMode,
        cause, effect, severity, severityJustification, probability,
        probabilityJustification, detection, detectionJustification, rpn,
        action, responsibility, targetDate, completionDate, verifiedBy,
        effectivenessVerified, comments, createdBy
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      insertFmeca.systemId,
      insertFmeca.systemName,
      insertFmeca.systemFunction,
      insertFmeca.subsystem,
      insertFmeca.failureMode,
      insertFmeca.cause,
      insertFmeca.effect,
      insertFmeca.severity,
      insertFmeca.severityJustification,
      insertFmeca.probability,
      insertFmeca.probabilityJustification,
      insertFmeca.detection,
      insertFmeca.detectionJustification,
      insertFmeca.rpn,
      insertFmeca.action,
      insertFmeca.responsibility,
      insertFmeca.targetDate,
      insertFmeca.completionDate || null,
      insertFmeca.verifiedBy || null,
      insertFmeca.effectivenessVerified || null,
      insertFmeca.comments || null,
      insertFmeca.createdBy || null
    );
    
    const id = info.lastInsertRowid as number;
    const getStmt = this.db.prepare('SELECT * FROM system_fmeca WHERE id = ?');
    const systemFmeca = getStmt.get(id) as SystemFmeca;
    
    // Convert date strings to Date objects
    if (systemFmeca.createdAt) {
      systemFmeca.createdAt = new Date(systemFmeca.createdAt as unknown as string);
    }
    if (systemFmeca.updatedAt) {
      systemFmeca.updatedAt = new Date(systemFmeca.updatedAt as unknown as string);
    }
    
    return systemFmeca;
  }
  
  async updateSystemFmeca(id: number, fmecaUpdate: Partial<InsertSystemFmeca>): Promise<SystemFmeca | undefined> {
    const getStmt = this.db.prepare('SELECT * FROM system_fmeca WHERE id = ?');
    const systemFmeca = getStmt.get(id) as SystemFmeca | undefined;
    if (!systemFmeca) return undefined;
    
    const updateFields = ['updatedAt = CURRENT_TIMESTAMP'];
    const updateValues = [];
    
    for (const [key, value] of Object.entries(fmecaUpdate)) {
      if (value !== undefined && key !== 'id') {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }
    
    if (updateFields.length <= 1) return systemFmeca;
    
    const stmt = this.db.prepare(`
      UPDATE system_fmeca SET ${updateFields.join(', ')} WHERE id = ?
    `);
    
    stmt.run(...updateValues, id);
    
    const updatedSystemFmeca = getStmt.get(id) as SystemFmeca;
    
    // Convert date strings to Date objects
    if (updatedSystemFmeca.createdAt) {
      updatedSystemFmeca.createdAt = new Date(updatedSystemFmeca.createdAt as unknown as string);
    }
    if (updatedSystemFmeca.updatedAt) {
      updatedSystemFmeca.updatedAt = new Date(updatedSystemFmeca.updatedAt as unknown as string);
    }
    
    return updatedSystemFmeca;
  }
  
  async deleteSystemFmeca(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM system_fmeca WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }
  
  // Asset FMECA History operations
  
  async getAssetFmecaHistory(id: number): Promise<AssetFmecaHistory | undefined> {
    const stmt = this.db.prepare('SELECT * FROM asset_fmeca_history WHERE id = ?');
    const assetFmecaHistory = stmt.get(id) as AssetFmecaHistory | undefined;
    
    if (assetFmecaHistory) {
      // Convert date strings to Date objects
      if (assetFmecaHistory.createdAt) {
        assetFmecaHistory.createdAt = new Date(assetFmecaHistory.createdAt as unknown as string);
      }
      if (assetFmecaHistory.updatedAt) {
        assetFmecaHistory.updatedAt = new Date(assetFmecaHistory.updatedAt as unknown as string);
      }
    }
    
    return assetFmecaHistory;
  }
  
  async getAssetFmecaHistoryByFmecaId(assetFmecaId: number): Promise<AssetFmecaHistory[]> {
    const stmt = this.db.prepare('SELECT * FROM asset_fmeca_history WHERE assetFmecaId = ? ORDER BY version DESC');
    const assetFmecaHistory = stmt.all(assetFmecaId) as AssetFmecaHistory[];
    
    // Convert date strings to Date objects
    assetFmecaHistory.forEach(history => {
      if (history.createdAt) {
        history.createdAt = new Date(history.createdAt as unknown as string);
      }
      if (history.updatedAt) {
        history.updatedAt = new Date(history.updatedAt as unknown as string);
      }
    });
    
    return assetFmecaHistory;
  }
  
  async getAssetFmecaHistoryByTagNumber(tagNumber: string): Promise<AssetFmecaHistory[]> {
    const stmt = this.db.prepare('SELECT * FROM asset_fmeca_history WHERE tagNumber = ? ORDER BY version DESC');
    const assetFmecaHistory = stmt.all(tagNumber) as AssetFmecaHistory[];
    
    // Convert date strings to Date objects
    assetFmecaHistory.forEach(history => {
      if (history.createdAt) {
        history.createdAt = new Date(history.createdAt as unknown as string);
      }
      if (history.updatedAt) {
        history.updatedAt = new Date(history.updatedAt as unknown as string);
      }
    });
    
    return assetFmecaHistory;
  }
  
  async createAssetFmecaHistory(insertHistory: InsertAssetFmecaHistory): Promise<AssetFmecaHistory> {
    const stmt = this.db.prepare(`
      INSERT INTO asset_fmeca_history (
        assetFmecaId, status, historyReason, version, tagNumber, assetDescription,
        assetFunction, component, failureMode, cause, effect, severity,
        severityJustification, probability, probabilityJustification, detection,
        detectionJustification, rpn, action, responsibility, targetDate,
        completionDate, verifiedBy, effectivenessVerified, comments, createdBy
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      insertHistory.assetFmecaId,
      insertHistory.status,
      insertHistory.historyReason,
      insertHistory.version,
      insertHistory.tagNumber,
      insertHistory.assetDescription,
      insertHistory.assetFunction,
      insertHistory.component,
      insertHistory.failureMode,
      insertHistory.cause,
      insertHistory.effect,
      insertHistory.severity,
      insertHistory.severityJustification,
      insertHistory.probability,
      insertHistory.probabilityJustification,
      insertHistory.detection,
      insertHistory.detectionJustification,
      insertHistory.rpn,
      insertHistory.action,
      insertHistory.responsibility,
      insertHistory.targetDate,
      insertHistory.completionDate || null,
      insertHistory.verifiedBy || null,
      insertHistory.effectivenessVerified || null,
      insertHistory.comments || null,
      insertHistory.createdBy || null
    );
    
    const id = info.lastInsertRowid as number;
    return this.getAssetFmecaHistory(id) as Promise<AssetFmecaHistory>;
  }
  
  async updateAssetFmecaHistory(id: number, updateData: Partial<AssetFmecaHistory>): Promise<AssetFmecaHistory | undefined> {
    const assetFmecaHistory = await this.getAssetFmecaHistory(id);
    if (!assetFmecaHistory) return undefined;
    
    const updateFields = ['updatedAt = CURRENT_TIMESTAMP'];
    const updateValues = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined && key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }
    
    if (updateFields.length <= 1) return assetFmecaHistory;
    
    const stmt = this.db.prepare(`
      UPDATE asset_fmeca_history SET ${updateFields.join(', ')} WHERE id = ?
    `);
    
    stmt.run(...updateValues, id);
    
    return this.getAssetFmecaHistory(id);
  }
  
  async getLatestAssetFmecaHistory(assetFmecaId: number): Promise<AssetFmecaHistory | undefined> {
    const stmt = this.db.prepare(`
      SELECT * FROM asset_fmeca_history 
      WHERE assetFmecaId = ? 
      ORDER BY version DESC 
      LIMIT 1
    `);
    
    const history = stmt.get(assetFmecaId) as AssetFmecaHistory | undefined;
    
    if (history) {
      // Convert date strings to Date objects
      if (history.createdAt) {
        history.createdAt = new Date(history.createdAt as unknown as string);
      }
      if (history.updatedAt) {
        history.updatedAt = new Date(history.updatedAt as unknown as string);
      }
    }
    
    return history;
  }
  
  // System FMECA History operations
  
  async getSystemFmecaHistory(id: number): Promise<SystemFmecaHistory | undefined> {
    const stmt = this.db.prepare('SELECT * FROM system_fmeca_history WHERE id = ?');
    const systemFmecaHistory = stmt.get(id) as SystemFmecaHistory | undefined;
    
    if (systemFmecaHistory) {
      // Convert date strings to Date objects
      if (systemFmecaHistory.createdAt) {
        systemFmecaHistory.createdAt = new Date(systemFmecaHistory.createdAt as unknown as string);
      }
      if (systemFmecaHistory.updatedAt) {
        systemFmecaHistory.updatedAt = new Date(systemFmecaHistory.updatedAt as unknown as string);
      }
    }
    
    return systemFmecaHistory;
  }
  
  async getSystemFmecaHistoryByFmecaId(systemFmecaId: number): Promise<SystemFmecaHistory[]> {
    const stmt = this.db.prepare('SELECT * FROM system_fmeca_history WHERE systemFmecaId = ? ORDER BY version DESC');
    const systemFmecaHistory = stmt.all(systemFmecaId) as SystemFmecaHistory[];
    
    // Convert date strings to Date objects
    systemFmecaHistory.forEach(history => {
      if (history.createdAt) {
        history.createdAt = new Date(history.createdAt as unknown as string);
      }
      if (history.updatedAt) {
        history.updatedAt = new Date(history.updatedAt as unknown as string);
      }
    });
    
    return systemFmecaHistory;
  }
  
  async getSystemFmecaHistoryBySystemName(systemName: string): Promise<SystemFmecaHistory[]> {
    const stmt = this.db.prepare('SELECT * FROM system_fmeca_history WHERE systemName = ? ORDER BY version DESC');
    const systemFmecaHistory = stmt.all(systemName) as SystemFmecaHistory[];
    
    // Convert date strings to Date objects
    systemFmecaHistory.forEach(history => {
      if (history.createdAt) {
        history.createdAt = new Date(history.createdAt as unknown as string);
      }
      if (history.updatedAt) {
        history.updatedAt = new Date(history.updatedAt as unknown as string);
      }
    });
    
    return systemFmecaHistory;
  }
  
  async createSystemFmecaHistory(insertHistory: InsertSystemFmecaHistory): Promise<SystemFmecaHistory> {
    const stmt = this.db.prepare(`
      INSERT INTO system_fmeca_history (
        systemFmecaId, status, historyReason, version, systemId, systemName,
        systemFunction, subsystem, failureMode, cause, effect, severity,
        severityJustification, probability, probabilityJustification, detection,
        detectionJustification, rpn, action, responsibility, targetDate,
        completionDate, verifiedBy, effectivenessVerified, comments, createdBy
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      insertHistory.systemFmecaId,
      insertHistory.status,
      insertHistory.historyReason,
      insertHistory.version,
      insertHistory.systemId,
      insertHistory.systemName,
      insertHistory.systemFunction,
      insertHistory.subsystem,
      insertHistory.failureMode,
      insertHistory.cause,
      insertHistory.effect,
      insertHistory.severity,
      insertHistory.severityJustification,
      insertHistory.probability,
      insertHistory.probabilityJustification,
      insertHistory.detection,
      insertHistory.detectionJustification,
      insertHistory.rpn,
      insertHistory.action,
      insertHistory.responsibility,
      insertHistory.targetDate,
      insertHistory.completionDate || null,
      insertHistory.verifiedBy || null,
      insertHistory.effectivenessVerified || null,
      insertHistory.comments || null,
      insertHistory.createdBy || null
    );
    
    const id = info.lastInsertRowid as number;
    return this.getSystemFmecaHistory(id) as Promise<SystemFmecaHistory>;
  }
  
  async updateSystemFmecaHistory(id: number, updateData: Partial<SystemFmecaHistory>): Promise<SystemFmecaHistory | undefined> {
    const systemFmecaHistory = await this.getSystemFmecaHistory(id);
    if (!systemFmecaHistory) return undefined;
    
    const updateFields = ['updatedAt = CURRENT_TIMESTAMP'];
    const updateValues = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined && key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }
    
    if (updateFields.length <= 1) return systemFmecaHistory;
    
    const stmt = this.db.prepare(`
      UPDATE system_fmeca_history SET ${updateFields.join(', ')} WHERE id = ?
    `);
    
    stmt.run(...updateValues, id);
    
    return this.getSystemFmecaHistory(id);
  }
  
  async getLatestSystemFmecaHistory(systemFmecaId: number): Promise<SystemFmecaHistory | undefined> {
    const stmt = this.db.prepare(`
      SELECT * FROM system_fmeca_history 
      WHERE systemFmecaId = ? 
      ORDER BY version DESC 
      LIMIT 1
    `);
    
    const history = stmt.get(systemFmecaId) as SystemFmecaHistory | undefined;
    
    if (history) {
      // Convert date strings to Date objects
      if (history.createdAt) {
        history.createdAt = new Date(history.createdAt as unknown as string);
      }
      if (history.updatedAt) {
        history.updatedAt = new Date(history.updatedAt as unknown as string);
      }
    }
    
    return history;
  }
  
  // Clean up database connection when done
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}