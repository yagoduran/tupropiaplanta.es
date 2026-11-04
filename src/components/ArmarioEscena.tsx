"use client";

import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { FILA_LUZ_ARMARIO, type EstadoArmario } from "@/lib/armario";
import type { PerfilJuego } from "@/lib/juego";
import { hojaDe } from "@/lib/variedades";
import { hojaMaceta } from "./Planta";
import styles from "./armario.module.css";

type Sitio = PerfilJuego["huecos"]["lista"][number];

const RUTA = "/assets/armario/tpp-armario-";
const px = (v: number) => `calc(${v}px * var(--k))`;

/** Trozo de una hoja de sprites de celda cuadrada, colocado en (x, y) en píxeles de arte. */
function sprite(hoja: string, ancho: number, alto: number, celda: number, col: number, fila: number): CSSProperties {
  return {
    width: px(celda),
    height: px(celda),
    backgroundImage: `url(${RUTA}${hoja}-1x.png)`,
    backgroundSize: `${px(ancho)} ${px(alto)}`,
    backgroundPosition: `${px(-col * celda)} ${px(-fila * celda)}`,
  };
}

const suscribirMovil = (cb: () => void) => {
  const m = window.matchMedia("(max-width: 1039px)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const esMovil = () => window.matchMedia("(max-width: 1039px)").matches;

interface Props {
  estado: EstadoArmario;
  sitios: Sitio[];
  maceta: string;
  alPulsar: (s: Sitio) => void;
}

/** El armario dibujado con las capas del diseño: pared, luces, equipo, plantas, tinte, efectos y puertas. */
export function ArmarioEscena({ estado, sitios, maceta, alPulsar }: Props) {
  const movil = useSyncExternalStore(suscribirMovil, esMovil, () => false);
  const [t, setT] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setT((n) => n + 1), 240);
    return () => clearInterval(id);
  }, []);

  const n = Math.max(3, Math.min(6, sitios.length));
  const porBalda = movil && n > 3 ? 3 : n;
  const baldas = Math.ceil(n / porBalda);
  const anchoInt = 48 * porBalda;
  const ancho = 32 + anchoInt;
  const alto = 32 + 16 + 112 * baldas + 16;
  const pot = hojaMaceta(maceta);
  const f4 = t % 4;
  const f3 = t % 3;
  const f2 = t % 2;

  const cerradas = estado.puertas === "cerradas";
  const floracion = estado.ciclo === "12/12";
  const filaLuz = FILA_LUZ_ARMARIO[estado.luz];
  const turbo = estado.mejoras.ext >= 2;
  const luzOn = estado.luz_on;

  const tinte = !luzOn
    ? "rgba(10,8,24,0.7)"
    : estado.clima.calor
      ? "rgba(214,60,40,0.16)"
      : floracion
        ? "rgba(240,170,60,0.22)"
        : "rgba(90,140,230,0.14)";

  // Centros de las lámparas en la primera (y cada) balda.
  const lamparas = estado.lamparas >= 2 ? [anchoInt * 0.27, anchoInt * 0.73] : [anchoInt / 2];

  return (
    <div
      className={styles.escena}
      style={{ width: px(ancho), height: px(alto) }}
      role="group"
      aria-label="Armario de cultivo"
    >
      {/* Techo: temporizador, extractor y filtro */}
      <div
        className={`pixel ${styles.pieza}`}
        style={{ ...sprite("equipo-32", 128, 128, 32, floracion ? 2 : 1, 0), left: px(16), top: 0 }}
        title={`Temporizador ${estado.ciclo}`}
      />
      <div
        className={`pixel ${styles.pieza}`}
        style={{
          ...sprite("equipo-32", 128, 128, 32, estado.ext_on ? f2 : 2, turbo ? 3 : 2),
          left: px(ancho - 52),
          top: 0,
        }}
        title="Extractor"
      />
      {estado.mejoras.ext >= 1 && (
        <div
          className={`pixel ${styles.pieza}`}
          style={{ ...sprite("equipo-32", 128, 128, 32, 3, 2), left: px(ancho - 84), top: 0 }}
          title="Filtro de carbón"
        />
      )}
      {estado.clima.olor > 0 && (
        <div
          className={`pixel ${styles.pieza}`}
          style={{ ...sprite("efectos-16", 64, 96, 16, f4, estado.clima.olor - 1), left: px(ancho - 44), top: px(14) }}
          aria-hidden
        />
      )}

      {/* Cuerpo */}
      <div className={styles.cuerpo} style={{ top: px(32), height: px(alto - 32) }}>
        <div className={styles.interior} style={{ width: px(anchoInt), height: px(112 * baldas) }}>
          {Array.from({ length: baldas }, (_, b) => (
            <div key={b} className={styles.balda} style={{ top: px(112 * b), height: px(112), width: px(anchoInt) }}>
              {lamparas.map((cx) => (
                <div
                  key={cx}
                  className={`pixel ${styles.pieza}`}
                  style={{
                    ...sprite("luces-64", 192, 256, 64, luzOn ? (floracion ? 2 : 1) : 0, filaLuz),
                    left: px(cx - 32),
                    top: 0,
                    opacity: luzOn ? 0.9 : 1,
                  }}
                  aria-hidden
                />
              ))}
              {b === 0 && (
                <>
                  <div
                    className={`pixel ${styles.pieza}`}
                    style={{ ...sprite("equipo-32", 128, 128, 32, 0, 0), left: px(2), top: px(-4) }}
                    aria-hidden
                  />
                  <span className={styles.lectura} style={{ left: px(6), top: px(2) }}>
                    {estado.clima.temp}°
                  </span>
                  <div
                    className={`pixel ${styles.pieza}`}
                    style={{
                      ...sprite("equipo-32", 128, 128, 32, estado.vent_on ? f3 : 3, 1),
                      left: px(anchoInt - 34),
                      top: px(-2),
                    }}
                    title="Ventilador"
                  />
                </>
              )}
              <div className={styles.bandeja} style={{ top: px(100), height: px(12) }} />
            </div>
          ))}

          {Array.from({ length: n }, (_, i) => {
            const b = Math.floor(i / porBalda);
            const j = i % porBalda;
            const cx = 24 + 48 * j;
            const s = sitios.find((x) => x.sitio === i + 1);
            const viva = s?.vida === "viva";
            const y0 = 112 * b;
            return (
              <div key={i}>
                {viva && s && (
                  <>
                    <span
                      className={`pixel ${styles.pieza}`}
                      style={{
                        width: px(64),
                        height: px(64),
                        left: px(cx - 32),
                        top: px(y0 + 28),
                        backgroundImage: `url(/assets/sprites/tpp-variedad-${hojaDe(s.variedad ?? "")}-1x.png)`,
                        backgroundSize: "600% 800%",
                        backgroundPosition: `${(f4 / 5) * 100}% ${(((s.fase ?? 1) - 1) / 7) * 100}%`,
                      }}
                    />
                    <span
                      className={`pixel ${styles.pieza}`}
                      style={{
                        width: px(64),
                        height: px(64),
                        left: px(cx - 32),
                        top: px(y0 + 46),
                        backgroundImage: `url(${pot.src})`,
                        backgroundSize: `${pot.columnas * 100}% 100%`,
                        backgroundPosition: `${(pot.columna / (pot.columnas - 1)) * 100}% 0`,
                      }}
                    />
                  </>
                )}
                {!viva && (
                  <span
                    className={`pixel ${styles.pieza}`}
                    style={{ ...sprite("ranuras-16", 64, 16, 16, s ? 0 : 3, 0), left: px(cx - 8), top: px(y0 + 92) }}
                    aria-hidden
                  />
                )}
                {s && s.plaga && viva && (
                  <span className={styles.plaga} style={{ left: px(cx + 6), top: px(y0 + 22) }} aria-hidden>
                    !
                  </span>
                )}
                <button
                  type="button"
                  className={styles.ranura}
                  style={{ left: px(48 * j), top: px(y0), width: px(48), height: px(112) }}
                  disabled={!s || cerradas}
                  onClick={() => s && alPulsar(s)}
                  aria-label={
                    !s ? `Hueco ${i + 1} bloqueado` : viva ? `Planta del hueco ${i + 1}` : `Hueco ${i + 1} libre`
                  }
                />
              </div>
            );
          })}

          <div className={styles.tinte} style={{ background: tinte }} />
          {estado.clima.calor &&
            [0.2, 0.55, 0.85].map((x) => (
              <div
                key={x}
                className={`pixel ${styles.pieza}`}
                style={{ ...sprite("efectos-16", 64, 96, 16, f4, 3), left: px(anchoInt * x - 8), top: px(30) }}
                aria-hidden
              />
            ))}
          {estado.clima.humedo &&
            [0.12, 0.7].map((x) => (
              <div
                key={x}
                className={`pixel ${styles.pieza}`}
                style={{ ...sprite("efectos-16", 64, 96, 16, f4, 4), left: px(anchoInt * x), top: px(70) }}
                aria-hidden
              />
            ))}

          {cerradas && (
            <div className={styles.puerta} style={{ borderWidth: px(16) }} aria-hidden>
              {luzOn && <span className={styles.juntaLuz} style={{ width: px(1) }} />}
              <div
                className={`pixel ${styles.pieza}`}
                style={{
                  ...sprite("equipo-32", 128, 128, 32, 3, 3),
                  left: `calc(50% - ${px(16)})`,
                  top: `calc(50% - ${px(16)})`,
                }}
              />
            </div>
          )}
        </div>
        <div className={styles.marco} style={{ borderWidth: px(16) }} aria-hidden />
      </div>
    </div>
  );
}
