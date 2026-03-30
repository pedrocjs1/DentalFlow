/**
 * Role-based permission helpers for the Dentiqa dashboard.
 *
 * Roles: OWNER > ADMIN > RECEPTIONIST / DENTIST
 */

export type UserRole = "OWNER" | "ADMIN" | "DENTIST" | "RECEPTIONIST";

// ─── Sidebar visibility ──────────────────────────────────────────────────────

/** Routes each role can see in the sidebar / navigate to. */
const ALLOWED_ROUTES: Record<UserRole, string[]> = {
  OWNER: ["/dashboard", "/agenda", "/pacientes", "/pipeline", "/campanas", "/estadisticas", "/conversaciones", "/configuracion"],
  ADMIN: ["/dashboard", "/agenda", "/pacientes", "/pipeline", "/campanas", "/estadisticas", "/conversaciones", "/configuracion"],
  DENTIST: ["/dashboard", "/agenda", "/pacientes", "/conversaciones"],
  RECEPTIONIST: ["/dashboard", "/agenda", "/pacientes", "/pipeline", "/campanas", "/conversaciones"],
};

/** Check if a role can access a given route prefix. */
export function canAccessRoute(role: UserRole | string, pathname: string): boolean {
  const allowed = ALLOWED_ROUTES[role as UserRole] ?? ALLOWED_ROUTES.RECEPTIONIST;
  return allowed.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

/** Filter sidebar items to only those the role can see. */
export function filterNavItems<T extends { href: string }>(items: T[], role: UserRole | string): T[] {
  const allowed = ALLOWED_ROUTES[role as UserRole] ?? ALLOWED_ROUTES.RECEPTIONIST;
  return items.filter((item) => allowed.some((r) => item.href === r || item.href.startsWith(r)));
}

// ─── Patient tabs visibility ─────────────────────────────────────────────────

/** Clinical tabs that require OWNER/ADMIN/DENTIST role. */
const CLINICAL_TABS = new Set([
  "odontograma",
  "periodoncia",
  "tratamiento",
  "evoluciones",
  "historia",
  "imagenes",
  "documentos",
]);

/** Check if a role can see a specific patient tab. */
export function canSeePatientTab(role: UserRole | string, tabValue: string): boolean {
  if (role === "RECEPTIONIST") return !CLINICAL_TABS.has(tabValue);
  return true; // OWNER, ADMIN, DENTIST see all tabs
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isManagerRole(role: string): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** Read the current user role from localStorage (client-side only). */
export function getUserRole(): UserRole {
  if (typeof window === "undefined") return "RECEPTIONIST";
  try {
    const stored = localStorage.getItem("df_user");
    if (stored) {
      const user = JSON.parse(stored);
      return (user.role as UserRole) ?? "RECEPTIONIST";
    }
  } catch { /* ignore */ }
  return "RECEPTIONIST";
}

/** Read the full user object from localStorage. */
export function getStoredUser(): { id: string; email: string; name: string; role: UserRole } | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("df_user");
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}
