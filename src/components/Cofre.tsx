"use client";

import { useEffect, useState } from "react";
import { marco } from "@/lib/diseno";
import styles from "./cofre.module.css";

export interface PremioCofre {
  texto: string;
  /** Cofre morado para los premios especiales. */
  raro?: boolean;
}

/** Fotograma de la hoja del cofre y cuánto dura antes de pasar al siguiente. */
const GUION: [number, number][] = [
  [0, 500],
  [1, 90],
  [2, 90],
  [3, 110],
  [2, 90],
  [3, 110],
  [1, 90],
  [4, 220],
  [5, 220],
  [6, 400],
  [7, 0],
];
const ABIERTO = 6;

interface Props {
  premio: PremioCofre;
  alCerrar: () => void;
}

/** Cofre que tiembla, se abre y suelta monedas antes de enseñar el premio. */
export function Cofre({ premio, alCerrar }: Props) {
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    if (paso >= GUION.length - 1) return;
    const id = setTimeout(() => setPaso((p) => p + 1), GUION[paso][1]);
    return () => clearTimeout(id);
  }, [paso]);

  useEffect(() => {
    const cerrar = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [alCerrar]);

  const fotograma = GUION[paso][0];
  const abierto = fotograma >= ABIERTO;
  const hoja = premio.raro ? "tpp-cofre-raro-1x.png" : "tpp-cofre-1x.png";
  const imagen = `url(/assets/sprites/${hoja})`;

  return (
    <div
      className={styles.capa}
      role="dialog"
      aria-modal="true"
      aria-label="Premio"
      onClick={abierto ? alCerrar : undefined}
    >
      <div className={styles.caja} style={marco("panel", "var(--u)")}>
        <div className={styles.escenario}>
          <div
            className={`pixel ${styles.cofre}`}
            style={{ backgroundImage: imagen, backgroundPosition: `calc(${-fotograma * 64}px * var(--k)) 0` }}
          />
          {abierto && (
            <>
              <div
                className={`pixel ${styles.destello}`}
                style={{
                  backgroundImage: imagen,
                  backgroundPosition: `calc(${-(paso === ABIERTO + 2 ? 0 : 1) * 64}px * var(--k)) calc(-64px * var(--k))`,
                }}
              />
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`pixel ${styles.moneda}`}
                  style={{
                    backgroundImage: imagen,
                    animationDelay: `${i * 0.25}s`,
                    left: `calc(${(i - 1) * 14}px * var(--k))`,
                  }}
                />
              ))}
            </>
          )}
        </div>
        <p className={styles.texto} data-visible={abierto}>
          {premio.texto}
        </p>
        <button
          type="button"
          className={styles.boton}
          style={marco("boton", "var(--u)")}
          onClick={alCerrar}
          disabled={!abierto}
        >
          Recoger
        </button>
      </div>
    </div>
  );
}
