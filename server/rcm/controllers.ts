import { Request, Response } from "express";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { systems, components } from "../../shared/rcm-schema";

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
    
    const createdAt = new Date().toISOString();
    const userId = req.user?.id || null;
    
    const [newSystem] = await db.insert(systems).values({
      name,
      purpose: purpose || null,
      operatingContext: operatingContext || null,
      boundaries: boundaries || null,
      createdAt,
      createdBy: userId
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
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.id || null
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
    
    // Check if parent component exists (if parentId is provided)
    if (parentId) {
      const [parentComponent] = await db.select()
        .from(components)
        .where(eq(components.id, parentId));
      
      if (!parentComponent) {
        return res.status(404).json({ error: "Parent component not found" });
      }
      
      // Ensure parent component belongs to the same system
      if (parentComponent.systemId !== systemId) {
        return res.status(400).json({ error: "Parent component must belong to the same system" });
      }
    }
    
    const [newComponent] = await db.insert(components).values({
      name,
      systemId,
      description: description || null,
      function: componentFunction || null,
      criticality: criticality || 'Medium',
      parentId: parentId || null,
      createdAt: new Date().toISOString(),
      createdBy: req.user?.id || null
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
    
    // Check if parent component exists (if parentId is provided)
    if (parentId) {
      // Prevent component from being its own parent
      if (parentId === componentId) {
        return res.status(400).json({ error: "Component cannot be its own parent" });
      }
      
      const [parentComponent] = await db.select()
        .from(components)
        .where(eq(components.id, parentId));
      
      if (!parentComponent) {
        return res.status(404).json({ error: "Parent component not found" });
      }
      
      // Ensure parent component belongs to the same system
      if (parentComponent.systemId !== systemId) {
        return res.status(400).json({ error: "Parent component must belong to the same system" });
      }
    }
    
    const [updatedComponent] = await db.update(components)
      .set({
        name,
        systemId,
        description: description || null,
        function: componentFunction || null,
        criticality: criticality || 'Medium',
        parentId: parentId || null,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.id || null
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

export const getFmecaRatings = (req: Request, res: Response) => {
  res.json([]);
};

export const createFmecaRating = (req: Request, res: Response) => {
  res.status(201).json({});
};

export const updateFmecaRating = (req: Request, res: Response) => {
  res.json({});
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

export const fmecaAnalysis = (req: Request, res: Response) => {
  res.json({});
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