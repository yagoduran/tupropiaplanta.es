import type { DatosCasa } from "./casa";
import type { HibridoPropio } from "./variedades";
import type { Estado, IdIcono } from "./diseno";
import type { PlagaJuego } from "./plagas";
import { tonoPorPorcentaje, type Medidor } from "./estado";

export type Accion = "regar" | "abonar" | "podar" | "ajustar_luz" | "cosechar";

/** Pantallas del juego: las pestañas y las del menú de usuario. */
export type PantallaJuego =
  | IdIcono
  | "perfil"
  | "plantas"
  | "inventario"
  | "estadisticas"
  | "coleccion"
  | "titulos"
  | "desafios"
  | "armario"
  | "habitaciones"
  | "maestria"
  | "laboratorio"
  | "prestigio"
  | "misiones"
  | "encargos"
  | "amigos"
  | "visita"
  | "perfil_publico"
  | "regalo"
  | "eventos"
  | "pase"
  | "mercado";

export interface AjustesJuego {
  volumen_efectos: number;
  volumen_musica: number;
  avisos: boolean;
  /** Avatar elegido (ver `AVATARES`). */
  avatar?: string;
  /** Título y marco de perfil equipados (ver `src/lib/progresion.ts`). */
  titulo?: string;
  marco?: string;
  /** Si es true, el jugador no sale en el ranking. */
  ranking_oculto?: boolean;
  /** País elegido (2 letras) para el ranking nacional; vacío lo quita. */
  pais?: string;
  /** Si es true, no sales en las búsquedas de jugadores (tus amigos sí te ven). */
  perfil_oculto?: boolean;
}

export interface FilaRanking {
  pos: number;
  usuario: string;
  nivel: number;
  cosechas: number;
  yo: boolean;
  creador?: boolean;
}

export type AmbitoRanking = "mundial" | "nacional" | "amigos";

export interface DatosRanking {
  ambito: AmbitoRanking;
  /** País elegido por el jugador; null si no ha elegido. */
  pais: string | null;
  top: FilaRanking[];
  /** Puesto del jugador; null si está oculto. */
  mia: { pos: number; nivel: number; cosechas: number } | null;
  total: number;
}

export interface EquipoJuego {
  maceta: string;
  luz: string;
  decoracion: string[];
}

export interface PerfilJuego {
  usuario: string;
  monedas: number;
  xp: number;
  nivel: number;
  xp_pct: number;
  tutorial_hecho: boolean;
  tutorial_paso: number;
  ajustes: AjustesJuego;
  equipo: EquipoJuego;
  /** Objetos que tiene el jugador y cuántos. Los gratuitos no aparecen. */
  inventario: Record<string, number>;
  logros: { valores: Record<string, number>; hechos: string[] };
  /** Logros conseguidos justo en esta respuesta. */
  logros_nuevos: string[];
  diaria: { racha: number; disponible: boolean; premios: number[] };
  /** Ayudas por ver anuncio que quedan hoy y monedas que da cada una. */
  anuncios: { restantes: number; monedas: number; recuperar: boolean };
  huecos: HuecosJuego;
  /** Semillas híbridas que tiene el jugador y sus híbridos propios. */
  hibridas: { semillas: string[]; propias: HibridoPropio[] };
  /** Veces que ha renacido y bonos de prestigio comprados. */
  prestigio: { n: number; bonos: Record<string, boolean> };
  /** Avisos sin leer en la campana y misiones completadas por reclamar. */
  avisos: number;
  misiones_listas: number;
  /** Habitación y mejoras del armario. */
  casa: DatosCasa;
  /** Robo que el jugador aún no ha visto. */
  robo?: { monedas: number; en: string } | null;
}

/** Número de hueco reservado para la planta del desafío. Tiene que coincidir con la base de datos. */
export const HUECO_DESAFIO = 9;

export interface HuecosJuego {
  activo: number;
  /** Máximo de huecos que se pueden tener. */
  maximo: number;
  /** Desafío en curso (hueco especial `HUECO_DESAFIO`), si lo hay. */
  desafio: string | null;
  desbloqueados: number;
  /** Precio y nivel del siguiente hueco por comprar; null si ya están todos. */
  siguiente: { precio: number; nivel: number } | null;
  lista: {
    hueco: number;
    vida: "viva" | "muerta" | "cosechada" | "vacio";
    plaga: boolean;
    variedad: string | null;
    fase: number | null;
  }[];
}

export interface PlantaJuego {
  id: string;
  variedad: string;
  /** Si la planta sigue viva, ha muerto o ya se ha cosechado. */
  vida: "viva" | "muerta" | "cosechada";
  fase: number;
  estado: Estado;
  agua: number;
  nutrientes: number;
  luz: number;
  temperatura: number;
  ph: number;
  salud: number;
  segundos_vida: number;
  /** Segundos que faltan para poder repetir cada acción. */
  esperas: Partial<Record<Accion, number>>;
  /** Plaga o hongo que sufre ahora, si lo hay. */
  plaga: PlagaJuego | null;
  /** Si es la planta de un desafío: cuál, segundos que quedan y puntos conseguidos al cosechar. */
  desafio: { id: string; restan: number; dias: number; puntos: number | null } | null;
}

export interface EstadoJuego {
  perfil: PerfilJuego;
  planta: PlantaJuego | null;
}

export interface RespuestaAccion extends EstadoJuego {
  ok: boolean;
  error?: string;
  recompensa?: number;
  /** Monedas ganadas por cuidar la planta. */
  ganadas?: number;
}

/** Segundos de espera total de cada acción, para dibujar el anillo. */
export const ESPERA_TOTAL: Record<Accion, number> = {
  regar: 300,
  abonar: 1800,
  podar: 3600,
  ajustar_luz: 3600,
  cosechar: 0,
};

export const MENSAJES_ERROR: Record<string, string> = {
  espera: "Todavía no puedes repetir eso. Espera un poco.",
  fase_insuficiente: "Tu planta aún no está lista para eso.",
  sin_planta: "No tienes ninguna planta. Planta una semilla.",
  planta_muerta: "Tu planta ha muerto. Planta una semilla nueva.",
  ya_hay_planta: "Ya tienes una planta viva.",
  variedad_bloqueada: "Todavía no tienes el nivel para esa semilla.",
  variedad_desconocida: "Esa semilla no existe.",
  monedas_insuficientes: "No tienes monedas suficientes.",
  nivel_insuficiente: "Todavía no tienes el nivel necesario.",
  sin_plaga: "Tu planta no tiene ninguna plaga.",
  tratamiento_incorrecto: "Ese producto no sirve para esta plaga.",
  huecos_maximos: "Ya tienes todos los huecos de cultivo.",
  hueco_bloqueado: "Ese hueco todavía no es tuyo.",
  bono_comprado: "Ya tienes esa bonificación.",
  bono_bloqueado: "Antes necesitas la bonificación anterior.",
  puntos_insuficientes: "No tienes puntos de prestigio suficientes.",
  confirmacion: "Escribe RENACER para confirmar.",
  sin_semilla: "Todavía no tienes la semilla de esa variedad.",
  cruce_en_curso: "Ya tienes un cruce en marcha.",
  cosecha_invalida: "Esas plantas no sirven para cruzar.",
  cruce_no_listo: "El cruce todavía no ha terminado.",
  sin_cruce: "No hay ningún cruce en marcha.",
  nombre_invalido: "El nombre solo puede tener letras y espacios (hasta 20).",
  huecos_automaticos: "Los huecos ahora llegan con las habitaciones y la mejora de capacidad.",
  mejora_comprada: "Ya tienes todos los niveles de esa mejora.",
  habitacion_no_tuya: "Primero tienes que desbloquear esa habitación.",
  mejora_desconocida: "Esa mejora no existe.",
  habitacion_comprada: "Esa habitación ya es tuya.",
  habitacion_bloqueada: "Todavía no puedes entrar en esa habitación.",
  habitacion_desconocida: "Esa habitación no existe.",
  desafio_riegos: "Sequía: hoy ya has usado tus 3 riegos.",
  desafio_prohibido: "En este desafío no puedes usar ese abono.",
  desafio_en_curso: "Ya tienes un desafío en curso.",
  desafio_jugado: "Ya has jugado este desafío esta semana.",
  hueco_desafio: "Vuelve a tu cultivo para plantar una semilla.",
  usuario_desconocido: "No hemos encontrado a ese jugador.",
  a_ti_mismo: "No puedes añadirte a ti mismo.",
  ya_amigos: "Ya sois amigos.",
  limite_amigos: "Se ha alcanzado el máximo de 50 amigos.",
  limite_solicitudes: "Tienes demasiadas solicitudes pendientes (máximo 20).",
  sin_solicitud: "Esa solicitud ya no existe.",
  no_es_amigo: "Solo puedes hacer eso con tus amigos.",
  visita_ya_regada: "Hoy ya has regado la planta de este amigo.",
  visita_limite: "Hoy ya has regado 5 plantas de amigos. Vuelve mañana.",
  visita_sin_planta: "Tu amigo no tiene ninguna planta viva ahora mismo.",
  saludo_ya_enviado: "Hoy ya has saludado a este amigo.",
  saludo_desconocido: "Ese saludo no existe.",
  regalo_desconocido: "Ese regalo no existe.",
  regalo_limite: "Hoy ya has enviado tus 3 regalos. Vuelve mañana.",
  regalo_ya_enviado: "Hoy ya le has enviado un regalo a este amigo.",
  regalo_monedas_limite: "Hoy no se pueden enviar más monedas a este amigo, o ya has regalado monedas hoy.",
  regalo_sin_abono: "No tienes ningún abono normal para regalar.",
  ya_lo_tienes: "Ya tienes ese objeto.",
  precio_fuera_rango: "El precio tiene que estar entre la mitad y cinco veces el de la tienda.",
  mercado_limite: "Ya tienes 10 ofertas a la venta. Retira alguna para publicar otra.",
  objeto_en_uso: "No puedes vender un objeto que llevas puesto. Quítalo antes.",
  objeto_desconocido: "Ese objeto no se puede vender.",
  oferta_no_disponible: "Esa oferta ya no está disponible.",
  oferta_propia: "No puedes comprar tus propias ofertas.",
  compras_limite: "Hoy ya has hecho 10 compras en el mercado. Vuelve mañana.",
  pase_invalido: "Ahora no hay ningún pase de temporada en marcha.",
  pase_nivel: "Todavía no has llegado a ese nivel del pase.",
  pase_bloqueado: "Desbloquea el pase especial para reclamar este premio.",
  pase_reclamado: "Ya has reclamado ese premio.",
  pase_comprado: "Ya tienes el pase especial de esta temporada.",
  mision_desconocida: "Esa misión no existe.",
  mision_reclamada: "Ya has reclamado esa misión.",
  mision_no_lista: "Todavía no has completado esa misión.",
  encargo_desconocido: "Ese encargo ya no está disponible.",
  faltan_gramos: "Todavía no tienes los gramos que piden.",
  recuperar_agotado: "Hoy ya has recuperado una planta. Vuelve mañana.",
  nada_que_recuperar: "No hay ninguna planta que recuperar en este hueco.",
  anuncios_agotados: "Hoy ya no quedan más ayudas. Vuelve mañana.",
  diaria_ya_reclamada: "Hoy ya has recogido tu regalo. Vuelve mañana.",
  no_lo_tienes: "Todavía no tienes ese objeto.",
  sin_existencias: "No te quedan unidades. Compra más en la tienda.",
  fase_incorrecta: "Ese abono no sirve en la fase actual de tu planta.",
  ya_aplicado: "Tu planta ya tiene ese mejorador.",
  sesion: "Tu sesión ha caducado. Vuelve a entrar.",
  red: "No se ha podido conectar. Inténtalo de nuevo.",
};

const dosCifras = (n: number) => String(n).padStart(2, "0");

export function formatoVida(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  return `${Math.floor(s / 86400)}d ${dosCifras(Math.floor((s % 86400) / 3600))}h ${dosCifras(Math.floor((s % 3600) / 60))}m ${dosCifras(s % 60)}s`;
}

const coma = (n: number) => String(n).replace(".", ",");

/** Herramientas de medida del jugador: sin ellas, la temperatura y el pH se ven como "?". */
export interface Medidas {
  termometro: boolean;
  medidorPh: boolean;
}

export function medidoresDe(p: PlantaJuego, medidas: Medidas = { termometro: true, medidorPh: true }): Medidor[] {
  const m = (id: IdIcono, nombre: string, valor: number, texto: string, extra: Partial<Medidor> = {}): Medidor => ({
    id,
    nombre,
    porcentaje: Math.max(0, Math.min(100, valor)),
    valor: texto,
    tono: tonoPorPorcentaje(valor),
    ...extra,
  });
  return [
    m("agua", "Agua", p.agua, `${Math.round(p.agua)}%`),
    m("nutrientes", "Nutrientes", p.nutrientes, `${Math.round(p.nutrientes)}%`, { nombreCorto: "Nutr." }),
    m("luz", "Luz", p.luz, `${Math.round(p.luz)}%`),
    medidas.termometro
      ? m(
          "temperatura",
          "Temperatura",
          p.temperatura >= 20 && p.temperatura <= 28 ? 100 : p.temperatura >= 18 && p.temperatura <= 30 ? 50 : 20,
          `${p.temperatura} °C`,
          {
            nombreCorto: "Temp.",
            valorCorto: `${p.temperatura}°`,
          },
        )
      : m("temperatura", "Temperatura", 0, "?", { nombreCorto: "Temp.", tono: "aviso" }),
    medidas.medidorPh
      ? m("ph", "pH", p.ph >= 6 && p.ph <= 7 ? 100 : p.ph >= 5.8 && p.ph <= 7.4 ? 50 : 20, coma(p.ph))
      : m("ph", "pH", 0, "?", { tono: "aviso" }),
    m("salud", "Salud", p.salud, `${Math.round(p.salud)}%`),
  ];
}
