import { NextResponse, type NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/supabase/sesion";

export async function proxy(peticion: NextRequest) {
  // Interruptor de mantenimiento: con MANTENIMIENTO=1 en Vercel, toda la web enseña la pantalla de mantenimiento.
  if (process.env.MANTENIMIENTO === "1" && !peticion.nextUrl.pathname.startsWith("/mantenimiento")) {
    return NextResponse.rewrite(new URL("/mantenimiento", peticion.url), { status: 503 });
  }
  return actualizarSesion(peticion);
}

export const config = {
  // Todas las rutas salvo los archivos estáticos y las imágenes del juego.
  matcher: ["/((?!_next/static|_next/image|assets|icon.png|apple-icon.png|og.png).*)"],
};
