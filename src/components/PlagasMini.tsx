"use client";

import { useEffect, useState } from "react";
import type { PlagaJuego, TipoPlaga } from "@/lib/plagas";
import styles from "./juego.module.css";

/** Fila de cada bicho en la hoja de plagas pequeñas (celdas de 8 × 8). El moho no es un bicho: usa su propio dibujo. */
const FILA_BICHO: Partial<Record<TipoPlaga, number>> = { pulgon: 0, arana: 1, mosca: 2, caracol: 3, oruga: 4 };

const TICK_MS = 83;
const PASO = 0.35;
const COMER = 24;

/** Rutas por el tallo y las hojas, en píxeles de arte de la planta (celda de 64 × 64). Pisan el suelo con los pies. */
const RUTAS: { x: number; y: number }[][] = [
  [
    { x: 30, y: 56 },
    { x: 30, y: 40 },
    { x: 22, y: 36 },
    { x: 14, y: 38 },
  ],
  [
    { x: 34, y: 50 },
    { x: 44, y: 44 },
    { x: 52, y: 42 },
  ],
  [
    { x: 30, y: 44 },
    { x: 40, y: 34 },
    { x: 46, y: 30 },
  ],
];

/** Reloj de las animaciones; se queda parado en la pestaña oculta o si el jugador pidió menos movimiento. */
function useReloj(): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (!document.hidden) setT((v) => v + 1);
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);
  return t;
}

function andar(ruta: (typeof RUTAS)[number], t: number) {
  const tramos: { a: (typeof ruta)[number]; b: (typeof ruta)[number]; d: number }[] = [];
  let total = 0;
  for (let i = 0; i < ruta.length - 1; i++) {
    const d = Math.hypot(ruta[i + 1].x - ruta[i].x, ruta[i + 1].y - ruta[i].y);
    tramos.push({ a: ruta[i], b: ruta[i + 1], d });
    total += d;
  }
  const ida = total / PASO;
  const ciclo = ida * 2 + COMER * 2;
  const u = t % ciclo;
  let dist = 0;
  let dir = 1;
  let modo: "andar" | "comer" | "quieta" = "andar";
  if (u < ida) dist = u * PASO;
  else if (u < ida + COMER) {
    dist = total;
    modo = "comer";
  } else if (u < ida * 2 + COMER) {
    dist = total - (u - ida - COMER) * PASO;
    dir = -1;
  } else {
    dist = 0;
    modo = "quieta";
    dir = -1;
  }
  let acc = 0;
  let x = ruta[0].x;
  let y = ruta[0].y;
  let espejo = 1;
  for (const { a, b, d } of tramos) {
    if (dist <= acc + d) {
      const k = (dist - acc) / d;
      x = a.x + (b.x - a.x) * k;
      y = a.y + (b.y - a.y) * k;
      espejo = (b.x - a.x) * dir >= 0 ? 1 : -1;
      break;
    }
    acc += d;
    x = b.x;
    y = b.y;
  }
  return { x, y, espejo, modo };
}

/** Bichos de 8 × 8 que pasean por la planta. Como mucho 3 a la vista; con plaga grave salen los 3. */
export function Bichos({ plaga }: { plaga: PlagaJuego }) {
  const t = useReloj();
  const fila = FILA_BICHO[plaga.tipo] ?? 0;
  const cuantos = plaga.grave ? 3 : 2;
  const caminar = Math.floor(t / 1.5) % 4;
  const lento = Math.floor(t / 3) % 2;
  return (
    <>
      {RUTAS.slice(0, cuantos).map((ruta, i) => {
        const b = andar(ruta, t + i * 37);
        const col = b.modo === "andar" ? caminar : b.modo === "comer" ? 4 + lento : 6 + lento;
        return (
          <span
            key={i}
            className={`pixel ${styles.bicho}`}
            aria-hidden
            style={{
              left: `calc(${Math.round(32 + (b.x - 32) * 0.55 - 4) + 16}px * var(--s))`,
              top: `calc(${Math.round(b.y - 7) + 8 - 11}px * var(--s))`,
              backgroundSize: `calc(64px * var(--s)) calc(48px * var(--s))`,
              backgroundPosition: `calc(${-col * 8}px * var(--s)) calc(${-fila * 8}px * var(--s))`,
              transform: `scaleX(${b.espejo})`,
            }}
          />
        );
      })}
    </>
  );
}

/** Marca de 16 × 16 arriba a la derecha de la planta: amarilla si es leve, roja y parpadeando si es grave. */
export function IndicadorPlaga({ plaga }: { plaga: PlagaJuego }) {
  const t = useReloj();
  const nivel = plaga.grave ? 2 : 0;
  const cuadro = nivel === 2 ? Math.floor(t / 3) % 2 : 0;
  return (
    <span
      className={`pixel ${styles.indicadorPlaga}`}
      role="img"
      aria-label={plaga.grave ? "Plaga grave" : "Plaga leve"}
      style={{
        backgroundSize: `calc(32px * var(--s)) calc(48px * var(--s))`,
        backgroundPosition: `calc(${-cuadro * 16}px * var(--s)) calc(${-nivel * 16}px * var(--s))`,
      }}
    />
  );
}

const FX_TICKS = 40;

/** Rociado, plaga que desaparece y hojas curadas: tres efectos de 16 × 16 con 6 fotogramas a 12 fps. */
export function EfectoTratamiento({ alTerminar }: { alTerminar: () => void }) {
  const t = useReloj();
  useEffect(() => {
    const id = setTimeout(alTerminar, FX_TICKS * TICK_MS);
    return () => clearTimeout(id);
  }, [alTerminar]);

  const celda = (fila: number, cuadro: number, x: number, y: number) => (
    <span
      key={`${fila}-${x}-${y}`}
      className={`pixel ${styles.efectoTrat}`}
      aria-hidden
      style={{
        left: `calc(${x}px * var(--s))`,
        top: `calc(${y}px * var(--s))`,
        backgroundSize: `calc(96px * var(--s)) calc(48px * var(--s))`,
        backgroundPosition: `calc(${-Math.min(5, cuadro) * 16}px * var(--s)) calc(${-fila * 16}px * var(--s))`,
      }}
    />
  );

  if (t < 8) return celda(0, t, 26, 44);
  if (t < 16) return <>{RUTAS.map((r) => celda(1, t - 8, r[0].x + 8, r[0].y - 12))}</>;
  if (t < FX_TICKS)
    return (
      <>
        {[
          [32, 18],
          [46, 10],
          [24, 30],
        ].map(([x, y]) => celda(2, Math.floor((t - 16) / 2), x, y))}
      </>
    );
  return null;
}
