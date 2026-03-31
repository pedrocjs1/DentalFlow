import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://dentiqa.app", lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: "https://dentiqa.app/legal/politica-de-privacidad", lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: "https://dentiqa.app/legal/terminos-de-servicio", lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: "https://dentiqa.app/legal/eliminacion-de-datos", lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];
}
