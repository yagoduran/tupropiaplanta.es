"use client";

import { useEffect, useState } from "react";
import styles from "./juego.module.css";

const CELDA = 64;
const FOTOGRAMAS = 4;
const FOTOGRAMA_MS = 220;

// Fila de cada luz en la hoja de luces: la columna 0 es apagada y de la 1 a la 4 está encendida.
const FILA_LUZ: Record<string, number> = { bombilla: 0, fluorescente: 1, led: 2, led_pro: 3 };

/** Lámpara de la escena según la luz equipada, encendida y animada. */
export function Lampara({ luz }: { luz: string }) {
  const [fotograma, setFotograma] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFotograma((f) => (f + 1) % FOTOGRAMAS), FOTOGRAMA_MS);
    return () => clearInterval(id);
  }, []);

  const fila = FILA_LUZ[luz] ?? 0;
  return (
    <div
      className={`pixel ${styles.lampara}`}
      aria-hidden
      style={{
        backgroundSize: `calc(${5 * CELDA}px * var(--s)) calc(${4 * CELDA}px * var(--s))`,
        backgroundPosition: `calc(${-(1 + fotograma) * CELDA}px * var(--s)) calc(${-fila * CELDA}px * var(--s))`,
      }}
    />
  );
}
