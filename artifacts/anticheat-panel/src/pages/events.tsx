import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiEvent } from "@/lib/api";
import { useState } from "react";
import { AlertTriangle, Trash2, RefreshCw, Search, Filter } from "lucide-react";

const SEV_CONFIG = {
  critical: { color: "text-red-500", bg: "bg-red-500/10 border-red-500/30", label: "KRITIS" },
  high:     { color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30", label: "TINGGI" },
  medium:   { color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30", label: "SEDANG" },
  low:      { color: "text-green-400", bg: "bg-green-400/10 border-green-400/30", label: "RENDAH" },
};

function EventRow({ event }: { event: ApiEvent }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEV_CONFIG[event.severity];

  return (
    <div
      className="border border-border rounded-lg overflow-hidden cursor-pointer hover:border-primary/30 transition-colors"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start gap-3 p-3">
        <div className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${sev.bg} ${sev.color}`}>
          {sev.label}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{event.type}</p>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {new Date(event.timestamp).toLocaleString("id-ID")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
          <div className="flex gap-3 mt-1">
            <span className="text-[11px] text-primary font-mono">{event.username}</span>
            <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[140px]">{event.hwid}</span>
          </div>
        </div>
      </div>
      {expanded && event.details && (
        <div className="border-t border-border bg-secondary/40 px-4 py-3">
          <p className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">{event.details}</p>
        </div>
      )}
    </div>
  );
}

export default function EventsPage() {
  const qc = useQueryClient();
  const [severity, setSeverity] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["events", severity, search],
    queryFn: () => api.getEvents({ severity: severity || undefined, username: search || undefined, limit: 300 }),
    refetchInterval: 8000,
  });

  const clearMut = useMutation({
    mutationFn: api.clearEvents,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });

  const events = data?.events ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-widest text-foreground">LOG DETEKSI</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} total event</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["events"] })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => clearMut.mutate()}
            disabled={clearMut.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/30 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={14} />
            Hapus Semua
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[180px] border border-border rounded-lg px-3 py-2 bg-card">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input
            className="bg-transparent text-sm text-foreground flex-1 outline-none placeholder:text-muted-foreground"
            placeholder="Cari username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-card">
          <Filter size={14} className="text-muted-foreground" />
          <select
            className="bg-transparent text-sm text-foreground outline-none cursor-pointer"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            <option value="">Semua Level</option>
            <option value="critical">Kritis</option>
            <option value="high">Tinggi</option>
            <option value="medium">Sedang</option>
            <option value="low">Rendah</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
          <AlertTriangle size={36} />
          <p className="text-sm">Tidak ada event ditemukan</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((e) => <EventRow key={e.id} event={e} />)}
        </div>
      )}
    </div>
  );
}
