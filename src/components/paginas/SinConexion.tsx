"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MacetaVacia } from "./MacetaVacia";
import { PaginaSuelta } from "./PaginaSuelta";
import styles from "./paginas.module.css";

const SEGUNDOS = 8;

/** Pantalla de «Sin conexión»: reintenta sola cada pocos segundos. */
export function SinConexion({ alReintentar }: { alReintentar?: () => void }) {
  const router = useRouter();
  const [falta, setFalta] = useState(SEGUNDOS);

  const reintentar = useCallback(() => {
    if (alReintentar) alReintentar();
    else router.refresh();
  }, [alReintentar, router]);

  // Cuenta atrás visible y, al terminarla, nuevo intento.
  useEffect(() => {
    const cuenta = setInterval(() => setFalta((f) => (f <= 1 ? SEGUNDOS : f - 1)), 1000);
    const intento = setInterval(reintentar, SEGUNDOS * 1000);
    return () => {
      clearInterval(cuenta);
      clearInterval(intento);
    };
  }, [reintentar]);

  return (
    <PaginaSuelta fondo="dia" ancho={560}>
      <div className={`${styles.panel} ${styles.conImagen}`} role="alert">
        <MacetaVacia />
        <div className={styles.cuerpo}>
          <h1 className={styles.titulo}>Sin conexión</h1>
          <p className={styles.texto}>
            Se ha perdido la conexión con el servidor. Tu planta sigue creciendo allí y volveremos a conectar solos en
            cuanto sea posible.
          </p>
          <p className={styles.texto}>Reintentando en {falta} s…</p>
          <button
            type="button"
            className={styles.principal}
            onClick={() => {
              setFalta(SEGUNDOS);
              reintentar();
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    </PaginaSuelta>
  );
}
