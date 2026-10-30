/** Calidad de la cosecha, de 1 a 5 estrellas. El nombre y el color van siempre con el número de estrellas. */
export const CALIDADES = [
  { nombre: "Pobre", color: "#b4b0bc" },
  { nombre: "Normal", color: "#f7b072" },
  { nombre: "Buena", color: "#c9f26b" },
  { nombre: "Excelente", color: "#bfe6f7" },
  { nombre: "Perfecta", color: "#f4d36a" },
] as const;

/** Calidad que tendría la cosecha ahora: sale de la salud, igual que en el servidor. */
export function calidadPrevista(salud: number): number {
  return Math.max(1, Math.min(5, Math.ceil(salud / 20)));
}
