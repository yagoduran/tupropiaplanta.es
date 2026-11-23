"use client";

import { marco } from "@/lib/diseno";
import type { DatosNegocio, PerfilNegocio } from "@/lib/negocio";
import { VARIEDAD_POR_ID } from "@/lib/variedades";
import { Icono } from "./Icono";
import { IconoSocial } from "./IconoSocial";
import styles from "./progresion.module.css";

interface Props {
  datos: DatosNegocio | null;
  monedas: number;
  ocupado: boolean;
  alElegir: (id: string) => void;
}

const miles = (n: number) => n.toLocaleString("es-ES", { useGrouping: "always" });

function Tarjeta({
  p,
  datos,
  monedas,
  ocupado,
  alElegir,
}: {
  p: PerfilNegocio;
  datos: DatosNegocio;
  monedas: number;
  ocupado: boolean;
  alElegir: (id: string) => void;
}) {
  const actual = datos.perfil === p.id;
  const cambia = datos.perfil !== null && !actual;
  const coste = cambia ? datos.coste_cambio : 0;
  const puede = datos.nivel_ok && !actual && monedas >= coste;
  return (
    <article
      className={styles.mision}
      aria-label={p.nombre}
      style={{ ...marco(actual ? "dorado" : "tarjeta", "var(--u)"), opacity: datos.nivel_ok || actual ? 1 : 0.6 }}
    >
      <div className={styles.misionCabeza}>
        <IconoSocial id="mision" k="var(--ik)" />
        <span className={styles.misionTexto}>
          <strong>{p.nombre}</strong>
          <span>
            <span style={{ color: "#1d6630" }}>✓</span> {p.bono}
          </span>
          <span>
            <span style={{ color: "#b9512a" }}>✗</span> {p.pega}
          </span>
        </span>
      </div>
      {coste > 0 && (
        <div className={styles.misionPie}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icono id="moneda" />
            Cambiar: {miles(coste)}
          </span>
        </div>
      )}
      <button
        type="button"
        className={styles.accion}
        style={marco(actual ? "boton_secundario" : puede ? "boton" : "boton_desactivado", "var(--u)")}
        disabled={ocupado || !puede}
        onClick={() => alElegir(p.id)}
      >
        {actual
          ? "✓ Tu perfil"
          : !datos.nivel_ok
            ? `Nivel ${datos.nivel_req}`
            : monedas < coste
              ? "Te faltan monedas"
              : cambia
                ? "Cambiar a este"
                : "Elegir"}
      </button>
    </article>
  );
}

/** Perfil de negocio y estado de saturación del mercado. */
export function Negocio({ datos, monedas, ocupado, alElegir }: Props) {
  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Mi negocio</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }
  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Mi negocio</h1>
        <span className={styles.resumen}>
          {datos.nivel_ok
            ? datos.perfil
              ? `Cambiar de perfil cuesta ${miles(datos.coste_cambio)} monedas.`
              : "Elige tu perfil: la primera vez es gratis."
            : `Se desbloquea en el nivel ${datos.nivel_req}.`}
        </span>
      </div>
      <div className={styles.misiones}>
        {datos.perfiles.map((p) => (
          <Tarjeta key={p.id} p={p} datos={datos} monedas={monedas} ocupado={ocupado} alElegir={alElegir} />
        ))}
      </div>
      <section className={styles.contenedor} aria-label="Saturación del mercado">
        <div className={styles.cabecera}>
          <h2 className={styles.titulo} style={{ fontSize: "var(--f-stat)" }}>
            Saturación del mercado
          </h2>
          <span className={styles.resumen}>
            Cada variedad aguanta 100 g sin bajar de precio. Por cada 50 g más, −5 % (hasta −30 %). Se recupera 10 g por hora.
          </span>
        </div>
        <ul className={styles.requisitos}>
          {datos.saturacion.length === 0 ? (
            <li>Ninguna variedad saturada. Precios normales.</li>
          ) : (
            datos.saturacion.map((s) => (
              <li key={s.variedad}>
                {VARIEDAD_POR_ID[s.variedad]?.nombre ?? s.variedad}: {s.g} g vendidos ·{" "}
                {s.descuento > 0 ? `precio −${s.descuento} %` : "sin descuento"}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
