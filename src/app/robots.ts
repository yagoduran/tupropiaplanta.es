import type { MetadataRoute } from "next";
import { urlBase } from "@/lib/urlBase";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/auth/", "/anuncio/", "/sesion", "/nueva-contrasena", "/mantenimiento"],
    },
    sitemap: `${urlBase()}/sitemap.xml`,
  };
}
