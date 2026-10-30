import { CLIENTES } from "@/lib/encargos";

interface Props {
  /** Índice de `CLIENTES`. Sin cliente se ve el misterioso. */
  cliente?: number;
  /** Escala del retrato de 32 × 32 px. */
  k?: number | string;
  apagado?: boolean;
}

const COLUMNAS = 13;

/** Retrato de un cliente, recortado de la hoja de retratos. */
export function RetratoCliente({ cliente, k = 2, apagado }: Props) {
  const f = (n: number) => `calc(${n}px * ${k})`;
  const c = cliente !== undefined && cliente >= 0 && cliente < CLIENTES.length ? cliente : COLUMNAS - 1;
  return (
    <span
      className="pixel"
      role="img"
      aria-hidden
      style={{
        display: "block",
        flex: "none",
        width: f(32),
        height: f(32),
        backgroundImage: "url(/assets/encargos/tpp-clientes-1x.png)",
        backgroundSize: `${f(COLUMNAS * 32)} ${f(32)}`,
        backgroundPosition: `calc(${-c * 32}px * ${k}) 0`,
        filter: apagado ? "grayscale(1)" : undefined,
      }}
    />
  );
}
