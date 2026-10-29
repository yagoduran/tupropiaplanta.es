import type { Rareza } from "./variedades";

/** XP de maestría necesaria: 60 × (nivel − 1)² × factor de rareza. Tiene que coincidir con `tpp.maestria_nivel()` en la base de datos. */
const FACTOR: Record<Rareza, number> = { comun: 1, poco_comun: 1.2, rara: 1.5, epica: 2, legendaria: 2.5 };

export const NIVEL_MAXIMO = 10;

export const xpDeNivel = (nivel: number, rareza: Rareza) => Math.round(60 * (nivel - 1) ** 2 * FACTOR[rareza]);

export const nivelDeMaestria = (xp: number, rareza: Rareza) =>
  Math.min(NIVEL_MAXIMO, 1 + Math.floor(Math.sqrt(xp / (60 * FACTOR[rareza]))));

export type MedallaMaestria = "bronce" | "plata" | "oro";

export const medallaDeNivel = (nivel: number): MedallaMaestria | null =>
  nivel >= 10 ? "oro" : nivel >= 6 ? "plata" : nivel >= 3 ? "bronce" : null;

/** Bonificación de cada nivel (de 1 a 10). */
export const BONOS_MAESTRIA = [
  "+2 % de monedas al cosechar",
  "+5 % de experiencia al cosechar",
  "Medalla de bronce",
  "−5 % de agua gastada",
  "−5 % de plagas",
  "Medalla de plata",
  "+5 % de monedas al cosechar",
  "−10 % de tiempo de cruce",
  "+10 % de sabor",
  "Medalla de oro",
] as const;

export interface DatosMaestria {
  /** XP de maestría de cada variedad. */
  xp: Record<string, number>;
  descubiertas: string[];
}
