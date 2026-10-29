"use client";

import Link from "next/link";
import { paginaAnuncio, type EspacioAnuncio } from "@/lib/anuncios";
import { useEleccionCookies } from "@/lib/cookies";
import styles from "./juego.module.css";

/**
 * Anuncio de un tercero. Solo se carga si el jugador ha aceptado las cookies de anuncios.
 * Va en un marco aislado (sin acceso a la web ni a la sesión del jugador).
 */
export function HuecoAnuncio({ espacio, className }: { espacio: EspacioAnuncio; className: string }) {
  const eleccion = useEleccionCookies();
  const permitido = eleccion === "aceptadas";
  return (
    <div className={className}>
      {permitido ? (
        <iframe
          title="Publicidad"
          srcDoc={paginaAnuncio(espacio)}
          width={espacio.ancho}
          height={espacio.alto}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          scrolling="no"
          className={styles.anuncioMarco}
        />
      ) : eleccion === "cargando" ? null : (
        <p className={styles.anuncioApagado}>
          Anuncios desactivados. Puedes activarlos en <Link href="/cookies">Cookies</Link>.
        </p>
      )}
    </div>
  );
}
