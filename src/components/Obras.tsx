"use client";

import { useEffect, useRef, useState } from "react";
import { marco } from "@/lib/diseno";
import type { DatosObras, Obra } from "@/lib/obras";
import { Icono } from "./Icono";
import { IconoSocial } from "./IconoSocial";
import styles from "./progresion.module.css";

interface Props {
  datos: DatosObras | null;
  monedas: number;
  ocupado: boolean;
  alEmpezar: (id: string) => void;
  alAcelerar: () => void;
  /** Se llama una vez cuando acaba la cuenta atrás de la obra en curso. */
  alTerminar: () => void;
}

const miles = (n: number) => n.toLocaleString("es-ES", { useGrouping: "always" });

function tiempo(seg: number) {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  return h > 0 ? `${h} h ${m} min` : m > 0 ? `${m} min ${s} s` : `${s} s`;
}

function Tarjeta({
  o,
  restante,
  monedas,
  ocupada,
  ocupado,
  alEmpezar,
  alAcelerar,
}: {
  o: Obra;
  restante: number;
  monedas: number;
  ocupada: boolean;
  ocupado: boolean;
  alEmpezar: (id: string) => void;
  alAcelerar: () => void;
}) {
  const curso = o.estado === "en_curso";
  const hecha = o.estado === "hecha";
  const bloqueada = o.estado === "bloqueada";
  const puede = o.estado === "disponible" && !ocupada && monedas >= o.precio;
  const coste = o.acelerar ?? 0;
  const total = o.horas * 3600;
  const pct = hecha ? 100 : curso ? Math.min(100, Math.round(((total - restante) / total) * 100)) : 0;
  const accion = curso ? alAcelerar : () => alEmpezar(o.id);
  const activo = curso ? monedas >= coste : puede;
  return (
    <article
      className={styles.mision}
      aria-label={o.nombre}
      style={{
        ...marco(curso ? "dorado" : bloqueada || hecha ? "apagado" : "tarjeta", "var(--u)"),
        opacity: hecha || bloqueada ? 0.6 : 1,
      }}
    >
      <div className={styles.misionCabeza}>
        <IconoSocial id="mision" k="var(--ik)" />
        <span className={styles.misionTexto}>
          <strong>{o.nombre}</strong>
          <span>{o.desc}</span>
        </span>
      </div>
      <div className={styles.pista} aria-hidden>
        <span className={styles.rellenoVerde} style={{ display: "block", width: `${pct}%` }} />
      </div>
      <div className={styles.misionPie}>
        <span>
          {hecha
            ? "Terminada"
            : curso
              ? restante > 0
                ? `Faltan ${tiempo(restante)}`
                : "Terminando…"
              : bloqueada
                ? `Nivel ${o.nivel}`
                : `Dura ${o.horas} h`}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Icono id="moneda" />
          {curso ? `Acelerar: ${miles(coste)}` : miles(o.precio)}
        </span>
      </div>
      {!hecha && !bloqueada && (
        <button
          type="button"
          className={styles.accion}
          style={marco(activo ? "boton" : "boton_desactivado", "var(--u)")}
          disabled={ocupado || !activo}
          onClick={accion}
        >
          {curso
            ? "Acelerar"
            : ocupada
              ? "Hay otra obra en marcha"
              : monedas < o.precio
                ? "Te faltan monedas"
                : "Empezar obra"}
        </button>
      )}
      {hecha && (
        <button type="button" className={styles.accion} style={marco("boton_secundario", "var(--u)")} disabled>
          ✓ Terminada
        </button>
      )}
      {bloqueada && (
        <button type="button" className={styles.accion} style={marco("boton_desactivado", "var(--u)")} disabled>
          Bloqueada
        </button>
      )}
    </article>
  );
}

/** Obras de la casa: proyectos grandes con tiempo y bono permanente. */
export function Obras({ datos, monedas, ocupado, alEmpezar, alAcelerar, alTerminar }: Props) {
  const [ahora, setAhora] = useState(0);
  const [recibido, setRecibido] = useState(0);
  const avisado = useRef(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setRecibido(Date.now());
      setAhora(Date.now());
      avisado.current = false;
    }, 0);
    return () => clearTimeout(id);
  }, [datos]);

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const curso = datos?.obras.find((o) => o.estado === "en_curso");
  const restante = curso ? Math.max(0, curso.resta - Math.floor((ahora - recibido) / 1000)) : 0;

  useEffect(() => {
    if (curso && recibido > 0 && restante <= 0 && !avisado.current) {
      avisado.current = true;
      alTerminar();
    }
  }, [curso, recibido, restante, alTerminar]);

  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Obras</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }
  const hechas = datos.obras.filter((o) => o.estado === "hecha").length;
  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Obras</h1>
        <span className={styles.resumen}>
          {hechas} de {datos.obras.length} terminadas · Solo puedes hacer una obra a la vez. Acelerar cuesta 1 moneda por
          minuto que falta (mínimo 50).
        </span>
      </div>
      <div className={styles.misiones}>
        {datos.obras.map((o) => (
          <Tarjeta
            key={o.id}
            o={o}
            restante={o.estado === "en_curso" ? restante : 0}
            monedas={monedas}
            ocupada={datos.ocupada}
            ocupado={ocupado}
            alEmpezar={alEmpezar}
            alAcelerar={alAcelerar}
          />
        ))}
      </div>
    </div>
  );
}
