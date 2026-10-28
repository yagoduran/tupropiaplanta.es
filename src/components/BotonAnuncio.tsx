"use client";

import { useState } from "react";
import { marco } from "@/lib/diseno";
import { Icono } from "./Icono";
import styles from "./juego.module.css";

export function BotonAnuncio({ onClick }: { onClick?: () => void }) {
  const [encima, setEncima] = useState(false);
  const estilo = marco(encima ? "boton_secundario_hover" : "boton_secundario", "var(--u)");
  return (
    <button
      type="button"
      className={styles.botonAnuncio}
      style={estilo}
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => setEncima(false)}
      onClick={onClick}
    >
      <Icono id="anuncio" k="var(--ik)" />
      <span className={styles.soloEscritorio}>Ver anuncio para ayuda extra</span>
      <span className={`${styles.soloMovil} ${styles.botonAnuncioCorto}`}>
        <strong>Ayuda</strong>
        <span>Ver anuncio</span>
      </span>
    </button>
  );
}
