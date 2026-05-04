import { Router, type Request } from "express";
import { store } from "../lib/store.js";

const router = Router();

function getClientIP(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return ip.trim();
  }
  return req.socket?.remoteAddress ?? req.ip ?? "unknown";
}

router.get("/myip", (req, res) => {
  res.json({ ip: getClientIP(req) });
});

router.get("/devices", (_req, res) => {
  res.json({ devices: store.getDevices() });
});

router.post("/devices/checkin", (req, res) => {
  const body = req.body;
  if (!body?.hwid) { res.status(400).json({ error: "Missing hwid" }); return; }
  const ip = getClientIP(req);
  const device = store.upsertDevice({
    hwid: body.hwid,
    username: body.username,
    deviceName: body.deviceName,
    model: body.model,
    os: body.os,
    ip,
    screenshotBase64: body.screenshotBase64,
  });
  res.json({ ...device, ip });
});

router.post("/devices/checkout", (req, res) => {
  const { hwid } = req.body;
  if (!hwid) { res.status(400).json({ error: "Missing hwid" }); return; }
  store.setDeviceOffline(hwid);
  res.json({ ok: true });
});

router.post("/devices/screenshot", (req, res) => {
  const { hwid, screenshotBase64 } = req.body;
  if (!hwid || !screenshotBase64) { res.status(400).json({ error: "Missing hwid or screenshot" }); return; }
  store.updateDeviceScreenshot(hwid, screenshotBase64);
  res.json({ ok: true });
});

export default router;
