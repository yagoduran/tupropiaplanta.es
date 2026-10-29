import { PaginaSuelta } from "./PaginaSuelta";
import styles from "./paginas.module.css";

/** Pantalla mientras se carga la planta. */
export function PantallaCarga() {
  return (
    <PaginaSuelta fondo="dia" ancho={520}>
      <div style={{ width: "100%" }} role="status" aria-live="polite">
        <p className={styles.texto} style={{ marginBottom: 8 }}>
          Encendiendo la lámpara…
        </p>
        <div className={styles.barra}>
          <div className={styles.barraRelleno} />
        </div>
      </div>
      <p className={styles.consejo}>
        <b>Consejo</b> Riega al amanecer para mejores resultados.
      </p>
    </PaginaSuelta>
  );
}
