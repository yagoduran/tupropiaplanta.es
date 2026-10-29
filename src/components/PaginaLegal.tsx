import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./cookies.module.css";

export function PaginaLegal({
  titulo,
  actualizado,
  children,
}: {
  titulo: string;
  actualizado: string;
  children: ReactNode;
}) {
  return (
    <main className={styles.pagina}>
      <h1>{titulo}</h1>
      <p>Última actualización: {actualizado}</p>
      {children}
      <Link href="/" className={styles.volver} style={{ textDecoration: "none" }}>
        Volver al juego
      </Link>
    </main>
  );
}
