export type Rareza = "comun" | "poco_comun" | "rara" | "epica" | "legendaria";

export interface Variedad {
  id: string;
  nombre: string;
  rareza: Rareza;
  /** Nivel necesario. Tiene que coincidir con `tpp.variedades()` en la base de datos. */
  nivel: number;
  descripcion: string;
  /** Multiplicador de monedas al cosechar. */
  recompensa: number;
  /** Multiplicador de la duración del ciclo. */
  ciclo: number;
  /** Multiplicador del desgaste de agua, nutrientes y luz. */
  desgaste: number;
}

export const RAREZAS: Record<Rareza, { etiqueta: string; fondo: string; texto: string }> = {
  comun: { etiqueta: "Común", fondo: "#a8845c", texto: "#1c1626" },
  poco_comun: { etiqueta: "Poco común", fondo: "#36a33b", texto: "#1c1626" },
  rara: { etiqueta: "Rara", fondo: "#2f6fb0", texto: "#ffffff" },
  epica: { etiqueta: "Épica", fondo: "#7a52b8", texto: "#ffffff" },
  legendaria: { etiqueta: "Legendaria", fondo: "#d9a43a", texto: "#1c1626" },
};

export const VARIEDADES: Variedad[] = [
  {
    id: "clasica",
    nombre: "Verde Clásica",
    rareza: "comun",
    nivel: 1,
    descripcion: "Fácil y agradecida. La mejor para aprender.",
    recompensa: 1,
    ciclo: 1,
    desgaste: 1,
  },
  {
    id: "hoja-azul",
    nombre: "Hoja Azul",
    rareza: "poco_comun",
    nivel: 3,
    descripcion: "Hojas azuladas que dan más monedas.",
    recompensa: 1.3,
    ciclo: 1,
    desgaste: 1,
  },
  {
    id: "dorada",
    nombre: "Dorada del Sur",
    rareza: "rara",
    nivel: 6,
    descripcion: "Crece más despacio, pero paga mucho mejor.",
    recompensa: 1.7,
    ciclo: 1.15,
    desgaste: 1,
  },
  {
    id: "noche",
    nombre: "Noche Púrpura",
    rareza: "epica",
    nivel: 10,
    descripcion: "Exigente: gasta más agua, nutrientes y luz.",
    recompensa: 2.2,
    ciclo: 1.3,
    desgaste: 1.2,
  },
  {
    id: "cristal",
    nombre: "Cristal Helado",
    rareza: "legendaria",
    nivel: 15,
    descripcion: "La más rara y la más exigente. Cosecha enorme.",
    recompensa: 3,
    ciclo: 1.5,
    desgaste: 1.3,
  },
];

export const VARIEDAD_POR_ID = Object.fromEntries(VARIEDADES.map((v) => [v.id, v])) as Record<string, Variedad>;

/** Días reales que tarda en llegar a la cosecha (293 horas por el multiplicador del ciclo). */
export const diasDeCiclo = (v: Variedad) => Math.round((293 * v.ciclo) / 24);
