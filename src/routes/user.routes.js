import express from "express";
import { getCurrentUser } from "../controllers/user.controller.js";

const router = express.Router();

router.get("/", getCurrentUser);

export default router;