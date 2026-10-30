"use client";

import { useState } from "react";
import { guardarEleccionCookies, leerEleccionCookies, leerEstadisticas } from "@/lib/cookies";
import styles from "./cookies.module.css";

interface Props {
  onCerrar: () => void;
}

interface FilaProps {
  titulo: string;
  texto: string;
  activa: boolean;
  fija?: boolean;
  onCambiar?: (activa: boolean) => void;
}

function Fila({ titulo, texto, activa, fija, onCambiar }: FilaProps) {
  return (
    <div className={styles.fila}>
      <div>
        <strong>{titulo}</strong>
        <p>{texto}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={activa}
        aria-label={titulo}
        disabled={fija}
        className={`${styles.interruptor} ${activa ? styles.interruptorOn : ""}`}
        onClick={() => onCambiar?.(!activa)}
      >
        <span>{fija ? "Siempre activas" : activa ? "Activadas" : "Desactivadas"}</span>
        <i />
      </button>
    </div>
  );
}

/** Ventana para elegir qué cookies se permiten. Las necesarias no se pueden desactivar. */
export function ConfigurarCookies({ onCerrar }: Props) {
  const [estadisticas, setEstadisticas] = useState(() => leerEstadisticas());
  const [publicidad, setPublicidad] = useState(() => leerEleccionCookies() === "aceptadas");

  const guardar = (est: boolean, pub: boolean) => {
    guardarEleccionCookies(pub ? "aceptadas" : "rechazadas", est);
    onCerrar();
  };

  return (
    <div className={styles.fondo} role="dialog" aria-modal="true" aria-label="Configurar cookies">
      <div className={styles.ventana}>
        <header>
          <h2>Configurar cookies</h2>
          <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <p>Elige qué cookies permites. Las necesarias no se pueden desactivar porque guardan tu sesión y tu partida.</p>
        <Fila titulo="Necesarias" texto="Sesión, partida guardada y tus preferencias de cookies." activa fija />
        <Fila
          titulo="Estadísticas"
          texto="Uso anónimo de pantallas y botones para mejorar el juego."
          activa={estadisticas}
          onCambiar={setEstadisticas}
        />
        <Fila
          titulo="Publicidad"
          texto="Anuncios personalizados en los huecos laterales. Sin ellas verás anuncios genéricos."
          activa={publicidad}
          onCambiar={setPublicidad}
        />
        <div className={styles.botones}>
          <button type="button" className={styles.rechazar} onClick={() => guardar(false, false)}>
            Rechazar todas
          </button>
          <button type="button" className={styles.rechazar} onClick={() => guardar(estadisticas, publicidad)}>
            Guardar selección
          </button>
          <button type="button" className={styles.aceptar} onClick={() => guardar(true, true)}>
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  );
}
