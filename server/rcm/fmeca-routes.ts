import express from "express";
import { db, pool } from "../db";
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
    // Use raw SQL query as a temporary workaround
    const result = await pool.query(
      `SELECT * FROM failure_criticality WHERE failure_mode_id = ANY($1::int[])`,
      [failureModeIds]
    );
    const criticalities = result.rows;

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
    const existingResult = await pool.query(
      `SELECT * FROM failure_criticality WHERE failure_mode_id = $1 LIMIT 1`,
      [failureModeId]
    );
    const existingCriticality = existingResult.rows[0];

    let result;
    if (existingCriticality) {
      // Update existing record using raw SQL
      const updateResult = await pool.query(
        `UPDATE failure_criticality 
         SET severity = $1, occurrence = $2, detection = $3, rpn = $4, 
             criticality_index = $5, consequence_type = $6, updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [
          validatedData.severity, 
          validatedData.occurrence, 
          validatedData.detection,
          validatedData.rpn,
          validatedData.criticalityIndex,
          validatedData.consequenceType,
          existingCriticality.id
        ]
      );
      result = updateResult.rows;
    } else {
      // Create new record using raw SQL
      const insertResult = await pool.query(
        `INSERT INTO failure_criticality 
         (failure_mode_id, severity, occurrence, detection, rpn, criticality_index, consequence_type, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [
          validatedData.failureModeId,
          validatedData.severity, 
          validatedData.occurrence, 
          validatedData.detection,
          validatedData.rpn,
          validatedData.criticalityIndex,
          validatedData.consequenceType
        ]
      );
      result = insertResult.rows;
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
router.delete("/criticalities/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the record exists
    const existingResult = await pool.query(
      `SELECT * FROM failure_criticality WHERE id = $1 LIMIT 1`,
      [id]
    );
    const existingCriticality = existingResult.rows[0];
    
    if (!existingCriticality) {
      return res.status(404).json({ error: "Criticality not found" });
    }

    // Delete the record
    await pool.query(
      `DELETE FROM failure_criticality WHERE id = $1`,
      [id]
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting criticality:", error);
    return res.status(500).json({ error: "Failed to delete criticality" });
  }
});

export default router;