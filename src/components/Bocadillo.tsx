import { marco, type IdIcono } from "@/lib/diseno";
import { Icono } from "./Icono";
import styles from "./juego.module.css";

/** Aviso sobre la escena, por ejemplo "¡Tu planta necesita agua!". */
export function Bocadillo({ texto, icono = "agua" }: { texto: string; icono?: IdIcono }) {
  const estilo = marco("bocadillo", "var(--u)");
  return (
    <div className={styles.bocadillo} role="status">
      <div className={styles.bocadilloCaja} style={estilo}>
        <Icono id={icono} />
        <span>{texto}</span>
      </div>
      <span className={`pixel ${styles.bocadilloCola}`} />
    </div>
  );
}
