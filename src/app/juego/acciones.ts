"use server";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { Accion, AjustesJuego, DatosRanking, EstadoJuego, RespuestaAccion } from "@/lib/juego";

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

export async function plantarSemilla(variedad = "clasica"): Promise<RespuestaAccion | { ok: false; error: string }> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_plantar", { p_variedad: variedad });
  if (error || !data) return { ok: false, error: error?.message?.includes("no_autenticado") ? "sesion" : "red" };
  return data as RespuestaAccion;
}

type Resultado = RespuestaAccion | { ok: false; error: string };

const fallo = (mensaje?: string): Resultado => ({
  ok: false,
  error: mensaje?.includes("no_autenticado") ? "sesion" : "red",
});

/** Guarda el paso del tutorial. `paso` 0 lo salta; `terminar` da el regalo de bienvenida una sola vez. */
export async function guardarTutorial(paso: number, terminar = false): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_tutorial", { p_paso: paso, p_terminar: terminar });
  if (error || !data) return fallo(error?.message);
  return data as RespuestaAccion;
}

export async function guardarAjustes(ajustes: Partial<AjustesJuego>): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_ajustes", { p_ajustes: ajustes });
  if (error || !data) return fallo(error?.message);
  return data as RespuestaAccion;
}

/** Borra los datos del juego del jugador. La cuenta de acceso no se toca. */
export async function borrarDatosDelJuego(): Promise<{ ok: boolean }> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_borrar_datos");
  return { ok: !error && !!data };
}

/** Clasificación de los mejores jugadores. Devuelve null si falla. */
export async function obtenerRanking(): Promise<DatosRanking | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_ranking");
  if (error || !data) return null;
  return data as DatosRanking;
}

/** Recoge el regalo diario. */
export async function reclamarDiaria(): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_reclamar_diaria");
  if (error || !data) return fallo(error?.message);
  return data as RespuestaAccion;
}

/** Da la ayuda extra tras ver el anuncio: monedas y sin esperas. */
export async function verAnuncio(): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_ver_anuncio");
  if (error || !data) return fallo(error?.message);
  return data as RespuestaAccion;
}

async function conObjeto(rpc: "tpp_comprar" | "tpp_equipar" | "tpp_usar", id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc(rpc, { p_objeto: id });
  if (error || !data) return fallo(error?.message);
  return data as RespuestaAccion;
}

export async function comprarObjeto(id: string): Promise<Resultado> {
  return conObjeto("tpp_comprar", id);
}

export async function equiparObjeto(id: string): Promise<Resultado> {
  return conObjeto("tpp_equipar", id);
}

export async function usarObjeto(id: string): Promise<Resultado> {
  return conObjeto("tpp_usar", id);
}
