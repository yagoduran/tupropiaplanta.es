import type { PlantaJuego } from "./juego";

const CLAVE = "tpp_visita";
/** A partir de cuánto tiempo fuera se enseña «Hola de nuevo». */
const MINIMO_MS = 60 * 60 * 1000;

/** Foto de la planta en la última visita. Se guarda solo en este navegador. */
export interface Visita {
  t: number;
  planta: string;
  agua: number;
  fase: number;
}

export interface Bienvenida {
  ausenteMs: number;
  agua: number;
  consumida: number;
  fase: number;
  subeDeFase: boolean;
  estado: PlantaJuego["estado"];
  variedad: string;
  plaga: PlantaJuego["plaga"];
}

export function leerVisita(): Visita | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? "null") as Visita | null;
    return v && typeof v.t === "number" ? v : null;
  } catch {
    return null;
  }
}

export function guardarVisita(planta: PlantaJuego, t: number) {
  try {
    const v: Visita = { t, planta: planta.id, agua: planta.agua, fase: planta.fase };
    localStorage.setItem(CLAVE, JSON.stringify(v));
  } catch {
    // Sin almacenamiento (modo privado): simplemente no se enseña la bienvenida.
  }
}

/** Qué ha pasado desde la última visita. Devuelve null si hace poco que estuvo o es otra planta. */
export function calcularBienvenida(
  visita: Visita | null,
  planta: PlantaJuego | null,
  ahora: number,
): Bienvenida | null {
  if (!visita || !planta || planta.vida !== "viva" || visita.planta !== planta.id) return null;
  const ausenteMs = ahora - visita.t;
  if (ausenteMs < MINIMO_MS) return null;
  return {
    ausenteMs,
    agua: Math.round(planta.agua),
    consumida: Math.max(0, Math.round(visita.agua - planta.agua)),
    fase: planta.fase,
    subeDeFase: planta.fase > visita.fase,
    estado: planta.estado,
    variedad: planta.variedad,
    plaga: planta.plaga,
  };
}
