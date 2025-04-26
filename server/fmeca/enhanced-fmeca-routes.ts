import express from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { 
  insertAssetFmecaSchema, 
  insertSystemFmecaSchema 
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

export default router;