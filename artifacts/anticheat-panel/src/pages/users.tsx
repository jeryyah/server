import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiUser } from "@/lib/api";
import { useState } from "react";
import { Users, Search, Shield, Slash, Star, Trash2, RefreshCw, Key, Copy, Check } from "lucide-react";

function generatePassword(length = 12): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$";
  let pw = "";
  for (let i = 0; i < length; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border"
      style={{ color, borderColor: color + "50", background: color + "18" }}>
      {text}
    </span>
  );
}

function PasswordGenerator() {
  const [pw, setPw] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = () => { setPw(generatePassword()); setCopied(false); };
  const copy = () => {
    navigator.clipboard.writeText(pw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Key size={14} className="text-primary" />
        <span className="text-xs font-bold tracking-widest text-muted-foreground">GENERATE PASSWORD USER</span>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-foreground min-h-[40px] flex items-center">
          {pw || <span className="text-muted-foreground text-xs">Klik Generate...</span>}
        </div>
        {pw && (
          <button onClick={copy} className="px-3 rounded-lg border border-border hover:border-primary/40 transition-colors">
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-muted-foreground" />}
          </button>
        )}
        <button
          onClick={generate}
          className="px-4 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/25 transition-colors whitespace-nowrap"
        >
          Generate
        </button>
      </div>
      {pw && (
        <p className="text-[11px] text-muted-foreground">
          Berikan password ini ke user untuk login pertama kali.
        </p>
      )}
    </div>
  );
}

function UserRow({ user, onAction }: { user: ApiUser; onAction: (action: string, id: string) => void }) {
  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${user.banned ? "border-red-500/30 bg-red-500/5" : "border-border bg-card"}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${user.role === "admin" ? "bg-primary/20" : "bg-secondary"}`}>
            <Shield size={16} className={user.role === "admin" ? "text-primary" : "text-muted-foreground"} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground">{user.username}</span>
              {user.role === "admin" && <Badge text="ADMIN" color="#00d4ff" />}
              {user.banned && <Badge text="BANNED" color="#ef4444" />}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">{user.hwid}</p>
            <div className="flex gap-4 mt-1.5">
              <span className="text-[11px] text-muted-foreground">
                Terakhir: <span className="text-foreground/60">{new Date(user.lastSeen).toLocaleDateString("id-ID")}</span>
              </span>
              {user.detectionCount > 0 && (
                <span className="text-[11px] text-red-400">⚠ {user.detectionCount} ancaman</span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex border-t border-border">
        <button onClick={() => onAction(user.banned ? "unban" : "ban", user.id)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${user.banned ? "text-green-400 hover:bg-green-400/10" : "text-red-400 hover:bg-red-400/10"}`}>
          <Slash size={12} />{user.banned ? "Unban" : "Ban"}
        </button>
        {user.role !== "admin" && (
          <button onClick={() => onAction("promote", user.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-yellow-400 hover:bg-yellow-400/10 transition-colors border-l border-border">
            <Star size={12} />Promote
          </button>
        )}
        <button onClick={() => onAction("delete", user.id)}
          className="px-4 flex items-center justify-center py-2.5 text-xs text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors border-l border-border">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["users"], queryFn: api.getUsers, refetchInterval: 10000,
  });

  const banMut = useMutation({ mutationFn: api.banUser, onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }) });
  const unbanMut = useMutation({ mutationFn: api.unbanUser, onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }) });
  const promoteMut = useMutation({ mutationFn: api.promoteUser, onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }) });
  const deleteMut = useMutation({ mutationFn: api.deleteUser, onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }) });

  const handleAction = (action: string, id: string) => {
    if (action === "ban") banMut.mutate(id);
    else if (action === "unban") unbanMut.mutate(id);
    else if (action === "promote") promoteMut.mutate(id);
    else if (action === "delete" && window.confirm("Hapus user ini secara permanen?")) deleteMut.mutate(id);
  };

  const users = data?.users ?? [];
  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.hwid.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-widest text-foreground">MANAJEMEN USER</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {users.length} user · {users.filter((u) => u.role === "admin").length} admin · {users.filter((u) => u.banned).length} diblokir
          </p>
        </div>
        <button onClick={() => qc.invalidateQueries({ queryKey: ["users"] })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>

      <PasswordGenerator />

      <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 bg-card">
        <Search size={14} className="text-muted-foreground shrink-0" />
        <input className="bg-transparent text-sm text-foreground flex-1 outline-none placeholder:text-muted-foreground"
          placeholder="Cari username atau HWID..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
          <Users size={36} />
          <p className="text-sm">{search ? "User tidak ditemukan" : "Belum ada user terdaftar"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((u) => <UserRow key={u.id} user={u} onAction={handleAction} />)}
        </div>
      )}
    </div>
  );
}
