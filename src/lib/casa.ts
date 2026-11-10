import type { IdIcono } from "./diseno";

export interface NivelMejora {
  nombre: string;
  texto: string;
  /** Tienen que coincidir con `tpp.mejoras()` en la base de datos. */
  precio: number;
  nivel: number;
}

export interface RamaMejoras {
  id: "cap" | "aisl" | "ext" | "riego" | "sens" | "seg";
  nombre: string;
  icono: IdIcono;
  niveles: NivelMejora[];
}

export const RAMAS: RamaMejoras[] = [
  {
    id: "cap",
    nombre: "Capacidad",
    icono: "cultivo",
    niveles: [
      { nombre: "Estante extra", texto: "+1 hueco de cultivo.", precio: 2000, nivel: 10 },
      { nombre: "Doble estante", texto: "+2 huecos de cultivo en total.", precio: 5000, nivel: 18 },
      { nombre: "Armario grande", texto: "+3 huecos de cultivo en total.", precio: 12000, nivel: 32 },
    ],
  },
  {
    id: "aisl",
    nombre: "Aislamiento",
    icono: "temperatura",
    niveles: [
      {
        nombre: "Paredes forradas",
        texto: "La temperatura oscila ±2 °C y +3 % de crecimiento.",
        precio: 1500,
        nivel: 6,
      },
      {
        nombre: "Aislamiento térmico",
        texto: "Oscila ±1 °C, +6 % de crecimiento y huele un poco menos.",
        precio: 4000,
        nivel: 16,
      },
      {
        nombre: "Cámara sellada",
        texto: "Temperatura estable, +9 % de crecimiento y el bono de monedas al cosechar.",
        precio: 9000,
        nivel: 26,
      },
    ],
  },
  {
    id: "ext",
    nombre: "Extractor con filtro",
    icono: "luz",
    niveles: [
      { nombre: "Filtro de carbón", texto: "El olor baja 2 niveles y hay menos hongos.", precio: 3000, nivel: 10 },
      {
        nombre: "Extractor turbo",
        texto: "−4 °C y −18 % de humedad con el extractor encendido; aún menos hongos.",
        precio: 8000,
        nivel: 22,
      },
    ],
  },
  {
    id: "riego",
    nombre: "Riego",
    icono: "agua",
    niveles: [
      { nombre: "Bandeja de goteo", texto: "El agua baja un 10 % más despacio.", precio: 600, nivel: 6 },
      { nombre: "Riego por goteo", texto: "Riega solo cuando el agua baja del 30 %.", precio: 2000, nivel: 15 },
      {
        nombre: "Riego automático total",
        texto: "El agua se mantiene siempre por encima del 40 %.",
        precio: 5000,
        nivel: 25,
      },
    ],
  },
  {
    id: "sens",
    nombre: "Sensores",
    icono: "temperatura",
    niveles: [
      {
        nombre: "Termómetro digital",
        texto: "Muestra la temperatura exacta y avisa si se sale del rango ideal de la variedad.",
        precio: 800,
        nivel: 8,
      },
      { nombre: "Sensor de humedad", texto: "Avisa antes de que aparezcan hongos.", precio: 2800, nivel: 24 },
      { nombre: "Estación de sensores", texto: "Avisa cuando hay riesgo de plagas.", precio: 6000, nivel: 30 },
    ],
  },
  {
    id: "seg",
    nombre: "Seguridad",
    icono: "aviso",
    niveles: [
      {
        nombre: "Cerradura reforzada",
        texto: "Los robos mientras no estás son la mitad de probables.",
        precio: 900,
        nivel: 9,
      },
      { nombre: "Alarma", texto: "Los robos son cuatro veces menos probables.", precio: 3000, nivel: 20 },
      { nombre: "Caja fuerte", texto: "Ya no te pueden robar mientras no estás.", precio: 7500, nivel: 30 },
    ],
  },
];

export const ROMANOS = ["I", "II", "III"] as const;

export type IdHabitacion =
  | "armario"
  | "salon"
  | "cocina"
  | "dormitorio"
  | "bano"
  | "terraza"
  | "invernadero"
  | "sotano"
  | "azotea";

export interface Habitacion {
  id: IdHabitacion;
  nombre: string;
  piso: string;
  /** Macetas. Tienen que coincidir con `tpp.habitaciones()` en la base de datos. */
  macetas: number;
  /** Número de hueco anterior al primero de la habitación (hueco = base + sitio). */
  base: number;
  precio: number;
  nivel: number;
  descripcion: string;
  /** Fondo de la escena; null usa las capas normales según la hora. */
  escena: string | null;
  /** Mientras no exista el prestigio, no se puede desbloquear. */
  bloqueada?: string;
  /** Colores de la habitación en el plano de la casa. */
  pared: string;
  suelo: string;
  /** Color del texto sobre la pared. */
  texto: string;
  /** Planta del plano (azotea, planta 1, planta baja o sótano) y su sitio en la rejilla de 4 columnas. */
  planta: "az" | "p1" | "pb" | "so";
  columnas: string;
  /** Al aire libre: el plano la dibuja con un marco más fino. */
  fuera?: boolean;
}

export const HABITACIONES: Habitacion[] = [
  {
    id: "armario",
    nombre: "Armario",
    piso: "Planta 1",
    macetas: 3,
    base: 0,
    precio: 0,
    nivel: 1,
    descripcion: "Luz controlada: tu espacio de cultivo de siempre, con puertas y extractor.",
    escena: null,
    pared: "#4b3a5e",
    suelo: "#3a2418",
    texto: "#f6eed6",
    planta: "p1",
    columnas: "3",
  },
  {
    id: "salon",
    nombre: "Salón",
    piso: "Planta baja",
    macetas: 3,
    base: 10,
    precio: 0,
    nivel: 1,
    descripcion: "Luz de ventana por la mañana: la luz de tus plantas baja un 10 % más despacio.",
    escena: null,
    pared: "#efe3c6",
    suelo: "#8a5a2e",
    texto: "#1c1626",
    planta: "pb",
    columnas: "1 / 3",
  },
  {
    id: "cocina",
    nombre: "Cocina",
    piso: "Planta baja",
    macetas: 2,
    base: 20,
    precio: 0,
    nivel: 1,
    descripcion: "Calor de los fogones: +2 °C.",
    escena: null,
    pared: "#c9f26b",
    suelo: "#f6eed6",
    texto: "#1c1626",
    planta: "pb",
    columnas: "3",
  },
  {
    id: "dormitorio",
    nombre: "Dormitorio",
    piso: "Planta 1",
    macetas: 2,
    base: 30,
    precio: 0,
    nivel: 1,
    descripcion: "Tranquilo y templado: la salud sufre un 5 % menos.",
    escena: null,
    pared: "#b48ee0",
    suelo: "#c49a5a",
    texto: "#1c1626",
    planta: "p1",
    columnas: "1",
  },
  {
    id: "bano",
    nombre: "Baño",
    piso: "Planta 1",
    macetas: 1,
    base: 40,
    precio: 1500,
    nivel: 8,
    descripcion: "Humedad alta: el agua dura un 20 % más. Ojo con los hongos.",
    escena: null,
    pared: "#ffffff",
    suelo: "#bfe6f7",
    texto: "#1c1626",
    planta: "p1",
    columnas: "2",
  },
  {
    id: "terraza",
    nombre: "Terraza",
    piso: "Planta 1",
    macetas: 2,
    base: 50,
    precio: 0,
    nivel: 15,
    descripcion: "Aire libre: +15 % de luz y más plagas.",
    escena: null,
    pared: "#5fb6e8",
    suelo: "#b9512a",
    texto: "#1c1626",
    planta: "p1",
    columnas: "4",
    fuera: true,
  },
  {
    id: "invernadero",
    nombre: "Invernadero",
    piso: "Planta baja",
    macetas: 3,
    base: 60,
    precio: 15000,
    nivel: 25,
    descripcion: "Techo de cristal y temperatura estable: +15 % de velocidad de crecimiento.",
    escena: "/assets/escena/escena-invernadero-1x.png",
    pared: "#dff5e6",
    suelo: "#5f3c26",
    texto: "#1c1626",
    planta: "pb",
    columnas: "4",
    fuera: true,
  },
  {
    id: "sotano",
    nombre: "Sótano",
    piso: "Bajo tierra",
    macetas: 4,
    base: 70,
    precio: 5000,
    nivel: 15,
    descripcion:
      "Fresco y oscuro: 4 °C menos que el resto de la casa y −10 % de plagas. Ideal para variedades de frío.",
    escena: "/assets/escena/escena-sotano-1x.png",
    pared: "#5f3c26",
    suelo: "#3a2418",
    texto: "#f6eed6",
    planta: "so",
    columnas: "1 / 5",
  },
  {
    id: "azotea",
    nombre: "Azotea",
    piso: "Azotea",
    macetas: 5,
    base: 80,
    precio: 40000,
    nivel: 35,
    descripcion: "Luz solar directa todo el día: +20 % de monedas al cosechar.",
    escena: "/assets/escena/escena-azotea-1x.png",
    bloqueada: "Necesita la llave de la azotea (bonificación de prestigio)",
    pared: "#bfe6f7",
    suelo: "#8c6a48",
    texto: "#1c1626",
    planta: "az",
    columnas: "1 / 5",
  },
];

/** Plantas de la casa, de arriba abajo. */
export const PLANTAS_CASA: { id: Habitacion["planta"]; nombre: string }[] = [
  { id: "az", nombre: "Azotea" },
  { id: "p1", nombre: "Planta 1" },
  { id: "pb", nombre: "Planta baja" },
  { id: "so", nombre: "Sótano" },
];

/** Mejoras de cada habitación (3 niveles). Tienen que coincidir con `tpp.mejoras()` y con los bonos de `tpp.sincronizar` y `tpp.accion`. */
export const MEJORAS_HABITACION: Partial<Record<IdHabitacion, [NivelMejora, NivelMejora, NivelMejora]>> = {
  armario: [
    { nombre: "Estantes con tapa", texto: "Los nutrientes bajan un 5 % más despacio.", precio: 1500, nivel: 5 },
    { nombre: "Sustrato aislado", texto: "Los nutrientes bajan un 10 % más despacio.", precio: 4000, nivel: 15 },
    { nombre: "Armario hermético", texto: "Los nutrientes bajan un 15 % más despacio.", precio: 9000, nivel: 25 },
  ],
  sotano: [
    { nombre: "Trampas de pegamento", texto: "Plagas −15 % (en vez de −10 %).", precio: 2500, nivel: 18 },
    { nombre: "Puerta con burlete", texto: "Plagas −20 %.", precio: 6000, nivel: 26 },
    { nombre: "Sótano estéril", texto: "Plagas −30 %.", precio: 12000, nivel: 34 },
  ],
  invernadero: [
    { nombre: "Cristales limpios", texto: "Crecimiento +20 % (en vez de +15 %).", precio: 6000, nivel: 28 },
    { nombre: "Ventanas automáticas", texto: "Crecimiento +25 %.", precio: 14000, nivel: 34 },
    { nombre: "Clima perfecto", texto: "Crecimiento +30 %.", precio: 30000, nivel: 40 },
  ],
  azotea: [
    { nombre: "Toldo y suelo nuevo", texto: "Monedas al cosechar +25 % (en vez de +20 %).", precio: 15000, nivel: 38 },
    { nombre: "Depósito de lluvia", texto: "Monedas al cosechar +30 %.", precio: 35000, nivel: 42 },
    { nombre: "Huerto en la azotea", texto: "Monedas al cosechar +40 %.", precio: 80000, nivel: 45 },
  ],
};

export const HABITACION_POR_ID: Record<string, Habitacion> = Object.fromEntries(HABITACIONES.map((h) => [h.id, h]));

export interface DatosCasa {
  habitacion: string;
  habitaciones: string[];
  /** Nivel (0 a 3) de cada rama de mejoras. */
  mejoras: Partial<Record<RamaMejoras["id"] | `h_${IdHabitacion}`, number>>;
}
