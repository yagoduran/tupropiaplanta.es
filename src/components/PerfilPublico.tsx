"use client";

import { marco } from "@/lib/diseno";
import type { PerfilPublicoDatos } from "@/lib/amigos";
import { MENSAJES_ERROR } from "@/lib/juego";
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
    ["Plantas cosechadas", String(j.cosechas)],
    ["Variedades", `${j.variedades} / ${j.variedades_total}`],
    ["Logros", `${j.logros} / ${j.logros_total}`],
  ];

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
            <strong>{j.usuario}</strong>
            <span>{lineaJugador(j)}</span>
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
                Visitar su planta
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
