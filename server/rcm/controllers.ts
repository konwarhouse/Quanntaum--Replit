import { Request, Response } from "express";
import { db } from "../db";
import { eq, sql } from "drizzle-orm";
import { systems, components } from "../../shared/rcm-schema";
import { failureModes } from "../../shared/schema";

// Systems controller functions
export const getSystems = async (req: Request, res: Response) => {
  try {
    const allSystems = await db.select().from(systems);
    res.json(allSystems);
  } catch (error) {
    console.error("Error fetching systems:", error);
    res.status(500).json({ error: "Failed to fetch systems" });
  }
};

export const getSystemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const systemId = parseInt(id, 10);
    
    if (isNaN(systemId)) {
      return res.status(400).json({ error: "Invalid system ID" });
    }
    
    const [system] = await db.select().from(systems).where(eq(systems.id, systemId));
    
    if (!system) {
      return res.status(404).json({ error: "System not found" });
    }
    
    res.json(system);
  } catch (error) {
    console.error("Error fetching system:", error);
    res.status(500).json({ error: "Failed to fetch system" });
  }
};

export const createSystem = async (req: Request, res: Response) => {
  try {
    const { name, purpose, operatingContext, boundaries } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "System name is required" });
    }
    
    // The timestamp column will use PostgreSQL's DEFAULT NOW() constraint
    const userId = req.user?.id || null;
    
    const [newSystem] = await db.insert(systems).values({
      name,
      purpose: purpose || null,
      operatingContext: operatingContext || null,
      boundaries: boundaries || null,
      createdBy: userId
      // Let the database handle createdAt with its default value
    }).returning();
    
    res.status(201).json(newSystem);
  } catch (error) {
    console.error("Error creating system:", error);
    res.status(500).json({ error: "Failed to create system" });
  }
};

export const updateSystem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const systemId = parseInt(id, 10);
    
    if (isNaN(systemId)) {
      return res.status(400).json({ error: "Invalid system ID" });
    }
    
    const { name, purpose, operatingContext, boundaries } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "System name is required" });
    }
    
    const [updatedSystem] = await db.update(systems)
      .set({
        name,
        purpose: purpose || null,
        operatingContext: operatingContext || null,
        boundaries: boundaries || null,
        updatedBy: req.user?.id || null
        // Let the database handle updatedAt with its default value
      })
      .where(eq(systems.id, systemId))
      .returning();
    
    if (!updatedSystem) {
      return res.status(404).json({ error: "System not found" });
    }
    
    res.json(updatedSystem);
  } catch (error) {
    console.error("Error updating system:", error);
    res.status(500).json({ error: "Failed to update system" });
  }
};

export const deleteSystem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const systemId = parseInt(id, 10);
    
    if (isNaN(systemId)) {
      return res.status(400).json({ error: "Invalid system ID" });
    }
    
    // Check if there are components using this system
    const relatedComponents = await db.select().from(components).where(eq(components.systemId, systemId));
    
    if (relatedComponents.length > 0) {
      return res.status(400).json({ 
        error: "Cannot delete system with associated components. Delete components first." 
      });
    }
    
    const [deletedSystem] = await db.delete(systems)
      .where(eq(systems.id, systemId))
      .returning();
    
    if (!deletedSystem) {
      return res.status(404).json({ error: "System not found" });
    }
    
    res.json({ success: true, system: deletedSystem });
  } catch (error) {
    console.error("Error deleting system:", error);
    res.status(500).json({ error: "Failed to delete system" });
  }
};

export const getComponents = async (req: Request, res: Response) => {
  try {
    const { systemId } = req.query;
    
    if (systemId) {
      const systemComponents = await db.select()
        .from(components)
        .where(eq(components.systemId, Number(systemId)));
      
      return res.json(systemComponents);
    }
    
    const allComponents = await db.select().from(components);
    res.json(allComponents);
  } catch (error) {
    console.error("Error fetching components:", error);
    res.status(500).json({ error: "Failed to fetch components" });
  }
};

export const getComponentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const componentId = parseInt(id, 10);
    
    if (isNaN(componentId)) {
      return res.status(400).json({ error: "Invalid component ID" });
    }
    
    const [component] = await db.select()
      .from(components)
      .where(eq(components.id, componentId));
    
    if (!component) {
      return res.status(404).json({ error: "Component not found" });
    }
    
    res.json(component);
  } catch (error) {
    console.error("Error fetching component:", error);
    res.status(500).json({ error: "Failed to fetch component" });
  }
};

export const createComponent = async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      systemId, 
      description, 
      function: componentFunction, 
      criticality,
      parentId 
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Component name is required" });
    }
    
    if (!systemId) {
      return res.status(400).json({ error: "System ID is required" });
    }
    
    // Check if system exists
    const [system] = await db.select()
      .from(systems)
      .where(eq(systems.id, systemId));
    
    if (!system) {
      return res.status(404).json({ error: "System not found" });
    }
    
    // Check if parent component exists (if parentId is provided and not "_none")
    let finalParentId = null; // Use a different variable to store the processed parent ID
    
    if (parentId && parentId !== "_none") {
      // Convert string "_none" to null
      if (parentId === "_none") {
        finalParentId = null;
      } else {
        const parentIdNum = parseInt(parentId.toString(), 10);
        
        if (!isNaN(parentIdNum)) {
          const [parentComponent] = await db.select()
            .from(components)
            .where(eq(components.id, parentIdNum));
          
          if (!parentComponent) {
            return res.status(404).json({ error: "Parent component not found" });
          }
          
          // Ensure parent component belongs to the same system
          if (parentComponent.systemId !== systemId) {
            return res.status(400).json({ error: "Parent component must belong to the same system" });
          }
          
          // Use the numeric parentId
          finalParentId = parentIdNum;
        } else {
          // If parentId is invalid, set it to null
          finalParentId = null;
        }
      }
    } else {
      // If no parentId or "_none", set to null
      finalParentId = null;
    }
    
    const [newComponent] = await db.insert(components).values({
      name,
      systemId,
      description: description || null,
      function: componentFunction || null,
      criticality: criticality || 'Medium',
      parentId: finalParentId,
      createdBy: req.user?.id || null
      // Let the database handle createdAt with its default value
    }).returning();
    
    res.status(201).json(newComponent);
  } catch (error) {
    console.error("Error creating component:", error);
    res.status(500).json({ error: "Failed to create component" });
  }
};

export const updateComponent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const componentId = parseInt(id, 10);
    
    if (isNaN(componentId)) {
      return res.status(400).json({ error: "Invalid component ID" });
    }
    
    const { 
      name, 
      systemId, 
      description, 
      function: componentFunction, 
      criticality,
      parentId 
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Component name is required" });
    }
    
    if (!systemId) {
      return res.status(400).json({ error: "System ID is required" });
    }
    
    // Check if system exists
    const [system] = await db.select()
      .from(systems)
      .where(eq(systems.id, systemId));
    
    if (!system) {
      return res.status(404).json({ error: "System not found" });
    }
    
    // Check if parent component exists (if parentId is provided and not "_none")
    let finalParentId = null; // Use a different variable to store the processed parent ID
    
    if (parentId && parentId !== "_none") {
      // Convert string "_none" to null
      if (parentId === "_none") {
        finalParentId = null;
      } else {
        const parentIdNum = parseInt(parentId.toString(), 10);
        
        if (!isNaN(parentIdNum)) {
          // Prevent component from being its own parent
          if (parentIdNum === componentId) {
            return res.status(400).json({ error: "Component cannot be its own parent" });
          }
          
          const [parentComponent] = await db.select()
            .from(components)
            .where(eq(components.id, parentIdNum));
          
          if (!parentComponent) {
            return res.status(404).json({ error: "Parent component not found" });
          }
          
          // Ensure parent component belongs to the same system
          if (parentComponent.systemId !== systemId) {
            return res.status(400).json({ error: "Parent component must belong to the same system" });
          }
          
          // Use the numeric parentId
          finalParentId = parentIdNum;
        } else {
          // If parentId is invalid, set it to null
          finalParentId = null;
        }
      }
    } else {
      // If no parentId or "_none", set to null
      finalParentId = null;
    }
    
    const [updatedComponent] = await db.update(components)
      .set({
        name,
        systemId,
        description: description || null,
        function: componentFunction || null,
        criticality: criticality || 'Medium',
        parentId: finalParentId,
        updatedBy: req.user?.id || null
        // Let the database handle updatedAt with its default value
      })
      .where(eq(components.id, componentId))
      .returning();
    
    if (!updatedComponent) {
      return res.status(404).json({ error: "Component not found" });
    }
    
    res.json(updatedComponent);
  } catch (error) {
    console.error("Error updating component:", error);
    res.status(500).json({ error: "Failed to update component" });
  }
};

export const deleteComponent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const componentId = parseInt(id, 10);
    
    if (isNaN(componentId)) {
      return res.status(400).json({ error: "Invalid component ID" });
    }
    
    // Check if any components use this as a parent
    const childComponents = await db.select()
      .from(components)
      .where(eq(components.parentId, componentId));
    
    if (childComponents.length > 0) {
      return res.status(400).json({ 
        error: "Cannot delete component with child components. Delete child components first." 
      });
    }
    
    const [deletedComponent] = await db.delete(components)
      .where(eq(components.id, componentId))
      .returning();
    
    if (!deletedComponent) {
      return res.status(404).json({ error: "Component not found" });
    }
    
    res.json({ success: true, component: deletedComponent });
  } catch (error) {
    console.error("Error deleting component:", error);
    res.status(500).json({ error: "Failed to delete component" });
  }
};

export const getFmecaRatings = async (req: Request, res: Response) => {
  try {
    const { failureModeId } = req.query;
    
    if (failureModeId) {
      const ratings = await db.select()
        .from(failureCriticality)
        .where(eq(failureCriticality.failureModeId, Number(failureModeId)));
      
      return res.json(ratings);
    }
    
    const allRatings = await db.select().from(failureCriticality);
    res.json(allRatings);
  } catch (error) {
    console.error("Error fetching FMECA ratings:", error);
    res.status(500).json({ error: "Failed to fetch FMECA ratings" });
  }
};

export const createFmecaRating = async (req: Request, res: Response) => {
  try {
    const { 
      failureModeId, 
      severity, 
      occurrence, 
      detection, 
      consequenceType
    } = req.body;
    
    if (!failureModeId) {
      return res.status(400).json({ error: "Failure mode ID is required" });
    }
    
    if (!severity || !occurrence || !detection) {
      return res.status(400).json({ 
        error: "Severity, occurrence, and detection ratings are required" 
      });
    }
    
    // Check if failure mode exists
    const [failureMode] = await db.select()
      .from(failureModes)
      .where(eq(failureModes.id, failureModeId));
    
    if (!failureMode) {
      return res.status(404).json({ error: "Failure mode not found" });
    }
    
    // Calculate RPN
    const rpn = severity * occurrence * detection;
    
    // Determine criticality index
    let criticalityIndex = "Low";
    if (rpn >= 200) {
      criticalityIndex = "Critical";
    } else if (rpn >= 100) {
      criticalityIndex = "High";
    } else if (rpn >= 50) {
      criticalityIndex = "Medium";
    }
    
    const [newRating] = await db.insert(failureCriticality).values({
      failureModeId,
      severity,
      occurrence,
      detection,
      rpn,
      criticalityIndex,
      consequenceType: consequenceType || null
    }).returning();
    
    res.status(201).json(newRating);
  } catch (error) {
    console.error("Error creating FMECA rating:", error);
    res.status(500).json({ error: "Failed to create FMECA rating" });
  }
};

export const updateFmecaRating = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ratingId = parseInt(id, 10);
    
    if (isNaN(ratingId)) {
      return res.status(400).json({ error: "Invalid rating ID" });
    }
    
    const { 
      failureModeId, 
      severity, 
      occurrence, 
      detection, 
      consequenceType
    } = req.body;
    
    if (!failureModeId) {
      return res.status(400).json({ error: "Failure mode ID is required" });
    }
    
    if (!severity || !occurrence || !detection) {
      return res.status(400).json({ 
        error: "Severity, occurrence, and detection ratings are required" 
      });
    }
    
    // Check if failure mode exists
    const [failureMode] = await db.select()
      .from(failureModes)
      .where(eq(failureModes.id, failureModeId));
    
    if (!failureMode) {
      return res.status(404).json({ error: "Failure mode not found" });
    }
    
    // Calculate RPN
    const rpn = severity * occurrence * detection;
    
    // Determine criticality index
    let criticalityIndex = "Low";
    if (rpn >= 200) {
      criticalityIndex = "Critical";
    } else if (rpn >= 100) {
      criticalityIndex = "High";
    } else if (rpn >= 50) {
      criticalityIndex = "Medium";
    }
    
    const [updatedRating] = await db.update(failureCriticality)
      .set({
        failureModeId,
        severity,
        occurrence,
        detection,
        rpn,
        criticalityIndex,
        consequenceType: consequenceType || null
      })
      .where(eq(failureCriticality.id, ratingId))
      .returning();
    
    if (!updatedRating) {
      return res.status(404).json({ error: "FMECA rating not found" });
    }
    
    res.json(updatedRating);
  } catch (error) {
    console.error("Error updating FMECA rating:", error);
    res.status(500).json({ error: "Failed to update FMECA rating" });
  }
};

export const getRcmConsequences = (req: Request, res: Response) => {
  res.json([]);
};

export const createRcmConsequence = (req: Request, res: Response) => {
  res.status(201).json({});
};

export const getMaintenanceTasks = (req: Request, res: Response) => {
  res.json([]);
};

export const createMaintenanceTask = (req: Request, res: Response) => {
  res.status(201).json({});
};

export const getFailureModesBySystem = async (req: Request, res: Response) => {
  try {
    const { systemId, componentId } = req.query;
    
    if (!systemId && !componentId) {
      return res.status(400).json({ error: "Either systemId or componentId is required" });
    }
    
    // Get components for this system
    let relatedComponents = [];
    
    if (systemId) {
      const systemIdNum = parseInt(systemId.toString(), 10);
      
      if (isNaN(systemIdNum)) {
        return res.status(400).json({ error: "Invalid system ID" });
      }
      
      // Get all components for this system
      relatedComponents = await db.select()
        .from(components)
        .where(eq(components.systemId, systemIdNum));
      
    } else if (componentId) {
      const componentIdNum = parseInt(componentId.toString(), 10);
      
      if (isNaN(componentIdNum)) {
        return res.status(400).json({ error: "Invalid component ID" });
      }
      
      // Get just this specific component
      const component = await db.select()
        .from(components)
        .where(eq(components.id, componentIdNum));
        
      relatedComponents = component;
    }
    
    if (relatedComponents.length === 0) {
      return res.json([]);
    }
    
    // Get component types or equipment classes to find related failure modes
    const componentTypes = relatedComponents.map(c => c.name.toLowerCase());
    
    // Fetch failure modes from existing database using direct query
    // since we need to match on equipment class
    const existingFailureModes = await db.execute(sql`
      SELECT * FROM "failure_modes" 
      WHERE "equipment_class" IS NULL 
      OR "equipment_class" IN (${sql.join(componentTypes)})
    `);
    
    res.json(existingFailureModes);
  } catch (error) {
    console.error("Error fetching failure modes by system:", error);
    res.status(500).json({ error: "Failed to fetch failure modes" });
  }
};

export const fmecaAnalysis = async (req: Request, res: Response) => {
  try {
    const { systemId, componentId, failureModes } = req.body;
    
    if (!systemId || !componentId) {
      return res.status(400).json({ error: "System ID and Component ID are required" });
    }
    
    // Placeholder for actual FMECA analysis
    // This would typically involve calculating criticality and risk metrics
    // based on the provided failure modes
    
    // For now, let's just return the received data with some calculated fields
    const analysis = {
      systemId,
      componentId,
      analysisDate: new Date().toISOString(),
      results: Array.isArray(failureModes) ? failureModes.map(fm => ({
        failureModeId: fm.id,
        description: fm.description,
        failureEffect: fm.effect || "N/A",
        severity: fm.severity || 5,
        occurrence: fm.occurrence || 5,
        detection: fm.detection || 5,
        rpn: (fm.severity || 5) * (fm.occurrence || 5) * (fm.detection || 5)
      })) : []
    };
    
    res.json(analysis);
  } catch (error) {
    console.error("Error creating FMECA analysis:", error);
    res.status(500).json({ error: "Failed to create FMECA analysis" });
  }
};

export const rcmAnalysis = (req: Request, res: Response) => {
  res.json({});
};

export const ramAnalysis = (req: Request, res: Response) => {
  res.json({});
};

export const getRamMetrics = (req: Request, res: Response) => {
  res.json([]);
};

export const getRamMetricById = (req: Request, res: Response) => {
  res.json({});
};

export const createRamMetric = (req: Request, res: Response) => {
  res.status(201).json({});
};

export const updateRamMetric = (req: Request, res: Response) => {
  res.json({});
};

export const deleteRamMetric = (req: Request, res: Response) => {
  res.json({ success: true });
};