export type Estacion = "primavera" | "verano" | "otono" | "invierno";

/** Estación según la fecha (Madrid): primavera 20/3, verano 21/6, otoño 22/9, invierno 21/12. */
export function estacionDelAnio(fecha: Date): Estacion {
  const partes = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", month: "numeric", day: "numeric" })
    .formatToParts(fecha)
    .filter((p) => p.type === "month" || p.type === "day");
  const dia = Number(partes.find((p) => p.type === "day")?.value);
  const mes = Number(partes.find((p) => p.type === "month")?.value);
  const f = mes * 100 + dia;
  if (f >= 1221 || f < 320) return "invierno";
  if (f < 621) return "primavera";
  if (f < 922) return "verano";
  return "otono";
}
