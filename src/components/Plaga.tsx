"use client";

import { useFotograma } from "@/lib/animacion";
import { PLAGAS, type PlagaJuego } from "@/lib/plagas";
import styles from "./juego.module.css";

const CELDA = 32;
const FOTOGRAMAS = 4;
const FOTOGRAMA_MS = 250;

/** Bichos o moho dibujados sobre la planta (hoja de plagas: 4 fotogramas, aparece y grave por cada tipo). */
export function Plaga({ plaga }: { plaga: PlagaJuego }) {
  const fotograma = useFotograma(FOTOGRAMAS, FOTOGRAMA_MS);
  const fila = PLAGAS[plaga.tipo].fila + (plaga.grave ? 1 : 0);
  return (
    <div
      className={`pixel ${styles.plaga}`}
      aria-hidden
      style={{
        backgroundSize: `calc(${FOTOGRAMAS * CELDA}px * var(--s)) calc(${12 * CELDA}px * var(--s))`,
        backgroundPosition: `calc(${-fotograma * CELDA}px * var(--s)) calc(${-fila * CELDA}px * var(--s))`,
      }}
    />
  );
}
