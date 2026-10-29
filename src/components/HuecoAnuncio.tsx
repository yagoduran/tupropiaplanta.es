"use client";

import Link from "next/link";
import type { EspacioAnuncio } from "@/lib/anuncios";
import { useEleccionCookies } from "@/lib/cookies";
import styles from "./juego.module.css";

/**
 * Anuncio de un tercero. Solo se carga si el jugador ha aceptado las cookies de anuncios.
 * Va en un marco con una página nuestra que solo contiene el anuncio (la red necesita ver nuestra dirección).
 */
export function HuecoAnuncio({ espacio, className }: { espacio: EspacioAnuncio; className: string }) {
  const eleccion = useEleccionCookies();
  const permitido = eleccion === "aceptadas";
  return (
    <div className={className}>
      {permitido ? (
        <iframe
          title="Publicidad"
          src={`/anuncio/${espacio.nombre}`}
          width={espacio.ancho}
          height={espacio.alto}
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
