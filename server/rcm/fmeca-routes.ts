import express from "express";
import { db, pool } from "../db";
import { and, eq } from "drizzle-orm";
import { 
  components, 
  failureModes, 
  failureCriticality,
  insertFailureCriticalitySchema
} from "../../shared/rcm-schema";
import { assets } from "../../shared/schema";
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

// Get all failure modes for a component OR get all failure modes by equipment class
router.get("/failure-modes", async (req, res) => {
  try {
    const { componentId, equipmentClass } = req.query;
    
    console.log("Failure modes query params:", { componentId, equipmentClass });
    
    // If equipmentClass is provided directly, use it
    if (equipmentClass) {
      const equipmentFailureModes = await db.query.failureModes.findMany({
        where: eq(failureModes.equipmentClass, equipmentClass as string),
      });
      console.log(`Found ${equipmentFailureModes.length} failure modes for equipment class ${equipmentClass}`);
      
      if (equipmentFailureModes.length === 0) {
        console.log(`No equipment class specific failure modes found for ${equipmentClass}, returning all available failure modes`);
        const allModes = await db.query.failureModes.findMany();
        return res.status(200).json(allModes);
      }
      
      return res.status(200).json(equipmentFailureModes);
    }
    
    // If no filtering parameters are provided, return all failure modes
    if (!componentId) {
      const allModes = await db.query.failureModes.findMany();
      console.log(`No parameters provided, returning all ${allModes.length} failure modes`);
      
      // Make sure we're not sending empty data
      if (allModes.length === 0) {
        // Insert a test failure mode for debugging if no failure modes exist at all
        console.log("Creating default test failure mode for debugging");
        const defaultFailureMode = await db.insert(failureModes).values({
          name: "Test Failure Mode",
          description: "Default test failure mode for debugging",
          equipmentClass: "Default",
        }).returning();
        
        return res.status(200).json(defaultFailureMode);
      }
      
      return res.status(200).json(allModes);
    }

    // First check if there are any failure modes directly linked to this component
    const componentFailureModes = await db.query.failureModes.findMany({
      where: eq(failureModes.componentId, Number(componentId)),
    });

    if (componentFailureModes.length > 0) {
      console.log(`Found ${componentFailureModes.length} failure modes directly linked to component ${componentId}`);
      return res.status(200).json(componentFailureModes);
    }

    console.log(`No component-specific failure modes found for component ${componentId}`);
    
    // Since component-specific failure modes weren't found, 
    // let's return all available failure modes as a fallback
    const allFailureModes = await db.query.failureModes.findMany();
    
    // Log all failure modes for debugging
    console.log("All available failure modes:", allFailureModes.map(fm => ({
      id: fm.id,
      name: fm.name || fm.description,
      equipmentClass: fm.equipmentClass
    })));
    
    if (allFailureModes.length === 0) {
      // If we still have no failure modes, create a default one for testing
      console.log("Creating default failure mode since none exist");
      const defaultFailureMode = await db.insert(failureModes).values({
        name: "Default Failure Mode",
        description: "Generated failure mode for testing when no others exist",
        equipmentClass: "Generic Equipment",
      }).returning();
      
      return res.status(200).json(defaultFailureMode);
    }
    
    console.log(`Returning ${allFailureModes.length} failure modes across all equipment classes`);
    return res.status(200).json(allFailureModes);
  } catch (error) {
    console.error("Error fetching failure modes:", error);
    return res.status(500).json({ error: "Failed to fetch failure modes" });
  }
});

// Get criticality data for a component's failure modes
router.get("/criticalities", async (req, res) => {
  try {
    const { componentId, failureModeIds } = req.query;
    
    // If failureModeIds is provided directly, use it
    if (failureModeIds) {
      let ids: number[] = [];
      try {
        ids = JSON.parse(failureModeIds as string);
      } catch (e) {
        return res.status(400).json({ error: "Invalid failureModeIds format. Expecting JSON array." });
      }
      
      if (ids.length === 0) {
        return res.status(200).json([]);
      }
      
      // Get criticalities for these failure modes
      const result = await pool.query(
        `SELECT * FROM failure_criticality WHERE failure_mode_id = ANY($1::int[])`,
        [ids]
      );
      const criticalities = result.rows;
      
      console.log(`Found ${criticalities.length} criticalities for specified failure modes`);
      return res.status(200).json(criticalities);
    }
    
    // Otherwise, require componentId
    if (!componentId) {
      return res.status(400).json({ error: "Either componentId or failureModeIds is required" });
    }

    // First get all failure modes
    const response = await fetch(`${req.protocol}://${req.get('host')}/api/rcm/failure-modes?componentId=${componentId}`);
    if (!response.ok) {
      return res.status(500).json({ error: "Failed to fetch failure modes" });
    }
    
    const failureModes = await response.json();
    if (failureModes.length === 0) {
      return res.status(200).json([]);
    }
    
    // Get all failure mode IDs
    const ids = failureModes.map(mode => mode.id);
    
    // Get criticalities for these failure modes
    const result = await pool.query(
      `SELECT * FROM failure_criticality WHERE failure_mode_id = ANY($1::int[])`,
      [ids]
    );
    const criticalities = result.rows;

    console.log(`Found ${criticalities.length} criticalities for component ${componentId}`);
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