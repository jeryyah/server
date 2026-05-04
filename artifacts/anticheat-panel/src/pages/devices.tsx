import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Monitor, Wifi, WifiOff, RefreshCw, Smartphone, Clock, Hash, Globe } from "lucide-react";
import { api } from "@/lib/api";

interface Device {
  hwid: string;
  username: string;
  deviceName: string;
  model: string;
  os: string;
  ip: string;
  lastSeen: string;
  screenshotBase64?: string;
  status: "online" | "offline";
  loginCount: number;
}

function DeviceCard({ device }: { device: Device }) {
  const isOnline = device.status === "online";
  const lastSeen = new Date(device.lastSeen).toLocaleString("id-ID");

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      isOnline ? "border-primary/30 shadow-[0_0_20px_rgba(0,212,255,0.05)]" : "border-border"
    }`} style={{ background: "hsl(var(--card))" }}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b border-border ${
        isOnline ? "bg-primary/5" : "bg-secondary/40"
      }`}>
        <div className="flex items-center gap-2.5">
          <Smartphone size={15} className={isOnline ? "text-primary" : "text-muted-foreground"} />
          <span className="text-sm font-bold text-foreground">{device.deviceName}</span>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${
          isOnline ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"
        }`}>
          {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
          {isOnline ? "ONLINE" : "OFFLINE"}
        </div>
      </div>

      {/* Screenshot */}
      <div className="aspect-video bg-secondary/60 border-b border-border flex items-center justify-center relative overflow-hidden">
        {device.screenshotBase64 ? (
          <img
            src={`data:image/jpeg;base64,${device.screenshotBase64}`}
            alt="device screenshot"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Monitor size={32} className="opacity-30" />
            <span className="text-xs opacity-50">Belum ada screenshot</span>
          </div>
        )}
        {isOnline && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500/80 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-bold text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <InfoItem icon={Globe} label="IP Address" value={device.ip} mono />
        <InfoItem icon={Smartphone} label="User" value={device.username} />
        <InfoItem icon={Hash} label="OS" value={device.os} />
        <InfoItem icon={Monitor} label="Login" value={`${device.loginCount}x`} />
        <div className="col-span-2">
          <InfoItem icon={Hash} label="HWID" value={device.hwid} mono />
        </div>
        <div className="col-span-2">
          <InfoItem icon={Clock} label="Terakhir Aktif" value={lastSeen} />
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, mono }: {
  icon: React.ElementType; label: string; value: string; mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <Icon size={10} className="text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground tracking-widest font-semibold uppercase">{label}</span>
      </div>
      <p className={`text-xs text-foreground truncate ${mono ? "font-mono" : "font-medium"}`}>{value || "—"}</p>
    </div>
  );
}

export default function DevicesPage() {
  const qc = useQueryClient();
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["devices"],
    queryFn: api.getDevices,
    refetchInterval: 6000,
  });

  const devices = (data as { devices: Device[] })?.devices ?? [];
  const onlineCount = devices.filter((d) => d.status === "online").length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-widest text-foreground">DEVICE MONITOR</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {devices.length} device terdaftar ·{" "}
            <span className="text-green-400 font-semibold">{onlineCount} online</span>
          </p>
        </div>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ["devices"] })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground border border-border rounded-xl">
          <Monitor size={40} className="opacity-30" />
          <p className="text-sm">Belum ada device terdaftar</p>
          <p className="text-xs opacity-60">Device akan muncul saat user login di aplikasi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {devices.map((d) => <DeviceCard key={d.hwid} device={d} />)}
        </div>
      )}
    </div>
  );
}
