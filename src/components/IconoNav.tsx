const IDS = [
  "hogar",
  "encargos",
  "inventario",
  "personal",
  "misiones",
  "amigos",
  "regalo",
  "armario",
  "calendario",
  "coleccion",
  "ayuda",
] as const;

export type IdIconoNav = (typeof IDS)[number];

interface Props {
  id: IdIconoNav;
  /** Escala del icono: un número o una expresión CSS como "var(--ik)". */
  k?: number | string;
}

/** Icono de 12x12 px de la hoja de navegación: Hogar, Encargos y las secciones de «Más». */
export function IconoNav({ id, k = "var(--ik)" }: Props) {
  const f = (n: number) => `calc(${n}px * ${k})`;
  const i = IDS.indexOf(id);
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
        backgroundImage: "url(/assets/ui/tpp-iconos-nav-1x.png)",
        backgroundSize: `${f(IDS.length * 12)} ${f(12)}`,
        backgroundPosition: `calc(${-i * 12}px * ${k}) 0`,
      }}
    />
  );
}
