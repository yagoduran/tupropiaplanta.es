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
  /** Sabor (0 a 100): da algo de XP al cosechar. Tiene que coincidir con `tpp.variedades()`. */
  sabor: number;
  /** Hoja de sprites con la que se dibuja la planta. */
  hoja: string;
  /** Variedad que sale de un cruce o de un premio: hace falta tener su semilla. */
  hibrida?: boolean;
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
    sabor: 50,
    hoja: "clasica",
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
    sabor: 66,
    hoja: "hoja-azul",
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
    sabor: 80,
    hoja: "dorada",
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
    sabor: 92,
    hoja: "noche",
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
    sabor: 95,
    hoja: "cristal",
  },
];

/** Variedades de la colección que salen de cruces o de premios. Tienen que coincidir con `tpp.variedades()`. */
export const HIBRIDAS_FIJAS: Variedad[] = [
  [
    "verde-azulado",
    "Verde Azulado",
    "poco_comun",
    "Verde Clásica × Hoja Azul. Fácil y con buen aroma.",
    1.15,
    0.95,
    0.95,
    62,
    "hoja-azul",
  ],
  ["brisa-dorada", "Brisa Dorada", "rara", "Hoja Azul × Dorada del Sur. Suave y rentable.", 1.5, 1.05, 1, 76, "dorada"],
  [
    "menta-nocturna",
    "Menta Nocturna",
    "epica",
    "Noche Púrpura × Verde Clásica. Fresca y exigente.",
    1.6,
    1.15,
    1.1,
    84,
    "noche",
  ],
  [
    "sol-medianoche",
    "Sol de Medianoche",
    "epica",
    "Dorada del Sur × Noche Púrpura. Brilla de noche.",
    2.4,
    1.3,
    1.15,
    90,
    "noche",
  ],
  [
    "escarcha-azul",
    "Escarcha Azul",
    "legendaria",
    "Cristal Helado × Hoja Azul. Fría y generosa.",
    2.6,
    1.35,
    1.15,
    92,
    "cristal",
  ],
  [
    "ambar-antiguo",
    "Ámbar Antiguo",
    "rara",
    "Premio de la maestría de oro en Dorada del Sur.",
    2,
    1.2,
    1,
    88,
    "dorada",
  ],
  ["aurora", "Aurora", "legendaria", "Premio por completar el 75 % de la colección.", 3.4, 1.55, 1.2, 98, "cristal"],
  [
    "ed-primavera",
    "Hoja Azul de Primavera",
    "poco_comun",
    "Edición limitada del evento de primavera.",
    1.3,
    1,
    1,
    66,
    "ed-primavera",
  ],
  [
    "ed-verano",
    "Dorada del Sur de Verano",
    "rara",
    "Edición limitada del evento de verano.",
    1.7,
    1.15,
    1,
    80,
    "ed-verano",
  ],
  [
    "ed-otono",
    "Noche Púrpura de Otoño",
    "epica",
    "Edición limitada del evento de otoño.",
    2.2,
    1.3,
    1.2,
    92,
    "ed-otono",
  ],
  [
    "ed-invierno",
    "Cristal Helado de Invierno",
    "legendaria",
    "Edición limitada del evento de invierno.",
    3,
    1.5,
    1.3,
    95,
    "ed-invierno",
  ],
].map(([id, nombre, rareza, descripcion, recompensa, ciclo, desgaste, sabor, hoja]) => ({
  id: id as string,
  nombre: nombre as string,
  rareza: rareza as Rareza,
  nivel: 1,
  descripcion: descripcion as string,
  recompensa: recompensa as number,
  ciclo: ciclo as number,
  desgaste: desgaste as number,
  sabor: sabor as number,
  hoja: hoja as string,
  hibrida: true,
}));

export const VARIEDAD_POR_ID = Object.fromEntries([...VARIEDADES, ...HIBRIDAS_FIJAS].map((v) => [v.id, v])) as Record<
  string,
  Variedad
>;

/** Híbridos propios del jugador, tal como llegan del servidor. */
export interface HibridoPropio {
  id: string;
  nombre: string;
  rareza: Rareza;
  hoja: string;
  recompensa: number;
  ciclo: number;
  desgaste: number;
  sabor: number;
}

/** Hoja de un híbrido propio: una de las 7 hojas de híbrido, siempre la misma para el mismo id. */
export function hojaHibridoPropio(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `hibrido-${(h % 7) + 1}`;
}

/** Añade los híbridos del jugador a la lista de variedades para poder dibujarlos y nombrarlos. */
export function registrarHibridas(propias: HibridoPropio[]) {
  for (const h of propias) {
    VARIEDAD_POR_ID[h.id] = {
      ...h,
      hoja: hojaHibridoPropio(h.id),
      nivel: 1,
      descripcion: "Híbrido propio.",
      hibrida: true,
    };
  }
}

/** Hoja de sprites de una variedad (los híbridos usan la de su rareza). */
export const hojaDe = (id: string) => VARIEDAD_POR_ID[id]?.hoja ?? id;

export interface Rasgos {
  rendimiento: number;
  resistencia: number;
  velocidad: number;
  sabor: number;
}

const acotar = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Los 4 rasgos (0 a 100) salen de los datos de la variedad. */
export const rasgosDe = (v: Pick<Variedad, "recompensa" | "ciclo" | "desgaste" | "sabor">): Rasgos => ({
  rendimiento: acotar(30 + (v.recompensa - 1) * 35),
  resistencia: acotar(90 - (v.desgaste - 1) * 100),
  velocidad: acotar(100 - (v.ciclo - 1) * 100),
  sabor: acotar(v.sabor),
});
