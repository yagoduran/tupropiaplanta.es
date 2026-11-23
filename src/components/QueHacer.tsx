"use client";

import { marco } from "@/lib/diseno";
import type { DatosCamino } from "@/lib/camino";
import type { PantallaJuego } from "@/lib/juego";
import type { Sugerencia } from "@/lib/queHacer";
import styles from "./juego.module.css";

/** Pista de «qué hacer ahora»: una sola frase y un botón que lleva a donde toca, con la barra del capítulo del Camino. */
export function QueHacer({
  sugerencia,
  camino,
  alIr,
}: {
  sugerencia: Sugerencia | null;
  camino: DatosCamino | null;
  alIr: (destino: PantallaJuego | "diaria") => void;
}) {
  const cap = camino?.capitulos.find((c) => c.n === camino.actual);
  if (!sugerencia && !cap) return null;
  return (
    <div className={styles.queHacer} style={marco("panel", "var(--u)")} role="status">
      {cap && (
        <button
          type="button"
          className={styles.caminoBarra}
          aria-label={`Capítulo ${cap.n}: ${cap.nombre}. ${cap.hechas} de ${cap.metas.length} metas. Abrir El Camino`}
          onClick={() => alIr("camino")}
        >
          <span className={styles.caminoTitulo}>
            Capítulo {cap.n} · {cap.hechas} de {cap.metas.length}
          </span>
          <span className={styles.caminoPista} aria-hidden>
            <span className={styles.caminoRelleno} style={{ width: `${Math.round((cap.hechas / cap.metas.length) * 100)}%` }} />
          </span>
        </button>
      )}
      {sugerencia && (
        <div className={styles.queHacerFila}>
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
      )}
    </div>
  );
}
