import Link from "next/link";
import { MacetaVacia } from "@/components/paginas/MacetaVacia";
import { PaginaSuelta } from "@/components/paginas/PaginaSuelta";
import styles from "@/components/paginas/paginas.module.css";

export default function NoEncontrada() {
  return (
    <PaginaSuelta ancho={560}>
      <div className={`${styles.panel} ${styles.conImagen}`}>
        <MacetaVacia />
        <div className={styles.cuerpo}>
          <p className={styles.codigo}>404</p>
          <h1 className={styles.titulo}>Esta maceta está vacía</h1>
          <p className={styles.texto}>
            La página que buscas no existe o se ha movido. Tu planta sigue bien donde la dejaste.
          </p>
          <Link href="/" className={styles.principal}>
            Volver al inicio
          </Link>
        </div>
      </div>
    </PaginaSuelta>
  );
}
