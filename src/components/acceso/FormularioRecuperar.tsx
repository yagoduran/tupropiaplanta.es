"use client";

import Link from "next/link";
import { useActionState } from "react";
import { pedirRecuperacion } from "@/app/login/acciones";
import type { EstadoAcceso } from "@/lib/acceso";
import styles from "./acceso.module.css";

const INICIAL: EstadoAcceso = {};

export function FormularioRecuperar() {
  const [estado, accion, enviando] = useActionState(pedirRecuperacion, INICIAL);
  return (
    <div className={styles.panel}>
      <h1 className={styles.titulo}>Recuperar contraseña</h1>
      <p className={styles.texto}>
        Escribe el email de tu cuenta y te enviaremos un enlace para crear una contraseña nueva. El enlace caduca en 1
        hora.
      </p>
      <form action={accion} className={styles.formulario} noValidate>
        <label className={styles.campo}>
          Email
          <input name="email" type="email" autoComplete="email" placeholder="tu@email.com" required />
        </label>
        {estado.error && (
          <p className={styles.error} role="alert">
            {estado.error}
          </p>
        )}
        {estado.aviso && (
          <p className={styles.aviso} role="status">
            {estado.aviso}
          </p>
        )}
        <button type="submit" className={styles.principal} disabled={enviando}>
          {enviando ? "Un momento..." : "Enviar enlace"}
        </button>
      </form>
      <Link href="/login" className={styles.enlace}>
        Volver a Entrar
      </Link>
    </div>
  );
}
