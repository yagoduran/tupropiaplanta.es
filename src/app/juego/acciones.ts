"use server";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { Accion, EstadoJuego, RespuestaAccion } from "@/lib/juego";

const ACCIONES: Accion[] = ["regar", "abonar", "podar", "ajustar_luz", "cosechar"];

/** Estado actualizado del jugador y su planta. Devuelve null si no hay sesión. */
export async function obtenerEstado(): Promise<EstadoJuego | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_estado");
  if (error || !data) return null;
  return data as EstadoJuego;
}

export async function hacerAccion(accion: Accion): Promise<RespuestaAccion | { ok: false; error: string }> {
  if (!ACCIONES.includes(accion)) return { ok: false, error: "accion_desconocida" };
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_accion", { p_accion: accion });
  if (error || !data) return { ok: false, error: error?.message?.includes("no_autenticado") ? "sesion" : "red" };
  return data as RespuestaAccion;
}

export async function plantarSemilla(): Promise<RespuestaAccion | { ok: false; error: string }> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_plantar");
  if (error || !data) return { ok: false, error: error?.message?.includes("no_autenticado") ? "sesion" : "red" };
  return data as RespuestaAccion;
}
