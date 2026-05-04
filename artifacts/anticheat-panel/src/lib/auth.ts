const TOKEN_KEY = "ac_panel_token";
const API = "/api";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function loginPanel(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API}/dashboard/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const data = await res.json() as { token: string };
      setToken(data.token);
      return { ok: true };
    }
    const err = await res.json() as { error: string };
    return { ok: false, error: err.error };
  } catch {
    return { ok: false, error: "Tidak dapat terhubung ke server." };
  }
}

export async function logoutPanel() {
  const token = getToken();
  clearToken();
  try {
    await fetch(`${API}/dashboard/logout`, {
      method: "POST",
      headers: { "x-panel-token": token ?? "" },
    });
  } catch {}
}

export async function verifyToken(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch(`${API}/dashboard/verify`, {
      headers: { "x-panel-token": token },
    });
    const data = await res.json() as { valid: boolean };
    return data.valid;
  } catch {
    return false;
  }
}
