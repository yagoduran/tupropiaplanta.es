export type CategoriaTienda = "macetas" | "luces" | "fertilizantes" | "herramientas" | "decoracion";

export type TipoObjeto = "maceta" | "luz" | "consumible" | "herramienta" | "decoracion";

export interface ObjetoTienda {
  id: string;
  categoria: CategoriaTienda;
  tipo: TipoObjeto;
  nombre: string;
  efecto: string;
  /** Tiene que coincidir con `tpp.catalogo()` en la base de datos, que es quien decide. */
  precio: number;
  nivel: number;
  /** Columna y fila del icono en la hoja de objetos. */
  celda: [number, number];
}

export const CATEGORIAS: { id: CategoriaTienda; etiqueta: string }[] = [
  { id: "macetas", etiqueta: "Macetas" },
  { id: "luces", etiqueta: "Luces" },
  { id: "fertilizantes", etiqueta: "Abonos" },
  { id: "herramientas", etiqueta: "Herramientas" },
  { id: "decoracion", etiqueta: "Decoración" },
];

export const CATALOGO: ObjetoTienda[] = [
  {
    id: "maceta_plastico",
    categoria: "macetas",
    tipo: "maceta",
    nombre: "Maceta de plástico",
    efecto: "Básica. Sin bonus.",
    precio: 0,
    nivel: 1,
    celda: [0, 0],
  },
  {
    id: "maceta_terracota",
    categoria: "macetas",
    tipo: "maceta",
    nombre: "Maceta de terracota",
    efecto: "El agua dura un 10 % más.",
    precio: 300,
    nivel: 1,
    celda: [1, 0],
  },
  {
    id: "maceta_tela",
    categoria: "macetas",
    tipo: "maceta",
    nombre: "Maceta de tela",
    efecto: "El agua dura un 5 % más y los nutrientes un 15 %.",
    precio: 1600,
    nivel: 1,
    celda: [2, 0],
  },
  {
    id: "maceta_ceramica",
    categoria: "macetas",
    tipo: "maceta",
    nombre: "Cerámica decorada",
    efecto: "El agua y los nutrientes duran un 10 % más.",
    precio: 2400,
    nivel: 12,
    celda: [3, 0],
  },
  {
    id: "bombilla",
    categoria: "luces",
    tipo: "luz",
    nombre: "Bombilla básica",
    efecto: "Incluida al empezar.",
    precio: 0,
    nivel: 1,
    celda: [0, 1],
  },
  {
    id: "fluorescente",
    categoria: "luces",
    tipo: "luz",
    nombre: "Fluorescente",
    efecto: "La luz dura un 15 % más.",
    precio: 450,
    nivel: 1,
    celda: [1, 1],
  },
  {
    id: "led",
    categoria: "luces",
    tipo: "luz",
    nombre: "Panel LED",
    efecto: "La luz dura un 30 % más.",
    precio: 1800,
    nivel: 1,
    celda: [2, 1],
  },
  {
    id: "led_pro",
    categoria: "luces",
    tipo: "luz",
    nombre: "LED pro",
    efecto: "La luz dura un 45 % más.",
    precio: 4500,
    nivel: 15,
    celda: [3, 1],
  },
  {
    id: "fert_generico",
    categoria: "fertilizantes",
    tipo: "consumible",
    nombre: "Abono básico",
    efecto: "+20 de nutrientes.",
    precio: 80,
    nivel: 1,
    celda: [0, 2],
  },
  {
    id: "fert_crecimiento",
    categoria: "fertilizantes",
    tipo: "consumible",
    nombre: "Abono de crecimiento",
    efecto: "+35 de nutrientes en las fases 4 y 5.",
    precio: 220,
    nivel: 1,
    celda: [1, 2],
  },
  {
    id: "fert_floracion",
    categoria: "fertilizantes",
    tipo: "consumible",
    nombre: "Abono de floración",
    efecto: "+25 de nutrientes y +10 % de monedas en la cosecha (fases 6 y 7).",
    precio: 1400,
    nivel: 1,
    celda: [2, 2],
  },
  {
    id: "fert_mejorador",
    categoria: "fertilizantes",
    tipo: "consumible",
    nombre: "Mejorador",
    efecto: "+10 % de monedas en la cosecha. Una vez por planta.",
    precio: 900,
    nivel: 10,
    celda: [3, 2],
  },
  {
    id: "pulverizador",
    categoria: "herramientas",
    tipo: "consumible",
    nombre: "Pulverizador",
    efecto: "Elimina bichos (pulgones, araña, mosca, caracoles u orugas). Un uso.",
    precio: 120,
    nivel: 1,
    celda: [4, 3],
  },
  {
    id: "fungicida",
    categoria: "herramientas",
    tipo: "consumible",
    nombre: "Fungicida",
    efecto: "Elimina el moho. Un uso.",
    precio: 150,
    nivel: 1,
    celda: [5, 3],
  },
  {
    id: "tijeras",
    categoria: "herramientas",
    tipo: "herramienta",
    nombre: "Tijeras de podar",
    efecto: "Podar da +15 de salud en vez de +10.",
    precio: 350,
    nivel: 1,
    celda: [1, 3],
  },
  {
    id: "poster",
    categoria: "decoracion",
    tipo: "decoracion",
    nombre: "Póster",
    efecto: "Decora la pared de tu cámara.",
    precio: 150,
    nivel: 1,
    celda: [0, 4],
  },
  {
    id: "planta_adorno",
    categoria: "decoracion",
    tipo: "decoracion",
    nombre: "Planta de adorno",
    efecto: "Decora el hueco libre.",
    precio: 260,
    nivel: 1,
    celda: [1, 4],
  },
];

export const OBJETO_POR_ID = Object.fromEntries(CATALOGO.map((o) => [o.id, o])) as Record<string, ObjetoTienda>;
