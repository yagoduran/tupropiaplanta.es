"use client";

import { useState } from "react";
import { marco } from "@/lib/diseno";
import { haceCuanto, type DatosNotificaciones, type Notificacion } from "@/lib/misiones";
import { Icono } from "./Icono";
import { IconoSocial } from "./IconoSocial";
import styles from "./juego.module.css";

interface Props {
  /** Avisos sin leer, según el último estado recibido. */
  avisos: number;
  datos: DatosNotificaciones | null;
  alAbrir: () => void;
  alLeer: (id: number | null) => void;
}

function IconoAviso({ tipo }: { tipo: Notificacion["tipo"] }) {
  if (tipo === "mision") return <IconoSocial id="mision" k={1.5} />;
  return (
    <Icono id={tipo === "sed" ? "agua" : tipo === "plaga" ? "aviso" : tipo === "nivel" ? "nivel" : "logros"} k={2} />
  );
}

/** Campana de la cabecera: contador de avisos sin leer y lista de los últimos. */
export function Campana({ avisos, datos, alAbrir, alLeer }: Props) {
  const [abierta, setAbierta] = useState(false);
  const panel = marco("panel", "var(--u)");
  const sinLeer = datos?.no_leidas ?? avisos;

  return (
    <div className={styles.campana}>
      <button
        type="button"
        className={styles.campanaBoton}
        aria-expanded={abierta}
        aria-label={sinLeer > 0 ? `Avisos: ${sinLeer} sin leer` : "Avisos"}
        onClick={() => {
          if (!abierta) alAbrir();
          setAbierta((v) => !v);
        }}
      >
        <IconoSocial id="campana" k={2} />
        {sinLeer > 0 && <span className={styles.campanaPunto}>{sinLeer > 9 ? "9+" : sinLeer}</span>}
      </button>
      {abierta && (
        <div className={styles.campanaPanel} style={panel}>
          <div className={styles.campanaCabeza}>
            <span>Avisos</span>
            {sinLeer > 0 && (
              <button type="button" className={styles.campanaLeer} onClick={() => alLeer(null)}>
                Marcar todo como leído
              </button>
            )}
          </div>
          {!datos ? (
            <p className={styles.avisoTexto}>Cargando…</p>
          ) : datos.lista.length === 0 ? (
            <p className={styles.avisoTexto} style={{ marginTop: 8 }}>
              No tienes avisos.
            </p>
          ) : (
            datos.lista.map((n) => (
              <button
                key={n.id}
                type="button"
                className={styles.aviso}
                style={{ background: n.leida ? "#f6eed6" : "#fff" }}
                onClick={() => !n.leida && alLeer(n.id)}
              >
                <IconoAviso tipo={n.tipo} />
                <span className={styles.avisoTexto}>
                  <strong>{n.titulo}</strong>
                  <span>{n.texto}</span>
                  <span className={styles.avisoCuando}>{haceCuanto(n.hace)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
