/** Mesa de procesado (8j): prensa, extractor y horno. */

export type Puesto = "prensa" | "extractor" | "horno";

export const PUESTOS: { id: Puesto; nombre: string; col: number }[] = [
  { id: "prensa", nombre: "Prensa", col: 0 },
  { id: "extractor", nombre: "Extractor", col: 1 },
  { id: "horno", nombre: "Horno", col: 2 },
];

export interface RecetaProc {
  st: Puesto;
  ins: [string, number][];
  /** Segundos de proceso. */
  t: number;
  out: number;
  /** Veces los 12 por gramo. */
  mult?: number;
  /** Precio por unidad (comestibles). */
  unit?: number;
  /** Segundos de ventana para recoger. */
  win: number;
  ruin: "half" | "all";
  plus: number;
}

export type EstadoTrabajo = "espera" | "procesando" | "listo" | "estropeado";

export interface TrabajoProc {
  rec: string;
  q: number;
  estado: EstadoTrabajo;
  restan: number | null;
  caduca: number | null;
}

export interface EncargoProc {
  k: string;
  n: string;
  /** Hoja del retrato: «cli» = clientes de encargos, «eco» = retratos de economía. */
  sh: "cli" | "eco";
  i: number;
  p: string;
  need: number;
  q: number;
  pay: number;
  hecho: boolean;
  tengo: number;
}

export interface DatosProcesado {
  recetas: Record<string, RecetaProc>;
  restos: { n: number; q: number };
  cogollos: { n: number; q: number };
  masas: Record<string, number>;
  puestos: Record<Puesto, TrabajoProc[]>;
  prod: Record<string, { n: number; q: number }>;
  encargos: EncargoProc[];
  mult_ventas: number;
  /** Segundos que faltan para que se renueven los encargos. */
  queda: number;
  /** Momento (ms) en que se recibieron, para ir restando los segundos que pasan. */
  recibido?: number;
}

/** Orden de la hoja de iconos de procesado (16 × 1). */
export const ICONO_PROC = {
  hachis: 0,
  rosin: 1,
  extracto: 2,
  diamantes: 3,
  galletas: 4,
  brownies: 5,
  restos: 6,
  cogollos: 7,
  "masa-galletas": 8,
  "masa-brownie": 9,
  prensa: 10,
  extractor: 11,
  horno: 12,
  cola: 13,
  recoger: 14,
  estropeado: 15,
} as const;
export type IdIconoProc = keyof typeof ICONO_PROC;

export const NOMBRE_PROC: Record<string, string> = {
  hachis: "Hachís",
  rosin: "Rosin",
  extracto: "Extracto",
  diamantes: "Diamantes",
  galletas: "Galletas",
  brownies: "Brownies",
  restos: "Restos de poda",
  cogollos: "Cogollos de 1–2★",
  "masa-galletas": "Masa de galletas",
  "masa-brownie": "Masa de brownie",
};

export const PRECIO_MASA: Record<string, number> = { "masa-galletas": 120, "masa-brownie": 150 };

const FACTOR_Q = [0.8, 0.8, 0.9, 1, 1.2, 1.5];
export const factorCalidad = (q: number) => FACTOR_Q[Math.max(1, Math.min(5, Math.round(q)))];

export const esComestible = (r: RecetaProc) => r.unit !== undefined;

/** Precio de una unidad (o gramo) con una calidad, sin multiplicador de ventas. */
export const precioProducto = (r: RecetaProc, q: number) => (r.unit ?? 12 * (r.mult ?? 1)) * factorCalidad(q);

/** Cuánto tienes de un ingrediente. */
export function tengoIngrediente(d: DatosProcesado, id: string): number {
  if (id === "restos") return d.restos.n;
  if (id === "cogollos") return d.cogollos.n;
  if (id.startsWith("masa-")) return d.masas[id] ?? 0;
  return d.prod[id]?.n ?? 0;
}

/** Calidad que saldría de una receta con lo que tienes (la peor de los ingredientes + bonificación). */
export function calidadResultante(d: DatosProcesado, r: RecetaProc): number {
  let q = 6;
  for (const [id] of r.ins) {
    if (id.startsWith("masa-")) continue;
    const v = id === "restos" ? d.restos.q : id === "cogollos" ? d.cogollos.q : (d.prod[id]?.q ?? 3);
    q = Math.min(q, Math.round(v));
  }
  if (q > 5) q = 3;
  return Math.max(1, Math.min(5, q + r.plus));
}

/** Texto «2 h 05 min» o «12 min 08 s» para un tiempo en segundos. */
export function duracion(s: number) {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
  return `${m} min ${String(t % 60).padStart(2, "0")} s`;
}

/** Estado de un trabajo teniendo en cuenta los segundos que han pasado desde que se recibió. */
export function trabajoAhora(t: TrabajoProc, r: RecetaProc, pasado: number): TrabajoProc {
  if (t.estado === "procesando" && t.restan !== null) {
    const rem = t.restan - pasado;
    if (rem > 0) return { ...t, restan: rem };
    const caduca = r.win + rem;
    return caduca > 0
      ? { ...t, estado: "listo", restan: null, caduca }
      : { ...t, estado: "estropeado", restan: null, caduca: null };
  }
  if (t.estado === "listo" && t.caduca !== null) {
    const caduca = t.caduca - pasado;
    return caduca > 0 ? { ...t, caduca } : { ...t, estado: "estropeado", caduca: null };
  }
  return t;
}
