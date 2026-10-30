"use client";

import { marco } from "@/lib/diseno";
import { useState } from "react";
import { RAREZAS, VARIEDADES, VARIEDAD_POR_ID, type Variedad } from "@/lib/variedades";
import { TIPOS_SEMILLA, TIPO_POR_ID, diasDeCiclo } from "@/lib/semillas";
import type { TipoSemilla } from "@/lib/juego";
import type { IdIcono } from "@/lib/diseno";
import { Icono } from "./Icono";
import styles from "./semillas.module.css";

interface Props {
  nivel: number;
  /** Variedad de la planta viva, si hay una. */
  enUso: string | null;
  ocupado: boolean;
  alPlantar: (variedad: string, tipo: TipoSemilla) => void;
  monedas: number;
  /** Semillas híbridas que tiene el jugador (de cruces y premios). */
  hibridas?: string[];
  aviso?: { texto: string; icono: IdIcono } | null;
}

const desgaste = (v: number) => (v <= 1 ? "Normal" : v <= 1.2 ? "Alto" : "Muy alto");

type PropsTarjeta = Omit<Props, "aviso" | "hibridas" | "monedas"> & {
  variedad: Variedad;
  tipo: TipoSemilla;
  sinMonedas: boolean;
};

function Tarjeta({ variedad, nivel, enUso, ocupado, alPlantar, tipo, sinMonedas }: PropsTarjeta) {
  const tarjeta = marco("tarjeta", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const apagado = marco("boton_desactivado", "var(--u)");
  const rareza = RAREZAS[variedad.rareza];
  const bloqueada = nivel < variedad.nivel;
  const hayPlanta = enUso !== null;
  const esActual = enUso === variedad.id;

  const texto = bloqueada
    ? `Nivel ${variedad.nivel}`
    : esActual
      ? "En uso"
      : hayPlanta
        ? "Planta viva"
        : sinMonedas
          ? "Sin monedas"
          : "Plantar";
  const activo = !bloqueada && !hayPlanta && !ocupado && !sinMonedas;

  return (
    <article className={styles.tarjeta} style={tarjeta}>
      <span className={styles.rareza} style={{ background: rareza.fondo, color: rareza.texto }}>
        {rareza.etiqueta}
      </span>
      <div
        className={`pixel ${styles.imagen}`}
        style={{
          backgroundImage: `url(/assets/sprites/tpp-variedad-${variedad.hoja}-1x.png)`,
          filter: bloqueada ? "brightness(0)" : undefined,
          opacity: bloqueada ? 0.3 : 1,
        }}
      />
      <h3 className={styles.nombre}>{bloqueada ? "???" : variedad.nombre}</h3>
      <p className={styles.descripcion}>
        {bloqueada ? `Se desbloquea en el nivel ${variedad.nivel}.` : variedad.descripcion}
      </p>
      {!bloqueada && (
        <ul className={styles.datos}>
          <li>
            <span>Ciclo</span>
            <strong className="numero">{String(diasDeCiclo(variedad, tipo)).replace(".", ",")} días</strong>
          </li>
          <li>
            <span>Monedas</span>
            <strong className="numero">×{String(variedad.recompensa).replace(".", ",")}</strong>
          </li>
          <li>
            <span>Exigencia</span>
            <strong>{desgaste(variedad.desgaste)}</strong>
          </li>
        </ul>
      )}
      <button
        type="button"
        className={styles.boton}
        style={{ ...(activo ? boton : apagado), color: activo ? "#1c1626" : "#4b3a5e" }}
        disabled={!activo}
        onClick={() => alPlantar(variedad.id, tipo)}
      >
        {texto}
      </button>
    </article>
  );
}

export function Semillas({ nivel, enUso, ocupado, alPlantar, aviso, monedas, hibridas = [] }: Props) {
  const [tipo, setTipo] = useState<TipoSemilla>("foto");
  const sinMonedas = monedas < TIPO_POR_ID[tipo].precio;
  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Semillas</h1>
        {aviso && (
          <p className={styles.aviso} role="status">
            <Icono id={aviso.icono} />
            <span>{aviso.texto}</span>
          </p>
        )}
      </div>
      <p className={styles.ayuda}>
        Elige qué plantar. Las más raras dan más monedas, tardan más y exigen más cuidados. Solo puedes tener una planta
        a la vez.
      </p>
      <div className={styles.tipos} role="radiogroup" aria-label="Tipo de semilla">
        {TIPOS_SEMILLA.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={tipo === t.id}
            className={`${styles.tipo} ${tipo === t.id ? styles.tipoActivo : ""}`}
            onClick={() => setTipo(t.id)}
          >
            <span
              className={`pixel ${styles.iconoTipo}`}
              style={{ backgroundPosition: `0 calc(${-t.fila * 32}px * var(--ik))` }}
            />
            <strong>{t.nombre}</strong>
            <span>{t.precio > 0 ? `${t.precio} monedas` : "Gratis"}</span>
          </button>
        ))}
      </div>
      <p className={styles.ayuda}>{TIPO_POR_ID[tipo].descripcion}</p>
      <div className={styles.rejilla}>
        {VARIEDADES.map((v) => (
          <Tarjeta
            key={v.id}
            variedad={v}
            nivel={nivel}
            enUso={enUso}
            ocupado={ocupado}
            alPlantar={alPlantar}
            tipo={tipo}
            sinMonedas={sinMonedas}
          />
        ))}
      </div>
      {hibridas.length > 0 && (
        <>
          <p className={styles.ayuda}>Tus semillas híbridas, de cruces y premios.</p>
          <div className={styles.rejilla}>
            {hibridas
              .map((id) => VARIEDAD_POR_ID[id])
              .filter(Boolean)
              .map((v) => (
                <Tarjeta
                  key={v.id}
                  variedad={v}
                  nivel={nivel}
                  enUso={enUso}
                  ocupado={ocupado}
                  alPlantar={alPlantar}
                  tipo={tipo}
                  sinMonedas={sinMonedas}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}
