import { ICONOS, type IdIcono } from "@/lib/diseno";

const ANCHO_HOJA = ICONOS.length * 12;

interface Props {
  id: IdIcono;
  /** Escala del icono: un número o una expresión CSS como "var(--ik)". */
  k?: number | string;
  opacidad?: number;
}

/** Icono de 12x12 px recortado de la hoja de iconos de la interfaz. */
export function Icono({ id, k = "var(--ik)", opacidad }: Props) {
  const f = (n: number) => `calc(${n}px * ${k})`;
  const i = ICONOS.indexOf(id);
  return (
    <span
      className="pixel"
      role="img"
      aria-hidden
      style={{
        display: "block",
        flex: "none",
        width: f(12),
        height: f(12),
        backgroundImage: "url(/assets/ui/tpp-ui-iconos-1x.png)",
        backgroundSize: `${f(ANCHO_HOJA)} ${f(12)}`,
        backgroundPosition: `calc(${-i * 12}px * ${k}) 0`,
        opacity: opacidad,
      }}
    />
  );
}
