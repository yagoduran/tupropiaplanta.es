"use client";

import { useState } from "react";
import { marco } from "@/lib/diseno";
import { duracionCorta, type VecinosJuego } from "@/lib/juego";
import styles from "./minijuegos.module.css";

const color = (s: number) => (s >= 100 ? "#a02a32" : s >= 80 ? "#e07b3f" : s >= 50 ? "#f4d36a" : "#74cf45");

interface Props {
  vecinos: VecinosJuego;
  /** Ambientadores que tiene el jugador. */
  ambientadores: number;
  ocupado: boolean;
  alUsarAmbientador: () => void;
  alIrATienda: () => void;
  alIrAMejoras: () => void;
  /** Estilo extra del botón (posición sobre la escena). */
  estilo?: React.CSSProperties;
  clase?: string;
}

/** Barra de sospecha vecinal: el olor de las plantas en floración la sube; a 100 % llega una multa. */
export function ChipVecinos({
  vecinos,
  ambientadores,
  ocupado,
  alUsarAmbientador,
  alIrATienda,
  alIrAMejoras,
  estilo,
  clase,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const s = vecinos.sospecha;
  const sube = vecinos.olor - 1;
  return (
    <>
      <button
        type="button"
        className={clase}
        style={{ ...marco("boton_secundario", "var(--u)"), ...estilo }}
        aria-expanded={abierto}
        onClick={() => setAbierto(true)}
      >
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            background: color(s),
            border: "2px solid #1c1626",
            marginRight: 6,
          }}
        />
        Vecinos {s} %
      </button>
      {abierto && (
        <div
          className={styles.capa}
          role="dialog"
          aria-modal="true"
          aria-label="Sospecha vecinal"
          onClick={() => setAbierto(false)}
        >
          <div className={styles.caja} style={marco("panel", "var(--u)")} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.titulo}>Sospecha vecinal</h2>
            <div className={styles.partida}>
              <div className={styles.barra}>
                <span style={{ width: `${s}%`, background: color(s) }} />
                <span className={styles.marca} style={{ left: "50%" }} />
                <span className={styles.marca} style={{ left: "80%" }} />
              </div>
            </div>
            <p className={styles.texto}>
              Las plantas huelen desde la fase 5 y los vecinos se dan cuenta. Al 50 % te avisan, al 80 % dejan una nota
              y al 100 % llega una multa del 10 % de tus monedas (entre 500 y 5.000).
            </p>
            <p className={sube > 0 ? styles.riesgo : styles.premio}>
              {sube > 0
                ? `Ahora sube ${sube.toLocaleString("es-ES", { maximumFractionDigits: 1 })} puntos por hora.`
                : "Ahora mismo baja 1 punto por hora."}
            </p>
            <p className={styles.texto}>
              El extractor con filtro de carbón (Mejoras del armario) reduce el olor un 60 %; el turbo, un 74 %. Un
              ambientador quita 20 puntos (uno cada 6 horas).
            </p>
            <div className={styles.botones}>
              {ambientadores > 0 ? (
                <button
                  type="button"
                  className={styles.boton}
                  style={marco("boton", "var(--u)")}
                  disabled={ocupado || vecinos.ambientador > 0}
                  onClick={alUsarAmbientador}
                >
                  {vecinos.ambientador > 0
                    ? `Ambientador en ${duracionCorta(vecinos.ambientador)}`
                    : `Usar ambientador (${ambientadores})`}
                </button>
              ) : (
                <button type="button" className={styles.boton} style={marco("boton", "var(--u)")} onClick={alIrATienda}>
                  Comprar ambientador
                </button>
              )}
              <button
                type="button"
                className={styles.boton}
                style={marco("boton_secundario", "var(--u)")}
                onClick={alIrAMejoras}
              >
                Mejorar extractor
              </button>
              <button
                type="button"
                className={styles.boton}
                style={marco("boton_secundario", "var(--u)")}
                onClick={() => setAbierto(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Aviso de multa por olores. */
export function Multa({ monedas, alCerrar }: { monedas: number; alCerrar: () => void }) {
  return (
    <div className={styles.capa} role="dialog" aria-modal="true" aria-label="Multa por olores">
      <div className={styles.caja} style={marco("panel", "var(--u)")}>
        <h2 className={styles.titulo}>Multa por olores</h2>
        <p className={styles.texto}>
          La comunidad de vecinos te ha multado por molestias. Has pagado{" "}
          <strong className="numero">{monedas.toLocaleString("es-ES")}</strong> monedas y la sospecha baja al 40 %.
        </p>
        <p className={styles.riesgo}>Mejora el extractor del armario o usa ambientadores para que no se repita.</p>
        <div className={styles.botones}>
          <button type="button" className={styles.boton} style={marco("boton", "var(--u)")} onClick={alCerrar}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
