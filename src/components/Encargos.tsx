"use client";

import { marco } from "@/lib/diseno";
import type { DatosEncargos } from "@/lib/encargos";
import { VARIEDAD_POR_ID } from "@/lib/variedades";
import { Icono } from "./Icono";
import { IconoSocial } from "./IconoSocial";
import styles from "./progresion.module.css";

interface Props {
  datos: DatosEncargos | null;
  ocupado: boolean;
  alEntregar: (id: string) => void;
}

const miles = (n: number) => n.toLocaleString("es-ES", { useGrouping: "always" });
const nombre = (id: string) => VARIEDAD_POR_ID[id]?.nombre ?? id;

function restante(segundos: number) {
  const h = Math.floor(segundos / 3600);
  const min = Math.floor((segundos % 3600) / 60);
  return h > 0 ? `${h} h ${min} min` : `${min} min`;
}

/** Móvil del juego: encargos de gramos de planta a cambio de monedas y XP. */
export function Encargos({ datos, ocupado, alEntregar }: Props) {
  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Móvil</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }
  const guardadas = Object.entries(datos.almacen).filter(([, g]) => g > 0);
  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Móvil</h1>
        <span className={styles.resumen}>Cada cosecha te da gramos. Entrégalos a quien te los pide antes de 24 h.</span>
      </div>
      <section className={styles.contenedor} aria-label="Almacén">
        <h2 className={styles.titulo} style={{ fontSize: "var(--f-stat)" }}>
          Tu almacén
        </h2>
        <p className={styles.resumen}>
          {guardadas.length === 0
            ? "Todavía no tienes gramos. Cosecha una planta para conseguirlos."
            : guardadas.map(([v, g]) => `${nombre(v)}: ${miles(g)} g`).join(" · ")}
        </p>
      </section>
      <section className={styles.contenedor} aria-label="Mensajes">
        <h2 className={styles.titulo} style={{ fontSize: "var(--f-stat)" }}>
          Mensajes
        </h2>
        {datos.lista.length === 0 && <p className={styles.resumen}>No tienes encargos ahora mismo.</p>}
        <div className={styles.misiones}>
          {datos.lista.map((e) => {
            const listo = e.tengo >= e.g;
            return (
              <article key={e.id} className={styles.mision} style={marco(listo ? "dorado" : "tarjeta", "var(--u)")}>
                <div className={styles.misionCabeza}>
                  <IconoSocial id="mision" k="var(--ik)" />
                  <span className={styles.misionTexto}>
                    <strong>{e.remite}</strong>
                    <span>
                      «Hola, ¿me puedes conseguir {e.g} g de {nombre(e.variedad)}? ¡Te lo pago bien!»
                    </span>
                  </span>
                </div>
                <div className={styles.pista} aria-hidden>
                  <span
                    className={styles.rellenoVerde}
                    style={{ display: "block", width: `${Math.min(100, Math.round((e.tengo / e.g) * 100))}%` }}
                  />
                </div>
                <div className={styles.misionPie}>
                  <span>
                    {Math.min(e.tengo, e.g)}/{e.g} g · quedan {restante(e.restan)}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Icono id="moneda" />+{miles(e.monedas)} · +{miles(e.xp)} XP
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.accion}
                  style={marco(listo ? "boton" : "boton_desactivado", "var(--u)")}
                  disabled={ocupado || !listo}
                  onClick={() => alEntregar(e.id)}
                >
                  {listo ? "Entregar" : `Faltan ${e.g - e.tengo} g`}
                </button>
              </article>
            );
          })}
        </div>
        {datos.siguiente_en !== null && (
          <p className={styles.resumen}>Próximo mensaje en {restante(datos.siguiente_en)}.</p>
        )}
      </section>
    </div>
  );
}
