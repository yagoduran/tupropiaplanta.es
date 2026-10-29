/** Avatares del jugador: nombre en el servidor y celda en la hoja de objetos. Tiene que coincidir con `tpp.ajustes`. */
export const AVATARES: { id: string; celda: [number, number]; nombre: string }[] = [
  { id: "avatar_gorra", celda: [0, 6], nombre: "Gorra" },
  { id: "avatar_sombrero", celda: [1, 6], nombre: "Sombrero" },
  { id: "avatar_gorro", celda: [2, 6], nombre: "Gorro" },
  { id: "avatar_bandana", celda: [3, 6], nombre: "Bandana" },
  { id: "avatar_rizos", celda: [4, 6], nombre: "Rizos" },
  { id: "avatar_gafas", celda: [5, 6], nombre: "Gafas" },
  { id: "avatar_cascos", celda: [6, 6], nombre: "Cascos" },
  { id: "avatar_brote", celda: [7, 6], nombre: "Brote" },
];

export const AVATAR_INICIAL = AVATARES[0];

export const avatarDe = (id?: string) => AVATARES.find((a) => a.id === id) ?? AVATAR_INICIAL;

export interface DatosPerfil {
  /** Fecha en que se creó el perfil. */
  desde: string;
  estadisticas: {
    racha: number;
    cosechas: number;
    gastado: number;
    riegos: number;
    abonos: number;
    muertas: number;
    logros: number;
    logros_total: number;
  };
  plantas: {
    id: string;
    variedad: string;
    vida: "viva" | "muerta" | "cosechada";
    hueco: number;
    fase: number;
    plantada: string;
    horas: number;
  }[];
}

export interface DatosEstadisticas {
  dias_cuenta: number;
  cosechas: number;
  racha_max: number;
  monedas_ganadas: number;
  /** Primer día con monedas registradas; antes de eso no hay datos de monedas. */
  desde: string | null;
  semanas: { inicio: string; n: number }[];
  dias: { dia: string; monedas: number }[];
  variedades: { variedad: string; n: number }[];
}
