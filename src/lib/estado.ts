import type { IdIcono } from "./diseno";

export type Tono = "bien" | "aviso" | "peligro";

// Relleno, brillo y sombra de la barra, y color del texto del valor.
export const TONOS: Record<Tono, { relleno: string; luz: string; sombra: string; texto: string }> = {
  bien: { relleno: "#36a33b", luz: "#74cf45", sombra: "#1d6630", texto: "#1d6630" },
  aviso: { relleno: "#d9a43a", luz: "#f4d36a", sombra: "#8a5a2e", texto: "#8a5a2e" },
  peligro: { relleno: "#b9512a", luz: "#e07b3f", sombra: "#7c2e1b", texto: "#7c2e1b" },
};

export function tonoPorPorcentaje(v: number): Tono {
  return v < 35 ? "peligro" : v < 60 ? "aviso" : "bien";
}

export interface Medidor {
  id: IdIcono;
  nombre: string;
  /** Nombre abreviado para pantallas medianas. */
  nombreCorto?: string;
  porcentaje: number;
  valor: string;
  /** Valor abreviado para móvil. */
  valorCorto?: string;
  tono: Tono;
}
