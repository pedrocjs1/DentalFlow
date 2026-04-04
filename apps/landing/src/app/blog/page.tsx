import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog Dentiqa | Articulos sobre Software Dental y Odontologia Digital",
  description: "Guias, comparativas y recursos sobre software dental, gestion de clinicas odontologicas, WhatsApp para dentistas y mas.",
  alternates: { canonical: "https://dentiqa.app/blog" },
};

const articles = [
  {
    slug: "mejor-software-dental-2026",
    title: "Mejor Software Dental 2026: Guia Completa para Elegir el Indicado",
    description: "Comparativa de funcionalidades, IA y WhatsApp: todo lo que necesitas para elegir el software dental ideal.",
    date: "2026-04-01",
    dateFormatted: "1 de abril, 2026",
    readTime: "12 min",
  },
  {
    slug: "software-gestion-clinica-dental",
    title: "Software de Gestion para Clinicas Dentales: Todo lo que Necesitas Saber",
    description: "Problemas de gestionar sin software, beneficios de digitalizar y los modulos esenciales.",
    date: "2026-03-28",
    dateFormatted: "28 de marzo, 2026",
    readTime: "10 min",
  },
  {
    slug: "historia-clinica-dental-digital",
    title: "Historia Clinica Dental Digital: Ventajas del Odontograma y Periodontograma Online",
    description: "Descubri por que la historia clinica digital supera al papel en seguridad, accesibilidad y eficiencia.",
    date: "2026-03-25",
    dateFormatted: "25 de marzo, 2026",
    readTime: "11 min",
  },
  {
    slug: "whatsapp-para-clinicas-dentales",
    title: "WhatsApp para Clinicas Dentales: Como Automatizar la Comunicacion",
    description: "Chatbot con IA, recordatorios automaticos y templates: la guia definitiva de WhatsApp dental.",
    date: "2026-03-20",
    dateFormatted: "20 de marzo, 2026",
    readTime: "9 min",
  },
  {
    slug: "agenda-turnos-dentista-online",
    title: "Agenda de Turnos para Dentistas Online: Optimiza tu Consulta",
    description: "De la agenda manual al sistema online: beneficios, Google Calendar y multi-profesional.",
    date: "2026-03-15",
    dateFormatted: "15 de marzo, 2026",
    readTime: "8 min",
  },
];

export default function BlogIndex() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Blog Dentiqa</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Articulos, guias y recursos sobre software dental, gestion de clinicas odontologicas y tecnologia para dentistas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/blog/${article.slug}`}
            className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all duration-300"
          >
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <time dateTime={article.date} className="text-sm text-gray-500">
                  {article.dateFormatted}
                </time>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  {article.readTime} lectura
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                {article.title}
              </h2>
              <p className="text-gray-600 leading-relaxed">{article.description}</p>
              <div className="mt-4 text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Leer articulo
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
