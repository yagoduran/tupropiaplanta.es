export type TipoPlaga = "pulgon" | "arana" | "mosca" | "caracol" | "oruga" | "moho";

export interface PlagaJuego {
  tipo: TipoPlaga;
  /** Lleva más de 6 horas sin tratar y quita más salud. */
  grave: boolean;
}

export const PLAGAS: Record<
  TipoPlaga,
  { nombre: string; aviso: string; fila: number; tratamiento: "pulverizador" | "fungicida" }
> = {
  pulgon: { nombre: "pulgones", aviso: "¡Pulgones en tu planta!", fila: 0, tratamiento: "pulverizador" },
  arana: { nombre: "araña roja", aviso: "¡Araña roja en tu planta!", fila: 2, tratamiento: "pulverizador" },
  mosca: { nombre: "mosca blanca", aviso: "¡Mosca blanca en tu planta!", fila: 4, tratamiento: "pulverizador" },
  caracol: { nombre: "caracoles", aviso: "¡Caracoles en tu planta!", fila: 6, tratamiento: "pulverizador" },
  oruga: { nombre: "orugas", aviso: "¡Orugas en tu planta!", fila: 8, tratamiento: "pulverizador" },
  moho: { nombre: "moho", aviso: "¡Moho en tu planta!", fila: 10, tratamiento: "fungicida" },
};

export const TRATAMIENTOS = {
  pulverizador: "Pulverizador",
  fungicida: "Fungicida",
} as const;
