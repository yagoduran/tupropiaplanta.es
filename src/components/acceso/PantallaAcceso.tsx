import type { ReactNode } from "react";
import styles from "./acceso.module.css";

/** Fondo de la habitación de noche con el logo, para las pantallas de entrada. */
export function PantallaAcceso({ children }: { children: ReactNode }) {
  return (
    <main className={styles.pantalla}>
      <div className={styles.fondo} aria-hidden />
      <div className={styles.velo} aria-hidden />
      <div className={styles.centro}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.logo} src="/assets/logo/tpp-logo-horizontal-oscuro-1x.png" alt="Tu Propia Planta" />
        {children}
      </div>
    </main>
  );
}
