"use client";

import { useFotograma } from "@/lib/animacion";
import { ESTADOS, type Estado } from "@/lib/diseno";
import type { CausaDano } from "@/lib/juego";
import { hojaDe } from "@/lib/variedades";
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
  maceta_primavera: 4,
  maceta_verano: 5,
  maceta_otono: 6,
  maceta_invierno: 7,
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
  /** Si es macho, usa su propia hoja. */
  sexo?: "hembra" | "macho" | null;
  /** Causa del daño; quemada y ciclo de luz roto tienen su propio dibujo. */
  causa?: CausaDano | null;
  /** Calidad prevista (1-5). En las fases 7 y 8 la clásica cambia de aspecto según ella. */
  calidad?: number;
}

/** Sprite de la planta. Animada en reposo cuando está sana; fija en cualquier otro estado. */
export function Planta({
  fase,
  estado,
  tamano = 1,
  variedad = "clasica",
  maceta = "maceta_plastico",
  sexo,
  causa,
  calidad,
}: Props) {
  const macho = sexo === "macho";
  const hojaVariedad = hojaDe(variedad);
  const propia = macho || hojaVariedad !== "clasica";
  const animada = estado === "sana";
  const fotograma = useFotograma(FOTOGRAMAS, FOTOGRAMA_MS, animada);

  // Cada variedad tiene su hoja con 4 fotogramas por fase y, desde la fase 3, sedienta (columna 4) y muerta (columna 5).
  // La clásica, además, usa la hoja general cuando no está sana, porque trae todos los estados.
  const hoja = macho
    ? { src: "/assets/sprites/tpp-planta-macho-1x.png", columnas: 6, filas: 8 }
    : propia || animada
      ? { src: `/assets/sprites/tpp-variedad-${hojaVariedad}-1x.png`, columnas: 6, filas: 8 }
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
  // Quemada por nutrientes o con el ciclo de luz roto: dibujo propio entre las fases 3 y 8 si la planta no está sedienta ni muerta.
  const columnaDano = causa === "quemada" ? 0 : causa === "ciclo_luz" ? 1 : -1;
  const dano =
    columnaDano >= 0 && fase >= 3 && (estado === "sana" || estado === "exceso_agua" || estado === "falta_nutrientes");
  // Clásica sana en floración: hojas amarillas con 1-2 estrellas, resina con 4 y brillo con 5. Con 3 se queda la de siempre.
  const porCalidad =
    !dano &&
    !macho &&
    hojaVariedad === "clasica" &&
    estado === "sana" &&
    (fase === 7 || fase === 8) &&
    !!calidad &&
    calidad !== 3;
  const hojaFinal = dano
    ? { src: "/assets/sprites/tpp-estados-nuevos-1x.png", columnas: 2, filas: 6 }
    : porCalidad
      ? { src: "/assets/plagas/tpp-planta-calidad-1x.png", columnas: 5, filas: 2 }
      : hoja;
  const columnaFinal = dano ? columnaDano : porCalidad ? calidad! - 1 : columna;
  const fila = dano ? fase - 3 : porCalidad ? fase - 7 : fase - 1;
  const columnaMaceta = COLUMNA_MACETA[maceta] ?? 0;

  return (
    <>
      <div
        className={`pixel ${styles.planta}`}
        role="img"
        aria-label={`Planta en fase ${fase}, estado ${estado.replace("_", " ")}`}
        style={{
          backgroundImage: `url(${hojaFinal.src})`,
          backgroundSize: `calc(${hojaFinal.columnas * CELDA}px * var(--s)) calc(${hojaFinal.filas * CELDA}px * var(--s))`,
          backgroundPosition: `calc(${-columnaFinal * CELDA}px * var(--s)) calc(${-fila * CELDA}px * var(--s))`,
          // La planta (sin maceta) se dibuja 17 px más arriba que la maceta, que va encima.
          transform: `translateY(calc(${-SUBIDA}px * var(--s))) scale(${tamano})`,
          transformOrigin: "50% 100%",
        }}
      />
      <div
        className={`pixel ${styles.planta}`}
        aria-hidden
        style={{
          backgroundImage: "url(/assets/sprites/tpp-macetas-1x.png?v=2)",
          backgroundSize: `calc(${8 * CELDA}px * var(--s)) calc(${CELDA}px * var(--s))`,
          backgroundPosition: `calc(${-columnaMaceta * CELDA}px * var(--s)) 0`,
        }}
      />
    </>
  );
}
