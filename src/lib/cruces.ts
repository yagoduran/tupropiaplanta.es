import type { Rareza } from "./variedades";

/** Planta viva que puede ser madre o padre. */
export interface PlantaCruce {
  id: string;
  variedad: string;
  hueco: number;
  fase: number;
  salud: number;
  fenotipo: string | null;
  /** Precio de semilla de su variedad, para el coste del cruce. */
  semilla: number;
}

export interface ResultadoCruce {
  tipo?: "pura" | "conocido" | "f1";
  id: string;
  /** Variedad fija de la colección (su nombre sale de la lista de variedades). */
  fija: boolean;
  nombre?: string | null;
  rareza?: Rareza;
  hoja?: string;
  /** Si es una variedad que el jugador no tenía. */
  nuevo?: boolean;
  /** Pareja ordenada «a+b», para el libro. */
  par?: string;
  coste?: number;
  semillas?: number;
  /** Ficha de la F1. */
  ficha?: Record<string, unknown> & { hoja?: string; fases?: number[] };
}

export interface DatosCruces {
  madres: PlantaCruce[];
  padres: PlantaCruce[];
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

export interface Trofeo {
  id: string;
  listo: boolean;
  reclamado: boolean;
}

export interface Libro {
  variedades: string[];
  f1: string[];
  fenotipos: string[];
  total: number;
  trofeos: Trofeo[];
}

/** Horas de un cruce y precio de acelerarlo. Tienen que coincidir con la base de datos. */
export const HORAS_CRUCE = 24;
export const PRECIO_ACELERAR = 150;

/** Coste de un cruce: el 40 % de la suma de las semillas, a decenas. */
export const costeCruce = (a: number, b: number) => Math.round((0.4 * (a + b)) / 10) * 10;
