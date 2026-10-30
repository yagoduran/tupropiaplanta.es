"use client";

import { useEffect, useState } from "react";
import { marco } from "@/lib/diseno";
import { cuentaAtras, ICONO_EVENTO, type DatosEventos } from "@/lib/temporada";
import { RAREZAS, VARIEDAD_POR_ID } from "@/lib/variedades";
import { IconoSocial } from "./IconoSocial";
import styles from "./progresion.module.css";

const MARCO_TEMPORADA = {
  primavera: "marco_hojas",
  verano: "marco_dorado",
  otono: "marco_otono",
  invierno: "marco_escarcha",
} as const;

const ESTADOS = {
  now: { texto: "Evento activo", fondo: "#1d6630" },
  past: { texto: "Terminado", fondo: "#4b3a5e" },
  soon: { texto: "Próximamente", fondo: "#d9a43a" },
} as const;

/** Eventos de temporada: cuatro al año, con tres misiones y una semilla de edición limitada. */
export function Eventos({ datos }: { datos: DatosEventos | null }) {
  const [elegido, setElegido] = useState<string | null>(null);
  const [inicio] = useState(() => Date.now());
  const [transcurrido, setTranscurrido] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTranscurrido(Math.floor((Date.now() - inicio) / 1000)), 1000);
    return () => clearInterval(id);
  }, [inicio]);

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
              style={{
                ...marco(e.id === ev.id ? "tarjeta" : "pestana", "var(--u)"),
                color: e.id === ev.id ? "#1c1626" : "#f6eed6",
              }}
              onClick={() => setElegido(e.id)}
            >
              <IconoSocial id={ICONO_EVENTO[e.id]} k={1} />
              {e.nombre}
            </button>
          ))}
      </div>

      <section className={styles.eventoHero} style={marco(MARCO_TEMPORADA[ev.id], "var(--u)")} aria-label={ev.nombre}>
        {[styles.esquinaAI, styles.esquinaAD, styles.esquinaBI, styles.esquinaBD].map((c) => (
          <span key={c} className={`${styles.esquina} ${c}`} aria-hidden>
            <IconoSocial id={ICONO_EVENTO[ev.id]} k={1} />
          </span>
        ))}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={`pixel ${styles.eventoEscena}`} src={`/assets/temporadas/escena-${ev.id}-1x.png`} alt="" />
        <div className={styles.eventoInfo}>
          <div className={styles.eventoEtiquetas}>
            <span
              className={styles.estadoEvento}
              style={{ background: est.fondo, color: ev.estado === "soon" ? "#1c1626" : undefined }}
            >
              {est.texto}
            </span>
            <span>{ev.fechas}</span>
          </div>
          <strong className={styles.eventoNombre}>{ev.nombre}</strong>
          <span>{ev.desc}</span>
          {segundos !== null ? (
            <div>
              <strong>{ev.estado === "now" ? "Termina en" : "Empieza en"}</strong>
              <div className={styles.cuenta}>
                {cuentaAtras(segundos - transcurrido).map((c) => (
                  <div key={c.k} className={styles.cuentaCaja}>
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
      </section>

      <div className={styles.eventoAbajo}>
        <section className={styles.eventoEdicion} style={marco("marco_prestigio", "var(--u)")}>
          {variedad && (
            <span
              className={`pixel ${styles.eventoSemilla}`}
              aria-hidden
              style={{
                backgroundImage: `url(/assets/sprites/tpp-variedad-${variedad.hoja}-1x.png)`,
                backgroundSize: "384px 512px",
                backgroundPosition: "0 -384px",
              }}
            />
          )}
          <span className={styles.jugadorTexto}>
            <span
              style={{
                color: rareza.texto,
                background: rareza.fondo,
                padding: "2px 8px",
                alignSelf: "flex-start",
                fontFamily: "var(--fuente-pixel)",
              }}
            >
              Variedad limitada
            </span>
            <strong style={{ fontFamily: "var(--fuente-pixel)", fontSize: "var(--f-stat)" }}>
              {ev.edicion_nombre}
            </strong>
            <span>
              {ev.tengo
                ? "¡Ya la tienes! Plántala desde Semillas."
                : ev.estado === "now"
                  ? "Solo durante el evento. Completa las 3 misiones del evento para conseguirla (y 500 monedas)."
                  : ev.estado === "soon"
                    ? "Disponible cuando empiece el evento."
                    : "Ya no se puede conseguir este año."}
            </span>
          </span>
        </section>

        <section className={styles.eventoMisiones} style={marco("marco_madera", "var(--u)")}>
          <span className={styles.subtitulo}>Misiones del evento</span>
          {ev.misiones.map((m) => (
            <div key={m.nombre} className={styles.eventoMision} style={marco("tarjeta", "var(--u)")}>
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
              <strong className="numero">
                {m.v}/{m.meta}
              </strong>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
