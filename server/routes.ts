import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { OpenAI } from "openai";
import * as XLSX from 'xlsx';
import { UserRole } from "@shared/auth";
import { 
  insertMessageSchema, 
  ChatCompletionRequest, 
  insertAssetSchema, 
  insertMaintenanceEventSchema, 
  insertFailureModeSchema,
  insertFailureHistorySchema,
  insertEquipmentClassSchema,
  WeibullParameters,
  MaintenanceOptimizationParameters,
  RCMParameters,
  SimulationParameters,
  FailureHistory
} from "@shared/schema";
import { z } from "zod";
import { 
  generateWeibullAnalysis, 
  calculateOptimalPMInterval, 
  calculateTotalCost, 
  determineMaintenanceStrategy,
  runSimulation
} from "./reliability/calculations";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get chat history for a user
  app.get("/api/messages/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const messages = await storage.getMessagesByUsername(username);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Handle chat completion with OpenAI
  app.post("/api/chat", async (req, res) => {
    try {
      // Validate request body
      const schema = z.object({
        username: z.string().min(1),
        message: z.string().min(1),
      });
      
      const validatedData = schema.parse(req.body) as ChatCompletionRequest;
      const { username, message } = validatedData;
      
      // Save user message
      const userMessageData = insertMessageSchema.parse({
        content: message,
        role: "user",
        username,
      });
      await storage.createMessage(userMessageData);
      
      // Get chat history to provide context to OpenAI
      const history = await storage.getMessagesByUsername(username);
      const chatHistory = history.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));
      
      // Default fallback response if OpenAI API fails
      let responseContent = "I'm currently experiencing connectivity issues with my knowledge base. " +
        "In the meantime, I can tell you that Reliability Centered Maintenance (RCM) is a process to ensure that assets continue to do what their users require in their present operating context. " +
        "Weibull analysis is a method for modeling and analyzing failure data, where the Weibull distribution is characterized by shape parameter (β) and scale parameter (η). " +
        "Would you like to know more about asset management or reliability engineering?";
      
      try {
        // Check if OpenAI API key is available
        if (!process.env.OPENAI_API_KEY) {
          console.warn("OPENAI_API_KEY is not set. Using fallback response.");
          // We'll use the fallback response defined above
        } else {
          // Try to call OpenAI API
          // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: "You are a helpful, friendly AI assistant. You can also provide information about reliability engineering, Weibull analysis, and Reliability-Centered Maintenance (RCM)." },
              ...chatHistory.slice(-10), // limit context to last 10 messages
              { role: "user", content: message }
            ],
            temperature: 0.7,
            max_tokens: 800,
          });
          
          // Only update responseContent if we got a valid response
          if (response.choices && response.choices.length > 0 && response.choices[0].message) {
            responseContent = response.choices[0].message.content || responseContent;
          }
        }
      } catch (error) {
        console.error("Error in chat completion:", error);
        if (error instanceof Error) {
          console.error("Error details:", error.message);
        }
        // We'll use the fallback response defined above
      }
      
      // Save AI response
      const aiMessageData = insertMessageSchema.parse({
        content: responseContent,
        role: "assistant",
        username,
      });
      const savedAiMessage = await storage.createMessage(aiMessageData);
      
      res.json({
        message: savedAiMessage,
        success: true,
      });
    } catch (error) {
      console.error("Error in chat completion:", error);
      res.status(500).json({ 
        message: "Failed to process chat request",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ========== Reliability Module API Endpoints ==========

  // Asset endpoints
  app.get("/api/assets", async (req, res) => {
    try {
      const assets = await storage.getAssets();
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.get("/api/assets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const asset = await storage.getAsset(id);
      
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      
      res.json(asset);
    } catch (error) {
      console.error("Error fetching asset:", error);
      res.status(500).json({ message: "Failed to fetch asset" });
    }
  });

  app.post("/api/assets", async (req, res) => {
    try {
      const assetData = insertAssetSchema.parse(req.body);
      const asset = await storage.createAsset(assetData);
      res.status(201).json(asset);
    } catch (error) {
      console.error("Error creating asset:", error);
      res.status(500).json({ 
        message: "Failed to create asset",
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Batch import assets
  app.post("/api/assets/batch", async (req, res) => {
    try {
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ message: "Expected an array of assets" });
      }
      
      const results = [];
      const errors = [];
      
      for (const assetData of req.body) {
        try {
          // Validate each asset individually
          const validatedAsset = insertAssetSchema.parse(assetData);
          
          // Check if asset number already exists
          const existingAssets = await storage.getAssets();
          const duplicateAsset = existingAssets.find(a => a.assetNumber === validatedAsset.assetNumber);
          
          if (duplicateAsset) {
            errors.push({
              assetNumber: validatedAsset.assetNumber,
              error: `Asset number ${validatedAsset.assetNumber} already exists in the database`
            });
            continue;
          }
          
          const asset = await storage.createAsset(validatedAsset);
          results.push(asset);
        } catch (error) {
          console.error("Error creating an asset in batch:", error);
          errors.push({
            asset: assetData,
            error: error instanceof Error ? error.message : "Unknown error"
          });
          // Continue with the rest of the assets even if one fails
        }
      }
      
      res.status(201).json({
        success: true,
        imported: results.length,
        total: req.body.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Error in batch import of assets:", error);
      res.status(500).json({ 
        message: "Failed to import assets",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.put("/api/assets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const assetData = req.body;
      const asset = await storage.updateAsset(id, assetData);
      
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      
      res.json(asset);
    } catch (error) {
      console.error("Error updating asset:", error);
      res.status(500).json({ message: "Failed to update asset" });
    }
  });

  app.delete("/api/assets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAsset(id);
      
      if (!success) {
        return res.status(404).json({ message: "Asset not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting asset:", error);
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });
  
  // Export assets to Excel
  app.get("/api/assets/export/excel", async (req, res) => {
    try {
      const assets = await storage.getAssets();
      
      // Create Excel workbook and worksheet
      const wb = XLSX.utils.book_new();
      
      // Convert assets to worksheet data
      const assetData = assets.map(asset => ({
        "Asset Number": asset.assetNumber,
        "Name": asset.name,
        "Description": asset.description || "",
        "Installation Date": asset.installationDate ? new Date(asset.installationDate).toISOString().split('T')[0] : "",
        "Equipment Class": asset.equipmentClass || "",
        "Criticality": asset.criticality || "",
        "Weibull Beta": asset.weibullBeta,
        "Weibull Eta": asset.weibullEta,
        "Time Unit": asset.timeUnit
      }));
      
      // Create the worksheet
      const ws = XLSX.utils.json_to_sheet(assetData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Assets");
      
      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Asset_Master_Export.xlsx');
      
      // Send the file
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error exporting assets to Excel:", error);
      res.status(500).json({ message: "Failed to export assets to Excel" });
    }
  });

  // Maintenance Event endpoints
  app.get("/api/maintenance-events", async (req, res) => {
    try {
      // Get all assets
      const assets = await storage.getAssets();
      
      // Get all maintenance events for all assets
      const allEvents = [];
      for (const asset of assets) {
        const assetEvents = await storage.getMaintenanceEventsByAssetId(asset.id);
        allEvents.push(...assetEvents);
      }
      
      // Return all events
      res.json(allEvents);
    } catch (error) {
      console.error("Error fetching all maintenance events:", error);
      res.status(500).json({ message: "Failed to fetch maintenance events" });
    }
  });

  app.get("/api/assets/:assetId/maintenance-events", async (req, res) => {
    try {
      const assetId = parseInt(req.params.assetId);
      const events = await storage.getMaintenanceEventsByAssetId(assetId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching maintenance events:", error);
      res.status(500).json({ message: "Failed to fetch maintenance events" });
    }
  });

  app.post("/api/maintenance-events", async (req, res) => {
    try {
      const eventData = insertMaintenanceEventSchema.parse(req.body);
      
      // Verify that the asset ID exists before creating the maintenance event
      const asset = await storage.getAsset(eventData.assetId);
      if (!asset) {
        return res.status(400).json({ 
          message: "Invalid asset ID. The asset ID must match an existing asset in the asset master." 
        });
      }
      
      const event = await storage.createMaintenanceEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating maintenance event:", error);
      res.status(500).json({ message: "Failed to create maintenance event" });
    }
  });
  
  // Batch import maintenance events
  app.post("/api/maintenance-events/batch", async (req, res) => {
    try {
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ message: "Expected an array of maintenance events" });
      }
      
      // First, gather all asset IDs to validate them in one step
      const assetIds = req.body.map(event => event.assetId);
      const uniqueAssetIds = [...new Set(assetIds)];
      const validAssetIds = new Set<number>();
      
      // Verify all asset IDs exist
      await Promise.all(uniqueAssetIds.map(async (assetId) => {
        const asset = await storage.getAsset(assetId);
        if (asset) {
          validAssetIds.add(assetId);
        }
      }));
      
      const results = [];
      const errors = [];
      
      for (const eventData of req.body) {
        try {
          // Validate each event individually
          const validatedEvent = insertMaintenanceEventSchema.parse(eventData);
          
          // Check if asset ID is valid
          if (!validAssetIds.has(validatedEvent.assetId)) {
            errors.push({
              event: eventData,
              error: `Invalid asset ID: ${validatedEvent.assetId}. Asset does not exist in the master data.`
            });
            continue;
          }
          
          const event = await storage.createMaintenanceEvent(validatedEvent);
          results.push(event);
        } catch (error) {
          console.error("Error creating a maintenance event in batch:", error);
          errors.push({
            event: eventData,
            error: error instanceof Error ? error.message : "Unknown error"
          });
          // Continue with the rest of the events even if one fails
        }
      }
      
      res.status(201).json({
        success: true,
        imported: results.length,
        total: req.body.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Error in batch import of maintenance events:", error);
      res.status(500).json({ 
        message: "Failed to import maintenance events",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.delete("/api/maintenance-events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMaintenanceEvent(id);
      
      if (!success) {
        return res.status(404).json({ message: "Maintenance event not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting maintenance event:", error);
      res.status(500).json({ message: "Failed to delete maintenance event" });
    }
  });

  // Failure Mode endpoints
  // Get all failure modes
  app.get("/api/failure-modes", async (req, res) => {
    try {
      // Get all equipment classes from assets
      const assets = await storage.getAssets();
      const equipmentClasses = [...new Set(assets.map(asset => asset.equipmentClass).filter(Boolean))];
      
      // Get failure modes for all equipment classes
      const allPromises = [];
      
      // Add direct fetch for asset-specific failure modes
      allPromises.push(
        Promise.all(
          assets.map(async (asset) => {
            const modes = await storage.getFailureModesByAssetId(asset.id);
            // Enrich each mode with the equipment class from its parent asset if not already set
            return modes.map(mode => ({
              ...mode,
              equipmentClass: mode.equipmentClass || asset.equipmentClass
            }));
          })
        )
      );
      
      // Add fetches for equipment class based failure modes
      for (const eqClass of equipmentClasses) {
        if (eqClass) {
          allPromises.push(storage.getFailureModesByEquipmentClass(eqClass));
        }
      }
      
      // Wait for all fetches to complete
      const results = await Promise.all(allPromises);
      
      // Flatten the array of arrays
      const failureModes = results.flat();
      
      // Remove duplicates (in case some failure modes are shared)
      const uniqueFailureModes = failureModes.filter(
        (mode, index, self) => 
          index === self.findIndex(m => m.id === mode.id)
      );
      
      res.json(uniqueFailureModes);
    } catch (error) {
      console.error("Error fetching all failure modes:", error);
      res.status(500).json({ message: "Failed to fetch failure modes" });
    }
  });
  
  // Get failure modes by equipment class
  app.get("/api/failure-modes/class/:equipmentClass", async (req, res) => {
    try {
      const equipmentClass = req.params.equipmentClass;
      
      // Use the dedicated method to fetch failure modes by equipment class
      const failureModes = await storage.getFailureModesByEquipmentClass(equipmentClass);
      
      res.json(failureModes);
    } catch (error) {
      console.error(`Error fetching failure modes for equipment class ${req.params.equipmentClass}:`, error);
      res.status(500).json({ message: "Failed to fetch failure modes by equipment class" });
    }
  });

  // Get all failure modes
  app.get("/api/failure-modes", async (req, res) => {
    try {
      // Get all failure modes from all assets
      const allAssets = await storage.getAssets();
      const allFailureModes = [];
      
      for (const asset of allAssets) {
        if (asset.id) {
          const failureModes = await storage.getFailureModesByAssetId(asset.id);
          allFailureModes.push(...failureModes);
        }
      }
      
      // Also include failure modes that may not be associated with a specific asset
      // but are associated with an equipment class
      const eqClasses = new Set(allAssets.map(a => a.equipmentClass).filter(Boolean));
      for (const eqClass of eqClasses) {
        if (eqClass) {
          const classFailureModes = await storage.getFailureModesByEquipmentClass(eqClass);
          // Only add those that aren't already in the list
          for (const fm of classFailureModes) {
            if (!allFailureModes.some(existing => existing.id === fm.id)) {
              allFailureModes.push(fm);
            }
          }
        }
      }
      
      res.json(allFailureModes);
    } catch (error) {
      console.error("Error fetching all failure modes:", error);
      res.status(500).json({ message: "Failed to fetch failure modes" });
    }
  });

  // Get failure modes for a specific asset
  app.get("/api/failure-modes/:assetId([0-9]+)", async (req, res) => {
    try {
      const assetId = parseInt(req.params.assetId);
      const failureModes = await storage.getFailureModesByAssetId(assetId);
      res.json(failureModes);
    } catch (error) {
      console.error("Error fetching failure modes:", error);
      res.status(500).json({ message: "Failed to fetch failure modes" });
    }
  });

  app.post("/api/failure-modes", async (req, res) => {
    try {
      // Check if user has admin role via header
      const userRole = req.headers['x-user-role'] as string;
      // For development/demo purposes, allow access if no role header is present
      // In production, this should be properly secured with authentication
      if (userRole && userRole !== 'admin') {
        return res.status(403).json({ 
          message: "Only administrators can create failure modes" 
        });
      }
      
      const failureModeData = insertFailureModeSchema.parse(req.body);
      const failureMode = await storage.createFailureMode(failureModeData);
      res.status(201).json(failureMode);
    } catch (error) {
      console.error("Error creating failure mode:", error);
      res.status(500).json({ message: "Failed to create failure mode" });
    }
  });

  app.put("/api/failure-modes/:id", async (req, res) => {
    try {
      // Check if user has admin role via header
      const userRole = req.headers['x-user-role'] as string;
      // For development/demo purposes, allow access if no role header is present
      // In production, this should be properly secured with authentication
      if (userRole && userRole !== 'admin') {
        return res.status(403).json({ 
          message: "Only administrators can update failure modes" 
        });
      }
      
      const id = parseInt(req.params.id);
      const failureModeData = req.body;
      const failureMode = await storage.updateFailureMode(id, failureModeData);
      
      if (!failureMode) {
        return res.status(404).json({ message: "Failure mode not found" });
      }
      
      res.json(failureMode);
    } catch (error) {
      console.error("Error updating failure mode:", error);
      res.status(500).json({ message: "Failed to update failure mode" });
    }
  });

  app.delete("/api/failure-modes/:id", async (req, res) => {
    try {
      // Check if user has admin role via header
      const userRole = req.headers['x-user-role'] as string;
      // For development/demo purposes, allow access if no role header is present
      // In production, this should be properly secured with authentication
      if (userRole && userRole !== 'admin') {
        return res.status(403).json({ 
          message: "Only administrators can delete failure modes" 
        });
      }
      
      const id = parseInt(req.params.id);
      const success = await storage.deleteFailureMode(id);
      
      if (!success) {
        return res.status(404).json({ message: "Failure mode not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting failure mode:", error);
      res.status(500).json({ message: "Failed to delete failure mode" });
    }
  });
  
  // Failure History endpoints
  app.get("/api/failure-history", async (req, res) => {
    try {
      const assetId = req.query.assetId ? parseInt(req.query.assetId as string) : undefined;
      const failureModeId = req.query.failureModeId ? parseInt(req.query.failureModeId as string) : undefined;
      
      let failureRecords;
      if (assetId) {
        failureRecords = await storage.getFailureHistoryByAssetId(assetId);
      } else if (failureModeId) {
        failureRecords = await storage.getFailureHistoryByFailureModeId(failureModeId);
      } else {
        // Get all failure records when no filter is specified
        // Implement a method to get all failure history records
        failureRecords = await Promise.all(
          (await storage.getAssets()).map(async (asset) => {
            return await storage.getFailureHistoryByAssetId(asset.id);
          })
        );
        // Flatten the array of arrays
        failureRecords = failureRecords.flat();
      }
      
      res.json(failureRecords);
    } catch (error) {
      console.error("Error fetching failure history:", error);
      res.status(500).json({ message: "Failed to fetch failure history" });
    }
  });
  
  app.post("/api/failure-history", async (req, res) => {
    try {
      // Modify the request data to handle date strings properly
      const requestData = {
        ...req.body,
        // Parse date strings into actual Date objects if they're strings
        installationDate: typeof req.body.installationDate === 'string' && req.body.installationDate
          ? new Date(req.body.installationDate) 
          : req.body.installationDate,
        lastFailureDate: typeof req.body.lastFailureDate === 'string' && req.body.lastFailureDate
          ? new Date(req.body.lastFailureDate) 
          : req.body.lastFailureDate,
        failureDate: typeof req.body.failureDate === 'string' 
          ? new Date(req.body.failureDate) 
          : req.body.failureDate,
        repairCompleteDate: typeof req.body.repairCompleteDate === 'string' && req.body.repairCompleteDate
          ? new Date(req.body.repairCompleteDate) 
          : req.body.repairCompleteDate
      };
      
      // Auto-calculate TBF (in days) if lastFailureDate and failureDate are provided but tbfDays is not
      if (requestData.lastFailureDate && requestData.failureDate && requestData.tbfDays === undefined) {
        const lastFailureDate = new Date(requestData.lastFailureDate);
        const failureDate = new Date(requestData.failureDate);
        const diffTime = Math.abs(failureDate.getTime() - lastFailureDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        requestData.tbfDays = diffDays;
      }
      
      // Auto-calculate downtime hours if failureDate and repairCompleteDate are provided but downtimeHours is not
      if (requestData.failureDate && requestData.repairCompleteDate && requestData.downtimeHours === undefined) {
        const failureDate = new Date(requestData.failureDate);
        const repairCompleteDate = new Date(requestData.repairCompleteDate);
        const diffTime = Math.abs(repairCompleteDate.getTime() - failureDate.getTime());
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
        requestData.downtimeHours = diffHours;
      }
      
      // Now parse with the schema
      const failureHistoryData = insertFailureHistorySchema.parse(requestData);
      
      // Create the record in the database
      const failureRecord = await storage.createFailureHistory(failureHistoryData);
      res.status(201).json(failureRecord);
    } catch (error) {
      console.error("Error creating failure history record:", error);
      res.status(500).json({ message: "Failed to create failure history record" });
    }
  });
  
  app.get("/api/failure-history/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const failureRecord = await storage.getFailureHistory(id);
      
      if (!failureRecord) {
        return res.status(404).json({ message: "Failure history record not found" });
      }
      
      res.json(failureRecord);
    } catch (error) {
      console.error("Error fetching failure history record:", error);
      res.status(500).json({ message: "Failed to fetch failure history record" });
    }
  });
  
  app.put("/api/failure-history/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Modify the request data to handle date strings properly
      const requestData = {
        ...req.body,
        // Parse date strings into actual Date objects if they're strings
        installationDate: typeof req.body.installationDate === 'string' && req.body.installationDate
          ? new Date(req.body.installationDate) 
          : req.body.installationDate,
        lastFailureDate: typeof req.body.lastFailureDate === 'string' && req.body.lastFailureDate
          ? new Date(req.body.lastFailureDate) 
          : req.body.lastFailureDate,
        failureDate: typeof req.body.failureDate === 'string' 
          ? new Date(req.body.failureDate) 
          : req.body.failureDate,
        repairCompleteDate: typeof req.body.repairCompleteDate === 'string' && req.body.repairCompleteDate
          ? new Date(req.body.repairCompleteDate) 
          : req.body.repairCompleteDate
      };
      
      // Auto-calculate TBF (in days) if lastFailureDate and failureDate are provided but tbfDays is not
      if (requestData.lastFailureDate && requestData.failureDate && requestData.tbfDays === undefined) {
        const lastFailureDate = new Date(requestData.lastFailureDate);
        const failureDate = new Date(requestData.failureDate);
        const diffTime = Math.abs(failureDate.getTime() - lastFailureDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        requestData.tbfDays = diffDays;
      }
      
      // Auto-calculate downtime hours if failureDate and repairCompleteDate are provided but downtimeHours is not
      if (requestData.failureDate && requestData.repairCompleteDate && requestData.downtimeHours === undefined) {
        const failureDate = new Date(requestData.failureDate);
        const repairCompleteDate = new Date(requestData.repairCompleteDate);
        const diffTime = Math.abs(repairCompleteDate.getTime() - failureDate.getTime());
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
        requestData.downtimeHours = diffHours;
      }
      
      const failureRecord = await storage.updateFailureHistory(id, requestData);
      
      if (!failureRecord) {
        return res.status(404).json({ message: "Failure history record not found" });
      }
      
      res.json(failureRecord);
    } catch (error) {
      console.error("Error updating failure history record:", error);
      res.status(500).json({ message: "Failed to update failure history record" });
    }
  });
  
  app.delete("/api/failure-history/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteFailureHistory(id);
      
      if (!success) {
        return res.status(404).json({ message: "Failure history record not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting failure history record:", error);
      res.status(500).json({ message: "Failed to delete failure history record" });
    }
  });
  
  // Export failure history to Excel
  app.get("/api/failure-history/export/excel", async (req, res) => {
    try {
      const assetId = req.query.assetId ? parseInt(req.query.assetId as string) : undefined;
      const failureModeId = req.query.failureModeId ? parseInt(req.query.failureModeId as string) : undefined;
      
      // Fetch failure records using the same logic as the GET endpoint
      let failureRecords;
      if (assetId) {
        failureRecords = await storage.getFailureHistoryByAssetId(assetId);
      } else if (failureModeId) {
        failureRecords = await storage.getFailureHistoryByFailureModeId(failureModeId);
      } else {
        // Get all failure records when no filter is specified
        failureRecords = await Promise.all(
          (await storage.getAssets()).map(async (asset) => {
            return await storage.getFailureHistoryByAssetId(asset.id);
          })
        );
        // Flatten the array of arrays
        failureRecords = failureRecords.flat();
      }
      
      // Get assets and failure modes to include their names in the export
      const assets = await storage.getAssets();
      const allFailureModes = await Promise.all(
        assets.map(async (asset) => {
          return await storage.getFailureModesByAssetId(asset.id);
        })
      );
      const failureModes = allFailureModes.flat();
      
      // Create Excel workbook and worksheet
      const wb = XLSX.utils.book_new();
      
      // Convert failure records to worksheet data
      const exportData = failureRecords.map(record => {
        const asset = assets.find(a => a.id === record.assetId);
        const failureMode = failureModes.find(fm => fm.id === record.failureModeId);
        
        return {
          "Asset": asset ? `${asset.assetNumber} - ${asset.name}` : `Asset ID: ${record.assetId}`,
          "Failure Mode": failureMode ? failureMode.description : `Mode ID: ${record.failureModeId}`,
          "Failure Date": record.failureDate ? new Date(record.failureDate).toISOString().split('T')[0] : "",
          "Repair Date": record.repairCompleteDate ? new Date(record.repairCompleteDate).toISOString().split('T')[0] : "",
          "Description": record.failureDescription || "",
          "Cause": record.failureCause || "",
          "Downtime (hrs)": record.downtimeHours,
          "Repair Time (hrs)": record.repairTimeHours,
          "RCA Required": record.needsRCA || "no",
          "Classification": record.failureClassification || "",
          "Detection Method": record.failureDetectionMethod || "",
          "Safety Impact": record.safetyImpact || "none",
          "Production Impact": record.productionImpact || "none",
          "Environmental Impact": record.environmentalImpact || "none",
          "Repair Cost": record.repairCost || 0,
          "Consequential Cost": record.consequentialCost || 0,
          "Parts Replaced": record.partsReplaced || "",
          "Repair Actions": record.repairActions || "",
          "Preventability": record.preventability || "",
          "Recorded By": record.recordedBy || "",
          "Record Date": record.recordDate ? new Date(record.recordDate).toISOString().split('T')[0] : ""
        };
      });
      
      // Create the worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Failure History");
      
      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Failure_History_Export.xlsx');
      
      // Send the file
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error exporting failure history to Excel:", error);
      res.status(500).json({ message: "Failed to export failure history to Excel" });
    }
  });

  // Weibull Analysis endpoint
  app.post("/api/weibull-analysis", async (req, res) => {
    try {
      // Validate request body
      const schema = z.object({
        beta: z.number().positive(),
        eta: z.number().positive(),
        timeUnits: z.enum(['hours', 'days', 'months', 'years']),
        timeHorizon: z.number().positive(),
      });
      
      const params = schema.parse(req.body) as WeibullParameters;
      const results = generateWeibullAnalysis(params);
      
      res.json(results);
    } catch (error) {
      console.error("Error in Weibull analysis:", error);
      res.status(500).json({ 
        message: "Failed to perform Weibull analysis",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  })
  
  // Data-driven Weibull Analysis endpoint
  app.post("/api/weibull-analysis/fit", async (req, res) => {
    try {
      // Validate request body
      const schema = z.object({
        assetId: z.number().positive().optional(),
        equipmentClass: z.string().optional(),
        useOperatingHours: z.boolean().default(false),
        timeHorizon: z.number().positive(),
      });
      
      const params = schema.parse(req.body);
      let failureRecords: FailureHistory[] = [];
      
      // Fetch failure history data based on criteria
      if (params.assetId) {
        failureRecords = await storage.getFailureHistoryByAssetId(params.assetId);
      } else if (params.equipmentClass) {
        // Get all assets of this equipment class
        const assets = await storage.getAssets();
        const filteredAssets = assets.filter(asset => asset.equipmentClass === params.equipmentClass);
        
        // Get failure records for all matching assets
        const promises = filteredAssets.map(asset => storage.getFailureHistoryByAssetId(asset.id));
        const results = await Promise.all(promises);
        
        // Flatten the array of arrays
        failureRecords = results.flat();
      } else {
        // If no specific criteria, get all failure records
        const assets = await storage.getAssets();
        const promises = assets.map(asset => storage.getFailureHistoryByAssetId(asset.id));
        const results = await Promise.all(promises);
        failureRecords = results.flat();
      }
      
      // Import the data fitting module
      const { 
        fitWeibullToFailureData, 
        calculateBLife, 
        classifyFailurePattern,
        analyzeFailureMechanisms,
        calculateMTBF
      } = await import('./reliability/weibullDataFitting');
      
      // Try to fit Weibull distribution to the data
      const fitResult = fitWeibullToFailureData(failureRecords, params.useOperatingHours);
      
      // If Weibull fit fails, fall back to basic MTBF calculation
      if (!fitResult) {
        console.log('[DEBUG] Weibull fit failed, trying fallback MTBF calculation');
        // Calculate MTBF directly from the failure data
        const mtbfResult = calculateMTBF(failureRecords, params.useOperatingHours);
        
        if (mtbfResult.mtbf === null) {
          return res.status(400).json({
            message: "Insufficient failure data for analysis. No valid TTF/TBF values found."
          });
        }
        
        console.log(`[DEBUG] MTBF calculated using ${mtbfResult.calculationMethod}: ${mtbfResult.mtbf}`);
        console.log(`[DEBUG] Data points used: ${JSON.stringify(mtbfResult.dataPoints)}`);
        
        // Create a simple analysis using only MTBF
        const timeValues = Array.from({ length: 100 }, (_, i) => (i / 99) * params.timeHorizon);
        
        // Default to exponential distribution (beta=1) for reliability curves when we only have MTBF
        // We already checked mtbfResult.mtbf is not null above
        const mtbfValue = mtbfResult.mtbf as number;
        
        const reliabilityCurve = timeValues.map(time => ({
          time,
          reliability: Math.exp(-time / mtbfValue)
        }));
        
        const failureRateCurve = timeValues.map(time => ({
          time,
          failureRate: 1 / mtbfValue  // Constant failure rate for exponential distribution
        }));
        
        const cumulativeFailureProbability = timeValues.map(time => ({
          time,
          probability: 1 - Math.exp(-time / mtbfValue)
        }));
        
        // Determine asset details for the response
        let assetDetails = null;
        if (params.assetId) {
          const asset = await storage.getAsset(params.assetId);
          assetDetails = {
            assetType: 'specific',
            id: params.assetId,
            label: asset?.name || `Asset ID: ${params.assetId}`
          };
        } else if (params.equipmentClass) {
          assetDetails = {
            assetType: 'class',
            id: null,
            label: params.equipmentClass
          };
        } else {
          assetDetails = {
            assetType: 'all',
            id: null,
            label: 'All Assets'
          };
        }
        
        // Format calculation method for display
        const calculationMethodDisplay = mtbfResult.calculationMethod === 'operatingHours' 
          ? 'Operating Hours' 
          : 'Calendar Days';
        
        // Return the simplified MTBF-based analysis
        return res.json({
          mtbf: mtbfResult.mtbf,
          reliabilityCurve,
          failureRateCurve,
          cumulativeFailureProbability,
          failureCount: failureRecords.length,
          assetDetails,
          // Include enhanced metadata about the calculation
          fallbackCalculation: true,
          calculationMethod: mtbfResult.calculationMethod,
          calculationMethodDisplay: calculationMethodDisplay,
          dataPoints: mtbfResult.dataPoints
        });
      }
      
      // Calculate additional metrics
      const { beta, eta, r2 } = fitResult;
      
      // Generate full analysis using the fitted parameters
      const analysisResults = generateWeibullAnalysis({
        beta,
        eta,
        timeHorizon: params.timeHorizon,
        timeUnits: params.useOperatingHours ? 'hours' : 'days'
      });
      
      // Calculate B10, B50 life values (when 10% and 50% of components fail)
      const b10Life = calculateBLife(beta, eta, 10);
      const b50Life = calculateBLife(beta, eta, 50);
      
      // Classify the failure pattern
      const failurePattern = classifyFailurePattern(beta);
      
      // Analyze common failure mechanisms
      const mechanismAnalysis = analyzeFailureMechanisms(failureRecords);
      
      // Determine what type of asset/component was analyzed
      let assetDetails = null;
      if (params.assetId) {
        // Specific asset analysis
        const asset = await storage.getAsset(params.assetId);
        assetDetails = {
          assetType: 'specific',
          id: params.assetId,
          label: asset?.name || `Asset ID: ${params.assetId}`
        };
      } else if (params.equipmentClass) {
        // Equipment class analysis
        assetDetails = {
          assetType: 'class',
          id: null,
          label: params.equipmentClass
        };
      } else if (req.body.failureModeId) {
        // Failure mode analysis
        const failureMode = await storage.getFailureMode(req.body.failureModeId);
        assetDetails = {
          assetType: 'failureMode',
          id: req.body.failureModeId,
          label: failureMode?.description || `Failure Mode ID: ${req.body.failureModeId}`
        };
      } else {
        // All assets analysis
        assetDetails = {
          assetType: 'all',
          id: null,
          label: 'All Assets'
        };
      }

      // Combine all results
      const enhancedResults = {
        ...analysisResults,
        fittedParameters: {
          beta,
          eta,
          r2
        },
        bLifeValues: {
          b10Life,
          b50Life
        },
        failurePattern,
        failureCount: failureRecords.length,
        mechanismAnalysis,
        dataPoints: fitResult.dataPoints,
        assetDetails
      };
      
      res.json(enhancedResults);
    } catch (error) {
      console.error("Error in data-driven Weibull analysis:", error);
      res.status(500).json({ 
        message: "Failed to perform data-driven Weibull analysis",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Maintenance Optimization endpoint
  app.post("/api/maintenance-optimization", async (req, res) => {
    try {
      // Validate request body
      const schema = z.object({
        beta: z.number().positive(),
        eta: z.number().positive(),
        preventiveMaintenanceCost: z.number().nonnegative(),
        correctiveMaintenanceCost: z.number().nonnegative(),
        targetReliabilityThreshold: z.number().min(0).max(100),
        maximumAcceptableDowntime: z.number().nonnegative(),
        timeHorizon: z.number().positive(),
      });
      
      const data = schema.parse(req.body);
      const { beta, eta, preventiveMaintenanceCost, correctiveMaintenanceCost, timeHorizon } = data;
      
      // Calculate optimal PM interval
      const optimalInterval = calculateOptimalPMInterval(beta, eta);
      
      // Calculate cost at optimal interval
      const optimalCost = calculateTotalCost(
        optimalInterval,
        beta,
        eta,
        preventiveMaintenanceCost,
        correctiveMaintenanceCost,
        timeHorizon
      );
      
      // Generate cost vs interval data for plotting
      const costCurve = [];
      const numPoints = 20;
      const maxInterval = eta * 2;
      const intervalStep = maxInterval / numPoints;
      
      for (let i = 1; i <= numPoints; i++) {
        const interval = i * intervalStep;
        const cost = calculateTotalCost(
          interval,
          beta,
          eta,
          preventiveMaintenanceCost,
          correctiveMaintenanceCost,
          timeHorizon
        );
        
        costCurve.push({ interval, cost });
      }
      
      res.json({
        optimalInterval,
        optimalCost,
        costCurve,
      });
    } catch (error) {
      console.error("Error in maintenance optimization:", error);
      res.status(500).json({ 
        message: "Failed to perform maintenance optimization",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // RCM Analysis endpoint
  app.post("/api/rcm-analysis", async (req, res) => {
    try {
      // Validate request body
      const schema = z.object({
        assetCriticality: z.enum(['High', 'Medium', 'Low']),
        isPredictable: z.boolean(),
        costOfFailure: z.number().nonnegative(),
        failureModeDescriptions: z.array(z.string()),
        failureConsequences: z.array(z.string()),
        currentMaintenancePractices: z.string(),
      });
      
      const data = schema.parse(req.body) as RCMParameters;
      
      // Determine maintenance strategy
      const results = determineMaintenanceStrategy(data);
      
      // Return the RCM analysis results
      res.json(results);
    } catch (error) {
      console.error("Error in RCM analysis:", error);
      res.status(500).json({ 
        message: "Failed to perform RCM analysis",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Simulation endpoint
  app.post("/api/simulation", async (req, res) => {
    try {
      // Validate request body
      const schema = z.object({
        beta: z.number().positive(),
        eta: z.number().positive(),
        numberOfRuns: z.number().int().positive().default(1000),
        timeHorizon: z.number().positive(),
        pmInterval: z.number().optional(),
        pmCost: z.number().nonnegative().default(0),
        failureCost: z.number().nonnegative().default(0),
      });
      
      const data = schema.parse(req.body);
      const { beta, eta, numberOfRuns, timeHorizon, pmInterval, pmCost, failureCost } = data;
      
      // Run simulation
      const simulationParams: SimulationParameters = {
        beta,
        eta,
        numberOfRuns,
        timeHorizon,
        pmInterval,
        pmCost,
        failureCost
      };
      
      // Run simulation
      const simulationResults = runSimulation(simulationParams);
      
      // Just return the simulation results directly
      res.json(simulationResults);
    } catch (error) {
      console.error("Error in simulation:", error);
      res.status(500).json({ 
        message: "Failed to run simulation",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Equipment Class endpoints
  app.get("/api/equipment-classes", async (req, res) => {
    try {
      const equipmentClasses = await storage.getEquipmentClasses();
      res.json(equipmentClasses);
    } catch (error) {
      console.error("Error fetching equipment classes:", error);
      res.status(500).json({ message: "Failed to fetch equipment classes" });
    }
  });

  app.get("/api/equipment-classes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const equipmentClass = await storage.getEquipmentClass(id);
      
      if (!equipmentClass) {
        return res.status(404).json({ message: "Equipment class not found" });
      }
      
      res.json(equipmentClass);
    } catch (error) {
      console.error("Error fetching equipment class:", error);
      res.status(500).json({ message: "Failed to fetch equipment class" });
    }
  });

  app.post("/api/equipment-classes", async (req, res) => {
    try {
      // Validate the user role in the header
      const userRole = req.header('X-User-Role');
      if (userRole !== UserRole.ADMIN) {
        return res.status(403).json({ message: "Only administrators can create equipment classes" });
      }

      const equipmentClassData = insertEquipmentClassSchema.parse(req.body);
      const equipmentClass = await storage.createEquipmentClass(equipmentClassData);
      res.status(201).json(equipmentClass);
    } catch (error) {
      console.error("Error creating equipment class:", error);
      res.status(500).json({ 
        message: "Failed to create equipment class",
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.delete("/api/equipment-classes/:id", async (req, res) => {
    try {
      // Validate the user role in the header
      const userRole = req.header('X-User-Role');
      if (userRole !== UserRole.ADMIN) {
        return res.status(403).json({ message: "Only administrators can delete equipment classes" });
      }

      const id = parseInt(req.params.id);
      const success = await storage.deleteEquipmentClass(id);
      
      if (!success) {
        return res.status(404).json({ message: "Equipment class not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting equipment class:", error);
      res.status(500).json({ message: "Failed to delete equipment class" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

/**
 * Process failure times to create histogram data
 * @param failureTimes - Array of failure times from simulation
 * @param timeHorizon - Total simulation time
 * @returns Histogram data for visualization
 */
function processFailureTimesForHistogram(failureTimes: number[], timeHorizon: number) {
  const numberOfBins = 10;
  const binSize = timeHorizon / numberOfBins;
  const bins = Array(numberOfBins).fill(0);
  
  failureTimes.forEach(time => {
    const binIndex = Math.min(Math.floor(time / binSize), numberOfBins - 1);
    bins[binIndex]++;
  });
  
  return bins.map((count, i) => ({
    binStart: i * binSize,
    binEnd: (i + 1) * binSize,
    count,
  }));
}
