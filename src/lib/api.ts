export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  'http://localhost:4001/api/v1';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('homehero_token');
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(body?.message ?? body?.error ?? res.statusText ?? 'API request failed');
  }
  if (body === null) {
    throw new Error(`Invalid API response from ${url}`);
  }
  return body as T;
}
