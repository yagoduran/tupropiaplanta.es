"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { enviarMensaje } from "@/app/juego/acciones";
import { marco } from "@/lib/diseno";
import { IconoBase } from "./IconoBase";
import styles from "./formularioMensaje.module.css";

export type TipoMensaje = "sugerencia" | "error";

const TEXTOS = {
  sugerencia: {
    titulo: "Enviar una sugerencia",
    ayuda: "Cuéntanos qué te gustaría ver en el juego. Leemos todas las ideas.",
    marcador: "Me gustaría que el juego tuviera…",
    min: 1,
    max: 500,
    boton: "Enviar sugerencia",
    gracias: "¡Gracias por tu sugerencia!",
  },
  error: {
    titulo: "Avisar de un error",
    ayuda: "Explica qué ha pasado y qué estabas haciendo. Así podremos arreglarlo antes.",
    marcador: "Estaba en… y al pulsar… pasó…",
    min: 10,
    max: 1000,
    boton: "Enviar aviso",
    gracias: "¡Gracias por avisarnos!",
  },
} as const;

const ERRORES: Record<string, string> = {
  limite: "Ya has enviado 3 mensajes hoy. Inténtalo de nuevo mañana.",
  texto: "El mensaje no tiene una longitud válida.",
  fallo: "No se ha podido enviar. Inténtalo de nuevo en un momento.",
};

interface Props {
  tipo: TipoMensaje;
  /** Pantalla del juego donde está el jugador, para saber dónde ocurrió. */
  donde: string;
  alCerrar: () => void;
}

/** Formulario para enviar una sugerencia o avisar de un error. Solo lo lee el equipo del juego. */
export function FormularioMensaje({ tipo, donde, alCerrar }: Props) {
  const t = TEXTOS[tipo];
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panel = marco("panel", "var(--u)");
  const campo = marco("campo", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");
  const valido = texto.trim().length >= t.min;

  async function enviar() {
    if (!valido || enviando) return;
    setEnviando(true);
    setError(null);
    const r = await enviarMensaje(tipo, texto, donde);
    setEnviando(false);
    if (r.ok) setEnviado(true);
    else setError(ERRORES[r.error] ?? ERRORES.fallo);
  }

  return createPortal(
    <div className={styles.velo} role="dialog" aria-modal="true" aria-labelledby="titulo-mensaje">
      <div className={styles.modal} style={panel}>
        <div className={styles.cabeceraModal}>
          <IconoBase id={enviado ? "enviado" : tipo} />
          <span id="titulo-mensaje">{enviado ? t.gracias : t.titulo}</span>
        </div>
        <div className={styles.cuerpo}>
          {enviado ? (
            <>
              <p>Tu mensaje ha llegado al equipo. Solo nosotros podemos verlo.</p>
              <div className={styles.botones}>
                <button type="button" className={styles.accion} style={boton} onClick={alCerrar}>
                  Cerrar
                </button>
              </div>
            </>
          ) : (
            <>
              <p>{t.ayuda}</p>
              <textarea
                className={styles.texto}
                style={campo}
                value={texto}
                maxLength={t.max}
                placeholder={t.marcador}
                rows={6}
                autoFocus
                onChange={(e) => setTexto(e.target.value)}
              />
              <div className={styles.contador}>
                {texto.length}/{t.max}
                {tipo === "error" && !valido && texto.length > 0 ? " · escribe al menos 10 letras" : ""}
              </div>
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              <div className={styles.botones}>
                <button type="button" className={styles.accion} style={secundario} onClick={alCerrar}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className={styles.accion}
                  style={boton}
                  disabled={!valido || enviando}
                  onClick={enviar}
                >
                  {enviando ? "Enviando…" : t.boton}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.querySelector(".juego") ?? document.body,
  );
}
