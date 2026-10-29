"use server";

import { crearClienteServidor } from "@/lib/supabase/servidor";

export type ResultadoContacto = { ok: true; caso: string } | { ok: false; error: string };

const ERRORES: Record<string, string> = {
  email_invalido: "El email no parece correcto.",
  mensaje_invalido: "El mensaje tiene que tener entre 10 y 2000 letras.",
  demasiados: "Has enviado muchos mensajes seguidos. Inténtalo de nuevo más tarde.",
};

/** Guarda el mensaje de contacto. Funciona también sin haber iniciado sesión. */
export async function enviarContacto(datos: {
  asunto: string;
  email: string;
  mensaje: string;
  tecnicos: string | null;
}): Promise<ResultadoContacto> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_contacto", {
    p_asunto: datos.asunto,
    p_email: datos.email,
    p_mensaje: datos.mensaje,
    p_datos: datos.tecnicos,
  });
  if (error || !data) {
    const clave = Object.keys(ERRORES).find((k) => error?.message?.includes(k));
    return { ok: false, error: clave ? ERRORES[clave] : "No se ha podido enviar. Inténtalo de nuevo en un momento." };
  }
  return { ok: true, caso: (data as { caso: string }).caso };
}
