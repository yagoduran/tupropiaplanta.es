import datos from "../../public/assets/fichas/tpp-variedades-datos.json";

/** Datos de las 16 variedades del bloque 8d (precios, tiempos en minutos, barras 1-5, rasgos). */
export type RarezaFicha = "comun" | "poco_comun" | "rara" | "epica" | "legendaria" | "especial";
export type EfectoFicha = "equilibrado" | "relajante" | "energizante" | "sonador" | "creativo";

export interface BarrasFicha {
  agua: number;
  nutrientes: number;
  luz: number;
  plagas: number;
  rendimiento: number;
  calidad: number;
  tolerancia: number;
  velocidad: number;
}

export interface FichaVariedad {
  id: string;
  nombre: string;
  rareza: RarezaFicha;
  origen: string;
  nivel: number;
  semilla: number;
  gramo: number;
  fases: number[];
  riego: number;
  ventana: number;
  agua: number;
  nutrientes: number;
  luz: number;
  luzT: string;
  tMin: number;
  tMax: number;
  plagas: number;
  gramos: number;
  calidad: number;
  sabor: string;
  efecto: EfectoFicha;
  sensacion: string;
  tolerancia: number;
  rasgos: string[];
  total: number;
  barras: BarrasFicha;
}

export const FICHAS = datos.variedades as unknown as FichaVariedad[];
export const FICHA_POR_ID: Record<string, FichaVariedad> = Object.fromEntries(FICHAS.map((f) => [f.id, f]));

export const RASGOS_FICHA = datos.rasgos as Record<string, { texto: string; icono: string; signo: number }>;

export const ICONOS_FICHA = [
  "precio-semilla",
  "precio-gramo",
  "desbloqueo",
  "rareza",
  "duracion",
  "riego",
  "ventana-cosecha",
  "consumo-agua",
  "consumo-nutrientes",
  "luz",
  "temperatura",
  "plagas",
  "rendimiento",
  "sabor",
  "efecto-relajante",
  "efecto-energizante",
  "efecto-creativo",
  "efecto-equilibrado",
  "efecto-sonador",
  "tolerancia",
  "rasgo",
  "comparar",
  "mejor",
  "peor",
] as const;
export type IconoFicha = (typeof ICONOS_FICHA)[number];

export const EFECTOS_FICHA: Record<EfectoFicha, { nombre: string; icono: IconoFicha }> = {
  equilibrado: { nombre: "Equilibrado", icono: "efecto-equilibrado" },
  relajante: { nombre: "Relajante", icono: "efecto-relajante" },
  energizante: { nombre: "Energizante", icono: "efecto-energizante" },
  sonador: { nombre: "Soñador", icono: "efecto-sonador" },
  creativo: { nombre: "Creativo", icono: "efecto-creativo" },
};

export const RAREZA_FICHA: Record<RarezaFicha, { nombre: string; fondo: string; texto: string }> = {
  comun: { nombre: "Común", fondo: "#efe3c6", texto: "#1c1626" },
  poco_comun: { nombre: "Poco común", fondo: "#c9f26b", texto: "#1c1626" },
  rara: { nombre: "Rara", fondo: "#2f6fb0", texto: "#ffffff" },
  epica: { nombre: "Épica", fondo: "#7a52b8", texto: "#ffffff" },
  legendaria: { nombre: "Legendaria", fondo: "#f4d36a", texto: "#1c1626" },
  especial: { nombre: "Especial", fondo: "#c03a9e", texto: "#ffffff" },
};

export const FONDO_FICHA: Record<string, string> = {
  clasica: "#c9f26b",
  "hoja-azul": "#5bb8b4",
  dorada: "#f4d36a",
  noche: "#b48ee0",
  cristal: "#bfe6f7",
  "verde-azulado": "#8ad9b0",
  "brisa-dorada": "#f2ec9a",
  "ambar-antiguo": "#f7b072",
  "menta-nocturna": "#d2f5e2",
  "sol-medianoche": "#e07b3f",
  "escarcha-azul": "#5fb6e8",
  aurora: "#f070c8",
  "ed-primavera": "#ffc2f0",
  "ed-verano": "#d9c94a",
  "ed-otono": "#c49a5a",
  "ed-invierno": "#dedbe2",
};

export const NOMBRE_FASES = [
  "Semilla",
  "Brote",
  "Plántula",
  "Vegetativo joven",
  "Vegetativo adulto",
  "Prefloración",
  "Floración",
  "Cosecha",
];
export const COLOR_FASES = ["#a8845c", "#c9f26b", "#74cf45", "#36a33b", "#1d6630", "#d9a43a", "#b48ee0"];

const NUEVOS = new Set([
  "verde-azulado",
  "brisa-dorada",
  "ambar-antiguo",
  "menta-nocturna",
  "sol-medianoche",
  "escarcha-azul",
  "aurora",
]);
/** Hoja de sprites de cada variedad (6 columnas × 8 fases de 64 px). */
export const hojaFicha = (id: string) =>
  NUEVOS.has(id) ? `/assets/fichas/tpp-variedad-${id}-1x.png` : `/assets/sprites/tpp-variedad-${id}-1x.png`;

/** «1 h 30 min», «45 min». */
export function horasMin(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`;
}

export const TEXTO_BARRA: Record<keyof BarrasFicha, [string, IconoFicha, 1 | -1, (f: FichaVariedad) => string]> = {
  agua: ["Consumo de agua", "consumo-agua", -1, (f) => `riego cada ${horasMin(f.riego)}`],
  nutrientes: [
    "Consumo de nutrientes",
    "consumo-nutrientes",
    -1,
    (f) => ["muy poco", "poco", "normal", "mucho", "muchísimo"][f.nutrientes - 1],
  ],
  luz: ["Luz que pide", "luz", -1, (f) => f.luzT],
  plagas: [
    "Resistencia a plagas",
    "plagas",
    1,
    (f) => ["muy baja", "baja", "normal", "alta", "casi inmune"][f.plagas - 1],
  ],
  rendimiento: ["Rendimiento", "rendimiento", 1, (f) => `${f.gramos} g por cosecha`],
  calidad: ["Sabor y calidad base", "sabor", 1, (f) => f.sabor],
  tolerancia: [
    "Tolerancia a errores",
    "tolerancia",
    1,
    (f) =>
      ["castiga cada fallo", "poco margen", "margen normal", "perdona bastante", "perdona casi todo"][f.tolerancia - 1],
  ],
  velocidad: ["Velocidad", "duracion", 1, (f) => horasMin(f.total)],
};
