"use client";

import { useState } from "react";
import { marco } from "@/lib/diseno";
import { cuentaAtras, ICONO_EVENTO, type DatosEventos } from "@/lib/temporada";
import { RAREZAS, VARIEDAD_POR_ID } from "@/lib/variedades";
import { IconoSocial } from "./IconoSocial";
import styles from "./progresion.module.css";

const ESTADOS = {
  now: { texto: "Evento activo", fondo: "#1d6630" },
  past: { texto: "Terminado", fondo: "#4b3a5e" },
  soon: { texto: "Próximamente", fondo: "#d9a43a" },
} as const;

/** Eventos de temporada: cuatro al año, con tres misiones y una semilla de edición limitada. */
export function Eventos({ datos }: { datos: DatosEventos | null }) {
  const [elegido, setElegido] = useState<string | null>(null);
  const tarjeta = marco("tarjeta", "var(--u)");

  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Eventos de temporada</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }
  const ev = datos.eventos.find((e) => e.id === (elegido ?? datos.activo)) ?? datos.eventos[0];
  const est = ESTADOS[ev.estado];
  const variedad = VARIEDAD_POR_ID[ev.edicion];
  const rareza = RAREZAS[ev.rareza];
  const segundos = ev.estado === "now" ? ev.restan : ev.estado === "soon" ? ev.empieza_en : null;

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Eventos de temporada</h1>
      </div>

      <div className={styles.eventoPestanas} role="tablist">
        {datos.eventos
          .toSorted(
            (a, b) =>
              ["primavera", "verano", "otono", "invierno"].indexOf(a.id) -
              ["primavera", "verano", "otono", "invierno"].indexOf(b.id),
          )
          .map((e) => (
            <button
              key={e.id}
              type="button"
              role="tab"
              aria-selected={e.id === ev.id}
              className={styles.eventoPestana}
              style={marco(e.id === ev.id ? "dorado" : "tarjeta", "var(--u)")}
              onClick={() => setElegido(e.id)}
            >
              <IconoSocial id={ICONO_EVENTO[e.id]} k={1} />
              {e.nombre}
            </button>
          ))}
      </div>

      <section className={styles.tarjeta} style={tarjeta} aria-label={ev.nombre}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={`pixel ${styles.eventoEscena}`} src={`/assets/temporadas/escena-${ev.id}-1x.png`} alt="" />
        <div className={styles.cabecera}>
          <div className={styles.desafioCabeza}>
            <span
              className={styles.estadoEvento}
              style={{ background: est.fondo, color: ev.estado === "soon" ? "#1c1626" : undefined }}
            >
              {est.texto}
            </span>
            <strong style={{ fontFamily: "var(--fuente-pixel)", fontSize: "var(--f-stat)" }}>{ev.nombre}</strong>
            <span>{ev.fechas}</span>
            <span>{ev.desc}</span>
          </div>
          {segundos !== null ? (
            <div>
              <span>{ev.estado === "now" ? "Termina en" : "Empieza en"}</span>
              <div className={styles.cuenta}>
                {cuentaAtras(segundos).map((c) => (
                  <div key={c.k}>
                    <strong>{c.v}</strong>
                    <span>{c.k}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <span>Volverá el año que viene</span>
          )}
        </div>

        <span className={styles.subtitulo}>Misiones del evento</span>
        <div className={styles.jugadores}>
          {ev.misiones.map((m) => (
            <div key={m.nombre} className={styles.jugador} style={marco("tarjeta", "var(--u)")}>
              <IconoSocial id={ICONO_EVENTO[ev.id]} k={2} />
              <span className={styles.jugadorTexto}>
                <strong>{m.nombre}</strong>
                <span className={styles.pista} aria-hidden>
                  <span
                    className={styles.rellenoVerde}
                    style={{ display: "block", width: `${Math.round((m.v / m.meta) * 100)}%` }}
                  />
                </span>
              </span>
              <span>
                {m.v}/{m.meta}
              </span>
            </div>
          ))}
        </div>

        <span className={styles.subtitulo}>Edición limitada</span>
        <div className={styles.jugador} style={marco("tarjeta", "var(--u)")}>
          {variedad && (
            <span
              className="pixel"
              aria-hidden
              style={{
                display: "block",
                flex: "none",
                width: 64,
                height: 64,
                backgroundImage: `url(/assets/sprites/tpp-variedad-${variedad.hoja}-1x.png)`,
                backgroundSize: "384px 512px",
                backgroundPosition: "0 -384px",
              }}
            />
          )}
          <span className={styles.jugadorTexto}>
            <strong>{ev.edicion_nombre}</strong>
            <span style={{ color: rareza.texto, background: rareza.fondo, padding: "0 6px", alignSelf: "flex-start" }}>
              {rareza.etiqueta}
            </span>
            <span>
              {ev.tengo
                ? "¡Ya la tienes! Plántala desde Semillas."
                : ev.estado === "now"
                  ? "Solo durante el evento. Completa las 3 misiones para conseguirla (y 500 monedas)."
                  : ev.estado === "soon"
                    ? "Disponible cuando empiece el evento."
                    : "Ya no se puede conseguir este año."}
            </span>
          </span>
        </div>
      </section>
    </div>
  );
}
