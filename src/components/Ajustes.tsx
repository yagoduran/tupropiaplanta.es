"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cerrarSesion } from "@/app/acciones";
import { marco } from "@/lib/diseno";
import type { AjustesJuego } from "@/lib/juego";
import { PAISES } from "@/lib/paises";
import { sonar } from "@/lib/sonido";
import { URL_DONAR, donarActivo } from "@/lib/donar";
import { EnlacesLegales } from "./EnlacesLegales";
import { Icono } from "./Icono";
import styles from "./ajustes.module.css";

interface Props {
  ajustes: AjustesJuego;
  alCambiar: (cambios: Partial<AjustesJuego>) => void;
  alVerTutorial: () => void;
  alBorrar: () => Promise<void>;
}

function Control({ etiqueta, valor, alCambiar }: { etiqueta: string; valor: number; alCambiar: (v: number) => void }) {
  const barra = marco("barra", "var(--u)");
  const boton = marco("boton_secundario", "var(--u)");
  return (
    <div className={styles.fila}>
      <span className={styles.etiqueta}>{etiqueta}</span>
      <div className={styles.control}>
        <div className={styles.pista} style={{ border: barra.border, background: barra.background }}>
          <div className={styles.relleno} style={{ width: `${valor}%` }} />
        </div>
        <div
          className={styles.pomo}
          style={{
            ...boton,
            left: `calc((100% - var(--pomo-w)) * ${valor / 100})`,
          }}
        />
        <input
          type="range"
          min={0}
          max={100}
          value={valor}
          aria-label={etiqueta}
          className={styles.rango}
          onChange={(e) => alCambiar(Number(e.target.value))}
        />
      </div>
      <span className={styles.numero}>{valor}</span>
    </div>
  );
}

export function Ajustes({ ajustes, alCambiar, alVerTutorial, alBorrar }: Props) {
  const panel = marco("panel", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");
  const peligro = marco("boton_espera", "var(--u)");
  const [efectos, setEfectos] = useState(ajustes.volumen_efectos);
  const [musica, setMusica] = useState(ajustes.volumen_musica);
  const [mensaje, setMensaje] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const primera = useRef(true);

  // Guarda los volúmenes cuando el jugador deja de mover el control.
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    const id = setTimeout(() => alCambiar({ volumen_efectos: efectos, volumen_musica: musica }), 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [efectos, musica]);

  const cambiarAvisos = async () => {
    if (ajustes.avisos) {
      alCambiar({ avisos: false });
      setMensaje("");
      return;
    }
    if (typeof Notification === "undefined") {
      setMensaje("Tu navegador no permite notificaciones.");
      return;
    }
    const permiso = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permiso === "granted") {
      alCambiar({ avisos: true });
      setMensaje("");
    } else {
      setMensaje("Has bloqueado las notificaciones. Actívalas en los permisos del navegador.");
    }
  };

  const borrar = async () => {
    setBorrando(true);
    await alBorrar();
    setBorrando(false);
    setConfirmando(false);
  };

  return (
    <div className={styles.contenedor} data-tut="ajustes">
      <h1 className={styles.titulo}>Ajustes</h1>
      <div className={styles.panel} style={panel}>
        <span className={styles.seccion}>Sonido</span>
        <Control etiqueta="Música" valor={musica} alCambiar={setMusica} />
        <Control etiqueta="Efectos" valor={efectos} alCambiar={setEfectos} />
        <button type="button" className={styles.prueba} style={secundario} onClick={() => sonar("clic")}>
          Probar efecto
        </button>

        <hr className={styles.linea} />
        <span className={styles.seccion}>Ayuda</span>
        <p className={styles.ayuda}>El juego está en BETA: tus ideas y avisos de fallos nos ayudan a mejorarlo.</p>
        <div className={styles.botones}>
          <a
            className={styles.accion}
            style={{ ...secundario, textDecoration: "none", textAlign: "center" }}
            href="/contacto?asunto=Sugerencia"
            target="_blank"
            rel="noopener"
          >
            Enviar una sugerencia
          </a>
          <a
            className={styles.accion}
            style={{ ...secundario, textDecoration: "none", textAlign: "center" }}
            href="/contacto?asunto=Problema%20t%C3%A9cnico"
            target="_blank"
            rel="noopener"
          >
            Avisar de un error
          </a>
          <a
            className={styles.accion}
            style={{ ...secundario, textDecoration: "none", textAlign: "center" }}
            href="/contacto?asunto=Soy%20creador%20de%20contenido"
            target="_blank"
            rel="noopener"
          >
            Soy creador de contenido
          </a>
        </div>

        {donarActivo && (
          <>
            <hr className={styles.linea} />
            <span className={styles.seccion}>Apoyar el juego</span>
            <p className={styles.ayuda}>
              Si te gusta el juego, puedes ayudarnos con una donación voluntaria. No da ventajas dentro del juego: es
              solo un agradecimiento.
            </p>
            <a
              className={styles.accion}
              style={{ ...secundario, textDecoration: "none", textAlign: "center" }}
              href={URL_DONAR}
              target="_blank"
              rel="noopener noreferrer"
            >
              Donar
            </a>
          </>
        )}

        <hr className={styles.linea} />
        <div className={styles.fila2}>
          <div>
            <span className={styles.etiqueta}>Notificaciones del navegador</span>
            <p className={styles.ayuda}>Te avisamos cuando tu planta necesite agua o esté lista.</p>
            {mensaje && <p className={styles.ayuda}>{mensaje}</p>}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={ajustes.avisos}
            aria-label="Notificaciones del navegador"
            className={styles.interruptor}
            data-activo={ajustes.avisos}
            onClick={cambiarAvisos}
          >
            <span />
          </button>
        </div>

        <hr className={styles.linea} />
        <div className={styles.fila2}>
          <div>
            <span className={styles.etiqueta}>Salir en el ranking</span>
            <p className={styles.ayuda}>Los demás verán tu nombre de usuario y tu nivel. Nunca tu correo.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!ajustes.ranking_oculto}
            aria-label="Salir en el ranking"
            className={styles.interruptor}
            data-activo={!ajustes.ranking_oculto}
            onClick={() => alCambiar({ ranking_oculto: !ajustes.ranking_oculto })}
          >
            <span />
          </button>
        </div>

        <hr className={styles.linea} />
        <div className={styles.fila2}>
          <div>
            <span className={styles.etiqueta}>Tu país</span>
            <p className={styles.ayuda}>Opcional. Solo sirve para el ranking nacional.</p>
          </div>
          <select
            aria-label="Tu país"
            className={styles.selector}
            value={ajustes.pais ?? ""}
            onChange={(e) => alCambiar({ pais: e.target.value })}
          >
            <option value="">Sin elegir</option>
            {PAISES.map(([codigo, nombre]) => (
              <option key={codigo} value={codigo}>
                {nombre}
              </option>
            ))}
          </select>
        </div>

        <hr className={styles.linea} />
        <div className={styles.fila2}>
          <div>
            <span className={styles.etiqueta}>Aparecer en las búsquedas</span>
            <p className={styles.ayuda}>Si lo desactivas, solo tus amigos podrán encontrarte y ver tu perfil.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!ajustes.perfil_oculto}
            aria-label="Aparecer en las búsquedas de jugadores"
            className={styles.interruptor}
            data-activo={!ajustes.perfil_oculto}
            onClick={() => alCambiar({ perfil_oculto: !ajustes.perfil_oculto })}
          >
            <span />
          </button>
        </div>

        <hr className={styles.linea} />
        <span className={styles.seccion}>Tutorial</span>
        <button type="button" className={styles.accion} style={secundario} onClick={alVerTutorial}>
          Ver el tutorial otra vez
        </button>

        <hr className={styles.linea} />
        <span className={styles.seccion}>Cuenta</span>
        <div className={styles.botones}>
          <form action={cerrarSesion}>
            <button type="submit" className={styles.accion} style={secundario}>
              Cerrar sesión
            </button>
          </form>
          <button
            type="button"
            className={styles.accion}
            style={{ ...peligro, color: "#f6eed6" }}
            onClick={() => setConfirmando(true)}
          >
            Borrar datos del juego
          </button>
        </div>
        <EnlacesLegales />
      </div>

      {confirmando &&
        createPortal(
          <div className={styles.velo} role="dialog" aria-modal="true" aria-labelledby="titulo-borrar">
            <div className={styles.modal} style={panel}>
              <div className={styles.cabeceraModal}>
                <Icono id="aviso" />
                <span id="titulo-borrar">¿Borrar los datos del juego?</span>
              </div>
              <div className={styles.cuerpoModal}>
                <p>
                  Se borrarán tus plantas, monedas y nivel de Tu Propia Planta. Esta acción no se puede deshacer. Tu
                  cuenta de acceso no se elimina.
                </p>
                <div className={styles.botones}>
                  <button
                    type="button"
                    className={styles.accion}
                    style={secundario}
                    onClick={() => setConfirmando(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.accion}
                    style={{ ...peligro, color: "#f6eed6" }}
                    disabled={borrando}
                    onClick={borrar}
                  >
                    {borrando ? "Borrando…" : "Sí, borrar"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.querySelector(".juego") ?? document.body,
        )}
    </div>
  );
}
