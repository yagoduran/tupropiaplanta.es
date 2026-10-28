import styles from "./juego.module.css";

/** Hueco de anuncio de 320x50 para móvil y tablet. */
export function BannerMovil() {
  return (
    <aside className={styles.bannerMovil} aria-label="Publicidad">
      <span className={styles.anuncioEtiqueta}>Publicidad</span>
      <div className={styles.bannerHueco} />
    </aside>
  );
}
