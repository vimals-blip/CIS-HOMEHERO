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

// Upload a file as multipart/form-data. Does NOT set Content-Type so the
// browser adds the correct multipart boundary. Transparently refreshes once on 401.
export async function uploadFile<T = any>(
  file: File,
  opts: { folder?: string } = {},
  retried = false,
): Promise<T> {
  const qs = opts.folder ? `?folder=${encodeURIComponent(opts.folder)}` : '';
  const form = new FormData();
  form.append('file', file);

  const token = getAccessToken();
  const res = await fetch(`${API_BASE}/uploads${qs}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (res.status === 401 && !retried && getRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) return uploadFile<T>(file, opts, true);
    clearTokens();
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message ?? body?.error ?? 'Upload failed');
  return body as T;
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

  // 401 → the session isn't valid. Try a one-time transparent refresh; if that
  // can't recover it (no/expired refresh token, rotated secret, etc.), clear the
  // session so the app redirects to login instead of rendering a broken,
  // data-less dashboard.
  if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
    if (getRefreshToken()) {
      const newToken = await refreshAccessToken();
      if (newToken) return apiFetch<T>(path, options, true);
    }
    clearTokens();
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
