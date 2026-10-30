"use client";

import { useEffect } from "react";
import { CAUSAS } from "@/lib/causas";
import { FASES, marco } from "@/lib/diseno";
import type { PlantaJuego } from "@/lib/juego";
import { hojaDe } from "@/lib/variedades";
import styles from "./anuncio.module.css";

function tiempoVivida(segundos: number) {
  const horas = Math.floor(segundos / 3600);
  const dias = Math.floor(horas / 24);
  if (dias === 0) return horas === 1 ? "1 hora" : `${horas} horas`;
  const resto = horas % 24;
  return `${dias} ${dias === 1 ? "día" : "días"}${resto ? ` y ${resto} h` : ""}`;
}

interface Props {
  planta: PlantaJuego;
  alEmpezar: () => void;
  alEstadisticas: () => void;
  alCerrar: () => void;
}

/** Ventana que explica por qué se ha secado la planta y qué hacer ahora. */
export function PlantaMuerta({ planta, alEmpezar, alEstadisticas, alCerrar }: Props) {
  useEffect(() => {
    const cerrar = (e: KeyboardEvent) => {
      if (e.key === "Escape") alCerrar();
    };
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [alCerrar]);

  const panel = marco("panel", "var(--u)");
  const tarjeta = marco("tarjeta", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");
  const causa = planta.causa ? CAUSAS[planta.causa] : null;

  return (
    <div className={styles.capa} role="dialog" aria-modal="true" aria-label="Tu planta se ha secado">
      <div className={styles.caja} style={{ ...panel, width: "min(100%, 560px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", gap: "var(--gap)" }}>
          <span
            className="pixel"
            aria-hidden
            style={{
              ...tarjeta,
              display: "block",
              width: 96,
              height: 96,
              backgroundImage: `url(/assets/sprites/tpp-variedad-${hojaDe(planta.variedad)}-1x.png)`,
              backgroundSize: "576px 768px",
              backgroundPosition: `${-5 * 96}px ${-Math.max(planta.fase - 1, 0) * 96}px`,
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h2 style={{ fontFamily: "var(--fuente-pixel)", fontSize: "var(--f-title)", lineHeight: 1.1 }}>
              Tu planta se ha secado
            </h2>
            <p className={styles.texto}>
              No pasa nada: cada cultivo enseña algo. Puedes empezar otra vez cuando quieras.
            </p>
          </div>
        </div>
        {causa && (
          <p className={styles.texto} style={{ ...tarjeta, padding: "calc(var(--u) * 2)" }}>
            <strong>Causa</strong>
            <br />
            {causa.titulo} {causa.evitar}
          </p>
        )}
        <dl className={styles.texto} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
          <dt>Tiempo vivida</dt>
          <dd style={{ fontWeight: 700 }}>{tiempoVivida(planta.segundos_vida)}</dd>
          <dt>Fase alcanzada</dt>
          <dd style={{ fontWeight: 700 }}>{FASES[planta.fase - 1]}</dd>
        </dl>
        <div className={styles.botones}>
          <button type="button" className={styles.btn} style={boton} onClick={alEmpezar} autoFocus>
            Empezar de nuevo
          </button>
          <button type="button" className={styles.btn} style={secundario} onClick={alEstadisticas}>
            Ver estadísticas
          </button>
        </div>
      </div>
    </div>
  );
}
