/** Clientes con historia y reputación (8i, parte A). */

export interface Capitulo {
  t: string;
  g: number;
  vars?: string[];
  efectos?: string[];
  q?: number;
  org?: boolean;
  limpia?: boolean;
  curado?: boolean;
  top?: boolean;
  distintas?: number;
  pago: number;
  rep: number;
  plazo?: number;
  viernes?: number;
  rapido?: { plazo: number; mult: number };
  vip?: boolean;
  rosa?: boolean;
}

export interface HistoriaEstado {
  id: string;
  rep: number;
  activa: boolean;
  cap: number;
  n: number;
  capitulo: Capitulo | null;
  plan: { ok: boolean; tengo: number; tomar: Record<string, number> } | null;
  pago: number | null;
  restan: number | null;
  restan_viernes: number | null;
  restan_rapido: number | null;
}

export interface DatosClientes {
  /** Reputación global (0 a 6.000). */
  global: number;
  /** Historias que se pueden llevar a la vez. */
  limite: number;
  activas: number;
  historias: HistoriaEstado[];
  /** Reputación (0 a 1.000) con cada cliente, por clave. */
  reputacion: Record<string, number>;
  /** Momento (ms) en que se recibieron, para ir restando los segundos que pasan. */
  recibido?: number;
}

export interface ClienteHistoria {
  id: string;
  nombre: string;
  rol: string;
  /** Posición en la hoja de retratos de la economía. */
  retrato: number;
  /** Lo que cuenta al conocerse. */
  presentacion: string;
  /** Rango global mínimo para que aparezca (0 = siempre). */
  desde: number;
}

export const CLIENTES_HISTORIA: ClienteHistoria[] = [
  {
    id: "raiz",
    nombre: "MC Raíz",
    rol: "Rapero",
    retrato: 0,
    presentacion: "Un rapero del barrio que sueña con grabar un disco. Le gusta lo que cultivas.",
    desde: 0,
  },
  {
    id: "pilar",
    nombre: "Abuela Pilar",
    rol: "Vecina del tercero",
    retrato: 1,
    presentacion: "Cuida de sus amigas del centro de día y solo quiere cosas cultivadas con mimo.",
    desde: 0,
  },
  {
    id: "ruben",
    nombre: "Rubén",
    rol: "Tatuador",
    retrato: 2,
    presentacion: "Trabaja contra reloj y paga bien a quien le cumple a tiempo.",
    desde: 0,
  },
  {
    id: "condesa",
    nombre: "La Condesa",
    rol: "Clienta VIP",
    retrato: 3,
    presentacion: "Solo trata con los más grandes del barrio. Llega cuando eres una leyenda.",
    desde: 4,
  },
];

export const RANGOS_CLIENTE = [
  { nombre: "Desconocido", desde: 0, nota: "Todavía no te conoce." },
  { nombre: "Conocido", desde: 100, nota: "Cuenta su historia." },
  { nombre: "Habitual", desde: 300, nota: "Paga un 5 % más." },
  { nombre: "De confianza", desde: 600, nota: "Capítulos especiales y un 10 % menos en su objeto." },
  { nombre: "VIP", desde: 1000, nota: "Paga ×1,2 y te da un objeto único." },
] as const;

export const RANGOS_GLOBALES = [
  { nombre: "Vecino", desde: 0, nota: "Una historia a la vez." },
  { nombre: "Cultivador del barrio", desde: 500, nota: "Dos historias a la vez." },
  { nombre: "Conocido en la calle", desde: 1500, nota: "Se abre el mercado negro." },
  { nombre: "Referente", desde: 3000, nota: "10 % de descuento en la tienda." },
  { nombre: "Leyenda", desde: 6000, nota: "Llega La Condesa y la semilla «Corona»." },
] as const;

export const rangoCliente = (p: number) => RANGOS_CLIENTE.findLastIndex((r) => p >= r.desde);
export const rangoGlobal = (p: number) => RANGOS_GLOBALES.findLastIndex((r) => p >= r.desde);

/** Iconos de la hoja de economía (16 × 1). */
export const ICONO_ECO = {
  reputacion: 0,
  vip: 1,
  descuento: 2,
  cadena: 3,
  historia: 4,
  llave: 5,
  candado: 6,
  mercado_negro: 7,
  riesgo: 8,
  inspeccion: 9,
  stock: 10,
  rotacion: 11,
  medicinal: 12,
  plazo: 13,
  organico: 14,
  curado: 15,
} as const;

/** Requisitos de un capítulo como lista de etiquetas. */
export function etiquetasCapitulo(c: Capitulo): { icono: keyof typeof ICONO_ECO; texto: string }[] {
  const r: { icono: keyof typeof ICONO_ECO; texto: string }[] = [];
  if (c.distintas && c.distintas > 1) r.push({ icono: "stock", texto: `${c.distintas} variedades distintas` });
  if (c.q) r.push({ icono: "reputacion", texto: `${c.q} estrellas o más` });
  if (c.org) r.push({ icono: "organico", texto: "Orgánico" });
  if (c.limpia) r.push({ icono: "medicinal", texto: "Sin plagas" });
  if (c.curado) r.push({ icono: "curado", texto: "Curado" });
  if (c.top) r.push({ icono: "vip", texto: "Top Shelf" });
  return r;
}
