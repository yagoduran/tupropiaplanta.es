"use client";

import { useEffect, useState, useTransition } from "react";
import { comprobarVerificacion, reenviarVerificacion } from "@/app/login/acciones";
import type { EstadoAcceso } from "@/lib/acceso";
import styles from "./acceso.module.css";

const ESPERA = 30;

/** Pantalla «Verifica tu email» tras crear la cuenta. */
export function VerificarEmail({ email, alCambiar }: { email: string; alCambiar: () => void }) {
  const [mensaje, setMensaje] = useState<EstadoAcceso>({});
  const [espera, setEspera] = useState(ESPERA);
  const [ocupado, empezar] = useTransition();

  useEffect(() => {
    if (espera <= 0) return;
    const id = setTimeout(() => setEspera((e) => e - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  return (
    <div className={styles.panel}>
      <h1 className={styles.titulo}>Verifica tu email</h1>
      <p className={styles.texto}>
        Te hemos enviado un enlace a <strong>{email}</strong>. Ábrelo para activar tu cuenta y plantar tu primera
        semilla. Mira también la carpeta de spam.
      </p>
      {mensaje.error && (
        <p className={styles.error} role="alert">
          {mensaje.error}
        </p>
      )}
      {mensaje.aviso && (
        <p className={styles.aviso} role="status">
          {mensaje.aviso}
        </p>
      )}
      <button
        type="button"
        className={styles.principal}
        disabled={ocupado}
        onClick={() => empezar(async () => setMensaje((await comprobarVerificacion()) ?? {}))}
      >
        Ya lo he verificado
      </button>
      <button
        type="button"
        className={styles.google}
        disabled={ocupado || espera > 0}
        onClick={() =>
          empezar(async () => {
            setMensaje(await reenviarVerificacion(email));
            setEspera(ESPERA);
          })
        }
      >
        {espera > 0 ? `Reenviar email (${espera} s)` : "Reenviar email"}
      </button>
      <button type="button" className={styles.enlace} onClick={alCambiar}>
        Cambiar email
      </button>
    </div>
  );
}
