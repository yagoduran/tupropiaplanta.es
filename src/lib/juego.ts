import type { Estado, IdIcono } from "./diseno";
import { tonoPorPorcentaje, type Medidor } from "./estado";

export type Accion = "regar" | "abonar" | "podar" | "ajustar_luz" | "cosechar";

export interface AjustesJuego {
  volumen_efectos: number;
  volumen_musica: number;
  avisos: boolean;
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

export function medidoresDe(p: PlantaJuego): Medidor[] {
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
    m("temperatura", "Temperatura", 60, `${p.temperatura} °C`, { nombreCorto: "Temp.", valorCorto: `${p.temperatura}°` }),
    m("ph", "pH", 55, coma(p.ph)),
    m("salud", "Salud", p.salud, `${Math.round(p.salud)}%`),
  ];
}
