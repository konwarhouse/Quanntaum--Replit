import { Request, Response } from "express";
import { db } from "../db";
import * as rcmSchema from "../../shared/rcm-schema";
import { eq } from "drizzle-orm";

// Systems API Endpoints
export async function getSystems(req: Request, res: Response) {
  try {
    const systems = await db.select().from(rcmSchema.systems);
    res.json(systems);
  } catch (error) {
    console.error("Error fetching systems:", error);
    res.status(500).json({ error: "Failed to fetch systems" });
  }
}

export async function getSystemById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const [system] = await db.select().from(rcmSchema.systems).where(eq(rcmSchema.systems.id, id));
    
    if (!system) {
      return res.status(404).json({ error: "System not found" });
    }
    
    res.json(system);
  } catch (error) {
    console.error("Error fetching system:", error);
    res.status(500).json({ error: "Failed to fetch system" });
  }
}

export async function createSystem(req: Request, res: Response) {
  try {
    // Set createdBy if authenticated user exists
    if (req.user) {
      req.body.createdBy = req.user.id;
    }
    
    const [system] = await db.insert(rcmSchema.systems).values(req.body).returning();
    res.status(201).json(system);
  } catch (error) {
    console.error("Error creating system:", error);
    res.status(500).json({ error: "Failed to create system" });
  }
}

export async function updateSystem(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const [updatedSystem] = await db
      .update(rcmSchema.systems)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(rcmSchema.systems.id, id))
      .returning();
    
    if (!updatedSystem) {
      return res.status(404).json({ error: "System not found" });
    }
    
    res.json(updatedSystem);
  } catch (error) {
    console.error("Error updating system:", error);
    res.status(500).json({ error: "Failed to update system" });
  }
}

export async function deleteSystem(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await db.delete(rcmSchema.systems).where(eq(rcmSchema.systems.id, id));
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting system:", error);
    res.status(500).json({ error: "Failed to delete system" });
  }
}

// Components API Endpoints
export async function getComponents(req: Request, res: Response) {
  try {
    const systemId = req.query.systemId ? parseInt(req.query.systemId as string) : undefined;
    
    let query = db.select().from(rcmSchema.components);
    if (systemId) {
      query = query.where(eq(rcmSchema.components.systemId, systemId));
    }
    
    const components = await query;
    res.json(components);
  } catch (error) {
    console.error("Error fetching components:", error);
    res.status(500).json({ error: "Failed to fetch components" });
  }
}

export async function getComponentById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const [component] = await db.select().from(rcmSchema.components).where(eq(rcmSchema.components.id, id));
    
    if (!component) {
      return res.status(404).json({ error: "Component not found" });
    }
    
    res.json(component);
  } catch (error) {
    console.error("Error fetching component:", error);
    res.status(500).json({ error: "Failed to fetch component" });
  }
}

export async function createComponent(req: Request, res: Response) {
  try {
    const [component] = await db.insert(rcmSchema.components).values(req.body).returning();
    res.status(201).json(component);
  } catch (error) {
    console.error("Error creating component:", error);
    res.status(500).json({ error: "Failed to create component" });
  }
}

export async function updateComponent(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const [updatedComponent] = await db
      .update(rcmSchema.components)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(rcmSchema.components.id, id))
      .returning();
    
    if (!updatedComponent) {
      return res.status(404).json({ error: "Component not found" });
    }
    
    res.json(updatedComponent);
  } catch (error) {
    console.error("Error updating component:", error);
    res.status(500).json({ error: "Failed to update component" });
  }
}

export async function deleteComponent(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    await db.delete(rcmSchema.components).where(eq(rcmSchema.components.id, id));
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting component:", error);
    res.status(500).json({ error: "Failed to delete component" });
  }
}

// FMECA API endpoints
export async function getFmecaRatings(req: Request, res: Response) {
  try {
    const failureModeId = req.query.failureModeId ? parseInt(req.query.failureModeId as string) : undefined;
    
    let query = db.select().from(rcmSchema.fmecaRatings);
    if (failureModeId) {
      query = query.where(eq(rcmSchema.fmecaRatings.failureModeId, failureModeId));
    }
    
    const ratings = await query;
    res.json(ratings);
  } catch (error) {
    console.error("Error fetching FMECA ratings:", error);
    res.status(500).json({ error: "Failed to fetch FMECA ratings" });
  }
}

export async function createFmecaRating(req: Request, res: Response) {
  try {
    // Calculate RPN
    const { severity, occurrence, detection } = req.body;
    const rpn = severity * occurrence * detection;
    
    // Determine criticality based on RPN
    let criticality = "Low";
    if (rpn > 200) {
      criticality = "High";
    } else if (rpn > 100) {
      criticality = "Medium";
    }
    
    const ratingData = {
      ...req.body,
      rpn,
      criticality
    };
    
    const [rating] = await db.insert(rcmSchema.fmecaRatings).values(ratingData).returning();
    res.status(201).json(rating);
  } catch (error) {
    console.error("Error creating FMECA rating:", error);
    res.status(500).json({ error: "Failed to create FMECA rating" });
  }
}

export async function updateFmecaRating(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    
    // Recalculate RPN and criticality if necessary
    let updateData = { ...req.body };
    
    if (req.body.severity !== undefined || req.body.occurrence !== undefined || req.body.detection !== undefined) {
      // Get current values if not provided
      const [currentRating] = await db.select().from(rcmSchema.fmecaRatings).where(eq(rcmSchema.fmecaRatings.id, id));
      
      if (!currentRating) {
        return res.status(404).json({ error: "FMECA rating not found" });
      }
      
      const severity = req.body.severity ?? currentRating.severity;
      const occurrence = req.body.occurrence ?? currentRating.occurrence;
      const detection = req.body.detection ?? currentRating.detection;
      
      const rpn = severity * occurrence * detection;
      
      let criticality = "Low";
      if (rpn > 200) {
        criticality = "High";
      } else if (rpn > 100) {
        criticality = "Medium";
      }
      
      updateData = {
        ...updateData,
        rpn,
        criticality
      };
    }
    
    const [updatedRating] = await db
      .update(rcmSchema.fmecaRatings)
      .set(updateData)
      .where(eq(rcmSchema.fmecaRatings.id, id))
      .returning();
    
    if (!updatedRating) {
      return res.status(404).json({ error: "FMECA rating not found" });
    }
    
    res.json(updatedRating);
  } catch (error) {
    console.error("Error updating FMECA rating:", error);
    res.status(500).json({ error: "Failed to update FMECA rating" });
  }
}

// RCM Consequences API Endpoints
export async function getRcmConsequences(req: Request, res: Response) {
  try {
    const failureModeId = req.query.failureModeId ? parseInt(req.query.failureModeId as string) : undefined;
    
    let query = db.select().from(rcmSchema.rcmConsequences);
    if (failureModeId) {
      query = query.where(eq(rcmSchema.rcmConsequences.failureModeId, failureModeId));
    }
    
    const consequences = await query;
    res.json(consequences);
  } catch (error) {
    console.error("Error fetching RCM consequences:", error);
    res.status(500).json({ error: "Failed to fetch RCM consequences" });
  }
}

export async function createRcmConsequence(req: Request, res: Response) {
  try {
    const [consequence] = await db.insert(rcmSchema.rcmConsequences).values(req.body).returning();
    res.status(201).json(consequence);
  } catch (error) {
    console.error("Error creating RCM consequence:", error);
    res.status(500).json({ error: "Failed to create RCM consequence" });
  }
}

// Maintenance Tasks API Endpoints
export async function getMaintenanceTasks(req: Request, res: Response) {
  try {
    const failureModeId = req.query.failureModeId ? parseInt(req.query.failureModeId as string) : undefined;
    
    let query = db.select().from(rcmSchema.maintenanceTasks);
    if (failureModeId) {
      query = query.where(eq(rcmSchema.maintenanceTasks.failureModeId, failureModeId));
    }
    
    const tasks = await query;
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching maintenance tasks:", error);
    res.status(500).json({ error: "Failed to fetch maintenance tasks" });
  }
}

export async function createMaintenanceTask(req: Request, res: Response) {
  try {
    const [task] = await db.insert(rcmSchema.maintenanceTasks).values(req.body).returning();
    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating maintenance task:", error);
    res.status(500).json({ error: "Failed to create maintenance task" });
  }
}

// Analysis functions
export async function fmecaAnalysis(req: Request, res: Response) {
  try {
    const systemId = parseInt(req.params.systemId);
    
    // Get all components for the system
    const components = await db.select().from(rcmSchema.components).where(eq(rcmSchema.components.systemId, systemId));
    
    // Collect all failure modes related to these components
    let failureModes = [];
    for (const component of components) {
      // This requires a join with the failure modes table based on component ids
      // This is a placeholder - you would need to implement the actual query
      // const componentFailureModes = await db.select().from(failureModes).where(eq(failureModes.componentId, component.id));
      // failureModes = [...failureModes, ...componentFailureModes];
    }
    
    // Get FMECA ratings for these failure modes
    // This is a placeholder - you would need to implement the actual query
    const fmecaRatings = []; // await db.select().from(rcmSchema.fmecaRatings).where(in(rcmSchema.fmecaRatings.failureModeId, failureModes.map(fm => fm.id)));
    
    // Process the data to create the analysis response
    const criticalFailureModes = fmecaRatings
      .filter(rating => rating.rpn > 100)
      .map(rating => ({
        id: rating.id,
        description: "Failure mode description", // You would need to join with failure modes to get this
        rpn: rating.rpn,
        criticality: rating.criticality
      }));
    
    // Placeholder for risk matrix and pareto analysis
    const riskMatrix = [];
    const paretoAnalysis = [];
    
    // Generate recommendations based on RPN
    const recommendations = [
      "Focus on high RPN items as priority",
      "Consider preventive maintenance for items with high severity",
      "Implement detection controls for items with high occurrence"
    ];
    
    const response: rcmSchema.FMECAAnalysisResponse = {
      criticalFailureModes,
      riskMatrix,
      paretoAnalysis,
      recommendations
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error performing FMECA analysis:", error);
    res.status(500).json({ error: "Failed to perform FMECA analysis" });
  }
}

export async function rcmAnalysis(req: Request, res: Response) {
  try {
    const failureModeId = parseInt(req.params.failureModeId);
    
    // Get RCM consequences for this failure mode
    const [consequence] = await db
      .select()
      .from(rcmSchema.rcmConsequences)
      .where(eq(rcmSchema.rcmConsequences.failureModeId, failureModeId));
    
    if (!consequence) {
      return res.status(404).json({ error: "RCM consequence not found for this failure mode" });
    }
    
    // Determine maintenance strategy based on consequences
    let maintenanceStrategy = "Run-to-Failure";
    
    if (consequence.safety || consequence.environmental) {
      maintenanceStrategy = "Preventive Maintenance";
    } else if (consequence.operational) {
      maintenanceStrategy = "Condition-Based Monitoring";
    }
    
    // Get existing maintenance tasks
    const tasks = await db
      .select()
      .from(rcmSchema.maintenanceTasks)
      .where(eq(rcmSchema.maintenanceTasks.failureModeId, failureModeId));
    
    // Map tasks to recommendation format
    const taskRecommendations = tasks.map(task => ({
      taskType: task.taskType,
      description: task.description,
      interval: task.interval,
      intervalUnit: task.intervalUnit,
      rationale: task.rationale
    }));
    
    // Generate recommendations if none exist
    if (taskRecommendations.length === 0) {
      if (consequence.safety || consequence.environmental) {
        taskRecommendations.push({
          taskType: "Preventive",
          description: "Regular inspection",
          interval: 3,
          intervalUnit: "Months",
          rationale: "Safety critical component requires regular inspection"
        });
      } else if (consequence.operational) {
        taskRecommendations.push({
          taskType: "Predictive",
          description: "Condition monitoring",
          interval: 1,
          intervalUnit: "Months",
          rationale: "Operational impact can be mitigated through monitoring"
        });
      } else {
        taskRecommendations.push({
          taskType: "Run-to-Failure",
          description: "No preventive action",
          interval: null,
          intervalUnit: null,
          rationale: "Economic justification for replacement only upon failure"
        });
      }
    }
    
    // Default actions when maintenance fails
    const defaultActions = [
      "Implement redundant system",
      "Keep spare parts inventory",
      "Train operators on emergency procedures"
    ];
    
    const response: rcmSchema.RCMAnalysisResponse = {
      maintenanceStrategy,
      taskRecommendations,
      consequenceAnalysis: {
        safety: consequence.safety,
        environmental: consequence.environmental,
        operational: consequence.operational,
        economic: consequence.economic,
        consequenceType: consequence.consequenceType
      },
      defaultActions
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error performing RCM analysis:", error);
    res.status(500).json({ error: "Failed to perform RCM analysis" });
  }
}

export async function ramAnalysis(req: Request, res: Response) {
  try {
    const systemId = parseInt(req.params.systemId);
    
    // Get all components for the system
    const components = await db.select().from(rcmSchema.components).where(eq(rcmSchema.components.systemId, systemId));
    
    // Get RAM metrics for these components
    const componentIds = components.map(c => c.id);
    // This is a placeholder - you would need to implement the actual query
    // const ramMetrics = await db.select().from(rcmSchema.ramMetrics).where(in(rcmSchema.ramMetrics.componentId, componentIds));
    const ramMetrics = []; // Placeholder
    
    // Calculate system reliability
    // For a series system, system reliability = product of component reliabilities
    const systemReliability = ramMetrics.length > 0 
      ? ramMetrics.reduce((acc, metric) => acc * metric.calculatedReliability, 1)
      : 0;
    
    // Calculate system availability
    // For a series system, system availability = product of component availabilities
    const systemAvailability = ramMetrics.length > 0
      ? ramMetrics.reduce((acc, metric) => acc * metric.availability, 1) 
      : 0;
    
    // Calculate system MTBF and MTTR
    // These would need more complex calculations based on the system configuration
    const mtbf = ramMetrics.length > 0
      ? ramMetrics.reduce((acc, metric) => acc + metric.mtbf, 0) / ramMetrics.length
      : 0;
    
    const mttr = ramMetrics.length > 0
      ? ramMetrics.reduce((acc, metric) => acc + metric.mttr, 0) / ramMetrics.length
      : 0;
    
    // Generate reliability curve
    const reliabilityCurve = Array.from({ length: 10 }, (_, i) => ({
      time: (i + 1) * 1000, // Example time points
      reliability: Math.exp(-1 * (i + 1) * 1000 / mtbf) // Exponential reliability function
    }));
    
    // Create availability heatmap
    const availabilityHeatmap = ramMetrics.map((metric, i) => ({
      componentId: i, // This is a placeholder
      componentName: `Component ${i}`, // This is a placeholder
      availability: metric.availability,
      criticality: metric.availability < 0.9 ? "High" : metric.availability < 0.95 ? "Medium" : "Low"
    }));
    
    // Calculate potential improvement
    const maintenanceImpact = {
      currentAvailability: systemAvailability,
      potentialAvailability: Math.min(0.99, systemAvailability * 1.1), // 10% improvement capped at 99%
      improvementPercentage: 10 // Placeholder
    };
    
    const response: rcmSchema.RAMAnalysisResponse = {
      systemReliability,
      systemAvailability,
      mtbf,
      mttr,
      reliabilityCurve,
      availabilityHeatmap,
      maintenanceImpact
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error performing RAM analysis:", error);
    res.status(500).json({ error: "Failed to perform RAM analysis" });
  }
}