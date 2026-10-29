"use client";

import { useState } from "react";
import { marco, type IdIcono } from "@/lib/diseno";
import { Icono } from "./Icono";
import styles from "./juego.module.css";

interface Props {
  id: IdIcono;
  etiqueta: string;
  detalle: string;
  /** Segundos que faltan para poder volver a usarlo. */
  espera?: number;
  /** Paso del anillo de espera, de 0 a 8. */
  pasoAnillo?: number;
  desactivado?: boolean;
  onClick?: () => void;
}

const dosCifras = (n: number) => String(n).padStart(2, "0");

export function BotonAccion({ id, etiqueta, detalle, espera = 0, pasoAnillo = 0, desactivado, onClick }: Props) {
  const [encima, setEncima] = useState(false);
  const [pulsado, setPulsado] = useState(false);

  const enEspera = espera > 0;
  const bloqueado = desactivado || enEspera;
  const estado = desactivado ? "desactivado" : enEspera ? "espera" : pulsado ? "pulsado" : encima ? "hover" : "normal";
  const estilo = marco(estado === "normal" ? "boton" : (`boton_${estado}` as const), "var(--u)");
  const color = estado === "espera" ? "#f6eed6" : estado === "desactivado" ? "#4b3a5e" : "#1c1626";

  return (
    <button
      type="button"
      className={styles.boton}
      data-tut={id}
      disabled={bloqueado}
      aria-disabled={bloqueado}
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => {
        setEncima(false);
        setPulsado(false);
      }}
      onMouseDown={() => setPulsado(true)}
      onMouseUp={() => setPulsado(false)}
      onClick={onClick}
      style={{
        ...estilo,
        color,
        height: pulsado ? "calc(var(--btn-h) - var(--u))" : "var(--btn-h)",
        marginTop: pulsado ? "var(--u)" : 0,
        cursor: bloqueado ? "not-allowed" : "pointer",
      }}
    >
      <span className={styles.botonIcono}>
        <Icono id={id} k="var(--un)" opacidad={desactivado ? 0.5 : 1} />
        {enEspera && (
          <span
            className={`pixel ${styles.anillo}`}
            style={{ backgroundPosition: `calc(${-pasoAnillo * 16}px * var(--un)) 0` }}
          />
        )}
      </span>
      <span className={styles.botonTextos}>
        <span className={styles.botonEtiqueta}>{etiqueta}</span>
        <span className={styles.botonDetalle}>
          {enEspera ? `En espera · ${dosCifras(Math.floor(espera / 60))}:${dosCifras(espera % 60)}` : detalle}
        </span>
      </span>
    </button>
  );
}
