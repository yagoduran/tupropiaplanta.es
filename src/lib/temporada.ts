import type { Rareza } from "./variedades";

export interface EventoDatos {
  id: "primavera" | "verano" | "otono" | "invierno";
  nombre: string;
  fechas: string;
  desc: string;
  /** Semilla de edición limitada y su nombre. */
  edicion: string;
  edicion_nombre: string;
  rareza: Rareza;
  estado: "now" | "past" | "soon";
  /** Segundos que faltan para que termine (activo) o empiece (próximo). */
  restan: number | null;
  empieza_en: number | null;
  misiones: { nombre: string; meta: number; v: number }[];
  /** Ya tienes la semilla de edición. */
  tengo: boolean;
  completo: boolean;
}

export interface DatosEventos {
  activo: string | null;
  eventos: EventoDatos[];
}

export interface PremioPase {
  tipo: "monedas" | "xp" | "objeto" | "semilla" | "marco";
  etq: string;
  estado: "reclamado" | "listo" | "futuro" | "bloqueado";
}

export type DatosPase =
  | { activo: false; proximo_en: number | null }
  | {
      activo: true;
      evento: string;
      nivel: number;
      pts: number;
      por_nivel: number;
      premium: boolean;
      precio: number;
      restan: number;
      niveles: { n: number; g: PremioPase; s: PremioPase }[];
    };

/** Icono social de cada evento. */
export const ICONO_EVENTO = {
  primavera: "flor_primavera",
  verano: "sol_verano",
  otono: "hoja_otono",
  invierno: "copo_nieve",
} as const;

export function cuentaAtras(segundos: number): { v: string; k: string }[] {
  const s = Math.max(0, Math.floor(segundos));
  const dos = (n: number) => String(n).padStart(2, "0");
  return [
    { v: String(Math.floor(s / 86400)), k: "días" },
    { v: dos(Math.floor((s % 86400) / 3600)), k: "horas" },
    { v: dos(Math.floor((s % 3600) / 60)), k: "min" },
  ];
}
