import type { Hora } from "./diseno";

/** Momento del día según la hora local del jugador. */
export function horaDelDia(fecha: Date): Hora {
  const h = fecha.getHours();
  if (h >= 6 && h < 9) return "amanecer";
  if (h >= 9 && h < 18) return "dia";
  if (h >= 18 && h < 21) return "atardecer";
  return "noche";
}
