"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Inicio",
  "/agenda": "Agenda",
  "/pacientes": "Pacientes",
  "/pipeline": "Pipeline CRM",
  "/campanas": "Campañas",
  "/conversaciones": "Conversaciones",
  "/configuracion": "Configuración",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Dueño",
  ADMIN: "Admin",
  DENTIST: "Dentista",
  RECEPTIONIST: "Recepcionista",
};

interface StoredUser {
  name: string;
  email: string;
  role: string;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("df_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  const handleLogout = () => {
    document.cookie = "df_token=; path=/; max-age=0";
    localStorage.removeItem("df_token");
    localStorage.removeItem("df_user");
    router.push("/login");
    router.refresh();
  };

  const title = PAGE_TITLES[pathname] ?? "DentalFlow";
  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : "U";

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-3">
        {user && (
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">{user.name}</p>
            <p className="text-xs text-gray-400">{ROLE_LABELS[user.role] ?? user.role}</p>
          </div>
        )}
        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-primary-700">{initials}</span>
        </div>
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
