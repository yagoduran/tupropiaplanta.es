"use client";

import { useEffect } from "react";
import { marco } from "@/lib/diseno";
import type { CosechaPendiente } from "@/lib/juego";
import { VARIEDAD_POR_ID, hojaDe } from "@/lib/variedades";
import { CALIDADES } from "@/lib/calidad";
import { Estrellas } from "./Estrellas";
import { Icono } from "./Icono";
import styles from "./anuncio.module.css";

interface Props {
  cosecha: CosechaPendiente;
  ocupado: boolean;
  alVender: () => void;
  alGuardar: () => void;
}

/** «¡Cosecha lista!»: peso, calidad y premio; el jugador elige vender o guardar. */
const FACTORES = {
  luz: { nombre: "Luz", icono: "luz" },
  riego: { nombre: "Riego", icono: "agua" },
  abono: { nombre: "Abono", icono: "nutrientes" },
  plagas: { nombre: "Plagas", icono: "aviso" },
  salud: { nombre: "Salud", icono: "salud" },
} as const;

const colorFactor = (v: number) => (v >= 4 ? "#36a33b" : v >= 3 ? "#c9f26b" : v >= 2 ? "#f4d36a" : "#e07b3f");

export function CosechaLista({ cosecha, ocupado, alVender, alGuardar }: Props) {
  useEffect(() => {
    const cerrar = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !ocupado) alVender();
    };
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [alVender, ocupado]);

  const panel = marco("panel", "var(--u)");
  const tarjeta = marco("tarjeta", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");
  const nombre = VARIEDAD_POR_ID[cosecha.variedad]?.nombre ?? cosecha.variedad;

  const filas: { nombre: string; valor: React.ReactNode }[] = [
    { nombre: "Peso", valor: `${cosecha.gramos} g` },
    {
      nombre: "Calidad",
      valor: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Estrellas calidad={cosecha.calidad} k={1.5} />
          <span>{CALIDADES[Math.max(1, Math.min(5, cosecha.calidad)) - 1].nombre}</span>
        </span>
      ),
    },
    { nombre: "Monedas", valor: `+${cosecha.monedas}` },
    { nombre: "Experiencia", valor: `+${cosecha.xp} XP` },
  ];

  return (
    <div className={styles.capa} role="dialog" aria-modal="true" aria-label="Cosecha lista">
      <div className={styles.caja} style={{ ...panel, width: "min(100%, 560px)" }}>
        <h2 style={{ fontFamily: "var(--fuente-pixel)", fontSize: "var(--f-title)", lineHeight: 1.1 }}>
          ¡Cosecha lista!
        </h2>
        <p className={styles.texto}>
          {nombre} · {cosecha.dias} {cosecha.dias === 1 ? "día" : "días"} de cultivo
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", gap: "var(--gap)" }}>
          <span
            className="pixel"
            aria-hidden
            style={{
              ...tarjeta,
              display: "block",
              width: 96,
              height: 96,
              backgroundImage: `url(/assets/sprites/tpp-variedad-${hojaDe(cosecha.variedad)}-1x.png)`,
              backgroundSize: "576px 768px",
              backgroundPosition: `0 ${-7 * 96}px`,
            }}
          />
          <dl
            className={styles.texto}
            style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignContent: "center" }}
          >
            {filas.map((f) => (
              <div key={f.nombre} style={{ display: "contents" }}>
                <dt>{f.nombre}</dt>
                <dd style={{ fontWeight: 700, textAlign: "right" }}>{f.valor}</dd>
              </div>
            ))}
          </dl>
        </div>
        {cosecha.factores && (
          <div className={styles.texto} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <strong>Qué ha influido</strong>
            {cosecha.factores.map((f) => {
              const info = FACTORES[f.id];
              return (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icono id={info.icono} k={1.5} />
                  <span style={{ flex: 1 }}>{info.nombre}</span>
                  <span aria-label={`${f.valor} de 5`} style={{ display: "inline-flex", gap: 3 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        style={{
                          width: 12,
                          height: 8,
                          border: "2px solid #1c1626",
                          background: i <= f.valor ? colorFactor(f.valor) : "#efe3c6",
                        }}
                      />
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <p className={styles.texto}>
          Vende la cosecha para cobrar las monedas, o guárdala para entregarla en los encargos.
        </p>
        <div className={styles.botones}>
          <button type="button" className={styles.btn} style={boton} disabled={ocupado} onClick={alVender} autoFocus>
            Vender
          </button>
          <button
            type="button"
            className={styles.btn}
            style={secundario}
            data-tut="guardar"
            disabled={ocupado}
            onClick={alGuardar}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
