import express from "express";
import { getBudget, upsertBudget } from "../controllers/budget.controller.js";
 
const router = express.Router();
 
router.get ("/" , getBudget);    // GET  /api/budget
router.post("/",  upsertBudget); // POST /api/budget
 
export default router;