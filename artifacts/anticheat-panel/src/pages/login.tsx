import { useState } from "react";
import { Shield, Eye, EyeOff, Lock } from "lucide-react";
import { loginPanel } from "@/lib/auth";

interface Props { onLogin: () => void; }

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError("Username dan password harus diisi."); return; }
    setLoading(true);
    setError("");
    const result = await loginPanel(username, password);
    setLoading(false);
    if (result.ok) { onLogin(); }
    else { setError(result.error ?? "Login gagal."); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield size={32} className="text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-widest text-foreground">ANTI-CHEAT</h1>
            <p className="text-xs text-muted-foreground tracking-widest mt-0.5">PANEL ADMINISTRATOR</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground tracking-widest">USERNAME</label>
            <input
              className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-colors"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground tracking-widest">PASSWORD</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                className="w-full bg-card border border-border rounded-lg px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/30">
              <Lock size={13} className="text-destructive shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-3 text-sm font-bold tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Shield size={15} />
            )}
            {loading ? "MEMVERIFIKASI..." : "MASUK"}
          </button>
        </form>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Default: <span className="font-mono">admin</span> / <span className="font-mono">anticheat2024</span>
        </p>
      </div>
    </div>
  );
}
