"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cambiarPassword } from "@/app/login/acciones";
import type { EstadoAcceso } from "@/lib/acceso";
import styles from "./acceso.module.css";

const INICIAL: EstadoAcceso = {};

export function FormularioNuevaPassword() {
  const [estado, accion, enviando] = useActionState(cambiarPassword, INICIAL);
  return (
    <div className={styles.panel}>
      <h1 className={styles.titulo}>Contraseña nueva</h1>
      <p className={styles.texto}>Elige una contraseña nueva para tu cuenta.</p>
      <form action={accion} className={styles.formulario} noValidate>
        <label className={styles.campo}>
          Contraseña nueva
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            required
          />
        </label>
        <label className={styles.campo}>
          Repite la contraseña
          <input name="repetida" type="password" autoComplete="new-password" required />
        </label>
        {estado.error && (
          <p className={styles.error} role="alert">
            {estado.error}
          </p>
        )}
        <button type="submit" className={styles.principal} disabled={enviando}>
          {enviando ? "Un momento..." : "Guardar contraseña"}
        </button>
      </form>
      <Link href="/recuperar" className={styles.enlace}>
        Pedir otro enlace
      </Link>
    </div>
  );
}
