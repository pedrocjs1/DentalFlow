"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#precios", label: "Precios" },
  { href: "#testimonios", label: "Testimonios" },
  { href: "#faq", label: "FAQ" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 text-gray-600 hover:text-gray-900"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="fixed top-0 right-0 w-64 h-full bg-white shadow-xl p-6 flex flex-col">
            <button
              onClick={() => setOpen(false)}
              className="self-end p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            <nav className="mt-8 space-y-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block text-base font-medium text-gray-700 hover:text-primary-600 transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <hr className="border-gray-200" />
              <a
                href="https://app.dentalflow.app/registro"
                className="block text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Iniciar sesión
              </a>
              <a
                href="https://app.dentalflow.app/registro"
                className="block text-center bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors"
              >
                Empezar gratis
              </a>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
