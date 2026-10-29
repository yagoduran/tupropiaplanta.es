export type Medalla = "bronce" | "plata" | "oro";

export interface Logro {
  id: string;
  nombre: string;
  descripcion: string;
  medalla: Medalla;
  /** Valor a alcanzar. Tiene que coincidir con `tpp.logros()` en la base de datos. */
  meta: number;
  /** Monedas de premio. Tiene que coincidir con `tpp.logros()` en la base de datos. */
  premio: number;
}

export const LOGROS: Logro[] = [
  {
    id: "primera_cosecha",
    nombre: "Primera cosecha",
    descripcion: "Cosecha tu primera planta.",
    medalla: "bronce",
    meta: 1,
    premio: 50,
  },
  { id: "cosechas_5", nombre: "Mano verde", descripcion: "Cosecha 5 plantas.", medalla: "plata", meta: 5, premio: 150 },
  {
    id: "cosechas_20",
    nombre: "Maestro cultivador",
    descripcion: "Cosecha 20 plantas.",
    medalla: "oro",
    meta: 20,
    premio: 500,
  },
  { id: "nivel_5", nombre: "Aprendiz", descripcion: "Llega al nivel 5.", medalla: "bronce", meta: 5, premio: 50 },
  { id: "nivel_10", nombre: "Cultivador", descripcion: "Llega al nivel 10.", medalla: "plata", meta: 10, premio: 150 },
  { id: "nivel_20", nombre: "Experto", descripcion: "Llega al nivel 20.", medalla: "oro", meta: 20, premio: 400 },
  {
    id: "riegos_50",
    nombre: "Gotita a gotita",
    descripcion: "Riega 50 veces.",
    medalla: "bronce",
    meta: 50,
    premio: 60,
  },
  {
    id: "abonos_25",
    nombre: "Bien alimentada",
    descripcion: "Abona 25 veces.",
    medalla: "bronce",
    meta: 25,
    premio: 60,
  },
  {
    id: "compras_5",
    nombre: "Cliente fiel",
    descripcion: "Compra 5 objetos en la tienda.",
    medalla: "bronce",
    meta: 5,
    premio: 60,
  },
  {
    id: "variedades_5",
    nombre: "Coleccionista",
    descripcion: "Planta las 5 variedades.",
    medalla: "plata",
    meta: 5,
    premio: 200,
  },
  {
    id: "racha_7",
    nombre: "Constancia",
    descripcion: "Recoge el regalo diario 7 días seguidos.",
    medalla: "plata",
    meta: 7,
    premio: 150,
  },
  {
    id: "gastado_1000",
    nombre: "Buen comprador",
    descripcion: "Gasta 1.000 monedas en la tienda.",
    medalla: "plata",
    meta: 1000,
    premio: 100,
  },
];

export const LOGRO_POR_ID = Object.fromEntries(LOGROS.map((l) => [l.id, l]));
