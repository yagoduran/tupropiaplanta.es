"use client";

import { useEffect, useState } from "react";
import { marco } from "@/lib/diseno";
import styles from "./robo.module.css";

interface Props {
  monedas: number;
  alCerrar: () => void;
}

const AGACHADO_MS = 800;
const HUIDA_MS = 1400;

/** Aviso de robo: el ladrón coge las monedas y huye, y después se cuenta cuánto se llevó. */
export function Robo({ monedas, alCerrar }: Props) {
  const [fase, setFase] = useState<"coge" | "huye" | "fin">("coge");

  useEffect(() => {
    if (fase === "fin") return;
    const id = setTimeout(() => setFase(fase === "coge" ? "huye" : "fin"), fase === "coge" ? AGACHADO_MS : HUIDA_MS);
    return () => clearTimeout(id);
  }, [fase]);

  useEffect(() => {
    const cerrar = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [alCerrar]);

  return (
    <div className={styles.capa} role="dialog" aria-modal="true" aria-label="Te han robado">
      <div className={styles.caja} style={marco("panel", "var(--u)")}>
        <div className={styles.escenario}>
          {fase !== "fin" && <div className={`pixel ${styles.ladron}`} data-fase={fase} />}
          {fase === "fin" && <div className={`pixel ${styles.aviso}`} />}
        </div>
        <h2 className={styles.titulo} data-visible={fase === "fin"}>
          ¡Te han robado!
        </h2>
        <p className={styles.texto} data-visible={fase === "fin"}>
          Un ladrón se llevó {monedas} {monedas === 1 ? "moneda" : "monedas"} mientras no estabas. Mejora la Seguridad
          en el armario para que sea menos probable.
        </p>
        <button
          type="button"
          className={styles.boton}
          style={marco("boton", "var(--u)")}
          onClick={alCerrar}
          disabled={fase !== "fin"}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
