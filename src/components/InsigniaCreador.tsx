/** Insignia de creador de contenido: icono de 16 px de la hoja de iconos extra (celda 3). */
export function InsigniaCreador({ k = 1 }: { k?: number }) {
  return (
    <span
      className="pixel"
      role="img"
      aria-label="Creador de contenido"
      title="Creador de contenido"
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        marginLeft: 4 * k,
        width: 16 * k,
        height: 16 * k,
        backgroundImage: "url(/assets/objetos/tpp-iconos-extra-16-1x.png)",
        backgroundSize: `${96 * k}px ${16 * k}px`,
        backgroundPosition: `${-3 * 16 * k}px 0`,
      }}
    />
  );
}
