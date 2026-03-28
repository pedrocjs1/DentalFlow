/**
 * Admin API helper
 * Uses df_admin_token cookie (httpOnly) for authentication.
 * All requests go to /api/v1/admin/*
 */

export const ADMIN_API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export class AdminApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export async function adminFetch<T = unknown>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${ADMIN_API_BASE}${path}`, {
    ...rest,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    let body: { message?: string; code?: string } = {};
    try {
      body = await res.json();
    } catch {}
    throw new AdminApiError(
      res.status,
      body.code ?? "UNKNOWN",
      body.message ?? `HTTP ${res.status}`
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
