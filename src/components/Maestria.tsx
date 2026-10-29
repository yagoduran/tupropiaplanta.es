"use client";

import { useState } from "react";
import { marco } from "@/lib/diseno";
import {
  BONOS_MAESTRIA,
  NIVEL_MAXIMO,
  medallaDeNivel,
  nivelDeMaestria,
  xpDeNivel,
  type DatosMaestria,
} from "@/lib/maestria";
import { VARIEDAD_POR_ID } from "@/lib/variedades";
import { Medalla } from "./Medalla";
import styles from "./progresion.module.css";

const miles = (n: number) => n.toLocaleString("es-ES", { useGrouping: "always" });

const NOMBRE_MEDALLA = { oro: "Medalla de oro", plata: "Medalla de plata", bronce: "Medalla de bronce" } as const;

/** Maestría de variedad: nivel, medalla y bonos de cada variedad que has cultivado. */
export function Maestria({ datos }: { datos: DatosMaestria | null }) {
  const [elegida, setElegida] = useState<string | null>(null);

  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Maestría de variedad</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }

  const ids = new Set([...datos.descubiertas, ...Object.keys(datos.xp)]);
  const lista = [...ids]
    .flatMap((id) => (VARIEDAD_POR_ID[id] ? [VARIEDAD_POR_ID[id]] : []))
    .map((v) => {
      const xp = datos.xp[v.id] ?? 0;
      const nivel = nivelDeMaestria(xp, v.rareza);
      const base = xpDeNivel(nivel, v.rareza);
      const sig = nivel >= NIVEL_MAXIMO ? base : xpDeNivel(nivel + 1, v.rareza);
      return { v, xp, nivel, pct: nivel >= NIVEL_MAXIMO ? 100 : Math.round(((xp - base) / (sig - base)) * 100), sig };
    });

  if (lista.length === 0) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Maestría de variedad</h1>
        <p className={styles.resumen}>Cosecha una planta para empezar a ganar maestría.</p>
      </div>
    );
  }

  const sel = lista.find((x) => x.v.id === elegida) ?? lista[0];
  const medalla = medallaDeNivel(sel.nivel);

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Maestría de variedad</h1>
        <span className={styles.resumen}>Bronce en el nivel 3, plata en el 6 y oro en el 10.</span>
      </div>

      <div className={styles.desafios}>
        <div className={styles.listaDesafios}>
          {lista.map((x) => {
            const m = medallaDeNivel(x.nivel);
            return (
              <button
                key={x.v.id}
                type="button"
                className={styles.desafio}
                style={marco(x.v.id === sel.v.id ? "dorado" : "tarjeta", "var(--u)")}
                aria-pressed={x.v.id === sel.v.id}
                onClick={() => setElegida(x.v.id)}
              >
                <span
                  className="pixel"
                  aria-hidden
                  style={{
                    display: "block",
                    flex: "none",
                    width: 64,
                    height: 64,
                    backgroundImage: `url(/assets/sprites/tpp-variedad-${x.v.hoja}-1x.png)`,
                    backgroundSize: "384px 512px",
                    backgroundPosition: "0 -320px",
                  }}
                />
                <span className={styles.desafioTexto}>
                  <strong>{x.v.nombre}</strong>
                  <span>Nivel {x.nivel}</span>
                  <span className={styles.pista}>
                    <span className={styles.relleno} style={{ width: `${x.pct}%`, background: "#f4d36a" }} />
                  </span>
                </span>
                <Medalla tipo={m ?? "bronce"} k={1} apagada={!m} />
              </button>
            );
          })}
        </div>

        <section className={styles.tarjeta} style={marco("panel", "var(--u)")} aria-label={sel.v.nombre}>
          <div className={styles.vista}>
            <span
              className="pixel"
              aria-hidden
              style={{
                display: "block",
                flex: "none",
                width: 128,
                height: 128,
                backgroundImage: `url(/assets/sprites/tpp-variedad-${sel.v.hoja}-1x.png)`,
                backgroundSize: "768px 1024px",
                backgroundPosition: "0 -640px",
              }}
            />
            <div>
              <p className={styles.pequeno}>
                Nivel {sel.nivel} de {NIVEL_MAXIMO}
              </p>
              <p className={styles.vistaNombre}>{sel.v.nombre}</p>
              <p className={styles.desafioPie}>
                <Medalla tipo={medalla ?? "bronce"} k={1} apagada={!medalla} />
                {medalla ? NOMBRE_MEDALLA[medalla] : "Sin medalla todavía"}
              </p>
            </div>
          </div>

          <div>
            <p className={styles.subtitulo}>
              Experiencia de maestría
              <span>{sel.nivel >= NIVEL_MAXIMO ? "Maestría completa" : `${miles(sel.xp)} / ${miles(sel.sig)} XP`}</span>
            </p>
            <div className={styles.pista}>
              <div className={styles.relleno} style={{ width: `${sel.pct}%`, background: "#f4d36a" }} />
            </div>
            <p className={styles.pequeno}>
              {sel.nivel >= NIVEL_MAXIMO
                ? "Has llegado al nivel máximo de esta variedad."
                : `Cultiva y cosecha ${sel.v.nombre} para subir al nivel ${sel.nivel + 1}.`}
            </p>
          </div>

          <p className={styles.subtitulo}>Bonificaciones por nivel</p>
          <ul className={styles.bonos}>
            {BONOS_MAESTRIA.map((texto, i) => {
              const nivel = i + 1;
              const logrado = nivel <= sel.nivel;
              const siguiente = nivel === sel.nivel + 1;
              return (
                <li
                  key={nivel}
                  className={styles.bono}
                  style={{
                    background: logrado ? "#fff" : siguiente ? "#f2ec9a" : "#e9dcbc",
                    borderColor: logrado ? "#36a33b" : siguiente ? "#d9a43a" : "#a8845c",
                    opacity: logrado || siguiente ? 1 : 0.65,
                  }}
                >
                  <strong>Nv. {nivel}</strong>
                  <span>{texto}</span>
                  <span>{logrado ? "✓" : siguiente ? "Siguiente" : ""}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
