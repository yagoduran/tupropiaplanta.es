import type { MetadataRoute } from "next";
import { urlBase } from "@/lib/urlBase";

const RUTAS = ["", "/login", "/registro", "/cookies", "/contacto"];

export default function sitemap(): MetadataRoute.Sitemap {
  return RUTAS.map((ruta) => ({ url: `${urlBase()}${ruta}` }));
}
