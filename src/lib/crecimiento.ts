import { FICHA_POR_ID } from "./fichas";
import type { TipoSemilla } from "./juego";

/** Las autoflorecientes completan el ciclo en el 65 % del tiempo. Tiene que coincidir con `tpp.fase_planta`; las fases salen de las fichas (minutos). */
const FACTOR_AUTO = 0.65;

/** Tamaño de la planta al empezar una fase; crece hasta TAMANO_MAXIMO al terminarla. El máximo deja libre el cable de la lámpara. */
const TAMANO_MINIMO = 0.6;
const TAMANO_MAXIMO = 0.74;

/** Tamaño de la planta (de 0.6 a 0.74) según lo avanzada que va dentro de su fase, para que siempre se vea crecer. */
export function tamanoPlanta(fase: number, segundosVida: number, variedad: string, tipo: TipoSemilla = "foto"): number {
  if (fase >= 8) return TAMANO_MAXIMO;
  const fases = FICHA_POR_ID[variedad]?.fases ?? FICHA_POR_ID.clasica.fases;
  const factor = (tipo === "auto" || tipo === "autofem" ? FACTOR_AUTO : 1) / 60;
  const minutos = segundosVida / 60;
  const desde = fases.slice(0, fase - 1).reduce((a, b) => a + b, 0) * factor * 60;
  const hasta = desde + fases[fase - 1] * factor * 60;
  const avance = Math.min(1, Math.max(0, (minutos - desde) / (hasta - desde)));
  // Pasos de 0.02 para no repintar a cada segundo.
  return Math.round((TAMANO_MINIMO + (TAMANO_MAXIMO - TAMANO_MINIMO) * avance) * 50) / 50;
}
