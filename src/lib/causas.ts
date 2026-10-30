import type { CausaDano } from "./juego";

export interface AvisoCausa {
  /** Columna del icono en `tpp-avisos-causa-1x.png`. */
  columna: number;
  /** Qué le pasa a la planta. */
  titulo: string;
  /** Cómo evitarlo. */
  evitar: string;
}

export const CAUSAS: Record<CausaDano | "macho", AvisoCausa> = {
  sed: { columna: 0, titulo: "Tu planta se está secando.", evitar: "Riégala antes de que el agua baje del 35 %." },
  hambre: {
    columna: 1,
    titulo: "Tu planta pasa hambre.",
    evitar: "Abónala cuando los nutrientes bajen del 30 %.",
  },
  ahogo: {
    columna: 2,
    titulo: "Tu planta tiene demasiada agua.",
    evitar: "No rieges si el agua pasa del 90 %.",
  },
  quemada: {
    columna: 3,
    titulo: "Demasiado abono: tu planta se quema.",
    evitar: "No abones si los nutrientes pasan del 80 %.",
  },
  oscuridad: {
    columna: 4,
    titulo: "A tu planta le falta luz.",
    evitar: "Revisa el ciclo de luz y que la lámpara sirva.",
  },
  ciclo_luz: {
    columna: 5,
    titulo: "Has roto el ciclo de luz.",
    evitar: "En floración pon 12 h de luz y 12 de oscuridad.",
  },
  plaga: { columna: 6, titulo: "Una plaga debilita a tu planta.", evitar: "Trátala cuanto antes." },
  macho: {
    columna: 7,
    titulo: "¡Es macho! Casi no da cosecha.",
    evitar: "Arráncala ya y planta otra; las feminizadas no salen macho.",
  },
};
