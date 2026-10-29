import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { MacetaVacia } from "@/components/paginas/MacetaVacia";
import { PaginaSuelta } from "@/components/paginas/PaginaSuelta";
import styles from "@/components/paginas/paginas.module.css";

export const metadata: Metadata = { title: "Mantenimiento · Tu Propia Planta", robots: { index: false } };

async function Contenido() {
  await connection();
  const vuelta = process.env.MANTENIMIENTO_HASTA?.trim();
  return (
    <PaginaSuelta fondo="dia" ancho={560}>
      <div className={`${styles.panel} ${styles.conImagen}`}>
        <MacetaVacia />
        <div className={styles.cuerpo}>
          <h1 className={styles.titulo}>Estamos regando los servidores</h1>
          <p className={styles.texto}>
            El juego está en mantenimiento y volverá en unos minutos. Mientras tanto, tus plantas no pierden agua ni
            salud.
          </p>
          {vuelta && <p className={styles.etiqueta}>Vuelta prevista: {vuelta}</p>}
          <Link href="/" className={styles.principal}>
            Volver al inicio
          </Link>
        </div>
      </div>
    </PaginaSuelta>
  );
}

export default function Mantenimiento() {
  return (
    <Suspense>
      <Contenido />
    </Suspense>
  );
}
