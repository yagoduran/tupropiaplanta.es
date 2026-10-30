import { marco, type IdIcono } from "@/lib/diseno";
import { Icono } from "./Icono";
import styles from "./juego.module.css";

/** Aviso sobre la escena, por ejemplo "¡Tu planta necesita agua!". */
export function Bocadillo({
  texto,
  icono = "agua",
  columnaAviso,
}: {
  texto: string;
  icono?: IdIcono;
  /** Columna de `tpp-avisos-causa-1x.png`: si se da, sustituye al icono. */
  columnaAviso?: number;
}) {
  const estilo = marco("bocadillo", "var(--u)");
  return (
    <div className={styles.bocadillo} role="status">
      <div className={styles.bocadilloCaja} style={estilo}>
        {columnaAviso === undefined ? (
          <Icono id={icono} />
        ) : (
          <span
            className="pixel"
            aria-hidden
            style={{
              display: "block",
              flex: "none",
              width: "calc(16px * var(--ik))",
              height: "calc(16px * var(--ik))",
              backgroundImage: "url(/assets/sprites/tpp-avisos-causa-1x.png)",
              backgroundSize: "calc(128px * var(--ik)) calc(16px * var(--ik))",
              backgroundPosition: `calc(${-columnaAviso * 16}px * var(--ik)) 0`,
            }}
          />
        )}
        <span>{texto}</span>
      </div>
      <span className={`pixel ${styles.bocadilloCola}`} />
    </div>
  );
}
