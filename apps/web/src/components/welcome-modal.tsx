"use client";

import { useState, useEffect } from "react";
import { X, MessageSquare, Users, Upload } from "lucide-react";

export function WelcomeModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const shouldShow = localStorage.getItem("df_welcome") === "1";
    if (shouldShow) {
      setShow(true);
      localStorage.removeItem("df_welcome");
    }
  }, []);

  if (!show) return null;

  const steps = [
    { icon: <MessageSquare className="h-5 w-5 text-emerald-500" />, title: "Conectá tu WhatsApp", desc: "Vinculá tu número de WhatsApp Business", href: "/configuracion?tab=integraciones" },
    { icon: <Users className="h-5 w-5 text-blue-500" />, title: "Agregá tus profesionales", desc: "Cargá los dentistas de tu clínica", href: "/configuracion?tab=profesionales" },
    { icon: <Upload className="h-5 w-5 text-purple-500" />, title: "Cargá tus pacientes", desc: "Importá desde CSV o cargá manualmente", href: "/pacientes" },
  ];

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button onClick={() => setShow(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🎉</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">¡Bienvenido a Dentiqa!</h2>
          <p className="text-sm text-gray-500 mt-1">Tu prueba gratuita de 14 días está activa.</p>
        </div>

        <div className="space-y-3 mb-6">
          {steps.map((s, i) => (
            <a
              key={i}
              href={s.href}
              onClick={() => setShow(false)}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-colors"
            >
              <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                {s.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </div>
            </a>
          ))}
        </div>

        <button
          onClick={() => setShow(false)}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          Empezar a usar Dentiqa
        </button>
      </div>
    </div>
  );
}
