import { Request, Response } from 'express';
import { db } from '../db';
import { fmecaRatings, components, systems } from '@shared/rcm-schema';
import { failureModes } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

// Get FMECA entries for a system
export async function getFmecaEntries(req: Request, res: Response) {
  try {
    const { systemId } = req.query;
    
    if (!systemId) {
      return res.status(400).json({ error: 'System ID is required' });
    }

    // First get all components in the system
    const systemComponents = await db.query.components.findMany({
      where: eq(components.systemId, Number(systemId)),
    });

    const componentIds = systemComponents.map(comp => comp.id);

    // Then get all failure modes associated with these components
    const failureModesData = await db.query.failureModes.findMany({
      where: inArray(failureModes.componentId, componentIds),
    });

    const failureModeIds = failureModesData.map(fm => fm.id);

    // Finally get all FMECA ratings for these failure modes
    const fmecaData = await db.query.fmecaRatings.findMany({
      where: inArray(fmecaRatings.failureModeId, failureModeIds),
    });

    // Combine the data to create a complete FMECA entry for each
    const result = await Promise.all(failureModesData.map(async (failureMode) => {
      const rating = fmecaData.find(fr => fr.failureModeId === failureMode.id);
      const component = systemComponents.find(c => c.id === failureMode.componentId);
      
      if (!rating || !component) {
        return null;
      }

      return {
        id: rating.id,
        componentId: component.id,
        component: component.name,
        function: component.function,
        failureMode: failureMode.name,
        failureCause: failureMode.cause,
        localEffect: failureMode.localEffect,
        systemEffect: failureMode.systemEffect,
        endEffect: failureMode.endEffect,
        severity: rating.severity,
        occurrence: rating.occurrence,
        detection: rating.detection,
        rpn: rating.rpn,
        criticality: rating.criticality,
        recommendedActions: failureMode.recommendedActions,
      };
    }));

    // Filter out nulls from the result
    const validResults = result.filter(entry => entry !== null);
    
    res.status(200).json(validResults);
  } catch (error) {
    console.error('Error fetching FMECA entries:', error);
    res.status(500).json({ error: 'Failed to fetch FMECA entries' });
  }
}

// Create a new FMECA entry
export async function createFmecaEntry(req: Request, res: Response) {
  try {
    const {
      componentId,
      failureMode,
      failureCause,
      localEffect,
      systemEffect,
      endEffect,
      severity,
      occurrence,
      detection,
      rpn,
      criticality,
      recommendedActions,
    } = req.body;

    // Create a new failure mode
    const [newFailureMode] = await db.insert(failureModes).values({
      description: failureMode, // Use existing description field
      consequences: failureCause, // Map to existing consequences field
      equipmentClass: 'RCM', // Default equipment class for RCM entries
      // New FMECA specific fields
      name: failureMode,
      cause: failureCause,
      localEffect: localEffect,
      systemEffect: systemEffect,
      endEffect: endEffect,
      componentId: componentId,
      recommendedActions: recommendedActions,
    }).returning();

    // Create a new FMECA rating
    const [newRating] = await db.insert(fmecaRatings).values({
      failureModeId: newFailureMode.id,
      severity: severity,
      occurrence: occurrence,
      detection: detection,
      rpn: rpn,
      criticality: criticality,
    }).returning();

    // Return the combined entry
    const entry = {
      id: newRating.id,
      componentId,
      failureMode,
      failureCause,
      localEffect,
      systemEffect,
      endEffect,
      severity,
      occurrence,
      detection,
      rpn,
      criticality,
      recommendedActions,
    };

    res.status(201).json(entry);
  } catch (error) {
    console.error('Error creating FMECA entry:', error);
    res.status(500).json({ error: 'Failed to create FMECA entry' });
  }
}

// Update an existing FMECA entry
export async function updateFmecaEntry(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      componentId,
      failureMode,
      failureCause,
      localEffect,
      systemEffect,
      endEffect,
      severity,
      occurrence,
      detection,
      rpn,
      criticality,
      recommendedActions,
    } = req.body;

    // Get the rating to find the associated failure mode
    const [rating] = await db.select().from(fmecaRatings).where(eq(fmecaRatings.id, Number(id)));

    if (!rating) {
      return res.status(404).json({ error: 'FMECA entry not found' });
    }

    // Update the failure mode
    await db.update(failureModes)
      .set({
        description: failureMode, // Use existing description field
        consequences: failureCause, // Map to existing consequences field
        // FMECA specific fields
        name: failureMode,
        cause: failureCause,
        localEffect: localEffect,
        systemEffect: systemEffect,
        endEffect: endEffect,
        componentId: componentId,
        recommendedActions: recommendedActions,
      })
      .where(eq(failureModes.id, rating.failureModeId));

    // Update the rating
    await db.update(fmecaRatings)
      .set({
        severity: severity,
        occurrence: occurrence,
        detection: detection,
        rpn: rpn,
        criticality: criticality,
      })
      .where(eq(fmecaRatings.id, Number(id)));

    // Return the updated entry
    const updatedEntry = {
      id: Number(id),
      componentId,
      failureMode,
      failureCause,
      localEffect,
      systemEffect,
      endEffect,
      severity,
      occurrence,
      detection,
      rpn,
      criticality,
      recommendedActions,
    };

    res.status(200).json(updatedEntry);
  } catch (error) {
    console.error('Error updating FMECA entry:', error);
    res.status(500).json({ error: 'Failed to update FMECA entry' });
  }
}

// Delete a FMECA entry
export async function deleteFmecaEntry(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Get the rating to find the associated failure mode
    const [rating] = await db.select().from(fmecaRatings).where(eq(fmecaRatings.id, Number(id)));

    if (!rating) {
      return res.status(404).json({ error: 'FMECA entry not found' });
    }

    // Delete the rating
    await db.delete(fmecaRatings).where(eq(fmecaRatings.id, Number(id)));

    // Delete the failure mode
    await db.delete(failureModes).where(eq(failureModes.id, rating.failureModeId));

    res.status(200).json({ message: 'FMECA entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting FMECA entry:', error);
    res.status(500).json({ error: 'Failed to delete FMECA entry' });
  }
}

// Get FMECA analysis summary
export async function getFmecaAnalysis(req: Request, res: Response) {
  try {
    const { systemId } = req.query;
    
    if (!systemId) {
      return res.status(400).json({ error: 'System ID is required' });
    }

    // Get system components
    const systemComponents = await db.query.components.findMany({
      where: eq(components.systemId, Number(systemId)),
    });

    const componentIds = systemComponents.map(comp => comp.id);

    // Get failure modes
    const failureModesData = await db.query.failureModes.findMany({
      where: inArray(failureModes.componentId, componentIds),
    });

    const failureModeIds = failureModesData.map(fm => fm.id);

    // Get FMECA ratings
    const fmecaData = await db.query.fmecaRatings.findMany({
      where: inArray(fmecaRatings.failureModeId, failureModeIds),
    });

    // Analysis results
    const criticalFailureModes = fmecaData
      .filter(rating => rating.criticality === 'High')
      .map(rating => {
        const failureMode = failureModesData.find(fm => fm.id === rating.failureModeId);
        if (!failureMode) {
          return null;
        }
        return {
          id: rating.id,
          description: failureMode.name,
          rpn: rating.rpn,
          criticality: rating.criticality,
        };
      })
      .filter(item => item !== null);

    // Create risk matrix (severity vs occurrence)
    const riskMatrix = [];
    for (let severity = 1; severity <= 10; severity++) {
      for (let occurrence = 1; occurrence <= 10; occurrence++) {
        const count = fmecaData.filter(r => r.severity === severity && r.occurrence === occurrence).length;
        if (count > 0) {
          riskMatrix.push({ severity, occurrence, count });
        }
      }
    }

    // Pareto analysis (sort by RPN)
    const paretoAnalysis = fmecaData
      .map(rating => {
        const failureMode = failureModesData.find(fm => fm.id === rating.failureModeId);
        if (!failureMode) {
          return null;
        }
        return {
          failureMode: failureMode.name,
          rpn: rating.rpn,
        };
      })
      .filter(item => item !== null)
      .sort((a, b) => (b?.rpn || 0) - (a?.rpn || 0))
      .slice(0, 10);

    // Recommendations based on highest RPNs
    const recommendations = failureModesData
      .filter(fm => {
        const rating = fmecaData.find(r => r.failureModeId === fm.id);
        return rating && rating.rpn > 100;
      })
      .map(fm => fm.recommendedActions)
      .filter(action => action && action.trim() !== '')
      .slice(0, 5);

    const result = {
      criticalFailureModes,
      riskMatrix,
      paretoAnalysis,
      recommendations,
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error generating FMECA analysis:', error);
    res.status(500).json({ error: 'Failed to generate FMECA analysis' });
  }
}