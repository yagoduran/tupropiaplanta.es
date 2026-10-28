import styles from "./juego.module.css";

/** Hueco reservado para un anuncio vertical de 160x600. */
export function Publicidad() {
  return (
    <aside className={styles.anuncio} aria-label="Publicidad">
      <span className={styles.anuncioEtiqueta}>Publicidad</span>
      <div className={styles.anuncioHueco} />
    </aside>
  );
}
