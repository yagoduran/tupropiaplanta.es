import type { NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/supabase/sesion";

export async function proxy(peticion: NextRequest) {
  return actualizarSesion(peticion);
}

export const config = {
  // Todas las rutas salvo los archivos estáticos y las imágenes del juego.
  matcher: ["/((?!_next/static|_next/image|assets|icon.png|apple-icon.png|og.png).*)"],
};
