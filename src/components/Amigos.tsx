"use client";

import { useState } from "react";
import { marco } from "@/lib/diseno";
import { conexion, type DatosAmigos, type Jugador as DatosJugador, type Resultado } from "@/lib/amigos";
import { AvatarJugador, lineaJugador } from "./Jugador";
import styles from "./progresion.module.css";

interface Props {
  datos: DatosAmigos | null;
  resultados: Resultado[] | null;
  ocupado: boolean;
  alBuscar: (texto: string) => void;
  alEnviar: (usuario: string) => void;
  alResponder: (usuario: string, aceptar: boolean) => void;
  alQuitar: (usuario: string) => void;
  alBloquear: (usuario: string) => void;
  alDesbloquear: (usuario: string) => void;
  alVisitar: (usuario: string) => void;
  alPerfil: (usuario: string) => void;
  alRegalar: (usuario: string) => void;
}

/** Amigos: búsqueda por nombre, solicitudes y lista de amigos con visita y perfil. */
export function Amigos(p: Props) {
  const [texto, setTexto] = useState("");
  const tarjeta = marco("tarjeta", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");

  const Boton = ({
    children,
    onClick,
    principal,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    principal?: boolean;
  }) => (
    <button
      type="button"
      className={styles.boton}
      style={principal ? boton : secundario}
      disabled={p.ocupado}
      onClick={onClick}
    >
      {children}
    </button>
  );

  const Fila = ({
    j,
    texto: sub,
    acciones,
  }: {
    j: DatosJugador;
    texto?: React.ReactNode;
    acciones: React.ReactNode;
  }) => (
    <div className={styles.jugador} style={tarjeta}>
      <AvatarJugador jugador={j} />
      <span className={styles.jugadorTexto}>
        <strong>{j.usuario}</strong>
        <span>{lineaJugador(j)}</span>
        {sub && <span>{sub}</span>}
      </span>
      <span className={styles.jugadorAcciones}>{acciones}</span>
    </div>
  );

  if (!p.datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Amigos</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }
  const d = p.datos;

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Amigos</h1>
        <span className={styles.resumen}>
          {d.amigos.length} de {d.max} amigos
        </span>
      </div>

      <form
        className={styles.buscador}
        onSubmit={(e) => {
          e.preventDefault();
          p.alBuscar(texto);
        }}
      >
        <input
          className={styles.campo}
          value={texto}
          maxLength={20}
          placeholder="Busca un jugador por su nombre (3 letras o más)"
          aria-label="Buscar jugador"
          onChange={(e) => setTexto(e.target.value)}
        />
        <button type="submit" className={styles.boton} style={boton} disabled={p.ocupado || texto.trim().length < 3}>
          Buscar
        </button>
      </form>

      {p.resultados && (
        <section className={styles.jugadores} aria-label="Resultados">
          {p.resultados.length === 0 && <p className={styles.resumen}>No hemos encontrado a nadie con ese nombre.</p>}
          {p.resultados.map((r) => (
            <Fila
              key={r.usuario}
              j={r}
              acciones={
                <>
                  <Boton onClick={() => p.alPerfil(r.usuario)}>Perfil</Boton>
                  {r.relacion === "ninguna" && (
                    <Boton principal onClick={() => p.alEnviar(r.usuario)}>
                      Añadir amigo
                    </Boton>
                  )}
                  {r.relacion === "enviada" && <span>Solicitud enviada</span>}
                  {r.relacion === "recibida" && (
                    <Boton principal onClick={() => p.alResponder(r.usuario, true)}>
                      Aceptar
                    </Boton>
                  )}
                  {r.relacion === "amigos" && <span>Ya sois amigos</span>}
                </>
              }
            />
          ))}
        </section>
      )}

      {d.recibidas.length > 0 && (
        <section className={styles.jugadores} aria-label="Solicitudes recibidas">
          <h2 className={styles.titulo} style={{ fontSize: "var(--f-stat)" }}>
            Solicitudes ({d.recibidas.length})
          </h2>
          {d.recibidas.map((j) => (
            <Fila
              key={j.usuario}
              j={j}
              acciones={
                <>
                  <Boton principal onClick={() => p.alResponder(j.usuario, true)}>
                    Aceptar
                  </Boton>
                  <Boton onClick={() => p.alResponder(j.usuario, false)}>Rechazar</Boton>
                </>
              }
            />
          ))}
        </section>
      )}

      <section className={styles.jugadores} aria-label="Mis amigos">
        <h2 className={styles.titulo} style={{ fontSize: "var(--f-stat)" }}>
          Mis amigos
        </h2>
        {d.amigos.length === 0 && (
          <p className={styles.resumen}>
            Todavía no tienes amigos. Busca a alguien por su nombre y envíale una solicitud.
          </p>
        )}
        {d.amigos.map((a) => (
          <Fila
            key={a.usuario}
            j={a}
            texto={
              <>
                <span className={`${styles.punto} ${a.hace !== null && a.hace < 300 ? styles.puntoOn : ""}`} />
                {conexion(a.hace)}
              </>
            }
            acciones={
              <>
                <Boton principal onClick={() => p.alVisitar(a.usuario)}>
                  Visitar
                </Boton>
                <Boton onClick={() => p.alRegalar(a.usuario)}>{a.regalado ? "Enviado" : "Regalar"}</Boton>
                <Boton onClick={() => p.alPerfil(a.usuario)}>Perfil</Boton>
              </>
            }
          />
        ))}
      </section>

      {d.enviadas.length > 0 && (
        <section className={styles.jugadores} aria-label="Solicitudes enviadas">
          <h2 className={styles.titulo} style={{ fontSize: "var(--f-stat)" }}>
            Solicitudes enviadas
          </h2>
          {d.enviadas.map((j) => (
            <Fila
              key={j.usuario}
              j={j}
              texto="Pendiente de respuesta"
              acciones={<Boton onClick={() => p.alQuitar(j.usuario)}>Cancelar</Boton>}
            />
          ))}
        </section>
      )}

      {d.bloqueados.length > 0 && (
        <section className={styles.jugadores} aria-label="Bloqueados">
          <h2 className={styles.titulo} style={{ fontSize: "var(--f-stat)" }}>
            Bloqueados
          </h2>
          {d.bloqueados.map((j) => (
            <Fila
              key={j.usuario}
              j={j}
              acciones={<Boton onClick={() => p.alDesbloquear(j.usuario)}>Desbloquear</Boton>}
            />
          ))}
        </section>
      )}
    </div>
  );
}
