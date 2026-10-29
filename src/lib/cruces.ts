import type { Rareza } from "./variedades";

export interface CosechaCruce {
  id: string;
  variedad: string;
  salud: number;
  plantada: string;
}

export interface ResultadoCruce {
  id: string;
  /** Receta fija de la colección (su nombre sale de la lista de variedades). */
  fija: boolean;
  nombre: string | null;
  rareza: Rareza;
  hoja: string;
  /** Si es una variedad que el jugador no tenía. */
  nuevo: boolean;
  recompensa?: number;
  ciclo?: number;
  desgaste?: number;
  sabor?: number;
}

export interface DatosCruces {
  cosechas: CosechaCruce[];
  cruce: {
    estado: "en_curso" | "abierto";
    variedad_a: string;
    variedad_b: string;
    /** Segundos que faltan, en el momento de recibir los datos. */
    restan: number;
    resultado: ResultadoCruce | null;
  } | null;
}

export type RespuestaCruce = DatosCruces & { ok: boolean; error?: string };

/** Minutos de un cruce y precio de acelerarlo. Tienen que coincidir con la base de datos. */
export const MINUTOS_CRUCE = 270;
export const PRECIO_ACELERAR = 150;

const ORDEN: Rareza[] = ["comun", "poco_comun", "rara", "epica", "legendaria"];

/** Probabilidad de cada rareza del resultado: la mejor de las dos plantas (62 %), una más (30 %) o dos más (8 %). */
export function rarezasPosibles(a: Rareza, b: Rareza): { rareza: Rareza; pct: number }[] {
  const base = Math.max(ORDEN.indexOf(a), ORDEN.indexOf(b));
  const mapa = new Map<Rareza, number>();
  [
    [0, 62],
    [1, 30],
    [2, 8],
  ].forEach(([extra, pct]) => {
    const r = ORDEN[Math.min(4, base + extra)];
    mapa.set(r, (mapa.get(r) ?? 0) + pct);
  });
  return [...mapa].map(([rareza, pct]) => ({ rareza, pct }));
}
