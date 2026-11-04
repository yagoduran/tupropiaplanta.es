/** Mercado semanal (8h): cada lunes a las 00:00 (Madrid) cambia la demanda, igual para todos. */

export interface SemanaMercado {
  /** Lunes de la semana (AAAA-MM-DD). */
  lunes: string;
  /** Variedad estrella (+40 a +60 %). */
  top: string;
  /** Variedad en baja (−20 a −30 %). */
  low: string;
  /** Cambio en porcentaje de cada variedad que hay en la lista esa semana. */
  mods: Record<string, number>;
}

export interface DatosMercadoSemanal {
  lunes: string;
  /** Segundos que faltan para el próximo lunes a las 00:00. */
  queda: number;
  /** Edición de temporada que está en su estación. */
  edicion: string;
  /** Las 8 últimas semanas, de la más antigua a la actual. */
  semanas: SemanaMercado[];
  /** Precio base por gramo de cada variedad. */
  base: Record<string, number>;
  /** Gramos guardados de cada variedad. */
  almacen: Record<string, number>;
  /** Calidad media (en estrellas) de los gramos guardados. */
  calidad: Record<string, number>;
  mult_ventas: number;
  /** Momento (ms) en que se recibió, para ir restando los segundos que pasan. */
  recibido?: number;
}

export type Tendencia = "alza" | "baja" | "estable";

/** Alza: más de +5 %. Baja: menos de −5 %. Estable: entre ambos. */
export const tendencia = (p: number): Tendencia => (p > 5 ? "alza" : p < -5 ? "baja" : "estable");

export const TENDENCIA = {
  alza: { texto: "En alza", fondo: "#c9f26b", icono: 0 },
  baja: { texto: "En baja", fondo: "#f7b072", icono: 1 },
  estable: { texto: "Estable", fondo: "#f2ec9a", icono: 2 },
} as const;

/** Hoja de iconos 6 × 1: alza, baja, estable, mercado, calendario, noticia. */
export const ICONO_MERCADO = { alza: 0, baja: 1, estable: 2, mercado: 3, calendario: 4, noticia: 5 } as const;

export const textoCambio = (p: number) => `${p > 0 ? "+" : p < 0 ? "−" : "±"}${Math.abs(p)} %`;

/** Precio por gramo de la semana (igual que `tpp.mercado_precio`: el .5 sube). */
export const precioSemana = (base: number, p: number) => Math.max(1, Math.floor((base * (100 + p) + 50) / 100));

/** Cliente (índice de `CLIENTES`), noticia del barrio y cita de quien anuncia la estrella de la semana. */
export const NOTICIAS: Record<string, [number, string, string]> = {
  dorada: [
    5,
    "Escapada de surf a Canarias. Medio barrio se va de viaje y quiere llevarse algo cítrico.",
    "Nos vamos todos a Canarias y solo piden Dorada. Pagan lo que les digas.",
  ],
  noche: [
    2,
    "Los clubs abren hasta tarde toda la semana.",
    "Todos los DJs me piden Noche Púrpura. Si tienes, guárdamela.",
  ],
  "hoja-azul": [
    6,
    "Concurso de cocina en el mercado del barrio.",
    "Los cocineros se pelean por la Hoja Azul. Yo la primera.",
  ],
  cristal: [7, "Feria de coleccionistas en el centro.", "Cristal Helado. Pago bastante más que el mes pasado."],
  clasica: [0, "Fiestas del barrio con verbena en la plaza.", "Con las fiestas todo el mundo quiere la de siempre."],
  aurora: [8, "Exposición de arte en la nave de la estación.", "Los artistas solo hablan de Aurora esta semana."],
  "sol-medianoche": [11, "Gira de conciertos de rock por la provincia.", "Para la gira, Sol de Medianoche. Mucha."],
  "menta-nocturna": [
    4,
    "Semana de guardias dobles en el hospital.",
    "Menta Nocturna para después de los turnos, por favor.",
  ],
  "brisa-dorada": [
    10,
    "Congreso internacional en el hotel del puerto.",
    "Brisa Dorada para los invitados del congreso.",
  ],
  "verde-azulado": [9, "Ruta larga de camioneros hasta el norte.", "Verde Azulado para el camino. Al por mayor."],
  "ambar-antiguo": [3, "Torneo de petanca en el parque.", "Ámbar Antiguo, que relaja después de la partida."],
  "escarcha-azul": [7, "Subasta de invierno en la galería.", "Escarcha Azul. Precio de subasta."],
  "ed-otono": [8, "Mercadillo de otoño en la plaza.", "La Edición Otoño vuela en el mercadillo."],
};

/** Cuando no hay noticia escrita (ediciones de otras estaciones): el cliente misterioso. */
export const NOTICIA_GENERICA: [number, string, string] = [12, "Rumores en el barrio.", "Alguien paga bien por esta."];

/** Barra del gráfico de semanas: 60 % = media altura. Sin cambio, una raya dorada de 2 px. */
export function barra(p: number | undefined, actual: boolean, alto: number) {
  const mitad = alto / 2;
  if (p === undefined || p === 0)
    return { arriba: mitad - 1, alto: 2, color: p === undefined ? "transparent" : "#d9a43a" };
  const h = Math.max(2, Math.round(Math.min(1, Math.abs(p) / 60) * mitad));
  return {
    arriba: p > 0 ? mitad - h : mitad,
    alto: h,
    color: p > 0 ? (actual ? "#1d6630" : "#74cf45") : actual ? "#a02a32" : "#e07b3f",
  };
}

/** Segundos en formato «2 d 5 h 08 min». */
export function cuentaAtras(s: number, conSegundos = false) {
  const t = Math.max(0, Math.floor(s));
  const base = `${Math.floor(t / 86400)} d ${Math.floor((t % 86400) / 3600)} h ${String(Math.floor((t % 3600) / 60)).padStart(2, "0")} min`;
  return conSegundos ? `${base} ${String(t % 60).padStart(2, "0")} s` : base;
}
