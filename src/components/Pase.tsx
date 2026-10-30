"use client";

import { useEffect, useRef } from "react";
import { marco } from "@/lib/diseno";
import { OBJETO_POR_ID } from "@/lib/tienda";
import type { DatosPase, PremioPase } from "@/lib/temporada";
import { Icono } from "./Icono";
import { IconoObjeto } from "./IconoObjeto";
import { IconoSocial } from "./IconoSocial";
import styles from "./progresion.module.css";

interface Props {
  datos: DatosPase | null;
  ocupado: boolean;
  monedas: number;
  alReclamar: (nivel: number, pista: "g" | "s") => void;
  alComprar: () => void;
}

const miles = (n: number) => n.toLocaleString("es-ES", { useGrouping: "always" });

const K_PREMIO = "calc(var(--un) * 0.66)";

const CELDAS = { moneda: [0, 5], experiencia: [1, 5], fert: [0, 2] } as const;

function IconoPremio({ tipo, id }: { tipo: PremioPase["tipo"]; id?: string }) {
  const objeto = id ? OBJETO_POR_ID[id] : null;
  if ((tipo === "maceta" || tipo === "decoracion" || tipo === "objeto") && objeto)
    return <IconoObjeto celda={objeto.celda} tamano={32} k={K_PREMIO} />;
  if (tipo === "monedas") return <IconoObjeto celda={[...CELDAS.moneda]} tamano={32} k={K_PREMIO} />;
  if (tipo === "xp") return <IconoObjeto celda={[...CELDAS.experiencia]} tamano={32} k={K_PREMIO} />;
  if (tipo === "objeto") return <IconoObjeto celda={[...CELDAS.fert]} tamano={32} k={K_PREMIO} />;
  if (tipo === "semilla") return <Icono id="semillas" k="calc(var(--un) * 1.4)" />;
  return <IconoSocial id="estrella_temporada" hoja={32} k={K_PREMIO} />;
}

const corto = (etq: string) => etq.replace(/^(\d[\d.]*)\s*monedas$/, "$1");

function Premio({
  p,
  especial,
  bloqueado,
  ocupado,
  alReclamar,
}: {
  p: PremioPase;
  especial: boolean;
  bloqueado: boolean;
  ocupado: boolean;
  alReclamar: () => void;
}) {
  const listo = p.estado === "listo" && !bloqueado;
  const reclamado = p.estado === "reclamado";
  const estilo = bloqueado
    ? "apagado"
    : listo
      ? "dorado"
      : reclamado
        ? "apagado"
        : especial
          ? "marco_prestigio"
          : "tarjeta";
  return (
    <button
      type="button"
      className={styles.paseCelda}
      style={{
        ...marco(estilo, "var(--u)"),
        opacity: bloqueado ? 0.45 : reclamado ? 0.5 : 1,
        cursor: listo ? "pointer" : "default",
      }}
      disabled={!listo || ocupado}
      onClick={alReclamar}
      title={p.etq}
    >
      <IconoPremio tipo={p.tipo} id={p.id} />
      <span className={styles.paseEtq2}>{listo ? "Reclamar" : corto(p.etq)}</span>
      {reclamado && !bloqueado && <span className={styles.paseHecho}>✓</span>}
      {bloqueado && (
        <span className={styles.paseCandado}>
          <Icono id="candado" k="calc(var(--un) * 0.66)" />
        </span>
      )}
    </button>
  );
}

/** Pase de temporada: 30 niveles con una pista gratis y otra especial. */
export function Pase({ datos, ocupado, monedas, alReclamar, alComprar }: Props) {
  const via = useRef<HTMLDivElement>(null);
  const nivelActual = datos?.activo ? datos.nivel : 0;
  // Al abrir el pase, la fila se centra en el nivel actual.
  useEffect(() => {
    const contenedor = via.current;
    const columna = contenedor?.querySelector<HTMLElement>('[data-actual="si"]');
    if (!contenedor || !columna) return;
    contenedor.scrollLeft = columna.offsetLeft - (contenedor.clientWidth - columna.offsetWidth) / 2;
  }, [nivelActual]);
  const panel = marco("panel", "var(--u)");
  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Pase de temporada</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }
  if (!datos.activo) {
    const dias = datos.proximo_en === null ? null : Math.ceil(datos.proximo_en / 86400);
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Pase de temporada</h1>
        <p className={styles.resumen}>
          Ahora no hay ningún pase en marcha.{dias !== null ? ` El próximo evento empieza en ${dias} días.` : ""}
        </p>
      </div>
    );
  }
  const dias = Math.max(0, Math.ceil(datos.restan / 86400));
  const enNivel = datos.pts - datos.nivel * datos.por_nivel;
  const pct = datos.nivel >= 30 ? 100 : Math.round((enNivel / datos.por_nivel) * 100);
  const sinSaldo = monedas < datos.precio;

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Pase de temporada · {datos.evento}</h1>
        <span className={styles.paseQuedan}>
          <IconoSocial id="reloj" k="calc(var(--un) * 0.66)" />
          Quedan {dias} días
        </span>
      </div>

      <section className={styles.paseCabecera} style={panel}>
        <div className={styles.paseNivelActual} style={marco("dorado", "var(--u)")}>
          Nivel {datos.nivel}
        </div>
        <div className={styles.paseXp}>
          <span>
            {datos.nivel >= 30
              ? "¡Pase completado!"
              : `Experiencia de temporada · ${enNivel} / ${datos.por_nivel} para el nivel ${datos.nivel + 1}`}
          </span>
          <div className={styles.paseBarra}>
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>
        {datos.premium ? (
          <span className={styles.paseActivo}>✓ Pase especial activo</span>
        ) : (
          <button
            type="button"
            className={styles.paseComprar}
            style={marco(ocupado || sinSaldo ? "boton_desactivado" : "dorado", "var(--u)")}
            disabled={ocupado || sinSaldo}
            onClick={alComprar}
          >
            Desbloquear especial · {miles(datos.precio)} monedas
          </button>
        )}
      </section>
      <p className={styles.resumen}>
        Ganas puntos al reclamar misiones (diaria +20, semanal +60), al completar misiones del evento (+100) y al
        cosechar (+50). Lo que no reclames al terminar la temporada se pierde.
      </p>

      <div className={styles.paseVia} ref={via}>
        <div className={styles.paseRejilla}>
          <div className={styles.paseEtiqueta}>
            <span>Gratis</span>
            <small>Para todos</small>
          </div>
          <div className={styles.paseEtiqueta}>
            <span>Nivel</span>
          </div>
          <div className={styles.paseEtiqueta}>
            <span>Especial</span>
            <small>{datos.premium ? "Desbloqueado" : "Bloqueado"}</small>
          </div>
          {datos.niveles.map((l) => (
            <div
              key={l.n}
              className={styles.paseColumna}
              data-actual={l.n === Math.max(1, datos.nivel) ? "si" : undefined}
            >
              <Premio
                p={l.g}
                especial={false}
                bloqueado={false}
                ocupado={ocupado}
                alReclamar={() => alReclamar(l.n, "g")}
              />
              <div className={styles.paseCruce}>
                <span
                  className={styles.paseCamino}
                  style={{ background: l.n <= datos.nivel ? "#36a33b" : "#5f3c26" }}
                />
                <span
                  className={styles.paseNodo}
                  style={marco(l.n < datos.nivel ? "boton" : l.n === datos.nivel ? "dorado" : "apagado", "var(--u)")}
                >
                  {l.n}
                </span>
              </div>
              <Premio
                p={l.s}
                especial
                bloqueado={!datos.premium}
                ocupado={ocupado}
                alReclamar={() => alReclamar(l.n, "s")}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
