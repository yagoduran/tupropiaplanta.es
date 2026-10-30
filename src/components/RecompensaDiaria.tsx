"use client";

import { useEffect } from "react";
import { marco } from "@/lib/diseno";
import type { PerfilJuego } from "@/lib/juego";
import { Icono } from "./Icono";
import styles from "./anuncio.module.css";

interface Props {
  diaria: PerfilJuego["diaria"];
  ocupado: boolean;
  alRecoger: () => void;
  alCerrar: () => void;
}

/** «Recompensa diaria»: los siete días de la racha; el séptimo es un cofre sorpresa. */
export function RecompensaDiaria({ diaria, ocupado, alRecoger, alCerrar }: Props) {
  useEffect(() => {
    const cerrar = (e: KeyboardEvent) => {
      if (e.key === "Escape") alCerrar();
    };
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [alCerrar]);

  const { racha, premios } = diaria;
  const hechos = racha >= premios.length ? 0 : racha;
  const hoy = hechos;
  const panel = marco("panel", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const dorado = marco("dorado", "var(--u)");
  const tarjeta = marco("tarjeta", "var(--u)");
  const apagado = marco("apagado", "var(--u)");

  return (
    <div className={styles.capa} role="dialog" aria-modal="true" aria-label="Recompensa diaria">
      <div className={styles.caja} style={{ ...panel, width: "min(100%, 640px)" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontFamily: "var(--fuente-pixel)", fontSize: "var(--f-title)", lineHeight: 1.1 }}>
            Recompensa diaria
          </h2>
          <button type="button" className={styles.btn} style={tarjeta} onClick={alCerrar} aria-label="Cerrar">
            <Icono id="cerrar" />
          </button>
        </header>
        <p className={styles.texto}>
          Día {hoy + 1} de {premios.length}. Entra cada día para llegar al cofre del día {premios.length}.
        </p>
        <ol
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${premios.length}, minmax(0, 1fr))`,
            gap: "calc(var(--u) * 2)",
            listStyle: "none",
            padding: 0,
          }}
        >
          {premios.map((p, i) => {
            const hecho = i < hechos;
            const esHoy = i === hoy;
            const cofre = i === premios.length - 1;
            return (
              <li
                key={i}
                className={styles.texto}
                style={{
                  ...(esHoy ? dorado : hecho ? apagado : tarjeta),
                  padding: "calc(var(--u) * 2)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  textAlign: "center",
                }}
              >
                <span>Día {i + 1}</span>
                <Icono id={cofre ? "cosechar" : "moneda"} k={2} opacidad={hecho ? 0.5 : 1} />
                <strong className="numero">{cofre ? "Cofre" : `+${p}`}</strong>
                <span style={{ fontSize: 10 }}>{hecho ? "Recogido" : esHoy ? "Hoy" : "Pendiente"}</span>
              </li>
            );
          })}
        </ol>
        <div className={styles.botones}>
          <button type="button" className={styles.btn} style={boton} disabled={ocupado} onClick={alRecoger} autoFocus>
            Recoger +{premios[hoy] ?? 0}
          </button>
        </div>
      </div>
    </div>
  );
}
