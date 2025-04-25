import express from "express";
import routes from "./routes";

// Export a router that uses routes from routes.ts
const router = express.Router();
router.use("/", routes);

export default router;