import styles from "./paginas.module.css";

/** Cuadro con una plantita, para las páginas de aviso. */
export function MacetaVacia() {
  return (
    <div className={styles.maceta} aria-hidden>
      <span />
    </div>
  );
}
