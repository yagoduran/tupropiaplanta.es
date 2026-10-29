"use client";

import { useEffect } from "react";
import { FASES, marco } from "@/lib/diseno";
import { PLAGAS } from "@/lib/plagas";
import type { Bienvenida as DatosBienvenida } from "@/lib/visita";
import { Icono } from "./Icono";
import styles from "./anuncio.module.css";

const ESTADOS: Record<string, string> = {
  sana: "Sana",
  sedienta: "Sedienta",
  exceso_agua: "Exceso de agua",
  falta_nutrientes: "Faltan nutrientes",
  plaga: "Con plaga",
  hongo: "Con hongo",
  muriendo: "Muriendo",
  muerta: "Muerta",
};

function tiempoFuera(ms: number) {
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h ${String(min % 60).padStart(2, "0")} min`;
  return `${Math.floor(h / 24)} días`;
}

// Fila de la hoja de la variedad: la fase menos uno. Columna 4 = sedienta, 5 = muerta.
const columna = (estado: string) => (estado === "muerta" ? 5 : estado === "sedienta" || estado === "muriendo" ? 4 : 0);

interface Props {
  usuario: string;
  datos: DatosBienvenida;
  alContinuar: () => void;
}

/** «Hola de nuevo»: resumen de lo que ha pasado mientras el jugador no estaba. */
export function Bienvenida({ usuario, datos, alContinuar }: Props) {
  useEffect(() => {
    const cerrar = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") alContinuar();
    };
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [alContinuar]);

  const panel = marco("panel", "var(--u)");
  const tarjeta = marco("tarjeta", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const plaga = datos.plaga ? PLAGAS[datos.plaga.tipo] : null;
  const estado = ESTADOS[datos.estado] ?? datos.estado;

  const filas = [
    { icono: <Icono id="tiempo" k={2} />, valor: tiempoFuera(datos.ausenteMs), nombre: "Tiempo fuera" },
    {
      icono: <Icono id="agua" k={2} />,
      valor: datos.consumida > 0 ? `−${datos.consumida} %` : "Sin cambios",
      nombre: `Agua · queda ${datos.agua} %`,
    },
    {
      icono: <Icono id="aviso" k={2} />,
      valor: plaga ? plaga.nombre : "Ninguna",
      nombre: "Plagas",
    },
    { icono: <Icono id="salud" k={2} />, valor: estado, nombre: "Estado de la planta" },
  ];

  return (
    <div className={styles.capa} role="dialog" aria-modal="true" aria-label="Hola de nuevo">
      <div className={styles.caja} style={{ ...panel, width: "min(100%, 520px)" }}>
        <h2 style={{ fontFamily: "var(--fuente-pixel)", fontSize: "var(--f-title)", lineHeight: 1.1 }}>
          ¡Hola de nuevo, {usuario}!
        </h2>
        <p className={styles.texto}>Esto ha pasado mientras no estabas.</p>
        <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", gap: "var(--gap)" }}>
          <div style={{ ...tarjeta, padding: "calc(var(--u) * 3)", display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              className="pixel"
              aria-hidden
              style={{
                display: "block",
                width: 96,
                height: 96,
                backgroundImage: `url(/assets/sprites/tpp-variedad-${datos.variedad}-1x.png)`,
                backgroundSize: "576px 768px",
                backgroundPosition: `${-columna(datos.estado) * 96}px ${-(datos.fase - 1) * 96}px`,
              }}
            />
            <span className={styles.texto} style={{ fontWeight: 700 }}>
              Fase {datos.fase} · {estado}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "calc(var(--u) * 2)" }}>
            {filas.map((f) => (
              <div
                key={f.nombre}
                style={{ ...tarjeta, padding: "calc(var(--u) * 2)", display: "flex", gap: 8, alignItems: "center" }}
              >
                {f.icono}
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <strong className="numero" style={{ fontSize: "var(--f-stat)" }}>
                    {f.valor}
                  </strong>
                  <span className={styles.texto}>{f.nombre}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        {datos.subeDeFase && (
          <p className={styles.texto} style={{ background: "#1d6630", color: "#f6eed6", padding: "8px 12px" }}>
            Ha subido de fase: ahora está en <strong>{FASES[datos.fase - 1]}</strong>.
            {datos.estado === "sedienta" && " Riégala pronto."}
          </p>
        )}
        <div className={styles.botones}>
          <button type="button" className={styles.btn} style={boton} onClick={alContinuar} autoFocus>
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
