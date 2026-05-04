import { Router } from "express";
import { store } from "../lib/store.js";

const router = Router();

router.get("/users", (_req, res) => {
  res.json({ users: store.getUsers() });
});

router.post("/users/sync", (req, res) => {
  const body = req.body;
  if (!body?.id || !body?.hwid) {
    res.status(400).json({ error: "Missing id or hwid" });
    return;
  }
  const events = store.getEvents();
  const detectionCount = events.filter(
    (e) => e.hwid === body.hwid && e.severity !== "low"
  ).length;

  const user = store.upsertUser({
    id: body.id,
    username: body.username ?? "unknown",
    hwid: body.hwid,
    role: body.role ?? "user",
    banned: body.banned ?? false,
    registeredAt: body.registeredAt ?? new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    detectionCount,
  });
  res.json(user);
});

router.put("/users/:id/ban", (req, res) => {
  const user = store.updateUser(req.params.id, { banned: true });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

router.put("/users/:id/unban", (req, res) => {
  const user = store.updateUser(req.params.id, { banned: false });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

router.put("/users/:id/promote", (req, res) => {
  const user = store.updateUser(req.params.id, { role: "admin" });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

router.delete("/users/:id", (req, res) => {
  store.deleteUser(req.params.id);
  res.json({ ok: true });
});

export default router;
