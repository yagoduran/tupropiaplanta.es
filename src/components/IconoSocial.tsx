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
  corazon: [0, 1],
  estrella_temporada: [2, 1],
  flor_primavera: [3, 1],
  sol_verano: [4, 1],
  hoja_otono: [5, 1],
  copo_nieve: [6, 1],
  copa: [1, 1],
  emoji_sonrisa: [7, 1],
  emoji_corazon: [0, 2],
  emoji_gracias: [1, 2],
  emoji_animo: [2, 2],
  emoji_sorpresa: [3, 2],
  emoji_risa: [4, 2],
  emoji_pulgar: [5, 2],
  emoji_planta: [6, 2],
} as const;

interface Props {
  id: keyof typeof ICONOS_SOCIAL;
  /** Hoja de 16 px o de 32 px (el mismo dibujo al doble de tamaño). */
  hoja?: 16 | 32;
  /** Escala: un número o una expresión CSS como "var(--ik)". */
  k?: number | string;
}

/** Icono recortado de la hoja social. */
export function IconoSocial({ id, k = 2, hoja = 16 }: Props) {
  const f = (n: number) => `calc(${n}px * ${k})`;
  const [c, r] = ICONOS_SOCIAL[id];
  return (
    <span
      className="pixel"
      aria-hidden
      style={{
        display: "block",
        flex: "none",
        width: f(hoja),
        height: f(hoja),
        backgroundImage: `url(/assets/social/tpp-social-${hoja}-1x.png)`,
        backgroundSize: `${f(8 * hoja)} ${f(3 * hoja)}`,
        backgroundPosition: `${f(-c * hoja)} ${f(-r * hoja)}`,
      }}
    />
  );
}
