import { VARIEDAD_POR_ID } from "./variedades";

/** Horas (de ciclo normal) a las que empieza cada fase: 2, 7, 17, 27, 40, 50 y 60 minutos. Tiene que coincidir con `tpp.fase_de`. */
const INICIO_FASE = [0, 2 / 60, 7 / 60, 17 / 60, 27 / 60, 40 / 60, 50 / 60, 1];

/** Tamaño de la planta al empezar una fase; crece hasta 1 al terminarla. */
const TAMANO_MINIMO = 0.82;

/** Tamaño de la planta (de 0.82 a 1) según lo avanzada que va dentro de su fase, para que siempre se vea crecer. */
export function tamanoPlanta(fase: number, segundosVida: number, variedad: string): number {
  if (fase >= 8) return 1;
  const ciclo = VARIEDAD_POR_ID[variedad]?.ciclo ?? 1;
  const horas = segundosVida / 3600 / ciclo;
  const desde = INICIO_FASE[fase - 1];
  const hasta = INICIO_FASE[fase];
  const avance = Math.min(1, Math.max(0, (horas - desde) / (hasta - desde)));
  // Pasos de 0.02 para no repintar a cada segundo.
  return Math.round((TAMANO_MINIMO + (1 - TAMANO_MINIMO) * avance) * 50) / 50;
}
