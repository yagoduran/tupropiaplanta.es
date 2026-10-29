"use client";

import { useFotograma } from "@/lib/animacion";
import { ESTADOS, type Estado } from "@/lib/diseno";
import styles from "./juego.module.css";

const CELDA = 64;
const FOTOGRAMAS = 4;
const FOTOGRAMA_MS = 330;
const SUBIDA = 17;

// Hoja general con todos los estados de la planta clásica.
const HOJA_ESTADOS = { src: "/assets/sprites/tpp-plantas-1x.png", columnas: 8, filas: 8 };

// Columna de cada maceta en la hoja de macetas. Los sprites de la planta ya no llevan maceta: siempre se dibuja una.
const COLUMNA_MACETA: Record<string, number> = {
  maceta_plastico: 0,
  maceta_terracota: 1,
  maceta_tela: 2,
  maceta_ceramica: 3,
};

interface Props {
  fase: number;
  estado: Estado;
  /** Tamaño de la planta, de 0.82 a 1 según lo avanzada que va dentro de su fase. */
  tamano?: number;
  /** Variedad de la planta. La clásica usa las hojas generales; el resto tiene su propia hoja. */
  variedad?: string;
  /** Maceta equipada, dibujada encima de la planta. */
  maceta?: string;
}

/** Sprite de la planta. Animada en reposo cuando está sana; fija en cualquier otro estado. */
export function Planta({ fase, estado, tamano = 1, variedad = "clasica", maceta = "maceta_plastico" }: Props) {
  const propia = variedad !== "clasica";
  const animada = estado === "sana";
  const fotograma = useFotograma(FOTOGRAMAS, FOTOGRAMA_MS, animada);

  // Cada variedad tiene su hoja con 4 fotogramas por fase y, desde la fase 3, sedienta (columna 4) y muerta (columna 5).
  // La clásica, además, usa la hoja general cuando no está sana, porque trae todos los estados.
  const hoja =
    propia || animada
      ? { src: `/assets/sprites/tpp-variedad-${variedad}-1x.png`, columnas: 6, filas: 8 }
      : HOJA_ESTADOS;
  const columnaPropia = animada
    ? fotograma
    : fase < 3
      ? 0
      : estado === "muerta"
        ? 5
        : estado === "sedienta" || estado === "muriendo"
          ? 4
          : 0;
  const columna = propia || animada ? columnaPropia : fase < 3 ? 0 : Math.max(0, ESTADOS.indexOf(estado));
  const fila = fase - 1;
  const columnaMaceta = COLUMNA_MACETA[maceta] ?? 0;

  return (
    <>
      <div
        className={`pixel ${styles.planta}`}
        role="img"
        aria-label={`Planta en fase ${fase}, estado ${estado.replace("_", " ")}`}
        style={{
          backgroundImage: `url(${hoja.src})`,
          backgroundSize: `calc(${hoja.columnas * CELDA}px * var(--s)) calc(${hoja.filas * CELDA}px * var(--s))`,
          backgroundPosition: `calc(${-columna * CELDA}px * var(--s)) calc(${-fila * CELDA}px * var(--s))`,
          // La planta (sin maceta) se dibuja 17 px más arriba que la maceta, que va encima.
          transform: `translateY(calc(${-SUBIDA}px * var(--s))) scale(${tamano})`,
          transformOrigin: "50% 100%",
        }}
      />
      <div
        className={`pixel ${styles.planta}`}
        aria-hidden
        style={{
          backgroundImage: "url(/assets/sprites/tpp-macetas-1x.png)",
          backgroundSize: `calc(${4 * CELDA}px * var(--s)) calc(${CELDA}px * var(--s))`,
          backgroundPosition: `calc(${-columnaMaceta * CELDA}px * var(--s)) 0`,
        }}
      />
    </>
  );
}
