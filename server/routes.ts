import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { OpenAI } from "openai";
import { 
  insertMessageSchema, 
  ChatCompletionRequest, 
  insertAssetSchema, 
  insertMaintenanceEventSchema, 
  insertFailureModeSchema,
  insertFailureHistorySchema,
  WeibullParameters,
  MaintenanceOptimizationParameters,
  RCMParameters,
  SimulationParameters
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
      for (const assetId of uniqueAssetIds) {
        const asset = await storage.getAsset(assetId);
        if (asset) {
          validAssetIds.add(assetId);
        }
      }
      
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
  app.get("/api/failure-modes/:assetId", async (req, res) => {
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
      const failureHistoryData = insertFailureHistorySchema.parse(req.body);
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
      const failureHistoryData = req.body;
      const failureRecord = await storage.updateFailureHistory(id, failureHistoryData);
      
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
