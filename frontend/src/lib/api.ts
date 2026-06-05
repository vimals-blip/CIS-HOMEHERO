export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  'http://localhost:4001/api/v1';

const ACCESS_KEY = 'homehero_token';
const REFRESH_KEY = 'homehero_refresh';

function hasWindow() {
  return typeof window !== 'undefined';
}

export function getAccessToken(): string | null {
  if (!hasWindow()) return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (!hasWindow()) return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken?: string) {
  if (!hasWindow()) return;
  window.localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) window.localStorage.setItem(REFRESH_KEY, refreshToken);
  window.dispatchEvent(new Event('homehero-auth-changed'));
}

export function clearTokens() {
  if (!hasWindow()) return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.dispatchEvent(new Event('homehero-auth-changed'));
}

// Dedupe concurrent refreshes so a burst of 401s triggers only one rotation.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) { clearTokens(); return null; }
        const data = await res.json();
        setTokens(data.accessToken, data.refreshToken);
        return data.accessToken as string;
      } catch {
        clearTokens();
        return null;
      }
    })();
  }

  const token = await refreshPromise.finally(() => { refreshPromise = null; });
  return token;
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  // Access token expired? Transparently refresh once and retry.
  if (res.status === 401 && !retried && !path.startsWith('/auth/') && getRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) return apiFetch<T>(path, options, true);
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(body?.message ?? body?.error ?? res.statusText ?? 'API request failed');
  }
  if (body === null) {
    throw new Error(`Invalid API response from ${url}`);
  }
  return body as T;
}
