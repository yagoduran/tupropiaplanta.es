export interface Encargo {
  id: string;
  remite: string;
  /** Tipo de pedido. Los antiguos no lo traen. */
  tipo?: "normal" | "urgente" | "grande" | "calidad" | "coleccion";
  /** Estrellas mínimas que pide (0 si no pide calidad). */
  q?: number;
  /** Mensaje con {g} y {v} para el gramaje y la variedad. */
  mensaje?: string;
  variedad: string;
  /** Gramos que pide. */
  g: number;
  monedas: number;
  /** Recompensa sin el mercado de la semana (solo en encargos nuevos desde 8h). */
  monedas_base?: number;
  /** Cambio (%) de esa variedad en el mercado cuando llegó el encargo. La recompensa se movió la mitad. */
  mercado?: number;
  xp: number;
  /** Gramos de esa variedad que tiene el jugador. */
  tengo: number;
  /** Segundos que quedan: para responder si es nuevo, para entregarlo si está aceptado. */
  restan: number;
  /** Nuevo: hay que aceptarlo o rechazarlo. Aceptado: se puede entregar. Los antiguos no lo traen (aceptado). */
  estado?: "nuevo" | "aceptado";
  /** Cliente que lo pide (índice de `CLIENTES`). */
  cliente?: number;
  /** Segundos que se tienen para entregarlo desde que se acepta. */
  plazo?: number;
}

/** Encargo que ya terminó: entregado o caducado. */
export interface EncargoHistorial {
  id: string;
  remite: string;
  cliente?: number;
  tipo?: Encargo["tipo"];
  variedad: string;
  g: number;
  monedas: number;
  xp: number;
  estado: "entregado" | "caducado";
  por?: "sin responder" | "sin entregar" | "cancelado";
}

export interface DatosEncargos {
  lista: Encargo[];
  /** Gramos guardados de cada variedad. */
  almacen: Record<string, number>;
  /** Segundos que faltan para el próximo encargo, o null si ya tiene 3. */
  siguiente_en: number | null;
  /** Calidad media (en estrellas) de los gramos guardados de cada variedad. */
  calidad?: Record<string, number>;
  /** Reputación (0 a 100) con cada cliente, por índice. Sin dato es 50. */
  reputacion?: Record<string, number>;
  /** Últimos encargos entregados o caducados. */
  historial?: EncargoHistorial[];
  /** Momento (ms) en que se recibieron, para ir restando los segundos que pasan. */
  recibido?: number;
}

/** Clientes del juego, en el orden de la hoja de retratos (32 × 32 px). */
export const CLIENTES = [
  { nombre: "Doña Rosa", rol: "Vecina de toda la vida" },
  { nombre: "Javi", rol: "Estudiante" },
  { nombre: "Lola", rol: "DJ" },
  { nombre: "Don Ernesto", rol: "Jubilado" },
  { nombre: "Nuria", rol: "Enfermera" },
  { nombre: "Kike", rol: "Surfero" },
  { nombre: "Carmen", rol: "Chef" },
  { nombre: "El Coleccionista", rol: "Coleccionista" },
  { nombre: "Aitana", rol: "Artista" },
  { nombre: "Paco", rol: "Camionero" },
  { nombre: "Valeria", rol: "Ejecutiva" },
  { nombre: "Toni", rol: "Rockero" },
] as const;

export const TIPOS_ENCARGO = {
  normal: { nombre: "Pedido normal", plazo: "3 días" },
  urgente: { nombre: "Urgente", plazo: "24 horas" },
  grande: { nombre: "Al por mayor", plazo: "5 días" },
  calidad: { nombre: "Calidad mínima", plazo: "3 días" },
  coleccion: { nombre: "Coleccionista", plazo: "3 días" },
} as const;

/** Tiempo restante legible: «2 d 4 h», «1 h 20 min» o «42:10». */
export function formatoTiempo(segundos: number) {
  const s = Math.max(0, Math.floor(segundos));
  if (s >= 86400) return `${Math.floor(s / 86400)} d ${Math.floor((s % 86400) / 3600)} h`;
  if (s >= 3600) return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
