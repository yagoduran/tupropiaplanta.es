"use client";

import { marco } from "@/lib/diseno";
import type { DatosMisiones, Mision } from "@/lib/misiones";
import { Icono } from "./Icono";
import { IconoSocial } from "./IconoSocial";
import styles from "./progresion.module.css";

interface Props {
  datos: DatosMisiones | null;
  ocupado: boolean;
  alReclamar: (id: string) => void;
}

const miles = (n: number) => n.toLocaleString("es-ES", { useGrouping: "always" });

function renovacion(segundos: number) {
  const dias = Math.floor(segundos / 86400);
  const horas = Math.floor((segundos % 86400) / 3600);
  const min = Math.floor((segundos % 3600) / 60);
  return dias > 0 ? `${dias} d ${horas} h` : `${horas} h ${min} min`;
}

function Tarjeta({ m, ocupado, alReclamar }: { m: Mision; ocupado: boolean; alReclamar: (id: string) => void }) {
  const hecha = m.estado === "reclamada";
  const lista = m.estado === "lista";
  const boton = marco(lista ? "boton" : hecha ? "boton_secundario" : "boton_desactivado", "var(--u)");
  return (
    <article
      className={styles.mision}
      style={{ ...marco(lista ? "dorado" : hecha ? "apagado" : "tarjeta", "var(--u)"), opacity: hecha ? 0.6 : 1 }}
    >
      <div className={styles.misionCabeza}>
        <IconoSocial id="mision" k="var(--ik)" />
        <span className={styles.misionTexto}>
          <strong>{m.nombre}</strong>
          <span>{m.desc}</span>
        </span>
      </div>
      <div className={styles.pista} aria-hidden>
        <span
          className={styles.rellenoVerde}
          style={{ display: "block", width: `${Math.round((m.v / m.meta) * 100)}%` }}
        />
      </div>
      <div className={styles.misionPie}>
        <span>
          {m.v}/{m.meta}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Icono id={m.premio.tipo === "monedas" ? "moneda" : "nivel"} />
          {m.premio.tipo === "monedas" ? `+${miles(m.premio.n)} monedas` : `+${miles(m.premio.n)} XP`}
        </span>
      </div>
      <button
        type="button"
        className={styles.accion}
        style={boton}
        disabled={ocupado || !lista}
        onClick={() => alReclamar(m.id)}
      >
        {hecha ? "✓ Reclamada" : lista ? "Reclamar" : `Faltan ${m.meta - m.v}`}
      </button>
    </article>
  );
}

/** Misiones diarias y semanales con su premio. */
export function Misiones({ datos, ocupado, alReclamar }: Props) {
  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Misiones</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }
  const grupos = [
    { titulo: "Diarias", tiempo: datos.renueva_dia, lista: datos.misiones.filter((m) => m.grupo === "d") },
    { titulo: "Semanales", tiempo: datos.renueva_semana, lista: datos.misiones.filter((m) => m.grupo === "s") },
  ];
  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Misiones</h1>
        <span className={styles.resumen}>Solo cuentan con tu planta normal, no con la de los desafíos.</span>
      </div>
      {grupos.map((g) => (
        <section key={g.titulo} className={styles.contenedor} aria-label={g.titulo}>
          <div className={styles.cabecera}>
            <h2 className={styles.titulo} style={{ fontSize: "var(--f-stat)" }}>
              {g.titulo}
            </h2>
            <span className={styles.reloj}>
              <IconoSocial id="reloj" k={1} />
              Se renuevan en {renovacion(g.tiempo)}
            </span>
          </div>
          <div className={styles.misiones}>
            {g.lista.map((m) => (
              <Tarjeta key={m.id} m={m} ocupado={ocupado} alReclamar={alReclamar} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
