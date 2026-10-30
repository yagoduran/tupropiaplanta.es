"use client";

import { useEffect, useState } from "react";

const CELDA = 48;
const COLUMNAS = 6;
const FILAS = 3;

export interface Cuadro {
  fila: number;
  columna: number;
  ms: number;
}

const tira = (fila: number, n: number, ms: number): Cuadro[] =>
  Array.from({ length: n }, (_, columna) => ({ fila, columna, ms }));

/** Animaciones del laboratorio (hoja de 6 columnas × 3 filas, celdas de 48 px). */
export const ANIM_PROBETA = tira(0, 6, 160);
export const ANIM_CAPULLO_QUIETO = tira(1, 3, 220);
/** El capullo se abre y, al terminar, salta el destello. */
export const ANIM_APERTURA = [...tira(1, 6, 220), ...tira(2, 5, 90)];

/** Reproduce una secuencia de cuadros: en bucle o parándose en el último. */
export function AnimacionCruce({ cuadros, bucle = false, k = 2 }: { cuadros: Cuadro[]; bucle?: boolean; k?: number }) {
  const [i, setI] = useState(0);
  const reducir = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reducir) return;
    const siguiente = bucle ? (i + 1) % cuadros.length : Math.min(i + 1, cuadros.length - 1);
    if (siguiente === i) return;
    const id = setTimeout(() => setI(siguiente), cuadros[i].ms);
    return () => clearTimeout(id);
  }, [i, cuadros, bucle, reducir]);

  const c = cuadros[reducir && !bucle ? cuadros.length - 1 : i];
  return (
    <span
      className="pixel"
      aria-hidden
      style={{
        display: "block",
        flex: "none",
        width: CELDA * k,
        height: CELDA * k,
        backgroundImage: "url(/assets/progresion/tpp-cruce-anim-1x.png)",
        backgroundSize: `${COLUMNAS * CELDA * k}px ${FILAS * CELDA * k}px`,
        backgroundPosition: `${-c.columna * CELDA * k}px ${-c.fila * CELDA * k}px`,
      }}
    />
  );
}
