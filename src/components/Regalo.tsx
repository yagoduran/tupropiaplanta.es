"use client";

import { useState } from "react";
import { marco } from "@/lib/diseno";
import { REGALOS, SALUDOS, type DatosRegalos, type Jugador, type TipoRegalo } from "@/lib/amigos";
import { MENSAJES_ERROR } from "@/lib/juego";
import { Icono } from "./Icono";
import { IconoSocial } from "./IconoSocial";
import { AvatarJugador, lineaJugador } from "./Jugador";
import styles from "./progresion.module.css";

interface Props {
  amigo: Jugador | null;
  datos: DatosRegalos | null;
  monedas: number;
  /** Regalo ya enviado en esta pantalla. */
  enviado: TipoRegalo | null;
  error: string | null;
  ocupado: boolean;
  alEnviar: (tipo: TipoRegalo, saludo: string | null) => void;
  alVolver: () => void;
}

/** Enviar un regalo a un amigo: monedas, agua o un abono, con un saludo opcional. */
export function Regalo({ amigo, datos, monedas, enviado, error, ocupado, alEnviar, alVolver }: Props) {
  const [tipo, setTipo] = useState<TipoRegalo>("agua");
  const [saludo, setSaludo] = useState<string | null>(null);
  const tarjeta = marco("tarjeta", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const apagado = marco("boton_desactivado", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");

  if (!amigo || !datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Enviar un regalo</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }
  const enviados = 3 - datos.restantes;
  const sinDisponible =
    datos.restantes <= 0 ||
    (tipo === "monedas" && (datos.monedas_hoy || monedas < 50)) ||
    (tipo === "abono" && datos.abonos < 1);

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Enviar un regalo</h1>
        <button type="button" className={styles.boton} style={secundario} onClick={alVolver}>
          Volver a amigos
        </button>
      </div>
      <section className={styles.tarjeta} style={tarjeta}>
        <div className={styles.jugador}>
          <AvatarJugador jugador={amigo} />
          <span className={styles.jugadorTexto}>
            <strong>Para {amigo.usuario}</strong>
            <span>{lineaJugador(amigo)}</span>
          </span>
        </div>

        <div
          className={styles.resumen}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "#1c1626", padding: 8 }}
        >
          <span>Regalos de hoy</span>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 16,
                height: 16,
                border: "2px solid #f6eed6",
                background: i < enviados ? "#f4d36a" : "transparent",
              }}
            />
          ))}
          <span>Te quedan {datos.restantes} de 3 · se renuevan a las 00:00</span>
        </div>

        {enviado ? (
          <div className={styles.jugadorTexto}>
            <IconoSocial id="regalo" hoja={32} k={2} />
            <strong>¡Regalo enviado!</strong>
            <span>
              {amigo.usuario} recibirá {REGALOS.find((r) => r.id === enviado)?.nombre.toLowerCase()} y un aviso en su
              campana.
            </span>
          </div>
        ) : (
          <>
            <div className={styles.jugadores}>
              {REGALOS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={styles.jugador}
                  style={{
                    ...marco(tipo === r.id ? "dorado" : "tarjeta", "var(--u)"),
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  aria-pressed={tipo === r.id}
                  onClick={() => setTipo(r.id)}
                >
                  {r.id === "monedas" ? (
                    <Icono id="moneda" k={3} />
                  ) : r.id === "agua" ? (
                    <Icono id="agua" k={3} />
                  ) : (
                    <Icono id="nutrientes" k={3} />
                  )}
                  <span className={styles.jugadorTexto}>
                    <strong>{r.nombre}</strong>
                    <span>{r.detalle}</span>
                    {r.id === "abono" && <span>Tienes {datos.abonos}</span>}
                  </span>
                </button>
              ))}
            </div>
            <span className={styles.subtitulo}>Añade un saludo (opcional)</span>
            <div className={styles.saludos}>
              {SALUDOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={styles.saludo}
                  style={marco(saludo === s.id ? "dorado" : "boton_secundario", "var(--u)")}
                  aria-label={s.nombre}
                  aria-pressed={saludo === s.id}
                  title={s.nombre}
                  onClick={() => setSaludo(saludo === s.id ? null : s.id)}
                >
                  <IconoSocial id={`emoji_${s.id}` as never} hoja={32} k={1} />
                </button>
              ))}
            </div>
            {error && (
              <p className={styles.resumen} style={{ color: "#7c2e1b" }}>
                {MENSAJES_ERROR[error] ?? MENSAJES_ERROR.red}
              </p>
            )}
            <button
              type="button"
              className={styles.accion}
              style={ocupado || sinDisponible ? apagado : boton}
              disabled={ocupado || sinDisponible}
              onClick={() => alEnviar(tipo, saludo)}
            >
              Enviar regalo
            </button>
          </>
        )}
      </section>
    </div>
  );
}
