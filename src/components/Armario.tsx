"use client";

import { useState } from "react";
import {
  avisosArmario,
  ICONO_ARMARIO,
  NOMBRE_LUZ,
  TEXTO_OLOR,
  type EstadoArmario,
  type IdIconoArmario,
} from "@/lib/armario";
import { RAMAS, ROMANOS } from "@/lib/casa";
import { marco } from "@/lib/diseno";
import type { PerfilJuego } from "@/lib/juego";
import { ArmarioEscena } from "./ArmarioEscena";
import { Icono } from "./Icono";
import { IconoProgresion } from "./IconoProgresion";
import a from "./armario.module.css";
import styles from "./progresion.module.css";

type Sitio = PerfilJuego["huecos"]["lista"][number];

interface Props {
  perfil: PerfilJuego;
  estado: EstadoArmario | null;
  ocupado: boolean;
  alComprar: (rama: string) => void;
  alAccion: (accion: string, valor: string) => void;
  alPulsarSitio: (s: Sitio) => void;
}

function IconoArm({ id }: { id: IdIconoArmario }) {
  return <span className={a.icono} style={{ backgroundPosition: `${-ICONO_ARMARIO[id] * 16}px 0` }} aria-hidden />;
}

const miles = (n: number) => n.toLocaleString("es-ES", { useGrouping: "always" });

/** Armario de cultivo: escena, clima, equipo y mejoras que se compran con monedas. */
export function Armario({ perfil, estado, ocupado, alComprar, alAccion, alPulsarSitio }: Props) {
  const [aviso, setAviso] = useState(0);
  const [seleccion, setSeleccion] = useState<{ rama: number; nivel: number }>({ rama: 0, nivel: 0 });
  const mejoras = perfil.casa.mejoras;
  const compradas = RAMAS.reduce((suma, r) => suma + (mejoras[r.id] ?? 0), 0);

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

  const panel = marco("panel", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");
  const dorado = marco("dorado", "var(--u)");
  const apagado = marco("boton_desactivado", "var(--u)");
  const sitios = perfil.huecos.lista.filter((x) => x.habitacion === "armario").sort((p, q) => p.sitio - q.sitio);
  const avisos = estado ? avisosArmario(estado, sitios.filter((x) => x.vida === "viva" && x.plaga).length) : [];
  const avisoAhora = avisos.length > 0 ? avisos[aviso % avisos.length] : null;
  const c = estado?.clima;

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Armario de cultivo</h1>
        <span className={styles.resumen}>
          {compradas} de {RAMAS.reduce((suma, r) => suma + r.niveles.length, 0)} mejoras compradas
        </span>
      </div>

      {estado && (
        <>
          {avisoAhora && (
            <div className={a.aviso} role="status">
              <IconoArm id="aviso" />
              <span>{avisoAhora}</span>
              <span className={a.avisoCuenta}>
                {(aviso % avisos.length) + 1} de {avisos.length}
              </span>
              {avisos.length > 1 && (
                <button type="button" className={a.avisoBoton} onClick={() => setAviso((v) => v + 1)}>
                  Siguiente
                </button>
              )}
            </div>
          )}

          <ArmarioEscena estado={estado} sitios={sitios} maceta={perfil.equipo.maceta} alPulsar={alPulsarSitio} />

          {c && (
            <div className={a.estadisticas}>
              {(
                [
                  ["temperatura", "Temperatura", `${c.temp} °C`, c.calor || c.frio],
                  ["humedad", "Humedad", `${c.hum} %`, c.humedo],
                  ["olor", "Olor", TEXTO_OLOR[c.olor], c.olor >= 2],
                  ["consumo", "Consumo", `${c.w} W`, false],
                  ["bonus", "Crecimiento", `${c.crec >= 0 ? "+" : ""}${c.crec} %`, c.crec < 0],
                  ["capacidad", "Huecos", `${sitios.length} de ${estado.cap}`, false],
                ] as [IdIconoArmario, string, string, boolean][]
              ).map(([id, nombre, valor, mal]) => (
                <div key={nombre} className={a.dato} style={panel}>
                  <span className={a.datoCab}>
                    <IconoArm id={id} />
                    {nombre}
                  </span>
                  <span className={`${a.datoValor} ${mal ? a.datoMal : ""}`}>{valor}</span>
                </div>
              ))}
            </div>
          )}

          <div className={a.equipo}>
            <section className={a.tarjeta} style={panel} aria-label="Equipo">
              <p className={a.subtitulo}>Equipo</p>
              <div className={a.interruptores}>
                {(
                  [
                    [
                      "luz",
                      `Luz: ${estado.luz_on ? "encendida" : "apagada"}`,
                      estado.luz_on ? "off" : "on",
                      estado.luz_on,
                    ],
                    [
                      "extractor",
                      `Extractor: ${estado.ext_on ? "encendido" : "apagado"}`,
                      estado.ext_on ? "off" : "on",
                      estado.ext_on,
                    ],
                    [
                      "ventilador",
                      `Ventilador: ${estado.vent_on ? "encendido" : "apagado"}`,
                      estado.vent_on ? "off" : "on",
                      estado.vent_on,
                    ],
                    [
                      "puertas",
                      estado.puertas === "cerradas" ? "Puertas cerradas" : "Puertas abiertas",
                      estado.puertas === "cerradas" ? "abiertas" : "cerradas",
                      estado.puertas === "cerradas",
                    ],
                  ] as [string, string, string, boolean][]
                ).map(([accion, texto, valor, activo]) => (
                  <button
                    key={accion}
                    type="button"
                    className={a.interruptor}
                    style={activo ? boton : secundario}
                    disabled={ocupado}
                    onClick={() => alAccion(accion, valor)}
                  >
                    {texto}
                  </button>
                ))}
              </div>
              <p className={a.subtitulo}>Ciclo de luz</p>
              <div className={a.interruptores}>
                {(["18/6", "12/12"] as const).map((ciclo) => (
                  <button
                    key={ciclo}
                    type="button"
                    className={a.interruptor}
                    style={estado.ciclo === ciclo ? dorado : secundario}
                    aria-pressed={estado.ciclo === ciclo}
                    disabled={ocupado}
                    onClick={() => alAccion("ciclo", ciclo)}
                  >
                    {ciclo === "18/6" ? "18/6 · crecimiento" : "12/12 · floración"}
                  </button>
                ))}
              </div>
            </section>

            <section className={a.tarjeta} style={panel} aria-label="Luces">
              <p className={a.subtitulo}>Luces</p>
              <ul className={a.luces}>
                {estado.luces.map((l, i) => {
                  const falta = !l.tengo && perfil.monedas < l.precio;
                  return (
                    <li key={l.id} className={a.luzFila}>
                      <span className={a.luzMiniatura}>
                        <span style={{ backgroundPosition: `${-64}px ${-i * 64}px` }} />
                      </span>
                      <span className={a.luzNombre}>
                        <strong>{NOMBRE_LUZ[l.id]}</strong>
                        <span>
                          {l.w} W · {l.bonus > 0 ? `+${l.bonus} % crecimiento` : "sin bono"} · calor {l.calor}
                        </span>
                      </span>
                      <button
                        type="button"
                        className={a.luzBoton}
                        style={l.puesta ? apagado : l.tengo ? boton : falta ? apagado : dorado}
                        disabled={ocupado || l.puesta || falta}
                        onClick={() => alAccion(l.tengo ? "luz_equipar" : "luz_comprar", l.id)}
                      >
                        {l.puesta
                          ? "✓ Puesta"
                          : l.tengo
                            ? "Poner"
                            : falta
                              ? "Te faltan monedas"
                              : `Comprar · ${miles(l.precio)}`}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </>
      )}

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
