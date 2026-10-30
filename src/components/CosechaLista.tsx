"use client";

import { useEffect } from "react";
import { marco } from "@/lib/diseno";
import type { CosechaPendiente } from "@/lib/juego";
import { VARIEDAD_POR_ID, hojaDe } from "@/lib/variedades";
import { Icono } from "./Icono";
import styles from "./anuncio.module.css";

interface Props {
  cosecha: CosechaPendiente;
  ocupado: boolean;
  alVender: () => void;
  alGuardar: () => void;
}

/** «¡Cosecha lista!»: peso, calidad y premio; el jugador elige vender o guardar. */
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
        <span style={{ display: "inline-flex", gap: 2 }} aria-label={`${cosecha.calidad} de 5 estrellas`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Icono key={n} id="nivel" k={1.5} opacidad={n <= cosecha.calidad ? 1 : 0.25} />
          ))}
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
        <p className={styles.texto}>
          Vende la cosecha para cobrar las monedas, o guárdala para entregarla en los encargos.
        </p>
        <div className={styles.botones}>
          <button type="button" className={styles.btn} style={boton} disabled={ocupado} onClick={alVender} autoFocus>
            Vender
          </button>
          <button type="button" className={styles.btn} style={secundario} disabled={ocupado} onClick={alGuardar}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
