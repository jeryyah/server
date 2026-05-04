import { Router } from "express";
import { store } from "../lib/store.js";

const router = Router();

router.get("/events", (req, res) => {
  let events = store.getEvents();
  const { severity, username, hwid, limit = "200", offset = "0" } = req.query as Record<string, string>;
  if (severity) events = events.filter((e) => e.severity === severity);
  if (username) events = events.filter((e) => e.username.toLowerCase().includes(username.toLowerCase()));
  if (hwid) events = events.filter((e) => e.hwid === hwid);
  const total = events.length;
  events = events.slice(Number(offset), Number(offset) + Number(limit));
  res.json({ events, total });
});

router.post("/events", (req, res) => {
  const body = req.body;
  if (!body?.id || !body?.type || !body?.hwid) {
    res.status(400).json({ error: "Missing required fields: id, type, hwid" });
    return;
  }
  const event = store.addEvent({
    id: body.id,
    type: body.type,
    description: body.description ?? "",
    severity: body.severity ?? "low",
    timestamp: body.timestamp ?? new Date().toISOString(),
    hwid: body.hwid,
    username: body.username ?? "unknown",
    details: body.details,
    screenshotUrl: body.screenshotUrl,
  });
  res.status(201).json(event);
});

router.delete("/events", (req, res) => {
  store.clearEvents();
  res.json({ ok: true });
});

export default router;
