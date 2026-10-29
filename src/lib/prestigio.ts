export interface BonoPrestigio {
  id: "mon" | "xp" | "cru" | "sot" | "inf" | "key";
  nombre: string;
  /** Celda en la hoja de progresión (columna, fila). */
  celda: [number, number];
  /** Tienen que coincidir con `tpp.bonos_prestigio()` en la base de datos. */
  coste: number;
  requiere: BonoPrestigio["id"] | null;
}

/** Dos columnas de bonos; cada uno exige el anterior de su columna. */
export const BONOS_PRESTIGIO: BonoPrestigio[][] = [
  [
    { id: "mon", nombre: "+5 % de monedas", celda: [3, 1], coste: 2, requiere: null },
    { id: "cru", nombre: "Cruces un 20 % más rápidos", celda: [0, 0], coste: 4, requiere: "mon" },
    { id: "inf", nombre: "Riego automático para siempre", celda: [4, 1], coste: 10, requiere: "cru" },
  ],
  [
    { id: "xp", nombre: "+10 % de experiencia al cosechar", celda: [3, 1], coste: 2, requiere: null },
    { id: "sot", nombre: "Empiezas con el Sótano", celda: [1, 1], coste: 6, requiere: "xp" },
    { id: "key", nombre: "Llave de la azotea", celda: [2, 1], coste: 12, requiere: "sot" },
  ],
];

export interface DatosPrestigio {
  prestigio: number;
  /** Puntos que se pueden gastar. */
  puntos: number;
  bonos: Record<string, boolean>;
  nivel: number;
  nivel_minimo: number;
  ganar: {
    nivel: number;
    variedades: number;
    legendarias: number;
    total: number;
    n_variedades: number;
    n_legendarias: number;
  };
  pierde: { monedas: number; mejoras: number; habitaciones: number; plantas: number };
  conserva: { variedades: number; maestrias: number; bonos: number };
}
