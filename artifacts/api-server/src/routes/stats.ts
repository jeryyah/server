import { Router } from "express";
import { store } from "../lib/store.js";

const router = Router();

router.get("/stats", (_req, res) => {
  res.json(store.getStats());
});

export default router;
