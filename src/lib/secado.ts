import { hojaDe } from "./variedades";

/** Estado de una cosecha en el armario de secado. Lo calcula `tpp.secado_item()` en la base de datos. */
export type EstadoSecado = "secando" | "curando" | "listo" | "reseca" | "moho";

export interface ItemSecado {
  id: number;
  variedad: string;
  gramos: number;
  calidad: number;
  /** Monedas de la cosecha sin multiplicador. */
  monedas: number;
  /** 0 si solo se seca; 24, 48 o 72 si se cura en tarro. */
  curar: number;
  estado: EstadoSecado;
  mult: number;
  bonus: number;
  /** Calidad al sacarla (una estrella menos si está reseca o con moho). */
  cal: number;
  /** Segundos que faltan para que esté lista. */
  faltan: number;
  /** Segundos que faltan para salir de la percha (con curado pasa al tarro). */
  faltan_percha: number;
  /** Segundos que quedan antes de que se pase. */
  expira_en: number;
  dias_curado: number;
  aperturas_hechas: number;
  puede_abrir: boolean;
  /** Monedas si la vendes ahora. */
  precio: number;
}

export interface DatosSecado {
  capacidad: number;
  items: ItemSecado[];
  /** Hora (ms) en la que se recibieron los datos; las cuentas atrás salen de ella. */
  recibido?: number;
}

/** Multiplicador de cada modo de cosecha. */
export const MULT_HUMEDO = 0.5;
export const MULT_SECO = 1;
export const MULT_CURADO: Record<1 | 2 | 3, { mult: number; nombre: string }> = {
  1: { mult: 1.5, nombre: "Curado" },
  2: { mult: 1.75, nombre: "Curado fino" },
  3: { mult: 2, nombre: "Top Shelf" },
};

/** Familia de color de los sprites (fila de las hojas): verde, azulado, dorado, morado, helado. */
const FAMILIAS: Record<string, number> = { clasica: 0, "hoja-azul": 1, dorada: 2, noche: 3, cristal: 4 };
export const familiaDe = (variedad: string) => FAMILIAS[hojaDe(variedad)] ?? 0;

/** Perchas y tarros ocupados ahora. Una cosecha en curado deja la percha a las 12 h, pero reserva el tarro desde el principio. */
export function ocupacion(items: ItemSecado[]) {
  return {
    perchas: items.filter((i) => i.curar === 0 || i.estado === "secando").length,
    tarros: items.filter((i) => i.curar > 0).length,
  };
}

export function tiempoCorto(segundos: number) {
  const s = Math.max(0, Math.ceil(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h >= 24) return `${Math.floor(h / 24)} d ${h % 24} h`;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}

export const ESTADO_TEXTO: Record<EstadoSecado, string> = {
  secando: "Secando",
  curando: "Curando",
  listo: "Lista",
  reseca: "Reseca",
  moho: "Con moho",
};

/** Columna de la hoja de perchas (0 vacía, 1 húmeda, 2 secando, 3 casi seca, 4 lista, 5 reseca). */
export function columnaPercha(i: ItemSecado | null) {
  if (!i) return 0;
  if (i.estado === "reseca") return 5;
  if (i.estado !== "secando" && i.curar === 0) return 4;
  if (i.curar > 0 && i.estado !== "secando") return 0;
  const hecho = 12 * 3600 - i.faltan_percha;
  return hecho < 4 * 3600 ? 1 : hecho < 8 * 3600 ? 2 : 3;
}

/** Columna de la hoja de tarros (0 vacío, 1 reservado, 2 curando, 3 pide abrir, 6 listo, 7 Top Shelf, 8 moho). */
export function columnaTarro(i: ItemSecado | null) {
  if (!i || i.curar === 0) return 0;
  if (i.estado === "secando") return 1;
  if (i.estado === "moho") return 8;
  if (i.estado === "listo") return i.curar === 72 ? 7 : 6;
  return i.puede_abrir ? 3 : 2;
}

/** Pone al día una cosecha pasados `t` segundos desde que se pidió el estado (para las cuentas atrás). */
export function conTiempo(i: ItemSecado, t: number): ItemSecado {
  const faltan = Math.max(0, i.faltan - t);
  const faltanPercha = Math.max(0, i.faltan_percha - t);
  const expira = Math.max(0, i.expira_en - t);
  const estado: EstadoSecado =
    expira <= 0
      ? i.curar > 0
        ? "moho"
        : "reseca"
      : faltan <= 0
        ? "listo"
        : faltanPercha <= 0 && i.curar > 0
          ? "curando"
          : "secando";
  const factor = estado === "reseca" ? 0.8 : estado === "moho" ? 0.5 : 1;
  return {
    ...i,
    estado,
    faltan,
    faltan_percha: faltanPercha,
    expira_en: expira,
    cal: estado === "reseca" || estado === "moho" ? Math.max(1, i.calidad - 1) : i.calidad,
    precio: Math.floor(i.monedas * i.mult * (1 + i.bonus / 100) * factor),
  };
}
