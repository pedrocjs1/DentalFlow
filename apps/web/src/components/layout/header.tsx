"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Bell } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Inicio",
  "/agenda": "Agenda",
  "/pacientes": "Pacientes",
  "/pipeline": "Pipeline CRM",
  "/campanas": "Campañas",
  "/conversaciones": "Conversaciones",
  "/configuracion": "Configuración",
};

const PAGE_SUBTITLES: Record<string, string> = {
  "/dashboard": "Resumen general de tu clínica",
  "/agenda": "Gestiona las citas de tus pacientes",
  "/pacientes": "Historial y fichas de pacientes",
  "/pipeline": "Seguimiento comercial de pacientes",
  "/campanas": "Marketing y comunicaciones masivas",
  "/conversaciones": "Mensajes de WhatsApp",
  "/configuracion": "Ajustes de tu clínica",
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
  const subtitle = PAGE_SUBTITLES[pathname];
  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <header className="h-16 bg-white border-b border-gray-200/80 flex items-center justify-between px-6 flex-shrink-0">
      <div className="min-w-0 pl-10 md:pl-0">
        <h1 className="text-lg font-semibold text-gray-900 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-gray-400 hidden sm:block">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button
          className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          title="Notificaciones"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200 mx-1 hidden sm:block" />

        {/* User info */}
        {user && (
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">
              {user.name}
            </p>
            <p className="text-[11px] text-gray-400">
              {ROLE_LABELS[user.role] ?? user.role}
            </p>
          </div>
        )}

        {/* Avatar */}
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-xs font-bold text-white">{initials}</span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
