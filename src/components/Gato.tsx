"use client";

import { useEffect, useState } from "react";
import { useFotograma } from "@/lib/animacion";
import { sonar } from "@/lib/sonido";
import styles from "./juego.module.css";

const CELDA = 32;
const FOTOGRAMAS = 4;
const FOTOGRAMA_MS = 300;
const FILA_RESPIRANDO = 1;
const FILA_RONRONEO = 4;
const FILA_HUIDA = 5;
const RONRONEO_MS = 2500;

/** Gato de la escena: respira, ronronea si lo tocas y huye mientras haya una plaga. */
export function Gato({ huye, alAcariciar }: { huye: boolean; alAcariciar: () => void }) {
  const [ronroneando, setRonroneando] = useState(false);
  const fotograma = useFotograma(FOTOGRAMAS, FOTOGRAMA_MS);

  useEffect(() => {
    if (!ronroneando) return;
    const id = setTimeout(() => setRonroneando(false), RONRONEO_MS);
    return () => clearTimeout(id);
  }, [ronroneando]);

  const fila = huye ? FILA_HUIDA : ronroneando ? FILA_RONRONEO : FILA_RESPIRANDO;
  return (
    <button
      type="button"
      className={`pixel ${styles.gato}`}
      aria-label="Acariciar al gato"
      onClick={() => {
        if (huye) return;
        setRonroneando(true);
        sonar("gato-maullido");
        alAcariciar();
      }}
      style={{
        backgroundSize: `calc(${FOTOGRAMAS * CELDA}px * var(--s)) calc(${6 * CELDA}px * var(--s))`,
        backgroundPosition: `calc(${-fotograma * CELDA}px * var(--s)) calc(${-fila * CELDA}px * var(--s))`,
      }}
    />
  );
}
