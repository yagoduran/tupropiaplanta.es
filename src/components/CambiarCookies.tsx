"use client";

import { useState } from "react";
import { useEleccionCookies } from "@/lib/cookies";
import { ConfigurarCookies } from "./ConfigurarCookies";
import styles from "./cookies.module.css";

/** Permite volver a elegir sobre los anuncios personalizados. */
export function CambiarCookies() {
  const actual = useEleccionCookies();
  const [configurando, setConfigurando] = useState(false);
  return (
    <div>
      <p>
        {actual === "aceptadas" && "Ahora mismo has aceptado los anuncios personalizados."}
        {actual === "rechazadas" && "Ahora mismo has rechazado los anuncios personalizados."}
        {(actual === null || actual === "cargando") && "Aún no has elegido. Te lo preguntaremos al volver al juego."}
      </p>
      <button type="button" className={styles.volver} onClick={() => setConfigurando(true)}>
        Cambiar mi elección
      </button>
      {configurando && <ConfigurarCookies onCerrar={() => setConfigurando(false)} />}
    </div>
  );
}
