import type { CSSProperties, ReactNode } from "react";
import styles from "./paginas.module.css";

interface Props {
  fondo?: "claro" | "dia";
  /** Ancho máximo del contenido, en px. */
  ancho?: number;
  logo?: boolean;
  children: ReactNode;
}

/** Marco común de las páginas sueltas (inicio, 404, mantenimiento, contacto…). */
export function PaginaSuelta({ fondo = "claro", ancho = 520, logo = true, children }: Props) {
  return (
    <main className={`${styles.pagina} ${styles[fondo]}`}>
      <div className={styles.centro} style={{ "--ancho": `${ancho}px` } as CSSProperties}>
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.logo} src="/assets/logo/tpp-logo-horizontal-claro-1x.png" alt="Tu Propia Planta" />
        )}
        {children}
      </div>
    </main>
  );
}
