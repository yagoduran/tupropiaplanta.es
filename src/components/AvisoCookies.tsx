"use client";

import Link from "next/link";
import { guardarEleccionCookies, useEleccionCookies } from "@/lib/cookies";
import styles from "./cookies.module.css";

/** Aviso de cookies para los anuncios. Solo aparece hasta que el jugador elige. */
export function AvisoCookies() {
  if (useEleccionCookies() !== null) return null;

  const elegir = (eleccion: "aceptadas" | "rechazadas") => guardarEleccionCookies(eleccion);

  return (
    <div className={styles.aviso} role="dialog" aria-label="Cookies">
      <p>
        Usamos cookies necesarias para que entres y juegues. Si aceptas, los anuncios podrán adaptarse a ti.{" "}
        <Link href="/cookies">Más información</Link>
      </p>
      <div className={styles.botones}>
        <button type="button" className={styles.rechazar} onClick={() => elegir("rechazadas")}>
          Rechazar
        </button>
        <button type="button" className={styles.aceptar} onClick={() => elegir("aceptadas")}>
          Aceptar
        </button>
      </div>
    </div>
  );
}
