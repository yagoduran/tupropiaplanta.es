"use client";

import { useState } from "react";
import { marco } from "@/lib/diseno";
import type { PantallaJuego } from "@/lib/juego";
import type { DatosNotificaciones } from "@/lib/misiones";
import { IconoSocial } from "./IconoSocial";
import { ListaAvisos } from "./ListaAvisos";
import styles from "./juego.module.css";

interface Props {
  /** Avisos sin leer, según el último estado recibido. */
  avisos: number;
  datos: DatosNotificaciones | null;
  alAbrir: () => void;
  alLeer: (id: number | null) => void;
  /** Abre la pantalla a la que lleva el aviso pulsado. */
  alIr: (pantalla: PantallaJuego) => void;
}

/** Campana de la cabecera: contador de avisos sin leer y lista de los últimos. */
export function Campana({ avisos, datos, alAbrir, alLeer, alIr }: Props) {
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
            <ListaAvisos
              lista={datos.lista}
              alPulsar={(n, destino) => {
                if (!n.leida) alLeer(n.id);
                setAbierta(false);
                alIr(destino);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
