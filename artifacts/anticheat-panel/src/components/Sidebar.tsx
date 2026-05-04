import { Link, useLocation } from "wouter";
import { LayoutDashboard, ListFilter, Users, Shield, Monitor, LogOut } from "lucide-react";
import { logoutPanel } from "@/lib/auth";

const NAV = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/devices", icon: Monitor, label: "Device Monitor" },
  { href: "/events", icon: ListFilter, label: "Log Deteksi" },
  { href: "/users", icon: Users, label: "Manajemen User" },
];

interface Props { onLogout: () => void; }

export default function Sidebar({ onLogout }: Props) {
  const [location] = useLocation();

  const handleLogout = async () => {
    await logoutPanel();
    onLogout();
  };

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card flex flex-col min-h-screen">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Shield size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-widest text-foreground">ANTI-CHEAT</p>
          <p className="text-[10px] text-muted-foreground tracking-widest">PANEL v1.0</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = location === href || (href !== "/" && location.startsWith(href));
          return (
            <Link key={href} href={href}>
              <a className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}>
                <Icon size={16} />
                {label}
              </a>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border space-y-3">
        <div className="flex items-center gap-2 px-3">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[11px] text-muted-foreground">Live • Auto-refresh 6s</span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut size={14} />
          Logout Panel
        </button>
      </div>
    </aside>
  );
}
