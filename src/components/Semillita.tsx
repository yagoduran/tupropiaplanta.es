import type { CSSProperties } from "react";

export type Expresion = "contenta" | "sorprendida" | "preocupada" | "animando" | "senalando" | "durmiendo";
export type DireccionFlecha = "abajo" | "arriba" | "derecha" | "izquierda";

const EXPRESIONES: Expresion[] = ["contenta", "sorprendida", "preocupada", "animando", "senalando", "durmiendo"];
const DIRECCIONES: DireccionFlecha[] = ["abajo", "arriba", "derecha", "izquierda"];

interface PropsSemillita {
  expresion: Expresion;
  /** Fotograma de la animación: 0 o 1. */
  cuadro: number;
  /** Ancho de una celda en píxeles de pantalla. Por defecto 32 × (--ik + 1): 3× en móvil y 4× en escritorio. */
  tamano?: string;
}

/** Semillita, la mascota. Hoja de 6 expresiones × 2 fotogramas, celdas de 32 px. */
export function Semillita({ expresion, cuadro, tamano = "calc(32px * (var(--ik) + 1))" }: PropsSemillita) {
  const c = `calc(${tamano} * ${EXPRESIONES.indexOf(expresion)})`;
  const f = `calc(${tamano} * ${cuadro})`;
  const estilo: CSSProperties = {
    display: "block",
    flex: "none",
    width: tamano,
    height: tamano,
    backgroundImage: "url(/assets/semillita/tpp-semillita-expresiones-1x.png)",
    backgroundSize: `calc(${tamano} * 6) calc(${tamano} * 2)`,
    backgroundPosition: `calc(${c} * -1) calc(${f} * -1)`,
  };
  return <span className="pixel" aria-hidden style={estilo} />;
}

interface PropsFlecha {
  direccion: DireccionFlecha;
  cuadro: number;
  /** Ancho de una celda en píxeles. */
  px: number;
  style?: CSSProperties;
}

/** Flecha de rebote de 16 px de celda: 4 direcciones × 2 fotogramas. */
export function FlechaSemillita({ direccion, cuadro, px, style }: PropsFlecha) {
  return (
    <span
      className="pixel"
      aria-hidden
      style={{
        position: "absolute",
        width: px,
        height: px,
        pointerEvents: "none",
        backgroundImage: "url(/assets/semillita/tpp-semillita-flechas-1x.png)",
        backgroundSize: `${px * 4}px ${px * 2}px`,
        backgroundPosition: `${-DIRECCIONES.indexOf(direccion) * px}px ${-cuadro * px}px`,
        ...style,
      }}
    />
  );
}
