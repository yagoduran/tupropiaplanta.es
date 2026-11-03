/** Datos fijos de la genética (8g). Las reglas viven en la base de datos. */

export const RECETAS: { padres: [string, string]; resultado: string }[] = [
  { padres: ["clasica", "hoja-azul"], resultado: "verde-azulado" },
  { padres: ["hoja-azul", "dorada"], resultado: "brisa-dorada" },
  { padres: ["noche", "clasica"], resultado: "menta-nocturna" },
  { padres: ["dorada", "noche"], resultado: "sol-medianoche" },
  { padres: ["cristal", "hoja-azul"], resultado: "escarcha-azul" },
];

export const recetaDe = (a: string, b: string) =>
  a === b
    ? null
    : (RECETAS.find((r) => (r.padres[0] === a && r.padres[1] === b) || (r.padres[0] === b && r.padres[1] === a))
        ?.resultado ?? null);

/** Clave del libro de un par (orden alfabético, igual que la base de datos). */
export const claveDePar = (a: string, b: string) => [a, b].sort().join("+");

export const NOMBRES_CORTOS: Record<string, string> = {
  clasica: "Clásica",
  "hoja-azul": "Hoja Azul",
  dorada: "Dorada",
  noche: "Noche",
  cristal: "Cristal",
  aurora: "Aurora",
};

export const PARES_F1: [string, string][] = [
  ["aurora", "clasica"],
  ["aurora", "cristal"],
  ["aurora", "dorada"],
  ["aurora", "hoja-azul"],
  ["aurora", "noche"],
  ["clasica", "cristal"],
  ["clasica", "dorada"],
  ["cristal", "dorada"],
  ["cristal", "noche"],
  ["hoja-azul", "noche"],
];

export const VARIEDADES_LIBRO = [
  "clasica",
  "hoja-azul",
  "dorada",
  "noche",
  "cristal",
  "verde-azulado",
  "brisa-dorada",
  "ambar-antiguo",
  "menta-nocturna",
  "sol-medianoche",
  "escarcha-azul",
  "aurora",
  "ed-primavera",
  "ed-verano",
  "ed-otono",
  "ed-invierno",
];

export interface Fenotipo {
  id: string;
  nombre: string;
  efecto: string;
  pista: string;
  /** Fila de la hoja de fenotipos y de las insignias. */
  fila: number;
}

export const FENOTIPOS: Fenotipo[] = [
  {
    id: "black",
    nombre: "Black",
    efecto: "+30 % de valor",
    pista: "Aparece más con padres de fenotipo morado.",
    fila: 0,
  },
  {
    id: "resina",
    nombre: "Hiperresinosa",
    efecto: "+25 % de gramos",
    pista: "Más probable con un padre de calidad 5.",
    fila: 1,
  },
  {
    id: "enana",
    nombre: "Enana",
    efecto: "Crece un 25 % más rápido, −10 % de gramos",
    pista: "Sale en cualquier planta.",
    fila: 2,
  },
  { id: "fantasma", nombre: "Fantasma", efecto: "+60 % de valor", pista: "Muy rara: 1 % por semilla.", fila: 3 },
  {
    id: "brasa",
    nombre: "Brasa",
    efecto: "+10 % de valor",
    pista: "Más probable con padres que aman el calor.",
    fila: 4,
  },
];

export const FENOTIPO_POR_ID = Object.fromEntries(FENOTIPOS.map((f) => [f.id, f]));

/** Hoja de fenotipos de la familia de color de una variedad. */
const FAMILIA: Record<string, string> = {
  clasica: "clasica",
  "verde-azulado": "clasica",
  "hoja-azul": "hoja-azul",
  "escarcha-azul": "hoja-azul",
  cristal: "cristal",
  aurora: "cristal",
  dorada: "dorada",
  "brisa-dorada": "dorada",
  "ambar-antiguo": "dorada",
  noche: "noche",
  "menta-nocturna": "noche",
  "sol-medianoche": "dorada",
};
export const hojaFenotipo = (hoja: string) => FAMILIA[hoja] ?? "clasica";

export const TROFEOS: Record<string, { nombre: string; texto: string; premio: string }> = {
  primer: { nombre: "Primer cruce", texto: "Consigue tu primera F1.", premio: "+200 monedas" },
  fenotipos: { nombre: "Cazafenotipos", texto: "Descubre los 5 fenotipos raros.", premio: "Maceta morada" },
  tres_cuartos: { nombre: "Tres cuartos", texto: "Rellena 24 entradas del libro.", premio: "Semilla de Aurora" },
  coleccionista: {
    nombre: "Coleccionista de cepas",
    texto: "Descubre las 16 variedades.",
    premio: "Título «Coleccionista de cepas»",
  },
  libro: { nombre: "Libro completo", texto: "Rellena las 31 entradas.", premio: "5.000 monedas y marco dorado" },
};
