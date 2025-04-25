import express from 'express';
import { Pool } from 'pg';
import { pool } from '../db';

const router = express.Router();

// Get all criticalities
router.get("/criticalities", async (req, res) => {
  try {
    const { componentId, failureModeIds } = req.query;
    
    // If failureModeIds is provided, use it
    if (failureModeIds) {
      try {
        const ids = JSON.parse(failureModeIds as string);
        
        if (!Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({ error: "Invalid failureModeIds format" });
        }
        
        const result = await pool.query(
          `SELECT * FROM failure_criticality WHERE failure_mode_id = ANY($1::int[])`,
          [ids]
        );
        
        return res.status(200).json(result.rows);
      } catch (parseError) {
        return res.status(400).json({ error: "Invalid failureModeIds: " + parseError.message });
      }
    }
    
    // Otherwise, require componentId
    if (!componentId) {
      return res.status(400).json({ error: "Either componentId or failureModeIds is required" });
    }

    // First get all failure modes for this component
    const response = await fetch(`${req.protocol}://${req.get('host')}/api/fmeca/failure-modes?componentId=${componentId}`);
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

// Create or update criticality - simplified direct approach
router.post("/criticalities", async (req, res) => {
  try {
    const { failureModeId, severity, occurrence, detection, rpn, criticalityIndex, consequenceType } = req.body;
    
    console.log("Received criticality data:", { 
      failureModeId, severity, occurrence, detection, rpn, criticalityIndex, consequenceType 
    });
    
    // Manual validation with direct conversions
    if (!failureModeId) {
      return res.status(400).json({ error: "Failure mode ID is required" });
    }
    
    // Prepare validated data directly
    const validatedData = {
      failureModeId: Number(failureModeId),
      severity: Number(severity || 5),
      occurrence: Number(occurrence || 5),
      detection: Number(detection || 5),
      rpn: Number(rpn || (severity * occurrence * detection)),
      criticalityIndex: criticalityIndex || "Low",
      consequenceType: consequenceType || "Operational"
    };

    // Check if an entry already exists for this failure mode
    const existingResult = await pool.query(
      `SELECT * FROM failure_criticality WHERE failure_mode_id = $1 LIMIT 1`,
      [validatedData.failureModeId]
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
    return res.status(500).json({ error: "Failed to create/update criticality", message: error.message });
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

// Get failure modes by component ID or equipment class
router.get("/failure-modes", async (req, res) => {
  try {
    const { componentId, equipmentClass } = req.query;
    
    if (!componentId && !equipmentClass) {
      return res.status(400).json({ error: "Either componentId or equipmentClass is required" });
    }
    
    let query;
    let params;
    
    if (componentId) {
      query = `
        SELECT * FROM failure_modes 
        WHERE component_id = $1 OR asset_id = $1
        ORDER BY name
      `;
      params = [componentId];
    } else {
      query = `
        SELECT * FROM failure_modes 
        WHERE equipment_class = $1
        ORDER BY name
      `;
      params = [equipmentClass];
    }
    
    const result = await pool.query(query, params);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching failure modes:", error);
    return res.status(500).json({ error: "Failed to fetch failure modes" });
  }
});

// Get all failure modes by equipment class (fallback)
router.get("/failure-modes-by-class", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM failure_modes WHERE equipment_class IS NOT NULL ORDER BY equipment_class, name`
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching failure modes by class:", error);
    return res.status(500).json({ error: "Failed to fetch failure modes by class" });
  }
});

export default router;