import { Router } from "express";
import crypto from "crypto";

const router = Router();

const PANEL_USER = process.env["PANEL_USER"] ?? "admin";
const PANEL_PASS = process.env["PANEL_PASSWORD"] ?? "anticheat2024";

const sessions = new Set<string>();

router.post("/dashboard/login", (req, res) => {
  const { username, password } = req.body ?? {};
  if (username === PANEL_USER && password === PANEL_PASS) {
    const token = crypto.randomBytes(32).toString("hex");
    sessions.add(token);
    res.json({ ok: true, token });
  } else {
    res.status(401).json({ error: "Username atau password salah." });
  }
});

router.post("/dashboard/logout", (req, res) => {
  const token = req.headers["x-panel-token"] as string;
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

router.get("/dashboard/verify", (req, res) => {
  const token = req.headers["x-panel-token"] as string;
  res.json({ valid: sessions.has(token) });
});

export { sessions };
export default router;
