"use server";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { DatosEstadisticas, DatosPerfil } from "@/lib/perfil";
import type { DatosProgresion } from "@/lib/progresion";
import type { DatosDesafios } from "@/lib/desafios";
import type { DatosMaestria } from "@/lib/maestria";
import type { DatosPrestigio } from "@/lib/prestigio";
import type { DatosEncargos } from "@/lib/encargos";
import type { DatosMisiones, DatosNotificaciones } from "@/lib/misiones";
import type { DatosEventos, DatosPase } from "@/lib/temporada";
import type { DatosAmigos, DatosRegalos, DatosVisita, PerfilPublicoDatos, Resultado as Jugadores } from "@/lib/amigos";
import type { DatosMercado } from "@/lib/mercado";
import type { RespuestaCruce } from "@/lib/cruces";
import type { Accion, AjustesJuego, AmbitoRanking, DatosRanking, EstadoJuego, RespuestaAccion } from "@/lib/juego";

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
export async function obtenerRanking(ambito: AmbitoRanking): Promise<DatosRanking | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_ranking", { p_ambito: ambito });
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

/** Acaricia al gato (cuenta para el logro, como mucho una vez cada 5 segundos). */
export async function acariciarGato(): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_acariciar_gato");
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

/** Llama a una función de la base de datos y devuelve su respuesta, o null si falla. */
async function llamar<T>(funcion: string, argumentos?: Record<string, unknown>): Promise<T | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc(funcion, argumentos);
  if (error || !data) return null;
  return data as T;
}

/** Amigos, solicitudes y bloqueados. */
export const obtenerAmigos = async () => llamar<DatosAmigos>("tpp_amigos");
export const buscarJugadores = async (texto: string) => llamar<Jugadores[]>("tpp_buscar_jugadores", { p_texto: texto });
export const enviarSolicitud = async (usuario: string) =>
  llamar<DatosAmigos>("tpp_enviar_solicitud", { p_usuario: usuario });
export const responderSolicitud = async (usuario: string, aceptar: boolean) =>
  llamar<DatosAmigos>("tpp_responder_solicitud", { p_usuario: usuario, p_aceptar: aceptar });
export const quitarAmigo = async (usuario: string) => llamar<DatosAmigos>("tpp_quitar_amigo", { p_usuario: usuario });
export const bloquearJugador = async (usuario: string) => llamar<DatosAmigos>("tpp_bloquear", { p_usuario: usuario });
export const desbloquearJugador = async (usuario: string) =>
  llamar<DatosAmigos>("tpp_desbloquear", { p_usuario: usuario });
export const obtenerPerfilPublico = async (usuario: string) =>
  llamar<PerfilPublicoDatos>("tpp_perfil_publico", { p_usuario: usuario });
export const visitarAmigo = async (usuario: string) => llamar<DatosVisita>("tpp_visitar", { p_usuario: usuario });
export const saludarAmigo = async (usuario: string, emoji: string) =>
  llamar<{ ok: boolean; error?: string; saludo?: string }>("tpp_saludar", { p_usuario: usuario, p_emoji: emoji });

/** Regalos que quedan hoy. */
export const obtenerRegalos = async () => llamar<DatosRegalos>("tpp_regalos");

/** Envía un regalo a un amigo, con un saludo opcional. */
export async function enviarRegalo(
  usuario: string,
  tipo: string,
  saludo: string | null,
): Promise<(RespuestaAccion & Partial<DatosRegalos>) | { ok: false; error: string }> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_enviar_regalo", {
    p_usuario: usuario,
    p_tipo: tipo,
    p_saludo: saludo,
  });
  if (error || !data) return fallo(error?.message);
  return data as RespuestaAccion & Partial<DatosRegalos>;
}

/** Mercado entre jugadores. */
export const obtenerMercado = async () => llamar<DatosMercado>("tpp_mercado");

type RespuestaMercado = (RespuestaAccion & Partial<DatosMercado>) | { ok: false; error: string };

async function llamarMercado(funcion: string, argumentos?: Record<string, unknown>): Promise<RespuestaMercado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc(funcion, argumentos);
  if (error || !data) return fallo(error?.message);
  return data as RespuestaMercado;
}
export const publicarOferta = async (objeto: string, precio: number) =>
  llamarMercado("tpp_mercado_publicar", { p_objeto: objeto, p_precio: Math.trunc(precio) });
export const comprarOferta = async (id: number) => llamarMercado("tpp_mercado_comprar", { p_id: id });
export const retirarOferta = async (id: number) => llamarMercado("tpp_mercado_retirar", { p_id: id });
export const republicarOferta = async (id: number) => llamarMercado("tpp_mercado_republicar", { p_id: id });
export const cobrarOferta = async (id: number) => llamarMercado("tpp_mercado_cobrar", { p_id: id });

/** Eventos de temporada. */
export const obtenerEventos = async () => llamar<DatosEventos>("tpp_evento");
export const obtenerPase = async () => llamar<DatosPase>("tpp_pase");

type RespuestaPase = (RespuestaAccion & Partial<DatosPase>) | { ok: false; error: string };

/** Reclama el premio de un nivel del pase (pista g = gratis, s = especial). */
export async function reclamarPase(nivel: number, pista: "g" | "s"): Promise<RespuestaPase> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_reclamar_pase", { p_nivel: nivel, p_pista: pista });
  if (error || !data) return fallo(error?.message);
  return data as RespuestaPase;
}

/** Compra el pase especial de la temporada. */
export async function comprarPase(): Promise<RespuestaPase> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_comprar_pase");
  if (error || !data) return fallo(error?.message);
  return data as RespuestaPase;
}

/** Riega la planta de un amigo. */
export async function regarVisita(usuario: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_regar_visita", { p_usuario: usuario });
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

/** Encargos del móvil y gramos guardados. Devuelve null si falla. */
export async function obtenerEncargos(): Promise<DatosEncargos | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_encargos");
  if (error || !data) return null;
  return data as DatosEncargos;
}

/** Entrega un encargo con los gramos del almacén. */
export async function entregarEncargo(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("tpp_entregar_encargo", { p_id: id });
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

/** Marca como visto el robo pendiente. */
export async function verRobo(): Promise<void> {
  const supabase = await crearClienteServidor();
  await supabase.rpc("tpp_ver_robo");
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
