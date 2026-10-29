"use client";

import { marco } from "@/lib/diseno";
import { RAREZAS, VARIEDADES, VARIEDAD_POR_ID, diasDeCiclo, type Variedad } from "@/lib/variedades";
import type { IdIcono } from "@/lib/diseno";
import { Icono } from "./Icono";
import styles from "./semillas.module.css";

interface Props {
  nivel: number;
  /** Variedad de la planta viva, si hay una. */
  enUso: string | null;
  ocupado: boolean;
  alPlantar: (variedad: string) => void;
  /** Semillas híbridas que tiene el jugador (de cruces y premios). */
  hibridas?: string[];
  aviso?: { texto: string; icono: IdIcono } | null;
}

const desgaste = (v: number) => (v <= 1 ? "Normal" : v <= 1.2 ? "Alto" : "Muy alto");

function Tarjeta({ variedad, nivel, enUso, ocupado, alPlantar }: Omit<Props, "aviso"> & { variedad: Variedad }) {
  const tarjeta = marco("tarjeta", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const apagado = marco("boton_desactivado", "var(--u)");
  const rareza = RAREZAS[variedad.rareza];
  const bloqueada = nivel < variedad.nivel;
  const hayPlanta = enUso !== null;
  const esActual = enUso === variedad.id;

  const texto = bloqueada ? `Nivel ${variedad.nivel}` : esActual ? "En uso" : hayPlanta ? "Planta viva" : "Plantar";
  const activo = !bloqueada && !hayPlanta && !ocupado;

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
            <strong className="numero">{diasDeCiclo(variedad)} días</strong>
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
        onClick={() => alPlantar(variedad.id)}
      >
        {texto}
      </button>
    </article>
  );
}

export function Semillas({ nivel, enUso, ocupado, alPlantar, aviso, hibridas = [] }: Props) {
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
      <div className={styles.rejilla}>
        {VARIEDADES.map((v) => (
          <Tarjeta key={v.id} variedad={v} nivel={nivel} enUso={enUso} ocupado={ocupado} alPlantar={alPlantar} />
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
                <Tarjeta key={v.id} variedad={v} nivel={nivel} enUso={enUso} ocupado={ocupado} alPlantar={alPlantar} />
              ))}
          </div>
        </>
      )}
    </div>
  );
}
