interface Props {
  celda: [number, number];
  /** Lado de la celda en la hoja: 16 o 32. */
  tamano?: 16 | 32;
  /** Escala: un número o una expresión CSS como "var(--s)". */
  k?: number | string;
  apagado?: boolean;
}

const COLUMNAS = 9;
const FILAS = 7;

/** Icono de un objeto recortado de la hoja de objetos. */
export function IconoObjeto({ celda, tamano = 32, k = 2, apagado }: Props) {
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
        backgroundImage: `url(/assets/objetos/tpp-objetos-${tamano}-1x.png)`,
        backgroundSize: `${f(COLUMNAS * tamano)} ${f(FILAS * tamano)}`,
        backgroundPosition: `${f(-celda[0] * tamano)} ${f(-celda[1] * tamano)}`,
        filter: apagado ? "brightness(0)" : undefined,
        opacity: apagado ? 0.35 : undefined,
      }}
    />
  );
}
