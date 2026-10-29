import { ANUNCIO_MOVIL } from "@/lib/anuncios";
import { HuecoAnuncio } from "./HuecoAnuncio";
import styles from "./juego.module.css";

/** Hueco de anuncio de 320x50 para móvil y tablet. */
export function BannerMovil() {
  return (
    <aside className={styles.bannerMovil} aria-label="Publicidad">
      <span className={styles.anuncioEtiqueta}>Publicidad</span>
      <HuecoAnuncio espacio={ANUNCIO_MOVIL} className={styles.bannerHueco} />
    </aside>
  );
}
