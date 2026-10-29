import { marco } from "@/lib/diseno";
import type { Jugador as DatosJugador } from "@/lib/amigos";
import { avatarDe } from "@/lib/perfil";
import { MARCO_POR_ID, TITULO_POR_ID } from "@/lib/progresion";
import { IconoObjeto } from "./IconoObjeto";

/** Avatar de un jugador dentro de su marco de perfil. */
export function AvatarJugador({ jugador, k = 2 }: { jugador: DatosJugador; k?: number }) {
  return (
    <span
      style={{
        ...marco(MARCO_POR_ID[jugador.marco ?? "madera"]?.estilo ?? "marco_madera", "var(--u)"),
        padding: "calc(var(--u) * 2)",
        display: "inline-flex",
        flex: "none",
      }}
    >
      <IconoObjeto celda={avatarDe(jugador.avatar).celda} k={k} />
    </span>
  );
}

/** «Nv. 12 · P1 · Título» */
export function lineaJugador(j: DatosJugador): string {
  const partes = [`Nv. ${j.nivel}${j.prestigio > 0 ? ` · P${j.prestigio}` : ""}`];
  if (j.titulo && TITULO_POR_ID[j.titulo]) partes.push(TITULO_POR_ID[j.titulo].nombre);
  return partes.join(" · ");
}
