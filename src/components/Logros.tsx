"use client";

import { useState } from "react";
import { marco, type IdIcono } from "@/lib/diseno";
import type { PerfilJuego } from "@/lib/juego";
import { CATEGORIAS_LOGRO, LOGROS, categoriaDe, type CategoriaLogro, type Logro } from "@/lib/logros";
import { Icono } from "./Icono";
import { Medalla } from "./Medalla";
import styles from "./logros.module.css";

interface Props {
  perfil: PerfilJuego;
  ocupado: boolean;
  alReclamar: () => void;
  aviso?: { texto: string; icono: IdIcono } | null;
}

const miles = (n: number) => n.toLocaleString("es-ES");

function Diaria({ perfil, ocupado, alReclamar }: Omit<Props, "aviso">) {
  const panel = marco("tarjeta", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const apagado = marco("boton_desactivado", "var(--u)");
  const { racha, disponible, premios } = perfil.diaria;
  // Con el regalo ya recogido, los días hechos son los de la racha; si no, tras el día 7 se empieza de nuevo.
  const hechos = disponible && racha >= premios.length ? 0 : racha;
  const activo = disponible && !ocupado;

  return (
    <section className={styles.diaria} style={panel} aria-label="Regalo diario">
      <div className={styles.diariaTexto}>
        <h2 className={styles.subtitulo}>Regalo diario</h2>
        <p className={styles.ayuda}>
          Entra cada día y recógelo: cuantos más días seguidos, más monedas. Si te saltas un día, vuelves a empezar.
        </p>
      </div>
      <ol className={styles.dias}>
        {premios.map((p, i) => {
          const hecho = i < hechos;
          const siguiente = disponible && i === hechos;
          return (
            <li
              key={i}
              className={`${styles.dia} ${hecho ? styles.diaHecho : ""} ${siguiente ? styles.diaSiguiente : ""}`}
            >
              <span>Día {i + 1}</span>
              <Icono id="moneda" />
              <strong className="numero">{p}</strong>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className={styles.reclamar}
        style={{ ...(activo ? boton : apagado), color: activo ? "#1c1626" : "#4b3a5e" }}
        disabled={!activo}
        onClick={alReclamar}
      >
        {disponible ? "Recoger regalo" : "Vuelve mañana"}
      </button>
    </section>
  );
}

function Tarjeta({ logro, valor, hecho }: { logro: Logro; valor: number; hecho: boolean }) {
  const tarjeta = marco(hecho ? "dorado" : "tarjeta", "var(--u)");
  const pct = Math.min(100, Math.round((100 * valor) / logro.meta));
  return (
    <article className={styles.tarjeta} style={tarjeta}>
      <Medalla tipo={logro.medalla} k="var(--ik)" apagada={!hecho} />
      <div className={styles.cuerpo}>
        <h3 className={styles.nombre}>{logro.nombre}</h3>
        <p className={styles.descripcion}>{logro.descripcion}</p>
        {hecho ? (
          <p className={styles.conseguido}>¡Conseguido!</p>
        ) : (
          <div className={styles.progreso}>
            <div className={styles.barra} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className={styles.relleno} style={{ width: `${pct}%` }} />
            </div>
            <span className="numero">
              {miles(valor)}/{miles(logro.meta)}
            </span>
          </div>
        )}
      </div>
      <span className={styles.premio}>
        <Icono id="moneda" />
        <strong className="numero">+{logro.premio}</strong>
      </span>
    </article>
  );
}

export function Logros({ perfil, ocupado, alReclamar, aviso }: Props) {
  const { valores, hechos } = perfil.logros;
  const [filtro, setFiltro] = useState<CategoriaLogro | "todos">("todos");
  const activa = marco("pestana_activa", "var(--u)");
  const inactiva = marco("pestana", "var(--u)");
  const lista = LOGROS.filter((l) => filtro === "todos" || categoriaDe(l.id) === filtro);
  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Logros</h1>
        {aviso && (
          <p className={styles.aviso} role="status">
            <Icono id={aviso.icono} />
            <span>{aviso.texto}</span>
          </p>
        )}
        <span className={styles.contador}>
          <strong className="numero">
            {hechos.length}/{LOGROS.length}
          </strong>{" "}
          conseguidos
        </span>
      </div>
      <Diaria perfil={perfil} ocupado={ocupado} alReclamar={alReclamar} />
      <div className={styles.filtros} role="tablist" aria-label="Categoría de logros">
        {[{ id: "todos" as const, nombre: "Todos" }, ...CATEGORIAS_LOGRO].map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={filtro === c.id}
            className={styles.filtro}
            style={filtro === c.id ? { ...activa, color: "#1c1626" } : { ...inactiva, color: "#f6eed6" }}
            onClick={() => setFiltro(c.id)}
          >
            {c.nombre}
          </button>
        ))}
      </div>
      <div className={styles.rejilla}>
        {lista.map((l) => (
          <Tarjeta key={l.id} logro={l} valor={valores[l.id] ?? 0} hecho={hechos.includes(l.id)} />
        ))}
      </div>
    </div>
  );
}
