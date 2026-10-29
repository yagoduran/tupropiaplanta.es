"use client";

import { marco } from "@/lib/diseno";
import { COLECCION, HITOS, type DatosProgresion } from "@/lib/progresion";
import { RAREZAS } from "@/lib/variedades";
import { Icono } from "./Icono";
import { IconoObjeto } from "./IconoObjeto";
import styles from "./progresion.module.css";

interface Props {
  datos: DatosProgresion | null;
  ocupado: boolean;
  alReclamar: (pct: number) => void;
}

const PREMIO_ICONO: Record<number, React.ReactNode> = {
  25: <IconoObjeto celda={[0, 5]} k={1} />,
  50: <IconoObjeto celda={[3, 0]} k={1} />,
  75: <Icono id="logros" k={3} />,
  100: <Icono id="ranking" k={3} />,
};

/** Colección: las variedades que has descubierto (las demás, en silueta) y los premios por completarla. */
export function Coleccion({ datos, ocupado, alReclamar }: Props) {
  const boton = marco("boton", "var(--u)");

  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Colección</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }

  const descubiertas = new Set(datos.descubiertas);

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Colección y enciclopedia</h1>
        <span className={styles.resumen}>Las variedades que no has descubierto aparecen en silueta.</span>
      </div>

      <section className={styles.tarjeta} style={marco("panel", "var(--u)")} aria-label="Progreso de la colección">
        <p className={styles.subtitulo}>
          {datos.pct} %
          <span>
            {datos.descubiertas.length} de {datos.total} variedades descubiertas
          </span>
        </p>
        <div
          className={styles.pista}
          role="progressbar"
          aria-valuenow={datos.pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={styles.rellenoVerde} style={{ width: `${datos.pct}%` }} />
        </div>
        <div className={styles.hitos}>
          {HITOS.map((h) => {
            const reclamado = datos.hitos.includes(h.pct);
            const listo = !reclamado && datos.pct >= h.pct;
            const faltan = Math.ceil((h.pct / 100) * datos.total) - datos.descubiertas.length;
            return (
              <div
                key={h.pct}
                className={styles.hito}
                style={marco(listo ? "dorado" : reclamado ? "apagado" : "tarjeta", "var(--u)")}
              >
                <strong>{h.pct} %</strong>
                <span className={styles.hitoIcono} style={{ opacity: reclamado || listo ? 1 : 0.45 }}>
                  {PREMIO_ICONO[h.pct]}
                </span>
                <span>{h.premio}</span>
                {reclamado ? (
                  <span className={styles.hitoEstado}>✓ Reclamado</span>
                ) : listo ? (
                  <button
                    type="button"
                    className={styles.accion}
                    style={boton}
                    disabled={ocupado}
                    onClick={() => alReclamar(h.pct)}
                  >
                    Reclamar
                  </button>
                ) : (
                  <span className={styles.hitoEstado}>Faltan {faltan}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className={styles.fichas}>
        {COLECCION.map((f, i) => {
          const descubierta = f.id !== null && descubiertas.has(f.id);
          const rareza = RAREZAS[f.rareza];
          return (
            <article
              key={f.nombre}
              className={styles.ficha}
              style={marco(descubierta ? "tarjeta" : "apagado", "var(--u)")}
              aria-label={descubierta ? f.nombre : "Variedad sin descubrir"}
            >
              <span className={styles.fichaCabeza}>
                <span>#{String(i + 1).padStart(2, "0")}</span>
                <span
                  className={styles.etiqueta}
                  style={{
                    background: descubierta ? rareza.fondo : "#4b3a5e",
                    color: descubierta ? rareza.texto : "#f6eed6",
                  }}
                >
                  {descubierta ? rareza.etiqueta : f.id === null ? "Próximamente" : "Sin descubrir"}
                </span>
              </span>
              <span
                className="pixel"
                aria-hidden
                style={{
                  display: "block",
                  width: 128,
                  height: 128,
                  alignSelf: "center",
                  backgroundImage: `url(/assets/sprites/tpp-variedad-${f.hoja}-1x.png)`,
                  backgroundSize: "768px 1024px",
                  backgroundPosition: `0 ${-(f.fila - 1) * 128}px`,
                  filter: descubierta ? undefined : "brightness(0)",
                  opacity: descubierta ? 1 : 0.5,
                }}
              />
              <span className={styles.huecoNombre}>{descubierta ? f.nombre : "???"}</span>
              <span className={styles.huecoDetalle}>{f.pista}</span>
            </article>
          );
        })}
      </div>
    </div>
  );
}
