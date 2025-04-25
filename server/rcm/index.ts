import express from "express";
import fmecaRoutes from "./fmeca-routes";

const router = express.Router();

router.use("/", fmecaRoutes);

export default router;