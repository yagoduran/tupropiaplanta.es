export interface Mision {
  id: string;
  /** "d" diaria o "s" semanal. */
  grupo: "d" | "s";
  nombre: string;
  desc: string;
  meta: number;
  v: number;
  estado: "curso" | "lista" | "reclamada";
  premio: { tipo: "monedas" | "xp"; n: number };
}

export interface DatosMisiones {
  misiones: Mision[];
  /** Segundos que faltan para que se renueven las diarias y las semanales. */
  renueva_dia: number;
  renueva_semana: number;
}

export interface Notificacion {
  id: number;
  tipo: "sed" | "plaga" | "mision" | "nivel" | "logro" | "amigo" | "visita" | "saludo" | "regalo" | "evento" | "pase" | "mercado" | "encargo";
  titulo: string;
  texto: string;
  /** Segundos desde que se creó. */
  hace: number;
  leida: boolean;
}

export interface DatosNotificaciones {
  no_leidas: number;
  lista: Notificacion[];
}

/** "hace 5 min", "hace 2 h", "ayer"… */
export function haceCuanto(segundos: number): string {
  if (segundos < 60) return "ahora";
  if (segundos < 3600) return `hace ${Math.floor(segundos / 60)} min`;
  if (segundos < 86400) return `hace ${Math.floor(segundos / 3600)} h`;
  const dias = Math.floor(segundos / 86400);
  return dias === 1 ? "ayer" : `hace ${dias} días`;
}
