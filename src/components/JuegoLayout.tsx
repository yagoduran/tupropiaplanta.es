import type { ReactNode } from "react";
import { marco } from "@/lib/diseno";
import { Cabecera } from "./Cabecera";
import { Pestanas } from "./Pestanas";
import { Publicidad } from "./Publicidad";
import styles from "./juego.module.css";

interface Props {
  panelEstado: ReactNode;
  escena: ReactNode;
  panelAcciones: ReactNode;
}

/** Estructura común del juego: cabecera, anuncios laterales, zona de juego y pestañas. */
export function JuegoLayout({ panelEstado, escena, panelAcciones }: Props) {
  const marcoJuego = marco("panel_oscuro", "var(--u)");
  return (
    <div className={`juego ${styles.raiz}`}>
      <Cabecera monedas={1250} nivel={7} xp={64} usuario="plantita_23" />
      <main className={styles.principal}>
        <div className={styles.lateral}>
          <Publicidad />
        </div>
        <div className={styles.centro}>
          <div className={styles.juego} style={marcoJuego}>
            <section className={styles.panelLateral} aria-label="Estado de la planta">
              {panelEstado}
            </section>
            <section className={styles.escena} aria-label="Cámara de cultivo">
              {escena}
            </section>
            <section className={styles.panelLateral} aria-label="Acciones">
              {panelAcciones}
            </section>
          </div>
          <Pestanas activa="cultivo" />
        </div>
        <div className={styles.lateral}>
          <Publicidad />
        </div>
      </main>
    </div>
  );
}
