"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { leerVisita } from "@/lib/visita";
import styles from "./acceso.module.css";

const TEXTOS = {
  caducada: {
    titulo: "Tu sesión ha caducado",
    texto:
      "Por seguridad cerramos la sesión cuando pasa mucho tiempo sin entrar. Tu planta, tus monedas y tus logros siguen guardados.",
    etiqueta: "Última entrada",
  },
  duplicada: {
    titulo: "Partida abierta en otro sitio",
    texto:
      "Tu cuenta se ha abierto en otra ventana o dispositivo. Para proteger tu partida solo puede haber una sesión activa a la vez.",
    etiqueta: "Otra sesión",
  },
} as const;

const sinCambios = () => () => {};

/** Fecha de la última visita guardada en este navegador, o cadena vacía. */
function useUltimaEntrada() {
  return useSyncExternalStore(
    sinCambios,
    () => {
      const v = leerVisita();
      if (!v) return "";
      return new Date(v.t).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" });
    },
    () => "",
  );
}

export function SesionCaducada({ motivo }: { motivo: keyof typeof TEXTOS }) {
  const t = TEXTOS[motivo];
  const ultima = useUltimaEntrada();
  return (
    <div className={styles.panel}>
      <h1 className={styles.titulo}>{t.titulo}</h1>
      <p className={styles.texto}>{t.texto}</p>
      {motivo === "caducada" && ultima && (
        <p className={styles.texto}>
          <strong>{t.etiqueta}:</strong> {ultima}
        </p>
      )}
      <Link href="/login" className={styles.principal} style={{ textAlign: "center", textDecoration: "none" }}>
        Iniciar sesión de nuevo
      </Link>
    </div>
  );
}
