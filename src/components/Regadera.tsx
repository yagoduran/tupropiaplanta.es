"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import styles from "./juego.module.css";

const TAM = 32;
const ESCENA_W = 96;
const ESCENA_H = 80;
/** Zona de la planta en la escena (unidades de la rejilla de 96x80). */
const PLANTA = { x0: 24, x1: 72, y1: 44 };
const DURACION_MS = 1400;
const INICIO = { x: 4, y: 6 };
const SOBRE_LA_PLANTA = { x: 26, y: 8 };

interface Props {
  alTerminar: () => void;
  alCancelar: () => void;
}

/** Regadera que se arrastra sobre la planta: al regar un instante llena la barra y ejecuta el riego. */
export function Regadera({ alTerminar, alCancelar }: Props) {
  const [pos, setPos] = useState(INICIO);
  const [progreso, setProgreso] = useState(0);
  const [auto, setAuto] = useState(false);
  const arrastre = useRef<{ dx: number; dy: number; movido: boolean } | null>(null);
  const acabado = useRef(false);

  // El pico está a la derecha de la regadera: ahí caen las gotas.
  const picoX = pos.x + 28;
  const encima = auto || (picoX >= PLANTA.x0 && picoX <= PLANTA.x1 && pos.y <= PLANTA.y1);

  useEffect(() => {
    if (!encima) return;
    let anterior = performance.now();
    let id = 0;
    const paso = (ahora: number) => {
      const dt = ahora - anterior;
      anterior = ahora;
      setProgreso((p) => Math.min(1, p + dt / DURACION_MS));
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [encima]);

  useEffect(() => {
    if (progreso < 1 || acabado.current) return;
    acabado.current = true;
    alTerminar();
  }, [progreso, alTerminar]);

  useEffect(() => {
    const tecla = (e: globalThis.KeyboardEvent) => e.key === "Escape" && alCancelar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [alCancelar]);

  const aUnidades = (e: PointerEvent<HTMLElement>) => {
    const caja = e.currentTarget.parentElement!.getBoundingClientRect();
    return {
      x: ((e.clientX - caja.left) / caja.width) * ESCENA_W,
      y: ((e.clientY - caja.top) / caja.height) * ESCENA_H,
    };
  };

  const empezar = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = aUnidades(e);
    arrastre.current = { dx: p.x - pos.x, dy: p.y - pos.y, movido: false };
  };

  const mover = (e: PointerEvent<HTMLDivElement>) => {
    const a = arrastre.current;
    if (!a) return;
    const p = aUnidades(e);
    const x = Math.min(ESCENA_W - TAM, Math.max(0, p.x - a.dx));
    const y = Math.min(ESCENA_H - TAM, Math.max(0, p.y - a.dy));
    if (Math.abs(x - pos.x) + Math.abs(y - pos.y) > 0.5) a.movido = true;
    setPos({ x, y });
  };

  const soltar = () => {
    // Un toque sin arrastrar la lleva sola sobre la planta.
    if (arrastre.current && !arrastre.current.movido) {
      setPos(SOBRE_LA_PLANTA);
      setAuto(true);
    }
    arrastre.current = null;
  };

  const teclado = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    setPos(SOBRE_LA_PLANTA);
    setAuto(true);
  };

  const columna = !encima ? 0 : progreso < 0.5 ? 1 : 2;

  return (
    <>
      <div
        className={`pixel ${styles.regadera}`}
        role="button"
        tabIndex={0}
        aria-label="Regadera: arrástrala sobre la planta o pulsa Intro para regar"
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onKeyDown={teclado}
        data-encima={encima}
        style={{
          left: `calc(${pos.x}px * var(--s))`,
          top: `calc(${pos.y}px * var(--s))`,
          backgroundPosition: `calc(${-columna * TAM}px * var(--s)) 0`,
        }}
      >
        {columna > 0 &&
          [0, 1, 2].map((i) => (
            <span
              key={i}
              className={`pixel ${styles.gota}`}
              style={{ animationDelay: `${i * 0.18}s`, left: `calc(${22 + i * 2}px * var(--s))` }}
            />
          ))}
      </div>
      <div className={styles.barraRiego} role="progressbar" aria-valuenow={Math.round(progreso * 100)}>
        <span style={{ width: `${progreso * 100}%` }} />
      </div>
      <button type="button" className={styles.cancelarRiego} onClick={alCancelar} aria-label="Cancelar riego">
        ✕
      </button>
    </>
  );
}
