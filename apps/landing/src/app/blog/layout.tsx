import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s | Blog Dentiqa", default: "Blog Dentiqa | Software Dental y Odontologia Digital" },
  description: "Articulos, guias y recursos sobre software dental, gestion de clinicas odontologicas y tecnologia para dentistas.",
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Dentiqa",
  url: "https://dentiqa.app",
  logo: "https://dentiqa.app/favicon.svg",
  contactPoint: { "@type": "ContactPoint", email: "hola@dentiqa.app", contactType: "sales" },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><span className="text-white text-sm font-bold">DQ</span></div>
            <span className="text-lg font-bold text-gray-900">Denti<span className="text-blue-600">qa</span></span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/blog" className="text-sm font-medium text-gray-600 hover:text-blue-600">Blog</a>
            <a href="https://dashboard.dentiqa.app/registro" className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg">Proba gratis</a>
          </div>
        </div>
      </header>
      <main className="min-h-screen bg-gray-50">{children}</main>
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm">&copy; 2026 Dentiqa by Violet Wave IA</p>
          <div className="flex gap-6">
            <a href="/" className="text-sm hover:text-white">Inicio</a>
            <a href="/blog" className="text-sm hover:text-white">Blog</a>
            <a href="https://wa.me/5492612312567" className="text-sm hover:text-white">Contacto</a>
          </div>
        </div>
      </footer>
    </>
  );
}
