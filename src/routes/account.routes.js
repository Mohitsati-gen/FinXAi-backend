import express from "express";
import { createAccount } from "../controllers/account.controller.js";
import { getAccounts } from "../controllers/account.controller.js";
import { setDefaultAccount } from "../controllers/account.controller.js";
import { getAccountById } from "../controllers/account.controller.js";
import { getAccountTransactions } from "../controllers/account.controller.js";
import { deleteAccount } from "../controllers/account.controller.js";

const router = express.Router();

router.get("/", getAccounts);
router.post("/", createAccount);
router.get("/:id/transactions",getAccountTransactions)
router.patch("/:id/default", setDefaultAccount);
router.get("/:id",getAccountById)
router.delete("/:id", deleteAccount);

export default router;