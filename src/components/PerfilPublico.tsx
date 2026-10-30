"use client";

import { InsigniaCreador } from "./InsigniaCreador";
import { marco } from "@/lib/diseno";
import type { PerfilPublicoDatos } from "@/lib/amigos";
import { MENSAJES_ERROR } from "@/lib/juego";
import { LOGRO_POR_ID } from "@/lib/logros";
import { RAREZAS, VARIEDAD_POR_ID } from "@/lib/variedades";
import { Medalla } from "./Medalla";
import { AvatarJugador, lineaJugador } from "./Jugador";
import styles from "./progresion.module.css";

interface Props {
  datos: PerfilPublicoDatos | null;
  ocupado: boolean;
  alVolver: () => void;
  alVisitar: (usuario: string) => void;
  alEnviar: (usuario: string) => void;
  alQuitar: (usuario: string) => void;
  alBloquear: (usuario: string) => void;
}

/** Perfil público de otro jugador: solo lo básico. */
export function PerfilPublico({ datos, ocupado, alVolver, alVisitar, alEnviar, alQuitar, alBloquear }: Props) {
  const tarjeta = marco("tarjeta", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");

  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Perfil</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }
  const j = datos.jugador;
  if (!datos.ok || !j) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Perfil</h1>
        <p className={styles.resumen}>{MENSAJES_ERROR[datos.error ?? "usuario_desconocido"] ?? MENSAJES_ERROR.red}</p>
        <button type="button" className={styles.boton} style={secundario} onClick={alVolver}>
          Volver a amigos
        </button>
      </div>
    );
  }
  const estadisticas = [
    ["Cosechas", String(j.cosechas)],
    ["Mejor cosecha", j.mejor_cosecha ? `${j.mejor_cosecha} g` : "—"],
    ["Días jugados", String(j.dias)],
    ["Amigos", String(j.amigos)],
  ];
  const destacados = j.destacados.map((id) => LOGRO_POR_ID[id]).filter(Boolean);
  const favorita = j.favorita ? VARIEDAD_POR_ID[j.favorita.variedad] : null;
  const desde = new Date(j.desde).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Perfil de {j.usuario}</h1>
        <button type="button" className={styles.boton} style={secundario} onClick={alVolver}>
          Volver a amigos
        </button>
      </div>
      <section className={styles.tarjeta} style={tarjeta}>
        <div className={styles.jugador}>
          <AvatarJugador jugador={j} k={3} />
          <span className={styles.jugadorTexto}>
            <strong>
              {j.usuario}
              {j.creador && <InsigniaCreador k={2} />}
            </strong>
            <span>{lineaJugador(j)}</span>
            <span className={styles.desde}>Cultivando desde el {desde}</span>
          </span>
        </div>
        <div className={styles.totales}>
          {estadisticas.map(([nombre, valor]) => (
            <div key={nombre} className={styles.total}>
              <strong className="numero">{valor}</strong>
              <span>{nombre}</span>
            </div>
          ))}
        </div>
        {destacados.length > 0 && (
          <>
            <h2 className={styles.subtitulo}>Medallas destacadas</h2>
            <div className={styles.destacados}>
              {destacados.map((l) => (
                <div key={l.id} className={styles.destacado} style={marco("dorado", "var(--u)")}>
                  <Medalla tipo={l.medalla} k="var(--ik)" />
                  <span>
                    <strong>{l.nombre}</strong>
                    <span>{l.descripcion}</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        <div className={styles.perfilDoble}>
          {favorita && j.favorita && (
            <div className={styles.bloque}>
              <h2 className={styles.subtitulo}>Variedad favorita</h2>
              <strong>{favorita.nombre}</strong>
              <span
                className={styles.rareza}
                style={{ background: RAREZAS[favorita.rareza].fondo, color: RAREZAS[favorita.rareza].texto }}
              >
                {RAREZAS[favorita.rareza].etiqueta}
              </span>
              <span>{j.favorita.cosechas} cosechas</span>
            </div>
          )}
          <div className={styles.bloque}>
            <h2 className={styles.subtitulo}>Racha actual: {j.racha} días</h2>
            <div className={styles.semana}>
              {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
                <span
                  key={d}
                  className={styles.dia}
                  data-hecho={j.semana[i]}
                  data-hoy={i === j.hoy_semana}
                  aria-label={`${d}: ${j.semana[i] ? "jugó" : "sin jugar"}`}
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
        {datos.relacion !== "yo" && (
          <div className={styles.jugadorAcciones}>
            {datos.relacion === "amigos" && (
              <button
                type="button"
                className={styles.boton}
                style={boton}
                disabled={ocupado}
                onClick={() => alVisitar(j.usuario)}
              >
                Ver su planta
              </button>
            )}
            {(datos.relacion === "ninguna" || datos.relacion === "recibida") && (
              <button
                type="button"
                className={styles.boton}
                style={boton}
                disabled={ocupado}
                onClick={() => alEnviar(j.usuario)}
              >
                {datos.relacion === "recibida" ? "Aceptar solicitud" : "Añadir amigo"}
              </button>
            )}
            {datos.relacion === "enviada" && <span>Solicitud enviada</span>}
            {datos.relacion === "amigos" && (
              <button
                type="button"
                className={styles.boton}
                style={secundario}
                disabled={ocupado}
                onClick={() => alQuitar(j.usuario)}
              >
                Quitar de amigos
              </button>
            )}
            <button
              type="button"
              className={styles.boton}
              style={secundario}
              disabled={ocupado}
              onClick={() => alBloquear(j.usuario)}
            >
              Bloquear
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
