"use client";

import { marco } from "@/lib/diseno";
import type { DatosEncargos } from "@/lib/encargos";
import { RetratoCliente } from "./RetratoCliente";
import { ESTADOS, estadoVisual, miles, resumen, textoTiempo, useSegundosTranscurridos } from "./encargosComun";
import styles from "./encargos.module.css";

interface Props {
  datos: DatosEncargos | null;
  ocupado: boolean;
  alAceptar: (id: string) => void;
  alRechazar: (id: string) => void;
  alVerTodos: () => void;
}

/** Buzón de encargos de la pantalla principal del móvil: los tres mensajes más urgentes. */
export function Buzon({ datos, ocupado, alAceptar, alRechazar, alVerTodos }: Props) {
  const transcurridos = useSegundosTranscurridos(datos);
  const panel = marco("panel", "var(--u)");
  const tarjeta = marco("tarjeta", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");
  if (!datos) return null;
  const abiertos = datos.lista
    .map((e) => ({ e, restan: Math.max(0, e.restan - transcurridos) }))
    .filter((x) => x.restan > 0)
    .sort((a, b) => a.restan - b.restan);
  return (
    <section className={styles.buzon} style={panel} aria-label="Buzón de encargos">
      <div className={styles.cabecera}>
        <h2 className={styles.subtitulo} style={{ border: 0 }}>
          Buzón de encargos
        </h2>
        <button type="button" className={styles.enlace} onClick={alVerTodos}>
          Ver todos ({abiertos.length})
        </button>
      </div>
      {abiertos.length === 0 && (
        <p className={styles.textoOscuro}>No tienes mensajes. Llegan encargos nuevos cada 3 horas.</p>
      )}
      {abiertos.slice(0, 3).map(({ e, restan }) => {
        const v = estadoVisual(e, restan);
        return (
          <article key={e.id} className={styles.mini} style={tarjeta}>
            <RetratoCliente cliente={e.cliente} k={2} />
            <span className={styles.tarjetaTexto}>
              <strong>{e.remite}</strong>
              <span>{resumen(e)}</span>
              <span className={`${styles.tiempo} ${v === "urge" ? styles.parpadeo : ""}`}>
                {textoTiempo(e, restan)}
              </span>
              <span className={styles.tiempo}>{miles(e.monedas)} monedas</span>
            </span>
            {v === "nuevo" ? (
              <span className={styles.miniBotones}>
                <button
                  type="button"
                  className={styles.accion}
                  style={secundario}
                  disabled={ocupado}
                  onClick={() => alRechazar(e.id)}
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  className={styles.accion}
                  style={boton}
                  disabled={ocupado}
                  onClick={() => alAceptar(e.id)}
                >
                  Aceptar
                </button>
              </span>
            ) : (
              <span className={styles.etiqueta} style={{ background: ESTADOS[v].fondo, borderColor: ESTADOS[v].borde }}>
                {ESTADOS[v].texto}
              </span>
            )}
          </article>
        );
      })}
    </section>
  );
}
