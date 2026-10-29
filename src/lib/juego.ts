import type { Estado, IdIcono } from "./diseno";
import type { PlagaJuego } from "./plagas";
import { tonoPorPorcentaje, type Medidor } from "./estado";

export type Accion = "regar" | "abonar" | "podar" | "ajustar_luz" | "cosechar";

/** Pantallas del juego: las pestañas y las del menú de usuario. */
export type PantallaJuego = IdIcono | "perfil" | "plantas" | "inventario" | "estadisticas";

export interface AjustesJuego {
  volumen_efectos: number;
  volumen_musica: number;
  avisos: boolean;
  /** Avatar elegido (ver `AVATARES`). */
  avatar?: string;
  /** Si es true, el jugador no sale en el ranking. */
  ranking_oculto?: boolean;
}

export interface FilaRanking {
  pos: number;
  usuario: string;
  nivel: number;
  yo: boolean;
}

export interface DatosRanking {
  top: FilaRanking[];
  /** Puesto del jugador; null si está oculto. */
  mia: { pos: number; nivel: number } | null;
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
  anuncios: { restantes: number; monedas: number };
  huecos: HuecosJuego;
}

export interface HuecosJuego {
  activo: number;
  desbloqueados: number;
  /** Precio y nivel del siguiente hueco por comprar; null si ya están todos. */
  siguiente: { precio: number; nivel: number } | null;
  lista: { hueco: number; vida: "viva" | "muerta" | "cosechada" | "vacio"; plaga: boolean }[];
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
  ya_lo_tienes: "Ya tienes ese objeto.",
  sin_plaga: "Tu planta no tiene ninguna plaga.",
  tratamiento_incorrecto: "Ese producto no sirve para esta plaga.",
  huecos_maximos: "Ya tienes todos los huecos de cultivo.",
  hueco_bloqueado: "Ese hueco todavía no es tuyo.",
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
