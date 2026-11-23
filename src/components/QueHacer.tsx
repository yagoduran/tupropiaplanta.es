"use client";

import { marco } from "@/lib/diseno";
import type { PantallaJuego } from "@/lib/juego";
import type { Sugerencia } from "@/lib/queHacer";
import styles from "./juego.module.css";

/** Pista de «qué hacer ahora»: una sola frase y un botón que lleva a donde toca. */
export function QueHacer({
  sugerencia,
  alIr,
}: {
  sugerencia: Sugerencia | null;
  alIr: (destino: PantallaJuego | "diaria") => void;
}) {
  if (!sugerencia) return null;
  return (
    <div className={styles.queHacer} style={marco("panel", "var(--u)")} role="status">
      <span className={styles.queHacerTexto}>{sugerencia.texto}</span>
      <button
        type="button"
        className={styles.queHacerBoton}
        style={marco("boton", "var(--u)")}
        onClick={() => alIr(sugerencia.destino)}
      >
        {sugerencia.boton}
      </button>
    </div>
  );
}
