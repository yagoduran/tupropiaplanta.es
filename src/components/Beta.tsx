/** Etiqueta «BETA» que va a la derecha del logo, alineada con su base (el contenedor debe ser flex con align-items: flex-end). */
export function Beta({ pequena = false }: { pequena?: boolean }) {
  return (
    <span
      aria-label="Versión beta"
      style={{
        flex: "none",
        marginBottom: pequena ? 0 : 6,
        padding: pequena ? "0 3px" : "1px 6px",
        background: "#e8833a",
        color: "#1c1626",
        border: "2px solid #1c1626",
        fontFamily: "var(--font-pixel)",
        fontWeight: 700,
        fontSize: pequena ? 9 : 12,
        lineHeight: 1.3,
        letterSpacing: 1,
      }}
    >
      BETA
    </span>
  );
}
