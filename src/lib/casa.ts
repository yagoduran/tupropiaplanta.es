import type { IdIcono } from "./diseno";

export interface NivelMejora {
  nombre: string;
  texto: string;
  /** Tienen que coincidir con `tpp.mejoras()` en la base de datos. */
  precio: number;
  nivel: number;
}

export interface RamaMejoras {
  id: "vent" | "riego" | "sens" | "luz" | "seg" | "cap";
  nombre: string;
  icono: IdIcono;
  niveles: [NivelMejora, NivelMejora, NivelMejora];
}

export const RAMAS: RamaMejoras[] = [
  {
    id: "vent",
    nombre: "Ventilación",
    icono: "luz",
    niveles: [
      { nombre: "Ventilador de clip", texto: "Mueve el aire: −5 % de hongos.", precio: 500, nivel: 5 },
      { nombre: "Extractor", texto: "Renueva el aire del armario: −10 % de hongos.", precio: 1500, nivel: 12 },
      {
        nombre: "Ventilación inteligente",
        texto: "Se ajusta sola: −20 % de hongos y la salud se recupera un 5 % más rápido.",
        precio: 4000,
        nivel: 20,
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
        texto: "Muestra la temperatura exacta y avisa si pasa de 30 °C.",
        precio: 800,
        nivel: 8,
      },
      { nombre: "Sensor de humedad", texto: "Avisa antes de que aparezcan hongos.", precio: 2800, nivel: 24 },
      { nombre: "Estación de sensores", texto: "Avisa cuando hay riesgo de plagas.", precio: 6000, nivel: 30 },
    ],
  },
  {
    id: "luz",
    nombre: "Iluminación",
    icono: "luz",
    niveles: [
      { nombre: "Lámpara LED", texto: "+5 % de velocidad de crecimiento.", precio: 700, nivel: 7 },
      { nombre: "Panel LED", texto: "+10 % de crecimiento y menos calor.", precio: 2200, nivel: 14 },
      {
        nombre: "LED de espectro completo",
        texto: "+20 % de crecimiento y +5 % de monedas al cosechar.",
        precio: 7000,
        nivel: 28,
      },
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
  {
    id: "cap",
    nombre: "Capacidad",
    icono: "cultivo",
    niveles: [
      { nombre: "Estante extra", texto: "+1 hueco de cultivo.", precio: 1000, nivel: 10 },
      { nombre: "Doble estante", texto: "+2 huecos de cultivo en total.", precio: 3500, nivel: 18 },
      { nombre: "Armario grande", texto: "+3 huecos de cultivo en total.", precio: 8000, nivel: 32 },
    ],
  },
];

export const ROMANOS = ["I", "II", "III"] as const;

export interface Habitacion {
  id: "armario" | "sotano" | "invernadero" | "azotea";
  nombre: string;
  piso: string;
  /** Macetas. Tienen que coincidir con `tpp.habitaciones()` en la base de datos. */
  macetas: number;
  precio: number;
  nivel: number;
  descripcion: string;
  /** Fondo de la escena; null usa las capas normales según la hora. */
  escena: string | null;
  /** Mientras no exista el prestigio, no se puede desbloquear. */
  bloqueada?: string;
}

export const HABITACIONES: Habitacion[] = [
  {
    id: "armario",
    nombre: "Armario",
    piso: "Planta baja",
    macetas: 2,
    precio: 0,
    nivel: 1,
    descripcion: "Tu primer espacio de cultivo, junto a la ventana.",
    escena: null,
  },
  {
    id: "sotano",
    nombre: "Sótano",
    piso: "Bajo tierra",
    macetas: 4,
    precio: 5000,
    nivel: 15,
    descripcion: "Apenas entra luz por el ventanuco: controlas la luz con lámparas. −10 % de plagas.",
    escena: "/assets/escena/escena-sotano-1x.png",
  },
  {
    id: "invernadero",
    nombre: "Invernadero",
    piso: "Planta 1",
    macetas: 6,
    precio: 15000,
    nivel: 25,
    descripcion: "Techo de cristal y temperatura estable: +15 % de velocidad de crecimiento.",
    escena: "/assets/escena/escena-invernadero-1x.png",
  },
  {
    id: "azotea",
    nombre: "Azotea",
    piso: "Planta 2",
    macetas: 8,
    precio: 40000,
    nivel: 35,
    descripcion: "Luz solar directa todo el día: +20 % de monedas al cosechar.",
    escena: "/assets/escena/escena-azotea-1x.png",
    bloqueada: "Necesita la llave de la azotea (bonificación de prestigio)",
  },
];

export const HABITACION_POR_ID: Record<string, Habitacion> = Object.fromEntries(HABITACIONES.map((h) => [h.id, h]));

export interface DatosCasa {
  habitacion: string;
  habitaciones: string[];
  /** Nivel (0 a 3) de cada rama de mejoras. */
  mejoras: Partial<Record<RamaMejoras["id"], number>>;
}
