"use client";

import { useState } from "react";
import { marco } from "@/lib/diseno";
import type { IdIcono } from "@/lib/diseno";
import type { TipoSemilla } from "@/lib/juego";
import { Icono } from "./Icono";
import styles from "./cicloluz.module.css";

interface Props {
  horas: number;
  inicio: number;
  /** Tipo y fase de la planta viva, para dar el consejo que toca. */
  tipo: TipoSemilla | null;
  fase: number | null;
  ocupado: boolean;
  aviso?: { texto: string; icono: IdIcono } | null;
  alGuardar: (horas: number, inicio: number) => void;
}

const dosCifras = (n: number) => String(n).padStart(2, "0");

/** Horas (0 a 23) en las que la luz está encendida con un horario dado. */
const encendida = (hora: number, horas: number, inicio: number) => (hora - inicio + 24) % 24 < horas;

function consejo(tipo: TipoSemilla | null, fase: number | null, horas: number): string {
  if (!tipo || !fase) return "Planta una semilla para ver qué ciclo necesita.";
  if (tipo === "auto" || tipo === "autofem")
    return "Tu autofloreciente no depende del ciclo de luz: con 18 horas va bien.";
  if (fase <= 2) return "De semilla a plántula, la luz importa poco.";
  if (fase <= 5)
    return horas >= 16
      ? "Perfecto para crecer: 18 horas de luz y 6 de oscuridad."
      : "Para crecer, ponle 18 horas de luz.";
  return horas >= 11 && horas <= 13
    ? "Perfecto para florecer: 12 horas de luz y 12 de oscuridad."
    : "Estás en floración: pon 12 horas de luz o la planta se estresa.";
}

export function CicloLuz({ horas, inicio, tipo, fase, ocupado, aviso, alGuardar }: Props) {
  const [h, setH] = useState(horas);
  const [i, setI] = useState(inicio);
  const tarjeta = marco("tarjeta", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const apagado = marco("boton_desactivado", "var(--u)");
  const cambiado = h !== horas || i !== inicio;
  const activo = cambiado && !ocupado;

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Ciclo de luz</h1>
        {aviso && (
          <p className={styles.aviso} role="status">
            <Icono id={aviso.icono} />
            <span>{aviso.texto}</span>
          </p>
        )}
      </div>
      <p className={styles.ayuda}>
        Elige cuántas horas está encendida la luz y a qué hora se enciende (hora de España). Para crecer, 18 horas de
        luz y 6 de oscuridad. Para florecer, 12 y 12. Si rompes el ciclo en floración, la planta se estresa.
      </p>
      <section className={styles.panel} style={tarjeta}>
        <div className={styles.dia} role="img" aria-label={`Luz encendida ${h} horas desde las ${dosCifras(i)}:00`}>
          {Array.from({ length: 24 }, (_, hora) => (
            <span
              key={hora}
              className={encendida(hora, h, i) ? styles.dia_luz : styles.dia_noche}
              title={`${dosCifras(hora)}:00`}
            />
          ))}
        </div>
        <p className={styles.leyenda}>
          Luz de las {dosCifras(i)}:00 a las {dosCifras((i + h) % 24)}:00 · {h} h de luz y {24 - h} h de oscuridad
        </p>
        <label className={styles.campo}>
          <span>Horas de luz: {h}</span>
          <input type="range" min={8} max={24} value={h} onChange={(e) => setH(Number(e.target.value))} />
        </label>
        <label className={styles.campo}>
          <span>Se enciende a las {dosCifras(i)}:00</span>
          <input type="range" min={0} max={23} value={i} onChange={(e) => setI(Number(e.target.value))} />
        </label>
        <div className={styles.atajos}>
          <button type="button" className={styles.atajo} onClick={() => setH(18)}>
            18/6 · Crecimiento
          </button>
          <button type="button" className={styles.atajo} onClick={() => setH(12)}>
            12/12 · Floración
          </button>
        </div>
        <p className={styles.consejo}>{consejo(tipo, fase, h)}</p>
        <button
          type="button"
          className={styles.guardar}
          style={{ ...(activo ? boton : apagado), color: activo ? "#1c1626" : "#4b3a5e" }}
          disabled={!activo}
          onClick={() => alGuardar(h, i)}
        >
          Guardar horario
        </button>
      </section>
    </div>
  );
}
