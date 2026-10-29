import { ESPACIOS_ANUNCIO, paginaAnuncio } from "@/lib/anuncios";

/** Página mínima que carga solo un banner. Va dentro de un marco del juego, para que la red vea nuestra dirección. */
export async function GET(_peticion: Request, { params }: { params: Promise<{ espacio: string }> }) {
  const { espacio } = await params;
  const datos = ESPACIOS_ANUNCIO[espacio];
  if (!datos) return new Response("No existe", { status: 404 });
  return new Response(paginaAnuncio(datos), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}
