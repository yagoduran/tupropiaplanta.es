import type { ReactNode } from "react";
import { marco, type IdIcono } from "@/lib/diseno";
import type { PerfilJuego } from "@/lib/juego";
import { BannerMovil } from "./BannerMovil";
import { Cabecera } from "./Cabecera";
import { Pestanas } from "./Pestanas";
import { Publicidad } from "./Publicidad";
import styles from "./juego.module.css";

interface Props {
  perfil: PerfilJuego;
  panelEstado: ReactNode;
  /** Estado en tarjetas, solo para tablet y móvil. */
  estadoCompacto: ReactNode;
  escena: ReactNode;
  panelAcciones: ReactNode;
  /** Pantalla de la pestaña activa. */
  pantalla: IdIcono;
  alElegirPantalla: (id: IdIcono) => void;
  /** Contenido de las pantallas que no son el cultivo. */
  secundaria?: ReactNode;
}

/** Estructura común del juego: cabecera, anuncios laterales, zona de juego y pestañas. */
export function JuegoLayout({
  perfil,
  panelEstado,
  estadoCompacto,
  escena,
  panelAcciones,
  pantalla,
  alElegirPantalla,
  secundaria,
}: Props) {
  const marcoJuego = marco("panel_oscuro", "var(--u)");
  return (
    <div className={`juego ${styles.raiz}`}>
      <Cabecera
        monedas={perfil.monedas}
        nivel={perfil.nivel}
        xp={perfil.xp_pct}
        usuario={perfil.usuario}
        alAbrirAjustes={() => alElegirPantalla("ajustes")}
      />
      <main className={styles.principal}>
        <div className={styles.lateral}>
          <Publicidad />
        </div>
        <div className={styles.centro}>
          <div className={styles.juego} style={marcoJuego}>
            {pantalla === "cultivo" || !secundaria ? (
              <>
                <section className={`${styles.panelLateral} ${styles.soloEscritorio}`} aria-label="Estado de la planta">
                  {panelEstado}
                </section>
                <section className={styles.escena} aria-label="Cámara de cultivo">
                  {escena}
                </section>
                <section className={`${styles.soloMovil} ${styles.estadoMovil}`} aria-label="Estado de la planta">
                  {estadoCompacto}
                </section>
                <section className={`${styles.panelLateral} ${styles.acciones}`} aria-label="Acciones">
                  {panelAcciones}
                </section>
              </>
            ) : (
              <section className={styles.secundaria} aria-label={pantalla}>
                {secundaria}
              </section>
            )}
          </div>
          <Pestanas activa={pantalla} alElegir={alElegirPantalla} />
        </div>
        <div className={styles.lateral}>
          <Publicidad />
        </div>
      </main>
      <BannerMovil />
    </div>
  );
}
