/** Estrellas de calidad: hoja de 6 celdas de 12 px (vacía y una por calidad, cada una de su color). */
export function Estrellas({ calidad, k = 2 }: { calidad: number; k?: number }) {
  const q = Math.max(1, Math.min(5, calidad));
  return (
    <span style={{ display: "inline-flex", gap: 2 }} role="img" aria-label={`${q} de 5 estrellas`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="pixel"
          aria-hidden
          style={{
            display: "block",
            width: 12 * k,
            height: 12 * k,
            backgroundImage: "url(/assets/plagas/tpp-estrellas-calidad-1x.png)",
            backgroundSize: `${72 * k}px ${12 * k}px`,
            backgroundPosition: `${-(i < q ? q : 0) * 12 * k}px 0`,
          }}
        />
      ))}
    </span>
  );
}
