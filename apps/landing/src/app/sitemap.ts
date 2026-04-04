import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://dentiqa.app";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },

    // Blog
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/blog/mejor-software-dental-2026`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/blog/software-gestion-clinica-dental`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/blog/historia-clinica-dental-digital`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/blog/whatsapp-para-clinicas-dentales`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/blog/agenda-turnos-dentista-online`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },

    // Country landing pages
    { url: `${base}/ar`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/cl`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/co`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },

    // Legal
    { url: `${base}/legal/politica-de-privacidad`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/legal/terminos-de-servicio`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/legal/eliminacion-de-datos`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];
}
