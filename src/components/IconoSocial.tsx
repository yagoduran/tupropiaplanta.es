/** Iconos de la hoja social: 8 columnas x 3 filas. */
export const ICONOS_SOCIAL = {
  mision: [0, 0],
  reloj: [1, 0],
  pase: [2, 0],
  regalo: [3, 0],
  amigo: [4, 0],
  campana: [5, 0],
  mercado: [6, 0],
  saludo: [7, 0],
} as const;

interface Props {
  id: keyof typeof ICONOS_SOCIAL;
  /** Escala: un número o una expresión CSS como "var(--ik)". */
  k?: number | string;
}

/** Icono de 16x16 px recortado de la hoja social. */
export function IconoSocial({ id, k = 2 }: Props) {
  const f = (n: number) => `calc(${n}px * ${k})`;
  const [c, r] = ICONOS_SOCIAL[id];
  return (
    <span
      className="pixel"
      aria-hidden
      style={{
        display: "block",
        flex: "none",
        width: f(16),
        height: f(16),
        backgroundImage: "url(/assets/social/tpp-social-16-1x.png)",
        backgroundSize: `${f(128)} ${f(48)}`,
        backgroundPosition: `${f(-c * 16)} ${f(-r * 16)}`,
      }}
    />
  );
}
