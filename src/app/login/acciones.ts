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
  if (error) return { error: mensajeDeError(error.code, error.message) };
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
  if (error) return { error: mensajeDeError(error.code, error.message) };

  // Con la confirmación por correo activa no hay sesión hasta que pulsa el enlace.
  if (!data.session) {
    return { aviso: "Te hemos enviado un correo. Pulsa el enlace para activar tu cuenta." };
  }
  redirect("/");
}
