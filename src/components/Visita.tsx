"use client";

import { marco } from "@/lib/diseno";
import { conexion, SALUDOS, type DatosVisita } from "@/lib/amigos";
import { MENSAJES_ERROR, medidoresDe, type PlantaJuego } from "@/lib/juego";
import { EstadoCompacto } from "./EstadoCompacto";
import { AvatarJugador, lineaJugador } from "./Jugador";
import { IconoSocial } from "./IconoSocial";
import { Planta } from "./Planta";
import styles from "./progresion.module.css";

interface Props {
  datos: DatosVisita | null;
  ocupado: boolean;
  alVolver: () => void;
  alRegar: () => void;
  alSaludar: (emoji: string) => void;
  alPerfil: () => void;
}

/** Visita a la planta de un amigo: solo se mira, se riega una vez al día y se deja un saludo. */
export function Visita({ datos, ocupado, alVolver, alRegar, alSaludar, alPerfil }: Props) {
  const tarjeta = marco("tarjeta", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const apagado = marco("boton_desactivado", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");

  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Visita</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }
  const j = datos.jugador;
  if (!datos.ok || !j) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Visita</h1>
        <p className={styles.resumen}>{MENSAJES_ERROR[datos.error ?? "no_es_amigo"] ?? MENSAJES_ERROR.red}</p>
        <button type="button" className={styles.boton} style={secundario} onClick={alVolver}>
          Volver a amigos
        </button>
      </div>
    );
  }
  const pl = datos.planta;
  const medidores = pl
    ? medidoresDe({
        ...pl,
        vida: "viva",
        segundos_vida: 0,
        esperas: {},
        plaga: null,
        desafio: null,
        tipo: "foto",
        sexo: null,
        causa: null,
        id: "visita",
      } as PlantaJuego)
    : [];
  const regarOff = ocupado || datos.regado || !pl;

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Planta de {j.usuario}</h1>
        <button type="button" className={styles.boton} style={secundario} onClick={alVolver}>
          Volver a amigos
        </button>
      </div>
      <div className={styles.visita}>
        <section className={styles.tarjeta} style={tarjeta} aria-label="Planta">
          <span className={styles.subtitulo}>
            Solo lectura <span>{pl ? `Fase ${pl.fase}` : ""}</span>
          </span>
          {pl ? (
            <>
              <div
                className={styles.visitaPlanta}
                style={{ ["--s" as string]: 3, width: "calc(96px * 3)", height: "calc(80px * 3)" }}
              >
                <Planta fase={pl.fase} estado={pl.estado} variedad={pl.variedad} maceta={pl.maceta} />
              </div>
              <EstadoCompacto medidores={medidores} />
            </>
          ) : (
            <p className={styles.vacio}>{j.usuario} no tiene ninguna planta viva ahora mismo.</p>
          )}
        </section>

        <section className={styles.tarjeta} style={tarjeta} aria-label="Amigo">
          <div className={styles.jugador}>
            <AvatarJugador jugador={j} />
            <span className={styles.jugadorTexto}>
              <strong>{j.usuario}</strong>
              <span>{lineaJugador(j)}</span>
              <span>{conexion(j.hace)}</span>
            </span>
          </div>
          <button type="button" className={styles.boton} style={secundario} onClick={alPerfil}>
            Ver perfil
          </button>
          <button
            type="button"
            className={styles.accion}
            style={regarOff ? apagado : boton}
            disabled={regarOff}
            onClick={alRegar}
          >
            {datos.regado ? "Ya la has regado hoy" : "Regar su planta (+20 agua)"}
          </button>
          <p className={styles.resumen} style={{ color: "#1c1626" }}>
            Puedes regar una planta de cada amigo al día (hasta 5 al día) y ganas 10 monedas.
          </p>
          <span className={styles.subtitulo}>{datos.saludo ? "Saludo enviado hoy" : "Deja un saludo"}</span>
          <div className={styles.saludos}>
            {SALUDOS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={styles.saludo}
                style={marco(datos.saludo === s.id ? "dorado" : "boton_secundario", "var(--u)")}
                aria-label={s.nombre}
                title={s.nombre}
                disabled={ocupado || !!datos.saludo}
                onClick={() => alSaludar(s.id)}
              >
                <IconoSocial id={`emoji_${s.id}` as never} hoja={32} k={1} />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
