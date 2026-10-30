import { VARIEDAD_POR_ID } from "./variedades";
import type { TipoSemilla } from "./juego";

/** Horas (de ciclo normal de 3 días) a las que empieza cada fase. Tiene que coincidir con `tpp.fase_de`. */
const INICIO_FASE = [0, 2.4, 8.4, 20.4, 32.4, 48, 60, 72];

/** Las autoflorecientes completan el ciclo en el 65 % del tiempo. Tiene que coincidir con `tpp.fase_planta`. */
const FACTOR_AUTO = 0.65;

/** Tamaño de la planta al empezar una fase; crece hasta TAMANO_MAXIMO al terminarla. El máximo deja libre el cable de la lámpara. */
const TAMANO_MINIMO = 0.6;
const TAMANO_MAXIMO = 0.74;

/** Tamaño de la planta (de 0.6 a 0.74) según lo avanzada que va dentro de su fase, para que siempre se vea crecer. */
export function tamanoPlanta(fase: number, segundosVida: number, variedad: string, tipo: TipoSemilla = "foto"): number {
  if (fase >= 8) return TAMANO_MAXIMO;
  const ciclo = (VARIEDAD_POR_ID[variedad]?.ciclo ?? 1) * (tipo === "auto" || tipo === "autofem" ? FACTOR_AUTO : 1);
  const horas = segundosVida / 3600 / ciclo;
  const desde = INICIO_FASE[fase - 1];
  const hasta = INICIO_FASE[fase];
  const avance = Math.min(1, Math.max(0, (horas - desde) / (hasta - desde)));
  // Pasos de 0.02 para no repintar a cada segundo.
  return Math.round((TAMANO_MINIMO + (TAMANO_MAXIMO - TAMANO_MINIMO) * avance) * 50) / 50;
}
