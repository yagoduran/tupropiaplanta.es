"use client";

import { useFotograma } from "@/lib/animacion";
import { ESTADOS, type Estado } from "@/lib/diseno";
import styles from "./juego.module.css";

const CELDA = 64;
const FOTOGRAMAS = 4;
const FOTOGRAMA_MS = 330;

// Hoja de animaciones (4 fotogramas por fase, desde la fase 2) y hoja completa de estados.
const HOJA_ANIMADA = { src: "/assets/sprites/tpp-animaciones-1x.png", columnas: 4, filas: 11 };
const HOJA_ESTADOS = { src: "/assets/sprites/tpp-plantas-1x.png", columnas: 8, filas: 8 };

// Columna de cada maceta en la hoja de macetas. La de terracota ya va dibujada en los sprites de la planta.
const COLUMNA_MACETA: Record<string, number> = {
  maceta_plastico: 0,
  maceta_terracota: 1,
  maceta_tela: 2,
  maceta_ceramica: 3,
};

interface Props {
  fase: number;
  estado: Estado;
  /** Variedad de la planta. La clásica usa las hojas generales; el resto tiene su propia hoja. */
  variedad?: string;
  /** Maceta equipada. Si no es la de terracota se dibuja encima. */
  maceta?: string;
}

/** Sprite de la planta. Animada en reposo cuando está sana; fija en cualquier otro estado. */
export function Planta({ fase, estado, variedad = "clasica", maceta = "maceta_terracota" }: Props) {
  const propia = variedad !== "clasica";
  const animada = estado === "sana" && (propia || fase >= 2);
  const fotograma = useFotograma(FOTOGRAMAS, FOTOGRAMA_MS, animada);

  // Las variedades propias traen 4 fotogramas por fase y, desde la fase 3, sedienta (columna 4) y muerta (columna 5).
  const hoja = propia
    ? { src: `/assets/sprites/tpp-variedad-${variedad}-1x.png`, columnas: 6, filas: 8 }
    : animada
      ? HOJA_ANIMADA
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
  const columna = propia ? columnaPropia : animada ? fotograma : fase < 3 ? 0 : Math.max(0, ESTADOS.indexOf(estado));
  const fila = propia ? fase - 1 : animada ? fase - 2 : fase - 1;
  const columnaMaceta = COLUMNA_MACETA[maceta] ?? 1;

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
        }}
      />
      {columnaMaceta !== 1 && (
        <div
          className={`pixel ${styles.planta}`}
          aria-hidden
          style={{
            backgroundImage: "url(/assets/sprites/tpp-macetas-1x.png)",
            backgroundSize: `calc(${4 * CELDA}px * var(--s)) calc(${CELDA}px * var(--s))`,
            backgroundPosition: `calc(${-columnaMaceta * CELDA}px * var(--s)) 0`,
          }}
        />
      )}
    </>
  );
}
