import { Router } from "express";
import * as rcmController from "./index";
import { Request, Response, NextFunction } from "express";

const router = Router();

// Authentication middleware
const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

// Systems endpoints
router.get("/systems", rcmController.getSystems);
router.get("/systems/:id", rcmController.getSystemById);
router.post("/systems", authenticateUser, rcmController.createSystem);
router.put("/systems/:id", authenticateUser, rcmController.updateSystem);
router.delete("/systems/:id", authenticateUser, rcmController.deleteSystem);

// Components endpoints
router.get("/components", rcmController.getComponents);
router.get("/components/:id", rcmController.getComponentById);
router.post("/components", authenticateUser, rcmController.createComponent);
router.put("/components/:id", authenticateUser, rcmController.updateComponent);
router.delete("/components/:id", authenticateUser, rcmController.deleteComponent);

// FMECA endpoints
router.get("/fmeca-ratings", rcmController.getFmecaRatings);
router.post("/fmeca-ratings", authenticateUser, rcmController.createFmecaRating);
router.put("/fmeca-ratings/:id", authenticateUser, rcmController.updateFmecaRating);

// RCM Consequences endpoints
router.get("/rcm-consequences", rcmController.getRcmConsequences);
router.post("/rcm-consequences", authenticateUser, rcmController.createRcmConsequence);

// Maintenance Tasks endpoints
router.get("/maintenance-tasks", rcmController.getMaintenanceTasks);
router.post("/maintenance-tasks", authenticateUser, rcmController.createMaintenanceTask);

// Analysis endpoints
router.get("/analysis/fmeca/:systemId", rcmController.fmecaAnalysis);
router.get("/analysis/rcm/:failureModeId", rcmController.rcmAnalysis);
router.get("/analysis/ram/:systemId", rcmController.ramAnalysis);

export default router;