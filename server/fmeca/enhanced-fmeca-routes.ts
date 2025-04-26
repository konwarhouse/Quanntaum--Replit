import express from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { 
  insertAssetFmecaSchema, 
  insertSystemFmecaSchema,
  insertAssetFmecaHistorySchema,
  insertSystemFmecaHistorySchema,
  FmecaHistoryStatus
} from '@shared/fmeca-schema';

const router = express.Router();

// Enhanced authentication middleware with better development bypass and error handling
const authenticateUser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Check if already authenticated
  if (req.isAuthenticated()) {
    console.log(`FMECA API: Authenticated access by user ${req.user.username}`);
    return next();
  }
  
  // For development, always allow bypass for FMECA routes in development
  const isDev = process.env.NODE_ENV === 'development';
  const hasExplicitBypass = req.query.bypass_auth === 'true' || 
                           req.headers['x-bypass-auth'] === 'true';
  
  if (isDev) {
    // In development, either allow explicit bypass or try auto-login
    if (hasExplicitBypass) {
      console.log('FMECA DEV AUTH BYPASS: Allowing access with explicit bypass');
      return next();
    }
    
    // In development, always allow access without trying complicated auto-login
    console.log('FMECA DEV MODE: Allowing access directly in development');
    return next();
  }
  
  // In production, require authentication
  console.log('FMECA authentication failure: User not authenticated');
  return res.status(401).json({ error: 'Not authenticated' });
};

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Asset FMECA Routes

// Get all asset FMECA records
router.get('/asset', async (req, res) => {
  try {
    const records = await storage.getAllAssetFmeca();
    return res.status(200).json(records);
  } catch (error) {
    console.error('Error fetching asset FMECA records:', error);
    return res.status(500).json({ error: 'Failed to fetch asset FMECA records' });
  }
});

// Get asset FMECA records by tag number
router.get('/asset/:tagNumber', async (req, res) => {
  try {
    const { tagNumber } = req.params;
    
    if (!tagNumber) {
      return res.status(400).json({ error: 'Tag number is required' });
    }
    
    const records = await storage.getAssetFmecaByTagNumber(tagNumber);
    return res.status(200).json(records);
  } catch (error) {
    console.error('Error fetching asset FMECA records by tag number:', error);
    return res.status(500).json({ error: 'Failed to fetch asset FMECA records' });
  }
});

// Create a new asset FMECA record
router.post('/asset', async (req, res) => {
  try {
    console.log("Received request to create asset FMECA:", JSON.stringify(req.body, null, 2));
    
    const validatedData = insertAssetFmecaSchema.parse(req.body);
    
    // Set created by if user is authenticated
    if (req.user && req.user.id) {
      validatedData.createdBy = req.user.id;
    }
    
    console.log("Validated data:", JSON.stringify(validatedData, null, 2));
    const record = await storage.createAssetFmeca(validatedData);
    console.log("Created asset FMECA record:", JSON.stringify(record, null, 2));
    
    // Create a history record to track this initial creation
    try {
      // Prepare history data from the original record
      const historyData = {
        assetFmecaId: record.id,
        version: 1,
        status: FmecaHistoryStatus.ACTIVE,
        historyReason: "Initial creation",
        // Copy all the fields from the original record
        ...record,
        // Override the id to avoid conflict
        id: undefined
      };
      
      // Create history record
      console.log("Creating initial asset FMECA history record");
      await storage.createAssetFmecaHistory(historyData);
      console.log("Initial history record created successfully");
    } catch (historyError) {
      // Just log the error but don't fail the main request
      console.error("Error creating initial history record:", historyError);
    }
    
    return res.status(201).json(record);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    
    console.error('Error creating asset FMECA record:', error);
    return res.status(500).json({ error: 'Failed to create asset FMECA record' });
  }
});

// Update an asset FMECA record
router.put('/asset/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Valid ID is required' });
    }
    
    const recordId = Number(id);
    
    // Don't validate against the full schema to allow partial updates
    const updatedRecord = await storage.updateAssetFmeca(recordId, req.body);
    
    if (!updatedRecord) {
      return res.status(404).json({ error: 'Asset FMECA record not found' });
    }
    
    // Create a history record to track this update
    try {
      // Get the latest version number
      const latestHistory = await storage.getLatestAssetFmecaHistory(recordId);
      const nextVersion = latestHistory ? latestHistory.version + 1 : 1;
      
      // Prepare history data from the updated record
      const historyData = {
        assetFmecaId: updatedRecord.id,
        version: nextVersion,
        status: FmecaHistoryStatus.ACTIVE,
        historyReason: "Manual update",
        // Copy all the fields from the updated record
        ...updatedRecord,
        // Override the id to avoid conflict
        id: undefined
      };
      
      // Create history record
      console.log(`Creating asset FMECA history record (version ${nextVersion})`);
      await storage.createAssetFmecaHistory(historyData);
      console.log("Asset FMECA history record created successfully");
      
      // Also mark previous history record as superseded
      if (latestHistory) {
        // For now, we're not implementing this part as it would require updating
        // existing history records which we haven't implemented in our storage interface
        console.log("Note: Previous history version remains active");
      }
    } catch (historyError) {
      // Just log the error but don't fail the main request
      console.error("Error creating asset FMECA history record:", historyError);
    }
    
    return res.status(200).json(updatedRecord);
  } catch (error) {
    console.error('Error updating asset FMECA record:', error);
    return res.status(500).json({ error: 'Failed to update asset FMECA record' });
  }
});

// Delete an asset FMECA record
router.delete('/asset/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Valid ID is required' });
    }
    
    const recordId = Number(id);
    const success = await storage.deleteAssetFmeca(recordId);
    
    if (!success) {
      return res.status(404).json({ error: 'Asset FMECA record not found' });
    }
    
    return res.status(200).json({ success });
  } catch (error) {
    console.error('Error deleting asset FMECA record:', error);
    return res.status(500).json({ error: 'Failed to delete asset FMECA record' });
  }
});

// System FMECA Routes

// Get all system FMECA records
router.get('/system', async (req, res) => {
  try {
    const records = await storage.getAllSystemFmeca();
    return res.status(200).json(records);
  } catch (error) {
    console.error('Error fetching system FMECA records:', error);
    return res.status(500).json({ error: 'Failed to fetch system FMECA records' });
  }
});

// Get system FMECA records by system name
router.get('/system/:systemName', async (req, res) => {
  try {
    const { systemName } = req.params;
    
    if (!systemName) {
      return res.status(400).json({ error: 'System name is required' });
    }
    
    const records = await storage.getSystemFmecaBySystemName(systemName);
    return res.status(200).json(records);
  } catch (error) {
    console.error('Error fetching system FMECA records by system name:', error);
    return res.status(500).json({ error: 'Failed to fetch system FMECA records' });
  }
});

// Create a new system FMECA record
router.post('/system', async (req, res) => {
  try {
    console.log("Received request to create system FMECA:", JSON.stringify(req.body, null, 2));
    
    const validatedData = insertSystemFmecaSchema.parse(req.body);
    
    // Set created by if user is authenticated
    if (req.user && req.user.id) {
      validatedData.createdBy = req.user.id;
    }
    
    console.log("Validated data:", JSON.stringify(validatedData, null, 2));
    const record = await storage.createSystemFmeca(validatedData);
    console.log("Created system FMECA record:", JSON.stringify(record, null, 2));
    
    // Create a history record to track this initial creation
    try {
      // Prepare history data from the original record
      const historyData = {
        systemFmecaId: record.id,
        version: 1,
        status: FmecaHistoryStatus.ACTIVE,
        historyReason: "Initial creation",
        // Copy all the fields from the original record
        ...record,
        // Override the id to avoid conflict
        id: undefined
      };
      
      // Create history record
      console.log("Creating initial system FMECA history record");
      await storage.createSystemFmecaHistory(historyData);
      console.log("Initial system FMECA history record created successfully");
    } catch (historyError) {
      // Just log the error but don't fail the main request
      console.error("Error creating initial system FMECA history record:", historyError);
    }
    
    return res.status(201).json(record);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    
    console.error('Error creating system FMECA record:', error);
    return res.status(500).json({ error: 'Failed to create system FMECA record' });
  }
});

// Update a system FMECA record
router.put('/system/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Valid ID is required' });
    }
    
    const recordId = Number(id);
    
    // Don't validate against the full schema to allow partial updates
    const updatedRecord = await storage.updateSystemFmeca(recordId, req.body);
    
    if (!updatedRecord) {
      return res.status(404).json({ error: 'System FMECA record not found' });
    }
    
    // Create a history record to track this update
    try {
      // Get the latest version number
      const latestHistory = await storage.getLatestSystemFmecaHistory(recordId);
      const nextVersion = latestHistory ? latestHistory.version + 1 : 1;
      
      // Prepare history data from the updated record
      const historyData = {
        systemFmecaId: updatedRecord.id,
        version: nextVersion,
        status: FmecaHistoryStatus.ACTIVE,
        historyReason: "Manual update",
        // Copy all the fields from the updated record
        ...updatedRecord,
        // Override the id to avoid conflict
        id: undefined
      };
      
      // Create history record
      console.log(`Creating system FMECA history record (version ${nextVersion})`);
      await storage.createSystemFmecaHistory(historyData);
      console.log("System FMECA history record created successfully");
      
      // Also mark previous history record as superseded
      if (latestHistory) {
        // For now, we're not implementing this part as it would require updating
        // existing history records which we haven't implemented in our storage interface
        console.log("Note: Previous history version remains active");
      }
    } catch (historyError) {
      // Just log the error but don't fail the main request
      console.error("Error creating system FMECA history record:", historyError);
    }
    
    return res.status(200).json(updatedRecord);
  } catch (error) {
    console.error('Error updating system FMECA record:', error);
    return res.status(500).json({ error: 'Failed to update system FMECA record' });
  }
});

// Delete a system FMECA record
router.delete('/system/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Valid ID is required' });
    }
    
    const recordId = Number(id);
    const success = await storage.deleteSystemFmeca(recordId);
    
    if (!success) {
      return res.status(404).json({ error: 'System FMECA record not found' });
    }
    
    return res.status(200).json({ success });
  } catch (error) {
    console.error('Error deleting system FMECA record:', error);
    return res.status(500).json({ error: 'Failed to delete system FMECA record' });
  }
});

// FMECA History Routes

// Asset FMECA History

// Get asset FMECA history by FMECA ID
router.get('/asset/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Valid ID is required' });
    }
    
    const recordId = Number(id);
    const history = await storage.getAssetFmecaHistoryByFmecaId(recordId);
    
    return res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching asset FMECA history:', error);
    return res.status(500).json({ error: 'Failed to fetch asset FMECA history' });
  }
});

// Get asset FMECA history by tag number
router.get('/asset/history/:tagNumber', async (req, res) => {
  try {
    const { tagNumber } = req.params;
    
    if (!tagNumber) {
      return res.status(400).json({ error: 'Tag number is required' });
    }
    
    const history = await storage.getAssetFmecaHistoryByTagNumber(tagNumber);
    
    return res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching asset FMECA history by tag number:', error);
    return res.status(500).json({ error: 'Failed to fetch asset FMECA history' });
  }
});

// Get latest asset FMECA history version for a specific FMECA record
router.get('/asset/:id/history/latest', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Valid ID is required' });
    }
    
    const recordId = Number(id);
    const latestHistory = await storage.getLatestAssetFmecaHistory(recordId);
    
    if (!latestHistory) {
      return res.status(404).json({ error: 'No history found for this FMECA record' });
    }
    
    return res.status(200).json(latestHistory);
  } catch (error) {
    console.error('Error fetching latest asset FMECA history:', error);
    return res.status(500).json({ error: 'Failed to fetch latest asset FMECA history' });
  }
});

// Get a specific asset FMECA history record by ID
router.get('/asset/:fmecaId/history/:historyId', async (req, res) => {
  try {
    const { fmecaId, historyId } = req.params;
    
    if (!fmecaId || isNaN(Number(fmecaId))) {
      return res.status(400).json({ error: 'Valid FMECA ID is required' });
    }
    
    if (!historyId || isNaN(Number(historyId))) {
      return res.status(400).json({ error: 'Valid history ID is required' });
    }
    
    const recordId = Number(historyId);
    const history = await storage.getAssetFmecaHistory(recordId);
    
    if (!history) {
      return res.status(404).json({ error: 'Asset FMECA history record not found' });
    }
    
    // Verify that this history record belongs to the specified FMECA
    if (history.assetFmecaId !== Number(fmecaId)) {
      return res.status(404).json({ error: 'History record does not match the specified FMECA ID' });
    }
    
    return res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching specific asset FMECA history record:', error);
    return res.status(500).json({ error: 'Failed to fetch asset FMECA history record' });
  }
});

// System FMECA History

// Get system FMECA history by FMECA ID
router.get('/system/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Valid ID is required' });
    }
    
    const recordId = Number(id);
    const history = await storage.getSystemFmecaHistoryByFmecaId(recordId);
    
    return res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching system FMECA history:', error);
    return res.status(500).json({ error: 'Failed to fetch system FMECA history' });
  }
});

// Get system FMECA history by system name
router.get('/system/history/:systemName', async (req, res) => {
  try {
    const { systemName } = req.params;
    
    if (!systemName) {
      return res.status(400).json({ error: 'System name is required' });
    }
    
    const history = await storage.getSystemFmecaHistoryBySystemName(systemName);
    
    return res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching system FMECA history by system name:', error);
    return res.status(500).json({ error: 'Failed to fetch system FMECA history' });
  }
});

// Get latest system FMECA history version for a specific FMECA record
router.get('/system/:id/history/latest', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Valid ID is required' });
    }
    
    const recordId = Number(id);
    const latestHistory = await storage.getLatestSystemFmecaHistory(recordId);
    
    if (!latestHistory) {
      return res.status(404).json({ error: 'No history found for this FMECA record' });
    }
    
    return res.status(200).json(latestHistory);
  } catch (error) {
    console.error('Error fetching latest system FMECA history:', error);
    return res.status(500).json({ error: 'Failed to fetch latest system FMECA history' });
  }
});

// Get a specific system FMECA history record by ID
router.get('/system/:fmecaId/history/:historyId', async (req, res) => {
  try {
    const { fmecaId, historyId } = req.params;
    
    if (!fmecaId || isNaN(Number(fmecaId))) {
      return res.status(400).json({ error: 'Valid FMECA ID is required' });
    }
    
    if (!historyId || isNaN(Number(historyId))) {
      return res.status(400).json({ error: 'Valid history ID is required' });
    }
    
    const recordId = Number(historyId);
    const history = await storage.getSystemFmecaHistory(recordId);
    
    if (!history) {
      return res.status(404).json({ error: 'System FMECA history record not found' });
    }
    
    // Verify that this history record belongs to the specified FMECA
    if (history.systemFmecaId !== Number(fmecaId)) {
      return res.status(404).json({ error: 'History record does not match the specified FMECA ID' });
    }
    
    return res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching specific system FMECA history record:', error);
    return res.status(500).json({ error: 'Failed to fetch system FMECA history record' });
  }
});

// Route to get a history record by ID (doesn't need parent FMECA ID)
router.get('/asset/history/:historyId', async (req, res) => {
  try {
    const { historyId } = req.params;
    
    if (!historyId || isNaN(Number(historyId))) {
      return res.status(400).json({ error: 'Valid history ID is required' });
    }
    
    const recordId = Number(historyId);
    const history = await storage.getAssetFmecaHistory(recordId);
    
    if (!history) {
      return res.status(404).json({ error: 'Asset FMECA history record not found' });
    }
    
    return res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching asset FMECA history record:', error);
    return res.status(500).json({ error: 'Failed to fetch asset FMECA history record' });
  }
});

// Route to get a system history record by ID (doesn't need parent FMECA ID)
router.get('/system/history/:historyId', async (req, res) => {
  try {
    const { historyId } = req.params;
    
    if (!historyId || isNaN(Number(historyId))) {
      return res.status(400).json({ error: 'Valid history ID is required' });
    }
    
    const recordId = Number(historyId);
    const history = await storage.getSystemFmecaHistory(recordId);
    
    if (!history) {
      return res.status(404).json({ error: 'System FMECA history record not found' });
    }
    
    return res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching system FMECA history record:', error);
    return res.status(500).json({ error: 'Failed to fetch system FMECA history record' });
  }
});

// Update asset FMECA history record
router.put('/asset/history/:historyId', async (req, res) => {
  try {
    const { historyId } = req.params;
    
    if (!historyId || isNaN(Number(historyId))) {
      return res.status(400).json({ error: 'Valid history ID is required' });
    }
    
    const recordId = Number(historyId);
    const existingRecord = await storage.getAssetFmecaHistory(recordId);
    
    if (!existingRecord) {
      return res.status(404).json({ error: 'Asset FMECA history record not found' });
    }
    
    // Validate update data
    const updateData = {
      ...req.body,
      // Ensure these fields are properly typed/converted
      severity: Number(req.body.severity),
      probability: Number(req.body.probability),
      detection: Number(req.body.detection),
      rpn: Number(req.body.rpn),
      // Convert empty strings to null for optional fields
      completionDate: req.body.completionDate || null,
      verifiedBy: req.body.verifiedBy || null,
      effectivenessVerified: req.body.effectivenessVerified || null,
      comments: req.body.comments || null
    };
    
    // Update the record
    const updatedRecord = await storage.updateAssetFmecaHistory(recordId, updateData);
    
    if (!updatedRecord) {
      return res.status(500).json({ error: 'Failed to update asset FMECA history record' });
    }
    
    return res.status(200).json(updatedRecord);
  } catch (error) {
    console.error('Error updating asset FMECA history record:', error);
    return res.status(500).json({ error: 'Failed to update asset FMECA history record' });
  }
});

// Update system FMECA history record
router.put('/system/history/:historyId', async (req, res) => {
  try {
    const { historyId } = req.params;
    
    if (!historyId || isNaN(Number(historyId))) {
      return res.status(400).json({ error: 'Valid history ID is required' });
    }
    
    const recordId = Number(historyId);
    const existingRecord = await storage.getSystemFmecaHistory(recordId);
    
    if (!existingRecord) {
      return res.status(404).json({ error: 'System FMECA history record not found' });
    }
    
    // Validate update data
    const updateData = {
      ...req.body,
      // Ensure these fields are properly typed/converted
      severity: Number(req.body.severity),
      probability: Number(req.body.probability),
      detection: Number(req.body.detection),
      rpn: Number(req.body.rpn),
      // Convert empty strings to null for optional fields
      completionDate: req.body.completionDate || null,
      verifiedBy: req.body.verifiedBy || null,
      effectivenessVerified: req.body.effectivenessVerified || null,
      comments: req.body.comments || null
    };
    
    // Update the record
    const updatedRecord = await storage.updateSystemFmecaHistory(recordId, updateData);
    
    if (!updatedRecord) {
      return res.status(500).json({ error: 'Failed to update system FMECA history record' });
    }
    
    return res.status(200).json(updatedRecord);
  } catch (error) {
    console.error('Error updating system FMECA history record:', error);
    return res.status(500).json({ error: 'Failed to update system FMECA history record' });
  }
});

export default router;