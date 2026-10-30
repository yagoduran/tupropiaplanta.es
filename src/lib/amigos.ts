import type { Estado } from "./diseno";
import { haceCuanto } from "./misiones";

export interface Jugador {
  usuario: string;
  nivel: number;
  avatar: string;
  titulo: string | null;
  marco: string | null;
  prestigio: number;
  creador?: boolean;
}

export interface Amigo extends Jugador {
  /** Segundos desde que jugó por última vez; null si no consta. */
  hace: number | null;
  /** Hoy ya le has regado la planta / dejado un saludo. */
  regado: boolean;
  saludado: boolean;
  /** Hoy ya le has enviado un regalo. */
  regalado: boolean;
}

export type Relacion = "ninguna" | "enviada" | "recibida" | "amigos";

export interface Resultado extends Jugador {
  relacion: Relacion;
}

export interface DatosAmigos {
  max: number;
  /** Regalos que puedes enviar todavía hoy (de 3). */
  regalos_restantes: number;
  amigos: Amigo[];
  recibidas: Jugador[];
  enviadas: Jugador[];
  bloqueados: Jugador[];
  ok?: boolean;
  error?: string;
}

export interface PerfilPublicoDatos {
  ok: boolean;
  error?: string;
  relacion?: Relacion | "yo";
  jugador?: Jugador & {
    cosechas: number;
    variedades: number;
    variedades_total: number;
    logros: number;
    logros_total: number;
  };
}

export interface DatosVisita {
  ok: boolean;
  error?: string;
  jugador?: Jugador & { hace: number | null };
  planta: {
    variedad: string;
    fase: number;
    estado: Estado;
    agua: number;
    nutrientes: number;
    luz: number;
    temperatura: number;
    ph: number;
    salud: number;
    maceta: string;
  } | null;
  regado: boolean;
  saludo: string | null;
  riegos_hoy: number;
}

/** Saludos con emoji: id en el servidor, nombre y celda en la hoja social. */
export const SALUDOS: { id: string; nombre: string; icono: string }[] = [
  { id: "sonrisa", nombre: "Sonrisa", icono: "emoji_sonrisa" },
  { id: "corazon", nombre: "Corazón", icono: "emoji_corazon" },
  { id: "gracias", nombre: "Gracias", icono: "emoji_gracias" },
  { id: "animo", nombre: "Ánimo", icono: "emoji_animo" },
  { id: "sorpresa", nombre: "Sorpresa", icono: "emoji_sorpresa" },
  { id: "risa", nombre: "Risa", icono: "emoji_risa" },
  { id: "pulgar", nombre: "Pulgar arriba", icono: "emoji_pulgar" },
  { id: "planta", nombre: "Planta", icono: "emoji_planta" },
];

/** «Conectado» si ha jugado hace menos de 5 minutos; si no, hace cuánto. */
export function conexion(hace: number | null): string {
  if (hace === null) return "Sin conexión reciente";
  return hace < 300 ? "Conectado" : `Última vez ${haceCuanto(hace)}`;
}

export interface DatosRegalos {
  restantes: number;
  /** Abonos normales que tienes para regalar. */
  abonos: number;
  /** Hoy ya has regalado monedas. */
  monedas_hoy: boolean;
}

export type TipoRegalo = "monedas" | "agua" | "abono";

export const REGALOS: { id: TipoRegalo; nombre: string; detalle: string }[] = [
  { id: "monedas", nombre: "50 monedas", detalle: "De tu saldo (1 regalo de monedas al día)" },
  { id: "agua", nombre: "Agua extra", detalle: "+30 de agua para su planta" },
  { id: "abono", nombre: "Un abono", detalle: "Uno de los tuyos (Abono normal)" },
];
