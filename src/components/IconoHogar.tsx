const ORDEN = [
  "salon",
  "cocina",
  "dormitorio",
  "bano",
  "terraza",
  "armario",
  "sotano",
  "invernadero",
  "azotea",
  "mover",
] as const;

export type IdIconoHogar = (typeof ORDEN)[number];

/** Icono de una habitación (o «mover») recortado de la hoja de iconos de Hogar: 10 celdas de 12 px. */
export function IconoHogar({ id, k = 2 }: { id: string; k?: number | string }) {
  const i = (ORDEN as readonly string[]).indexOf(id);
  if (i < 0) return null;
  const f = (n: number) => `calc(${n}px * ${k})`;
  return (
    <span
      className="pixel"
      aria-hidden
      style={{
        display: "inline-block",
        flex: "none",
        width: f(12),
        height: f(12),
        backgroundImage: "url(/assets/hogar/tpp-iconos-hogar-1x.png)",
        backgroundSize: `${f(120)} ${f(12)}`,
        backgroundPosition: `${f(-12 * i)} 0`,
      }}
    />
  );
}
