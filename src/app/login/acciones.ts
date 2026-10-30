"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { mensajeDeError, type EstadoAcceso } from "@/lib/acceso";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USUARIO = /^[A-Za-z0-9_]{3,20}$/;

function texto(datos: FormData, campo: string) {
  return String(datos.get(campo) ?? "").trim();
}

export async function entrar(_anterior: EstadoAcceso, datos: FormData): Promise<EstadoAcceso> {
  const email = texto(datos, "email");
  const password = String(datos.get("password") ?? "");
  if (!EMAIL.test(email)) return { error: "Escribe un email válido." };
  if (!password) return { error: "Escribe tu contraseña." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: mensajeDeError(error.code) };
  redirect("/");
}

export async function registrar(_anterior: EstadoAcceso, datos: FormData): Promise<EstadoAcceso> {
  const email = texto(datos, "email");
  const password = String(datos.get("password") ?? "");
  const usuario = texto(datos, "usuario");
  const mayorDeEdad = datos.get("mayor") === "on";

  if (!EMAIL.test(email)) return { error: "Escribe un email válido." };
  if (!USUARIO.test(usuario)) {
    return { error: "El nombre de usuario debe tener de 3 a 20 letras, números o guiones bajos." };
  }
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (!mayorDeEdad) return { error: "Debes confirmar que tienes 18 años o más." };

  const cabeceras = await headers();
  const origen = cabeceras.get("origin") ?? `https://${cabeceras.get("host")}`;

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origen}/auth/callback`,
      data: { usuario, mayor_de_edad: true },
    },
  });
  if (error) return { error: mensajeDeError(error.code) };

  // Con la confirmación por correo activa no hay sesión hasta que pulsa el enlace.
  if (!data.session) return { verificar: email };
  redirect("/");
}

async function origenActual() {
  const cabeceras = await headers();
  return cabeceras.get("origin") ?? `https://${cabeceras.get("host")}`;
}

/** Manda el enlace para crear una contraseña nueva. Responde igual exista o no el email. */
export async function pedirRecuperacion(_anterior: EstadoAcceso, datos: FormData): Promise<EstadoAcceso> {
  const email = texto(datos, "email");
  if (!EMAIL.test(email)) return { error: "Escribe un email válido." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origenActual()}/auth/callback?next=/nueva-contrasena`,
  });
  if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
    return { error: mensajeDeError(error.code) };
  }
  return { aviso: "Enlace enviado. Revisa tu bandeja de entrada y la carpeta de spam." };
}

/** Guarda la contraseña nueva (hay que venir del enlace del correo). */
export async function cambiarPassword(_anterior: EstadoAcceso, datos: FormData): Promise<EstadoAcceso> {
  const password = String(datos.get("password") ?? "");
  const repetida = String(datos.get("repetida") ?? "");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== repetida) return { error: "Las dos contraseñas no coinciden." };

  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "El enlace ha caducado. Pide uno nuevo." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: mensajeDeError(error.code) };
  redirect("/");
}

/** Vuelve a mandar el correo de verificación. */
export async function reenviarVerificacion(email: string): Promise<EstadoAcceso> {
  if (!EMAIL.test(email)) return { error: "Escribe un email válido." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${await origenActual()}/auth/callback` },
  });
  if (error) return { error: mensajeDeError(error.code) };
  return { aviso: "Correo reenviado." };
}

/** «Ya lo he verificado»: si ya hay sesión entra al juego; si no, avisa. */
export async function comprobarVerificacion(): Promise<EstadoAcceso> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/");
  return { error: "Todavía no vemos la verificación. Abre el enlace del correo y vuelve aquí." };
}
