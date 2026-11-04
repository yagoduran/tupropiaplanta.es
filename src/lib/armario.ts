/** Armario de cultivo: equipo, clima y luces. Tiene que coincidir con `tpp.armario_estado` en la base de datos. */

export type IdLuz = "barra_led" | "panel_led" | "quantum" | "hps";

export interface LuzArmario {
  id: IdLuz;
  precio: number;
  w: number;
  bonus: number;
  calor: number;
  tengo: boolean;
  puesta: boolean;
}

export interface EstadoArmario {
  luz: IdLuz;
  luces: LuzArmario[];
  lamparas: number;
  cap: number;
  puertas: "abiertas" | "cerradas";
  luz_on: boolean;
  ext_on: boolean;
  vent_on: boolean;
  ciclo: "18/6" | "12/12";
  mejoras: { cap: number; aisl: number; ext: number };
  plantas: number;
  flor: number;
  clima: {
    temp: number;
    hum: number;
    olor: number;
    w: number;
    crec: number;
    salud: number;
    calor: boolean;
    frio: boolean;
    humedo: boolean;
  };
  monedas: number;
}

export const NOMBRE_LUZ: Record<IdLuz, string> = {
  barra_led: "Barra LED",
  panel_led: "Panel LED",
  quantum: "Quantum board",
  hps: "Sodio HPS",
};

export const FILA_LUZ_ARMARIO: Record<IdLuz, number> = { barra_led: 0, panel_led: 1, quantum: 2, hps: 3 };

/** Hoja de iconos del armario (16 × 1). */
export const ICONO_ARMARIO = {
  temperatura: 0,
  humedad: 1,
  consumo: 2,
  ciclo: 3,
  bonus: 4,
  olor: 5,
  capacidad: 6,
  aislamiento: 7,
  filtro: 8,
  extractor: 9,
  luz: 10,
  temporizador: 11,
  puerta: 12,
  aviso: 13,
  calor: 14,
  vapor: 15,
} as const;
export type IdIconoArmario = keyof typeof ICONO_ARMARIO;

export const TEXTO_OLOR = ["Sin olor", "Olor leve", "Olor notable", "Olor fuerte"] as const;

/** Problemas del armario por prioridad: calor, humedad, plaga y olor. */
export function avisosArmario(e: EstadoArmario, plagas: number): string[] {
  const l: string[] = [];
  if (e.clima.calor) l.push(`Hace demasiado calor (${e.clima.temp} °C). Enciende el extractor o abre las puertas.`);
  if (e.clima.frio) l.push(`Hace frío (${e.clima.temp} °C). Cierra las puertas o cambia a una luz más potente.`);
  if (e.clima.humedo) l.push(`Humedad alta (${e.clima.hum} %): riesgo de hongos. Enciende el extractor o el ventilador.`);
  if (plagas > 0) l.push(plagas === 1 ? "Hay una planta con plaga." : `Hay ${plagas} plantas con plaga.`);
  if (e.clima.olor >= 2) l.push("Se nota el olor desde fuera. Mejora el extractor o cierra las puertas.");
  return l;
}
