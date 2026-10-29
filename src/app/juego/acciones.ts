"use server";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { DatosEstadisticas, DatosPerfil } from "@/lib/perfil";
import type { DatosProgresion } from "@/lib/progresion";
import type { DatosDesafios } from "@/lib/desafios";
import type { DatosMaestria } from "@/lib/maestria";
import type { DatosPrestigio } from "@/lib/prestigio";
import type { DatosMisiones, DatosNotificaciones } from "@/lib/misiones";
import type { RespuestaCruce } from "@/lib/cruces";
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

/** Datos de Mi perfil y Mis plantas. Devuelve null si falla. */
export async function obtenerMiPerfil(): Promise<DatosPerfil | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_mi_perfil");
  if (error || !data) return null;
  return data as DatosPerfil;
}

/** Datos de la pantalla de Estadísticas. Devuelve null si falla. */
export async function obtenerEstadisticas(): Promise<DatosEstadisticas | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_mis_estadisticas");
  if (error || !data) return null;
  return data as DatosEstadisticas;
}

/** Colección, títulos y marcos. Devuelve null si falla. */
export async function obtenerProgresion(): Promise<DatosProgresion | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_progresion");
  if (error || !data) return null;
  return data as DatosProgresion;
}

/** Reclama el premio de un hito de la colección. */
export async function reclamarHito(pct: number): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_reclamar_hito", { p_pct: pct });
  if (error || !data) return fallo(error?.message);
  return data as RespuestaAccion;
}

/** Desafíos de la semana. Devuelve null si falla. */
export async function obtenerDesafios(): Promise<DatosDesafios | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_desafios");
  if (error || !data) return null;
  return data as DatosDesafios;
}

/** Empieza un desafío: crea su planta y pasa a jugarla. */
export async function empezarDesafio(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_empezar_desafio", { p_id: id });
  if (error || !data) return fallo(error?.message);
  return data as RespuestaAccion;
}

/** Misiones del día y de la semana. Devuelve null si falla. */
export async function obtenerMisiones(): Promise<DatosMisiones | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_misiones");
  if (error || !data) return null;
  return data as DatosMisiones;
}

/** Reclama el premio de una misión completada. */
export async function reclamarMision(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_reclamar_mision", { p_id: id });
  if (error || !data) return fallo(error?.message);
  return data as RespuestaAccion;
}

/** Avisos de la campana. Devuelve null si falla. */
export async function obtenerNotificaciones(): Promise<DatosNotificaciones | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_notificaciones");
  if (error || !data) return null;
  return data as DatosNotificaciones;
}

/** Marca como leído un aviso, o todos si no se indica cuál. */
export async function leerNotificaciones(id: number | null): Promise<DatosNotificaciones | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_leer_notificaciones", { p_id: id });
  if (error || !data) return null;
  return data as DatosNotificaciones;
}

/** Maestría de cada variedad. Devuelve null si falla. */
export async function obtenerMaestria(): Promise<DatosMaestria | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_mi_maestria");
  if (error || !data) return null;
  return data as DatosMaestria;
}

/** Compra el siguiente nivel de una rama de mejoras del armario. */
export async function comprarMejora(rama: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_comprar_mejora", { p_rama: rama });
  if (error || !data) return fallo(error?.message);
  return data as RespuestaAccion;
}

export async function comprarHabitacion(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_comprar_habitacion", { p_id: id });
  if (error || !data) return fallo(error?.message);
  return data as RespuestaAccion;
}

export async function elegirHabitacion(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_elegir_habitacion", { p_id: id });
  if (error || !data) return fallo(error?.message);
  return data as RespuestaAccion;
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

/** Cambia la planta con la que se juega. */
export async function elegirHueco(hueco: number): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_elegir_hueco", { p_hueco: hueco });
  if (error || !data) return fallo(error?.message);
  return data as RespuestaAccion;
}

/** Compra el siguiente hueco de cultivo. */
export async function comprarHueco(): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_comprar_hueco");
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

async function cruce(rpc: string, args?: Record<string, unknown>): Promise<RespuestaCruce | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc(rpc, args);
  if (error || !data) return null;
  return data as RespuestaCruce;
}

/** Cosechas disponibles y cruce en marcha. */
export async function obtenerCruces() {
  return cruce("tpp_cruces");
}

export async function iniciarCruce(a: string, b: string) {
  return cruce("tpp_iniciar_cruce", { p_a: a, p_b: b });
}

export async function acelerarCruce() {
  return cruce("tpp_acelerar_cruce");
}

export async function abrirCruce() {
  return cruce("tpp_abrir_cruce");
}

export async function guardarCruce(nombre: string) {
  return cruce("tpp_guardar_cruce", { p_nombre: nombre });
}

type RespuestaPrestigio = DatosPrestigio & { ok?: boolean; error?: string };

async function prestigio(rpc: string, args?: Record<string, unknown>): Promise<RespuestaPrestigio | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc(rpc, args);
  if (error || !data) return null;
  return data as RespuestaPrestigio;
}

/** Datos del prestigio y sus bonificaciones. */
export async function obtenerPrestigio() {
  return prestigio("tpp_prestigio");
}

export async function comprarBonoPrestigio(id: string) {
  return prestigio("tpp_comprar_bono_prestigio", { p_id: id });
}

/** Renace: reinicia el progreso. Hay que enviar la palabra RENACER. */
export async function renacer(confirmacion: string) {
  return prestigio("tpp_renacer", { p_confirmar: confirmacion });
}
