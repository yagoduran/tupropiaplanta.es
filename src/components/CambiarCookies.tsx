"use client";

import { guardarEleccionCookies, useEleccionCookies } from "@/lib/cookies";
import styles from "./cookies.module.css";

/** Permite volver a elegir sobre los anuncios personalizados. */
export function CambiarCookies() {
  const actual = useEleccionCookies();
  return (
    <div>
      <p>
        {actual === "aceptadas" && "Ahora mismo has aceptado los anuncios personalizados."}
        {actual === "rechazadas" && "Ahora mismo has rechazado los anuncios personalizados."}
        {(actual === null || actual === "cargando") && "Aún no has elegido. Te lo preguntaremos al volver al juego."}
      </p>
      <button type="button" className={styles.volver} onClick={() => guardarEleccionCookies(null)}>
        Cambiar mi elección
      </button>
    </div>
  );
}
