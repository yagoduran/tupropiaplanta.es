"use client";

import { useEffect, useState } from "react";
import { marco } from "@/lib/diseno";
import styles from "./anuncio.module.css";

const SEGUNDOS = 5;

interface Props {
  monedas: number;
  /** Si es true, el anuncio es para recuperar la planta muerta y no da monedas. */
  recuperar?: boolean;
  ocupado: boolean;
  alRecoger: () => void;
  alCerrar: () => void;
}

/** Anuncio de prueba con cuenta atrás. Se sustituirá por el anuncio real de la red publicitaria. */
export function AnuncioPrueba({ monedas, recuperar, ocupado, alRecoger, alCerrar }: Props) {
  const [resta, setResta] = useState(SEGUNDOS);

  useEffect(() => {
    if (resta <= 0) return;
    const id = setTimeout(() => setResta((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [resta]);

  useEffect(() => {
    const cerrarConEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !ocupado) alCerrar();
    };
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [ocupado, alCerrar]);

  const listo = resta <= 0;
  const panel = marco("panel", "var(--u)");
  const boton = marco(listo && !ocupado ? "boton" : "boton_desactivado", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");

  return (
    <div className={styles.capa} role="dialog" aria-modal="true" aria-label="Anuncio">
      <div className={styles.caja} style={panel}>
        <span className={styles.etiqueta}>Anuncio de prueba</span>
        <div className={styles.hueco}>
          <span>{listo ? "¡Listo!" : `Tu recompensa en ${resta} s`}</span>
          <div className={styles.barra}>
            <div className={styles.relleno} style={{ width: `${((SEGUNDOS - resta) / SEGUNDOS) * 100}%` }} />
          </div>
        </div>
        <p className={styles.texto}>
          {recuperar
            ? "Al terminar tu planta vuelve a la vida con la mitad de su salud."
            : `Al terminar recibes ${monedas} monedas y tu planta puede volver a recibir cuidados ya.`}
        </p>
        <div className={styles.botones}>
          <button type="button" className={styles.btn} style={boton} disabled={!listo || ocupado} onClick={alRecoger}>
            {recuperar ? "Recuperar mi planta" : "Recoger recompensa"}
          </button>
          <button type="button" className={styles.btn} style={secundario} disabled={ocupado} onClick={alCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
