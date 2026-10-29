interface Props {
  /** Celda (columna, fila) en la hoja de progresión: 6 columnas x 3 filas. */
  celda: [number, number];
  /** Lado de la celda en la hoja: 16 o 32. */
  tamano?: 16 | 32;
  /** Escala: un número o una expresión CSS como "var(--ik)". */
  k?: number | string;
  apagado?: boolean;
}

/** Icono recortado de la hoja de progresión. */
export function IconoProgresion({ celda, tamano = 32, k = 2, apagado }: Props) {
  const f = (n: number) => `calc(${n}px * ${k})`;
  return (
    <span
      className="pixel"
      aria-hidden
      style={{
        display: "block",
        flex: "none",
        width: f(tamano),
        height: f(tamano),
        backgroundImage: `url(/assets/progresion/tpp-progresion-${tamano}-1x.png)`,
        backgroundSize: `${f(6 * tamano)} ${f(3 * tamano)}`,
        backgroundPosition: `${f(-celda[0] * tamano)} ${f(-celda[1] * tamano)}`,
        opacity: apagado ? 0.25 : undefined,
      }}
    />
  );
}
