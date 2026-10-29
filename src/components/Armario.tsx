"use client";

import { useState } from "react";
import { RAMAS, ROMANOS } from "@/lib/casa";
import { marco } from "@/lib/diseno";
import type { PerfilJuego } from "@/lib/juego";
import { Icono } from "./Icono";
import { IconoProgresion } from "./IconoProgresion";
import styles from "./progresion.module.css";

interface Props {
  perfil: PerfilJuego;
  ocupado: boolean;
  alComprar: (rama: string) => void;
}

const miles = (n: number) => n.toLocaleString("es-ES", { useGrouping: "always" });

/** Mejoras del armario: cinco ramas de tres niveles que se compran con monedas. */
export function Armario({ perfil, ocupado, alComprar }: Props) {
  const [seleccion, setSeleccion] = useState<{ rama: number; nivel: number }>({ rama: 0, nivel: 0 });
  const mejoras = perfil.casa.mejoras;
  const compradas = RAMAS.reduce((a, r) => a + (mejoras[r.id] ?? 0), 0);

  const rama = RAMAS[seleccion.rama];
  const paso = rama.niveles[seleccion.nivel];
  const actual = mejoras[rama.id] ?? 0;
  const comprada = seleccion.nivel < actual;
  const anteriorOk = seleccion.nivel === actual;
  const nivelOk = perfil.nivel >= paso.nivel;
  const monedasOk = perfil.monedas >= paso.precio;
  const disponible = !comprada && anteriorOk && nivelOk;

  const requisitos = [
    { ok: nivelOk, texto: `Nivel ${paso.nivel} (tienes ${perfil.nivel})` },
    {
      ok: comprada || anteriorOk,
      texto: seleccion.nivel > 0 ? `Necesita «${rama.niveles[seleccion.nivel - 1].nombre}»` : "Sin mejoras previas",
    },
    { ok: comprada || monedasOk, texto: `${miles(paso.precio)} monedas (tienes ${miles(perfil.monedas)})` },
  ];

  let textoBoton = `Comprar · ${miles(paso.precio)}`;
  let activo = true;
  if (comprada) {
    textoBoton = "✓ Comprada";
    activo = false;
  } else if (!anteriorOk) {
    textoBoton = "Bloqueada";
    activo = false;
  } else if (!nivelOk) {
    textoBoton = `Necesitas el nivel ${paso.nivel}`;
    activo = false;
  } else if (!monedasOk) {
    textoBoton = "Te faltan monedas";
    activo = false;
  }

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Mejoras del armario</h1>
        <span className={styles.resumen}>{compradas} de 15 mejoras compradas</span>
      </div>

      <div className={styles.desafios}>
        <section className={styles.tarjeta} style={marco("panel", "var(--u)")} aria-label="Árbol de mejoras">
          <p className={styles.subtitulo}>Armario básico</p>
          {RAMAS.map((r, i) => (
            <div key={r.id} className={styles.ramaMejoras}>
              <span className={styles.ramaIcono}>
                <Icono id={r.icono} k={2} />
                <strong>{r.nombre}</strong>
              </span>
              <div className={styles.nivelesMejora}>
                {r.niveles.map((n, j) => {
                  const lvl = mejoras[r.id] ?? 0;
                  const hecha = j < lvl;
                  const libre = !hecha && j === lvl && perfil.nivel >= n.nivel;
                  const elegido = seleccion.rama === i && seleccion.nivel === j;
                  return (
                    <button
                      key={n.nombre}
                      type="button"
                      className={`${styles.nodoMejora} ${elegido ? styles.nodoElegido : ""}`}
                      style={marco(hecha ? "boton" : libre ? "dorado" : "apagado", "var(--u)")}
                      aria-pressed={elegido}
                      aria-label={`${r.nombre} ${ROMANOS[j]}: ${n.nombre}`}
                      onClick={() => setSeleccion({ rama: i, nivel: j })}
                    >
                      <strong>{hecha ? "✓" : ROMANOS[j]}</strong>
                      <span>{miles(n.precio)}</span>
                      <span>Nv. {n.nivel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <section className={styles.tarjeta} style={marco("panel", "var(--u)")} aria-label={paso.nombre}>
          <div className={styles.desafioCabeza}>
            <p className={styles.subtitulo}>
              {rama.nombre} {ROMANOS[seleccion.nivel]} · {paso.nombre}
              <span>{comprada ? "Comprada" : disponible ? "Disponible" : "Bloqueada"}</span>
            </p>
            <p className={styles.pequeno}>{paso.texto}</p>
          </div>
          <p className={styles.subtitulo}>Requisitos</p>
          <ul className={styles.requisitos}>
            {requisitos.map((r) => (
              <li key={r.texto}>
                <span style={{ color: r.ok ? "#1d6630" : "#b9512a" }}>{r.ok ? "✓" : "✗"}</span> {r.texto}
              </li>
            ))}
          </ul>
          <p className={styles.nota}>
            <IconoProgresion celda={[3, 0]} tamano={16} k={1} /> Las mejoras no valen en los desafíos.
          </p>
          <button
            type="button"
            className={styles.accion}
            style={marco(activo ? "boton" : "boton_desactivado", "var(--u)")}
            disabled={ocupado || !activo}
            onClick={() => alComprar(rama.id)}
          >
            {textoBoton}
          </button>
        </section>
      </div>
    </div>
  );
}
