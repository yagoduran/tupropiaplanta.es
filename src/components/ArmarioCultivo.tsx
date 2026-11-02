"use client";

import { useEffect, useState } from "react";
import { COLUMNA_MACETA } from "./Planta";
import { marco } from "@/lib/diseno";
import type { PerfilJuego } from "@/lib/juego";
import { hojaDe } from "@/lib/variedades";
import styles from "./hogar.module.css";

type Sitio = PerfilJuego["huecos"]["lista"][number];

/** Centros de las tres ranuras de la bandeja, en píxeles del dibujo (176 × 160). */
const CENTROS = [42, 88, 134];

interface Props {
  sitios: Sitio[];
  maceta: string;
  alPulsar: (s: Sitio) => void;
}

/** El armario de cultivo dibujado: puertas, luz apagable y extractor que gira mientras hay luz. */
export function ArmarioCultivo({ sitios, maceta, alPulsar }: Props) {
  const [abierto, setAbierto] = useState(true);
  const [luz, setLuz] = useState(true);
  const [t, setT] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setT((n) => n + 1), 220);
    return () => clearInterval(id);
  }, []);

  const fotograma = !abierto ? 0 : !luz ? 3 : 1 + (t % 2);
  const col = COLUMNA_MACETA[maceta] ?? 0;
  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");

  return (
    <section className={styles.armario} aria-label="Armario de cultivo">
      <div className={styles.armarioCabeza}>
        <strong className={styles.armarioTitulo}>Armario de cultivo</strong>
        <div className={styles.herramientas}>
          <button type="button" className={styles.boton} style={boton} onClick={() => setAbierto(!abierto)}>
            {abierto ? "Cerrar puertas" : "Abrir puertas"}
          </button>
          <button
            type="button"
            className={styles.boton}
            style={secundario}
            disabled={!abierto}
            onClick={() => setLuz(!luz)}
          >
            {luz ? "Apagar luz" : "Encender luz"}
          </button>
        </div>
      </div>
      <div className={styles.armarioMarco}>
        <div className={styles.armarioDibujo}>
          <div
            className={`pixel ${styles.armarioFondo}`}
            style={{
              backgroundImage: "url(/assets/hogar/tpp-armario-cultivo-2x.png)",
              backgroundSize: "400% 100%",
              backgroundPosition: `${(fotograma / 3) * 100}% 0`,
            }}
          />
          {abierto &&
            CENTROS.map((cx, i) => {
              const s = sitios.find((x) => x.sitio === i + 1);
              if (!s) return null;
              const viva = s.vida === "viva";
              return (
                <button
                  key={cx}
                  type="button"
                  className={styles.armarioSitio}
                  style={{ left: `${((cx - 32) / 176) * 100}%`, filter: luz ? undefined : "brightness(0.6)" }}
                  onClick={() => alPulsar(s)}
                  aria-label={viva ? `Planta del sitio ${s.sitio}` : `Sitio ${s.sitio} libre`}
                >
                  {viva && (
                    <>
                      <span
                        className={`pixel ${styles.armarioCapa}`}
                        style={{
                          top: "40.6%",
                          backgroundImage: `url(/assets/sprites/tpp-variedad-${hojaDe(s.variedad ?? "")}-1x.png)`,
                          backgroundSize: "600% 800%",
                          backgroundPosition: `${((t % 4) / 5) * 100}% ${(((s.fase ?? 1) - 1) / 7) * 100}%`,
                        }}
                      />
                      <span
                        className={`pixel ${styles.armarioCapa}`}
                        style={{
                          top: "51.9%",
                          backgroundImage: "url(/assets/sprites/tpp-macetas-1x.png?v=2)",
                          backgroundSize: "800% 100%",
                          backgroundPosition: `${(col / 7) * 100}% 0`,
                        }}
                      />
                    </>
                  )}
                </button>
              );
            })}
        </div>
      </div>
    </section>
  );
}
