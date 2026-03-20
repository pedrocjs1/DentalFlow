// Server-side needs the full URL (no proxy available).
// Client-side uses relative paths so Next.js rewrites handle the proxy to avoid CORS.
const SERVER_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )df_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Client-side fetch — uses relative URL so Next.js rewrite proxies to backend
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "Error desconocido" }));
    const error = new Error(body.message ?? `HTTP ${res.status}`) as Error & {
      code?: string;
      statusCode?: number;
    };
    error.code = body.code;
    error.statusCode = res.status;
    throw error;
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// Server-side fetch (reads token from cookie string) — needs full URL
export async function apiServerFetch<T>(
  path: string,
  cookieHeader: string
): Promise<T> {
  const match = cookieHeader.match(/(?:^|; )df_token=([^;]*)/);
  const token = match ? decodeURIComponent(match[1]) : null;

  const res = await fetch(`${SERVER_API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Error" }));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}
