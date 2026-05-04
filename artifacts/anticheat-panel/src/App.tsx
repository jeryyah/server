import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import EventsPage from "@/pages/events";
import UsersPage from "@/pages/users";
import DevicesPage from "@/pages/devices";
import NotFound from "@/pages/not-found";
import { verifyToken } from "@/lib/auth";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5000 } },
});

function Layout({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onLogout={onLogout} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function AppInner() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    verifyToken().then((valid) => {
      setAuthed(valid);
      if (!valid) navigate("/login");
    });
  }, []);

  const handleLogin = () => { setAuthed(true); navigate("/"); };
  const handleLogout = () => { setAuthed(false); navigate("/login"); };

  if (authed === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!authed) {
    return (
      <Switch>
        <Route path="/login" component={() => <LoginPage onLogin={handleLogin} />} />
        <Route component={() => <LoginPage onLogin={handleLogin} />} />
      </Switch>
    );
  }

  return (
    <Layout onLogout={handleLogout}>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/devices" component={DevicesPage} />
        <Route path="/events" component={EventsPage} />
        <Route path="/users" component={UsersPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AppInner />
        <Toaster />
      </WouterRouter>
    </QueryClientProvider>
  );
}
