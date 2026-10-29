"use client";

import { useEffect } from "react";
import { marco } from "@/lib/diseno";
import type { PerfilJuego } from "@/lib/juego";
import styles from "./anuncio.module.css";

interface Props {
  perfil: PerfilJuego;
  ocupado: boolean;
  alComprar: () => void;
  alCerrar: () => void;
}

const formato = (n: number) => n.toLocaleString("es-ES");

/** Ventana para ampliar la casa con otro hueco de cultivo. */
export function AmpliarHueco({ perfil, ocupado, alComprar, alCerrar }: Props) {
  useEffect(() => {
    const cerrarConEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !ocupado) alCerrar();
    };
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [ocupado, alCerrar]);

  const siguiente = perfil.huecos.siguiente;
  if (!siguiente) return null;

  const faltaNivel = perfil.nivel < siguiente.nivel;
  const faltanMonedas = perfil.monedas < siguiente.precio;
  const puede = !faltaNivel && !faltanMonedas && !ocupado;
  const panel = marco("panel", "var(--u)");
  const boton = marco(puede ? "boton" : "boton_desactivado", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");

  return (
    <div className={styles.capa} role="dialog" aria-modal="true" aria-label="Ampliar cultivo">
      <div className={styles.caja} style={panel}>
        <span className={styles.etiqueta}>Ampliar tu cultivo</span>
        <p className={styles.texto}>
          Con un hueco más de cultivo podrás cuidar otra planta a la vez. La maceta, la luz y las mejoras que ya tienes
          valen para todas.
        </p>
        <p className={styles.texto}>
          <strong>Hueco {perfil.huecos.desbloqueados + 1}:</strong> {formato(siguiente.precio)} monedas · nivel{" "}
          {siguiente.nivel}
        </p>
        {faltaNivel && (
          <p className={styles.texto}>
            Necesitas el nivel {siguiente.nivel}. Ahora tienes el {perfil.nivel}.
          </p>
        )}
        {!faltaNivel && faltanMonedas && (
          <p className={styles.texto}>Te faltan {formato(siguiente.precio - perfil.monedas)} monedas.</p>
        )}
        <div className={styles.botones}>
          <button type="button" className={styles.btn} style={boton} disabled={!puede} onClick={alComprar}>
            Comprar hueco
          </button>
          <button type="button" className={styles.btn} style={secundario} disabled={ocupado} onClick={alCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
