"use client";

import { useState } from "react";
import { HABITACIONES, HABITACION_POR_ID } from "@/lib/casa";
import { marco } from "@/lib/diseno";
import type { PerfilJuego } from "@/lib/juego";
import { IconoProgresion } from "./IconoProgresion";
import styles from "./progresion.module.css";

interface Props {
  perfil: PerfilJuego;
  ocupado: boolean;
  alComprar: (id: string) => void;
  alElegir: (id: string) => void;
}

const miles = (n: number) => n.toLocaleString("es-ES", { useGrouping: "always" });

/** Habitaciones: cada una trae más macetas y un bono, y cambia el fondo del cultivo. */
export function Habitaciones({ perfil, ocupado, alComprar, alElegir }: Props) {
  const [elegida, setElegida] = useState(perfil.casa.habitacion);
  const { habitaciones, habitacion: actual } = perfil.casa;
  const h = HABITACION_POR_ID[elegida] ?? HABITACIONES[0];
  const mia = habitaciones.includes(h.id);
  const nivelOk = perfil.nivel >= h.nivel;
  const monedasOk = perfil.monedas >= h.precio;

  let texto = `Desbloquear · ${miles(h.precio)}`;
  let activo = !ocupado;
  let accion = () => alComprar(h.id);
  if (mia && h.id === actual) {
    texto = "Estás aquí";
    activo = false;
  } else if (mia) {
    texto = "Ir a esta habitación";
    accion = () => alElegir(h.id);
  } else if (h.bloqueada) {
    texto = "Bloqueada";
    activo = false;
  } else if (!nivelOk) {
    texto = `Necesitas el nivel ${h.nivel}`;
    activo = false;
  } else if (!monedasOk) {
    texto = "Te faltan monedas";
    activo = false;
  }

  const requisitos = mia
    ? []
    : [
        { ok: nivelOk, texto: `Nivel ${h.nivel} (tienes ${perfil.nivel})` },
        { ok: monedasOk, texto: `${miles(h.precio)} monedas (tienes ${miles(perfil.monedas)})` },
        ...(h.bloqueada ? [{ ok: false, texto: h.bloqueada }] : []),
      ];

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Habitaciones y expansión</h1>
        <span className={styles.resumen}>
          Tienes {habitaciones.length} de {HABITACIONES.length} habitaciones · {perfil.huecos.desbloqueados} huecos de
          cultivo
        </span>
      </div>

      <div className={styles.desafios}>
        <div className={styles.listaDesafios}>
          {HABITACIONES.map((r) => {
            const mio = habitaciones.includes(r.id);
            const disponible = !mio && !r.bloqueada && perfil.nivel >= r.nivel;
            return (
              <button
                key={r.id}
                type="button"
                className={styles.desafio}
                style={marco(
                  r.id === elegida ? "dorado" : mio ? "tarjeta" : disponible ? "tarjeta" : "apagado",
                  "var(--u)",
                )}
                aria-pressed={r.id === elegida}
                onClick={() => setElegida(r.id)}
              >
                <IconoProgresion celda={mio || disponible ? [1, 1] : [2, 1]} k={1.5} />
                <span className={styles.desafioTexto}>
                  <strong>{r.nombre}</strong>
                  <span>
                    {r.piso} · {r.macetas} macetas
                  </span>
                  <span className={styles.desafioPie}>
                    {r.id === actual
                      ? "Estás aquí"
                      : mio
                        ? "Ya es tuya"
                        : `${miles(r.precio)} monedas · Nv. ${r.nivel}`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <section className={styles.tarjeta} style={marco("panel", "var(--u)")} aria-label={h.nombre}>
          <p className={styles.subtitulo}>
            {h.nombre}
            <span>
              {mia ? (h.id === actual ? "Estás aquí" : "Desbloqueada") : h.bloqueada ? "Bloqueada" : "Disponible"}
            </span>
          </p>
          <span
            className={`pixel ${styles.escenaMini}`}
            role="img"
            aria-label={`Vista de ${h.nombre}`}
            style={{
              backgroundImage: `url(${h.escena ?? "/assets/escena/escena-dia-1x.png"})`,
              opacity: mia || !h.bloqueada ? 1 : 0.5,
            }}
          />
          <p className={styles.pequeno}>{h.descripcion}</p>
          <p className={styles.pequeno}>
            <strong>Huecos de cultivo:</strong> {h.macetas}
          </p>
          {requisitos.length > 0 && (
            <>
              <p className={styles.subtitulo}>Requisitos</p>
              <ul className={styles.requisitos}>
                {requisitos.map((r) => (
                  <li key={r.texto}>
                    <span style={{ color: r.ok ? "#1d6630" : "#b9512a" }}>{r.ok ? "✓" : "✗"}</span> {r.texto}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className={styles.nota}>
            Tus huecos son los de la habitación más grande que tengas, más la mejora de Capacidad. La habitación en la
            que estás da su bono a todas tus plantas.
          </p>
          <button
            type="button"
            className={styles.accion}
            style={marco(activo ? "boton" : "boton_desactivado", "var(--u)")}
            disabled={!activo}
            onClick={accion}
          >
            {texto}
          </button>
        </section>
      </div>
    </div>
  );
}
