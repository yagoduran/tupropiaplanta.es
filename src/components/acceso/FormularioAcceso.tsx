"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { entrar, registrar } from "@/app/login/acciones";
import type { EstadoAcceso } from "@/lib/acceso";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import styles from "./acceso.module.css";
import { VerificarEmail } from "./VerificarEmail";

const INICIAL: EstadoAcceso = {};

export function FormularioAcceso({ modo, errorInicial }: { modo: "entrar" | "registro"; errorInicial?: string }) {
  const esRegistro = modo === "registro";
  const [estado, accion, enviando] = useActionState(esRegistro ? registrar : entrar, INICIAL);
  const [mayor, setMayor] = useState(false);
  const [errorGoogle, setErrorGoogle] = useState<string>();
  const [ocultoPara, setOcultoPara] = useState<EstadoAcceso>();

  const puedeEnviar = !enviando && (!esRegistro || mayor);
  const error = estado.error ?? errorGoogle ?? errorInicial;

  async function conGoogle() {
    setErrorGoogle(undefined);
    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setErrorGoogle("No se ha podido iniciar sesión con Google. Inténtalo de nuevo.");
  }

  if (estado.verificar && ocultoPara !== estado) {
    return <VerificarEmail email={estado.verificar} alCambiar={() => setOcultoPara(estado)} />;
  }

  return (
    <div className={styles.panel}>
      <div className={styles.pestanas}>
        <Link href="/login" className={`${styles.pestana} ${!esRegistro ? styles.pestanaActiva : ""}`}>
          Entrar
        </Link>
        <Link href="/registro" className={`${styles.pestana} ${esRegistro ? styles.pestanaActiva : ""}`}>
          Crear cuenta
        </Link>
      </div>

      <form action={accion} className={styles.formulario} noValidate>
        {esRegistro && (
          <label className={styles.campo}>
            Nombre de usuario
            <input
              name="usuario"
              type="text"
              autoComplete="username"
              placeholder="plantita_23"
              maxLength={20}
              required
            />
          </label>
        )}
        <label className={styles.campo}>
          Email
          <input name="email" type="email" autoComplete="email" placeholder="tu@email.com" required />
        </label>
        <label className={styles.campo}>
          Contraseña
          <input
            name="password"
            type="password"
            autoComplete={esRegistro ? "new-password" : "current-password"}
            placeholder="Mínimo 8 caracteres"
            required
          />
        </label>

        {!esRegistro && (
          <Link href="/recuperar" className={styles.olvido}>
            ¿Has olvidado tu contraseña?
          </Link>
        )}

        {esRegistro && (
          <label className={styles.edad}>
            <input type="checkbox" name="mayor" checked={mayor} onChange={(e) => setMayor(e.target.checked)} />
            <span className={styles.casilla} aria-hidden />
            <span>
              Confirmo que tengo <strong>18 años o más</strong> y acepto las condiciones de uso.
            </span>
          </label>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {estado.aviso && (
          <p className={styles.aviso} role="status">
            {estado.aviso}
          </p>
        )}

        <button type="submit" className={styles.principal} disabled={!puedeEnviar}>
          {enviando ? "Un momento..." : esRegistro ? "Crear cuenta" : "Entrar"}
        </button>
      </form>

      <div className={styles.separador}>
        <span />
        <em>o</em>
        <span />
      </div>

      <button type="button" className={styles.google} onClick={conGoogle}>
        <span className={styles.logoGoogle} aria-hidden>
          G
        </span>
        Continuar con Google
      </button>

      <div className={styles.aviso18}>
        <span className={styles.sello}>+18</span>
        <span>
          Juego solo para mayores de 18 años. Es un simulador de cultivo: no vende ni promociona ningún producto.
        </span>
      </div>
    </div>
  );
}
