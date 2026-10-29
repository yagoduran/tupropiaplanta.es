"use client";

import { FASES, marco } from "@/lib/diseno";
import type { DatosPerfil } from "@/lib/perfil";
import { RAREZAS, VARIEDAD_POR_ID } from "@/lib/variedades";
import styles from "./perfil.module.css";

const ESTADO = {
  viva: { texto: "Viva", fondo: "#36a33b", color: "#1c1626" },
  cosechada: { texto: "Cosechada", fondo: "#d9a43a", color: "#1c1626" },
  muerta: { texto: "Muerta", fondo: "#a8845c", color: "#1c1626" },
} as const;

function tiempo(horas: number) {
  if (horas < 1) return "menos de 1 hora";
  if (horas < 48) return `${Math.floor(horas)} h`;
  return `${Math.floor(horas / 24)} días`;
}

/** Mis plantas: todas las que ha cultivado el jugador, de la más reciente a la más antigua. */
export function MisPlantas({ datos }: { datos: DatosPerfil | null }) {
  const panel = marco("tarjeta", "var(--u)");
  return (
    <div className={styles.contenedor}>
      <h1 className={styles.titulo}>Mis plantas</h1>
      <div className={styles.tarjeta} style={panel}>
        {!datos ? (
          <p className={styles.vacio}>Cargando…</p>
        ) : datos.plantas.length === 0 ? (
          <p className={styles.vacio}>Todavía no has plantado nada.</p>
        ) : (
          <ul className={styles.lista}>
            {datos.plantas.map((p) => {
              const v = VARIEDAD_POR_ID[p.variedad];
              const estado = ESTADO[p.vida];
              return (
                <li key={p.id} className={styles.fila}>
                  <span className={styles.filaNombre}>
                    {v?.nombre ?? p.variedad}
                    <span className={styles.filaDetalle} style={{ display: "block" }}>
                      {RAREZAS[v?.rareza ?? "comun"].etiqueta} · hueco {p.hueco} · plantada el{" "}
                      {new Date(p.plantada).toLocaleDateString("es-ES")} · {tiempo(p.horas)} de vida
                      {p.vida === "viva" && ` · ${FASES[p.fase - 1]}`}
                    </span>
                  </span>
                  <span className={styles.etiqueta} style={{ background: estado.fondo, color: estado.color }}>
                    {estado.texto}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
