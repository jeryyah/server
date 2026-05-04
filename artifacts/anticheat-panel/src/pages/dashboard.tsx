import { useQuery } from "@tanstack/react-query";
import { api, type ApiStats } from "@/lib/api";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { Shield, Users, AlertTriangle, Zap, TrendingUp, Clock } from "lucide-react";

const SEV_COLORS = {
  low: "#eab308",
  medium: "#f97316",
  high: "#ef4444",
  critical: "#dc2626",
};

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex gap-4 items-start">
      <div className="rounded-lg p-2.5" style={{ background: color + "20" }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground tracking-widest uppercase font-semibold">{label}</p>
        <p className="text-2xl font-bold mt-0.5" style={{ color }}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SevPill({ sev, count }: { sev: string; count: number }) {
  const colors: Record<string, string> = {
    critical: "#dc2626", high: "#ef4444", medium: "#f97316", low: "#eab308",
  };
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-border">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: colors[sev] }} />
        <span className="text-sm font-semibold capitalize">{sev}</span>
      </div>
      <span className="text-sm font-bold" style={{ color: colors[sev] }}>{count}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<ApiStats>({
    queryKey: ["stats"],
    queryFn: api.getStats,
    refetchInterval: 10000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
    </div>
  );

  const s = stats!;
  const pieData = [
    { name: "Critical", value: s.bySeverity.critical, color: "#dc2626" },
    { name: "High", value: s.bySeverity.high, color: "#ef4444" },
    { name: "Medium", value: s.bySeverity.medium, color: "#f97316" },
    { name: "Low", value: s.bySeverity.low, color: "#eab308" },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-widest text-foreground">DASHBOARD</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Monitoring real-time anti-cheat</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={s.totalUsers} sub={`${s.bannedUsers} diblokir`} color="#00d4ff" />
        <StatCard icon={Shield} label="Total Events" value={s.totalEvents} sub="semua waktu" color="#22c55e" />
        <StatCard icon={AlertTriangle} label="Kritis" value={s.criticalEvents} sub="semua waktu" color="#dc2626" />
        <StatCard icon={Clock} label="24 Jam Terakhir" value={s.eventsLast24h} sub="deteksi baru" color="#f97316" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-primary" />
            <h2 className="text-sm font-bold tracking-widest text-muted-foreground">AKTIVITAS 24 JAM</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={s.hourlyActivity} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} interval={3} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#0d1420", border: "1px solid #1e2d40", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#94a3b8" }}
                itemStyle={{ color: "#00d4ff" }}
              />
              <Area type="monotone" dataKey="count" stroke="#00d4ff" strokeWidth={2} fill="url(#cg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-primary" />
            <h2 className="text-sm font-bold tracking-widest text-muted-foreground">SEBARAN SEVERITY</h2>
          </div>
          {pieData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#0d1420", border: "1px solid #1e2d40", borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: "#e2e8f0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full space-y-2 mt-2">
                {Object.entries(s.bySeverity).reverse().map(([sev, cnt]) => (
                  <SevPill key={sev} sev={sev} count={cnt} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">Belum ada data</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-primary" />
          <h2 className="text-sm font-bold tracking-widest text-muted-foreground">TOP 5 ANCAMAN</h2>
        </div>
        {s.topThreats.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={s.topThreats} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#0d1420", border: "1px solid #1e2d40", borderRadius: 8, fontSize: 12 }}
                itemStyle={{ color: "#00d4ff" }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {s.topThreats.map((_, i) => <Cell key={i} fill={["#dc2626","#ef4444","#f97316","#eab308","#00d4ff"][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-8">Belum ada ancaman terdeteksi</p>
        )}
      </div>
    </div>
  );
}
