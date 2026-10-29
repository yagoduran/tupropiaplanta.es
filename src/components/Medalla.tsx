import type { Medalla as TipoMedalla } from "@/lib/logros";

/** Celdas (columna, fila) de cada medalla en la hoja de progresión. */
const CELDAS: Record<TipoMedalla, [number, number]> = { oro: [5, 1], plata: [0, 2], bronce: [1, 2] };

interface Props {
  tipo: TipoMedalla;
  /** Escala: un número o una expresión CSS como "var(--ik)". */
  k?: number | string;
  apagada?: boolean;
}

/** Medalla de 32x32 px recortada de la hoja de progresión (6 columnas x 3 filas). */
export function Medalla({ tipo, k = 2, apagada }: Props) {
  const f = (n: number) => `calc(${n}px * ${k})`;
  const [c, r] = CELDAS[tipo];
  return (
    <span
      className="pixel"
      aria-hidden
      style={{
        display: "block",
        flex: "none",
        width: f(32),
        height: f(32),
        backgroundImage: "url(/assets/progresion/tpp-progresion-32-1x.png)",
        backgroundSize: `${f(192)} ${f(96)}`,
        backgroundPosition: `${f(-c * 32)} ${f(-r * 32)}`,
        filter: apagada ? "grayscale(1) brightness(0.55)" : undefined,
        opacity: apagada ? 0.6 : undefined,
      }}
    />
  );
}
