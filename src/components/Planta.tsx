"use client";

import { useEffect, useState } from "react";
import { ESTADOS, type Estado } from "@/lib/diseno";
import styles from "./juego.module.css";

const CELDA = 64;
const FOTOGRAMAS = 4;
const FOTOGRAMA_MS = 330;

// Hoja de animaciones (4 fotogramas por fase, desde la fase 2) y hoja completa de estados.
const HOJA_ANIMADA = { src: "/assets/sprites/tpp-animaciones-1x.png", columnas: 4, filas: 11 };
const HOJA_ESTADOS = { src: "/assets/sprites/tpp-plantas-1x.png", columnas: 8, filas: 8 };

interface Props {
  fase: number;
  estado: Estado;
}

/** Sprite de la planta. Animada en reposo cuando está sana; fija en cualquier otro estado. */
export function Planta({ fase, estado }: Props) {
  const [fotograma, setFotograma] = useState(0);
  const animada = estado === "sana" && fase >= 2;

  useEffect(() => {
    if (!animada) return;
    const id = setInterval(() => setFotograma((f) => (f + 1) % FOTOGRAMAS), FOTOGRAMA_MS);
    return () => clearInterval(id);
  }, [animada]);

  const hoja = animada ? HOJA_ANIMADA : HOJA_ESTADOS;
  const columna = animada ? fotograma : fase < 3 ? 0 : Math.max(0, ESTADOS.indexOf(estado));
  const fila = animada ? fase - 2 : fase - 1;

  return (
    <div
      className={`pixel ${styles.planta}`}
      role="img"
      aria-label={`Planta en fase ${fase}, estado ${estado.replace("_", " ")}`}
      style={{
        backgroundImage: `url(${hoja.src})`,
        backgroundSize: `calc(${hoja.columnas * CELDA}px * var(--s)) calc(${hoja.filas * CELDA}px * var(--s))`,
        backgroundPosition: `calc(${-columna * CELDA}px * var(--s)) calc(${-fila * CELDA}px * var(--s))`,
      }}
    />
  );
}
