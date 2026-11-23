"use client";

import { marco } from "@/lib/diseno";
import type { CapituloCamino, DatosCamino } from "@/lib/camino";
import { Icono } from "./Icono";
import { IconoSocial } from "./IconoSocial";
import styles from "./progresion.module.css";

interface Props {
  datos: DatosCamino | null;
  ocupado: boolean;
  alReclamar: (n: number) => void;
}

const miles = (n: number) => n.toLocaleString("es-ES", { useGrouping: "always" });

function textoPremio(c: CapituloCamino) {
  const partes = [`+${miles(c.premio.monedas)} monedas`, `+${miles(c.premio.xp)} XP`];
  if (c.premio.semillas) partes.push(`+${c.premio.semillas} ${c.premio.semillas === 1 ? "semilla" : "semillas"}`);
  return partes.join(" · ");
}

function Capitulo({
  c,
  actual,
  ocupado,
  alReclamar,
}: {
  c: CapituloCamino;
  actual: boolean;
  ocupado: boolean;
  alReclamar: (n: number) => void;
}) {
  const bloqueado = !c.reclamado && !actual;
  const lista = actual && c.completo;
  const boton = marco(lista ? "boton" : c.reclamado ? "boton_secundario" : "boton_desactivado", "var(--u)");
  return (
    <article
      className={styles.mision}
      aria-label={`Capítulo ${c.n}: ${c.nombre}`}
      style={{
        ...marco(lista ? "dorado" : actual ? "tarjeta" : "apagado", "var(--u)"),
        opacity: c.reclamado || bloqueado ? 0.6 : 1,
      }}
    >
      <div className={styles.misionCabeza}>
        <IconoSocial id="mision" k="var(--ik)" />
        <span className={styles.misionTexto}>
          <strong>
            Capítulo {c.n} · {c.nombre}
          </strong>
          <span>
            {c.reclamado ? "Completado" : bloqueado ? "Termina el capítulo anterior" : `${c.hechas} de ${c.metas.length} metas`}
          </span>
        </span>
      </div>
      <ul className={styles.requisitos}>
        {c.metas.map((m) => {
          const hecha = m.valor >= m.meta;
          return (
            <li key={m.id}>
              <span style={{ color: hecha ? "#1d6630" : "#b9512a" }}>{hecha ? "✓" : "✗"}</span> {m.texto}
              {!hecha && m.meta > 1 ? ` (${miles(m.valor)}/${miles(m.meta)})` : ""}
            </li>
          );
        })}
      </ul>
      <div className={styles.pista} aria-hidden>
        <span
          className={styles.rellenoVerde}
          style={{ display: "block", width: `${Math.round((c.hechas / c.metas.length) * 100)}%` }}
        />
      </div>
      <div className={styles.misionPie}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Icono id="moneda" />
          {textoPremio(c)}
        </span>
      </div>
      <button
        type="button"
        className={styles.accion}
        style={boton}
        disabled={ocupado || !lista}
        onClick={() => alReclamar(c.n)}
      >
        {c.reclamado ? "✓ Reclamado" : lista ? "Reclamar" : bloqueado ? "Bloqueado" : "Completa las metas"}
      </button>
    </article>
  );
}

/** El Camino: ocho capítulos con tres metas y un premio fijo cada uno. */
export function Camino({ datos, ocupado, alReclamar }: Props) {
  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>El Camino</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }
  const hechos = datos.capitulos.filter((c) => c.reclamado).length;
  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>El Camino</h1>
        <span className={styles.resumen}>
          {hechos} de {datos.capitulos.length} capítulos · Completa las tres metas de cada capítulo para reclamar su
          premio.
        </span>
      </div>
      <div className={styles.misiones}>
        {datos.capitulos.map((c) => (
          <Capitulo key={c.n} c={c} actual={c.n === datos.actual} ocupado={ocupado} alReclamar={alReclamar} />
        ))}
      </div>
    </div>
  );
}
