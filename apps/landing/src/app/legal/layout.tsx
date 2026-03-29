import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

const LEGAL_LINKS = [
  { href: "/legal/politica-de-privacidad", label: "Política de Privacidad" },
  { href: "/legal/terminos-de-servicio", label: "Términos de Servicio" },
  { href: "/legal/eliminacion-de-datos", label: "Eliminación de Datos" },
];

const APP_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/registro`
  : process.env.NODE_ENV === "production"
    ? "https://dashboard.dentiqa.app/registro"
    : "http://localhost:3000/registro";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">DQ</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900 tracking-tight leading-none">
                Denti<span className="text-primary-600">qa</span>
              </span>
              <span className="text-[9px] text-gray-400 leading-none">by Violet Wave IA</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-3">
            <a
              href={APP_URL}
              className="text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 px-5 py-2 rounded-lg transition-colors shadow-sm"
            >
              Probá gratis 14 días
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pt-24 pb-16 min-h-screen bg-gray-50/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6 sm:p-10">
            {children}
          </div>

          {/* Legal navigation */}
          <nav className="mt-8 flex flex-wrap gap-4 justify-center">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-gray-500 hover:text-primary-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-gray-500">
              &copy; 2026 Dentiqa by Violet Wave IA. Todos los derechos reservados.
            </p>
            <p className="text-xs text-gray-600">
              Hecho con 💙 en Argentina para toda Latinoamérica
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
