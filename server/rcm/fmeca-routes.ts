import express from "express";
import { db } from "../db";
import { and, eq } from "drizzle-orm";
import { 
  components, 
  failureModes, 
  failureCriticality,
  insertFailureCriticalitySchema
} from "../../shared/rcm-schema";
import { storage } from "../storage";
import { ZodError } from "zod";

const router = express.Router();

// Get all components for a system
router.get("/components", async (req, res) => {
  try {
    const { systemId } = req.query;
    
    if (!systemId) {
      return res.status(400).json({ error: "System ID is required" });
    }

    const systemComponents = await db.query.components.findMany({
      where: eq(components.systemId, Number(systemId)),
    });

    return res.status(200).json(systemComponents);
  } catch (error) {
    console.error("Error fetching components:", error);
    return res.status(500).json({ error: "Failed to fetch components" });
  }
});

// Get all failure modes for a component
router.get("/failure-modes", async (req, res) => {
  try {
    const { componentId } = req.query;
    
    if (!componentId) {
      return res.status(400).json({ error: "Component ID is required" });
    }

    const componentFailureModes = await db.query.failureModes.findMany({
      where: eq(failureModes.componentId, Number(componentId)),
    });

    return res.status(200).json(componentFailureModes);
  } catch (error) {
    console.error("Error fetching failure modes:", error);
    return res.status(500).json({ error: "Failed to fetch failure modes" });
  }
});

// Get criticality data for a component's failure modes
router.get("/criticalities", async (req, res) => {
  try {
    const { componentId } = req.query;
    
    if (!componentId) {
      return res.status(400).json({ error: "Component ID is required" });
    }

    // Get failure modes for this component
    const componentFailureModes = await db.query.failureModes.findMany({
      where: eq(failureModes.componentId, Number(componentId)),
    });
    
    if (componentFailureModes.length === 0) {
      return res.status(200).json([]);
    }

    // Get all failure mode IDs
    const failureModeIds = componentFailureModes.map(mode => mode.id);
    
    // Get criticalities for these failure modes
    const criticalities = await db.query.failureCriticality.findMany({
      where: (fields) => {
        return fields.failureModeId.in(failureModeIds);
      }
    });

    return res.status(200).json(criticalities);
  } catch (error) {
    console.error("Error fetching criticalities:", error);
    return res.status(500).json({ error: "Failed to fetch criticalities" });
  }
});

// Create or update criticality
router.post("/criticalities", async (req, res) => {
  try {
    const { failureModeId, severity, occurrence, detection, rpn, criticalityIndex, consequenceType } = req.body;
    
    // Validate input using Zod schema
    const validatedData = insertFailureCriticalitySchema.parse({
      failureModeId,
      severity,
      occurrence,
      detection,
      rpn,
      criticalityIndex,
      consequenceType
    });

    // Check if an entry already exists for this failure mode
    const existingCriticality = await db.query.failureCriticality.findFirst({
      where: eq(failureCriticality.failureModeId, failureModeId),
    });

    let result;
    if (existingCriticality) {
      // Update existing record
      result = await db.update(failureCriticality)
        .set(validatedData)
        .where(eq(failureCriticality.id, existingCriticality.id))
        .returning();
    } else {
      // Create new record
      result = await db.insert(failureCriticality)
        .values(validatedData)
        .returning();
    }

    return res.status(200).json(result[0]);
  } catch (error) {
    console.error("Error creating/updating criticality:", error);
    
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    
    return res.status(500).json({ error: "Failed to create/update criticality" });
  }
});

// Delete criticality
router.delete("/criticalities/:id", requireRole(UserRole.Analyst), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the record exists
    const existingCriticality = await db.query.failureCriticality.findFirst({
      where: eq(failureCriticality.id, Number(id)),
    });
    
    if (!existingCriticality) {
      return res.status(404).json({ error: "Criticality not found" });
    }

    // Delete the record
    await db.delete(failureCriticality)
      .where(eq(failureCriticality.id, Number(id)));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting criticality:", error);
    return res.status(500).json({ error: "Failed to delete criticality" });
  }
});

export default router;