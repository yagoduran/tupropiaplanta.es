"use client";

import { useState } from "react";
import { marco } from "@/lib/diseno";
import { Icono } from "./Icono";
import styles from "./juego.module.css";

export function BotonAnuncio({ restantes, onClick }: { restantes: number; onClick: () => void }) {
  const [encima, setEncima] = useState(false);
  const agotado = restantes <= 0;
  const estilo = marco(
    agotado ? "boton_desactivado" : encima ? "boton_secundario_hover" : "boton_secundario",
    "var(--u)",
  );
  return (
    <button
      type="button"
      className={styles.botonAnuncio}
      style={estilo}
      disabled={agotado}
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => setEncima(false)}
      onClick={onClick}
    >
      <Icono id="anuncio" k="var(--ik)" />
      <span className={styles.soloEscritorio}>
        {agotado ? "Sin ayudas extra hoy" : `Ver anuncio para ayuda extra (quedan ${restantes})`}
      </span>
      <span className={`${styles.soloMovil} ${styles.botonAnuncioCorto}`}>
        <strong>Ayuda</strong>
        <span>{agotado ? "Mañana más" : `Quedan ${restantes}`}</span>
      </span>
    </button>
  );
}
