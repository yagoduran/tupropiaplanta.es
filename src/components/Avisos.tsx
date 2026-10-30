"use client";

import { marco } from "@/lib/diseno";
import type { PantallaJuego } from "@/lib/juego";
import type { DatosNotificaciones, Notificacion } from "@/lib/misiones";
import { ListaAvisos } from "./ListaAvisos";
import styles from "./logros.module.css";

interface Props {
  datos: DatosNotificaciones | null;
  alLeerTodo: () => void;
  alPulsar: (n: Notificacion, destino: PantallaJuego) => void;
}

/** Pantalla de avisos: la lista completa de la campana. Cada aviso lleva a su pantalla. */
export function Avisos({ datos, alLeerTodo, alPulsar }: Props) {
  const panel = marco("panel", "var(--u)");
  const boton = marco("boton_secundario", "var(--u)");
  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Avisos</h1>
        {datos && datos.no_leidas > 0 && (
          <button type="button" className={styles.contador} style={boton} onClick={alLeerTodo}>
            Marcar todo como leído
          </button>
        )}
      </div>
      <div style={{ ...panel, display: "flex", flexDirection: "column", gap: 6, padding: 12, color: "#1c1626" }}>
        {!datos ? (
          <p>Cargando…</p>
        ) : datos.lista.length === 0 ? (
          <p>No tienes avisos.</p>
        ) : (
          <ListaAvisos lista={datos.lista} alPulsar={alPulsar} />
        )}
      </div>
    </div>
  );
}
