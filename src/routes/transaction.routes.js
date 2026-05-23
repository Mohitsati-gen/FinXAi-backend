import express from "express";
import { bulkDeleteTransactions } from "../controllers/transaction.controller.js";
import { getAccountTransactions } from "../controllers/transaction.controller.js";
import { createTransaction } from "../controllers/transaction.controller.js";
import { arcjetMiddleware } from "../middlewares/arcjet.middleware.js";
import multer from "multer";
import { verifyAuth } from "../middlewares/auth.middleware.js";
import { scanReceipt } from "../controllers/transaction.controller.js";
import { updateTransaction } from "../controllers/transaction.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // store in memory, not disk


router.post("/", verifyAuth , arcjetMiddleware , createTransaction);
router.get("/account/:id",verifyAuth, arcjetMiddleware ,   getAccountTransactions);
router.delete("/bulk", verifyAuth , arcjetMiddleware , bulkDeleteTransactions);
router.post("/scan-receipt", verifyAuth, arcjetMiddleware, upload.single("receipt"), scanReceipt);
router.patch("/:id", verifyAuth, arcjetMiddleware , updateTransaction);

export default router;