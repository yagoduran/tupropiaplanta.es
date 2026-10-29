import type { IdMarco } from "./diseno";
import type { Rareza } from "./variedades";

/** Una ficha de la colección: las 5 primeras son variedades reales, el resto llegará con los cruces y los eventos. */
export interface FichaColeccion {
  /** Variedad del juego; null si todavía no se puede conseguir. */
  id: string | null;
  nombre: string;
  rareza: Rareza;
  /** Hoja de sprites con la que se dibuja (también la silueta de las que faltan). */
  hoja: string;
  /** Fila de la hoja, de 1 a 8. */
  fila: number;
  pista: string;
}

export const COLECCION: FichaColeccion[] = [
  { id: "clasica", nombre: "Verde Clásica", rareza: "comun", hoja: "clasica", fila: 6, pista: "Variedad inicial" },
  {
    id: "hoja-azul",
    nombre: "Hoja Azul",
    rareza: "poco_comun",
    hoja: "hoja-azul",
    fila: 6,
    pista: "Tienda de semillas",
  },
  { id: "dorada", nombre: "Dorada del Sur", rareza: "rara", hoja: "dorada", fila: 6, pista: "Tienda de semillas" },
  { id: "noche", nombre: "Noche Púrpura", rareza: "epica", hoja: "noche", fila: 6, pista: "Tienda de semillas" },
  {
    id: "cristal",
    nombre: "Cristal Helado",
    rareza: "legendaria",
    hoja: "cristal",
    fila: 6,
    pista: "Tienda de semillas",
  },
  {
    id: null,
    nombre: "Verde Azulado",
    rareza: "poco_comun",
    hoja: "hoja-azul",
    fila: 4,
    pista: "Verde Clásica × Hoja Azul",
  },
  { id: null, nombre: "Brisa Dorada", rareza: "rara", hoja: "dorada", fila: 5, pista: "Hoja Azul × Dorada del Sur" },
  {
    id: null,
    nombre: "Menta Nocturna",
    rareza: "epica",
    hoja: "noche",
    fila: 5,
    pista: "Noche Púrpura × Verde Clásica",
  },
  {
    id: null,
    nombre: "Sol de Medianoche",
    rareza: "epica",
    hoja: "noche",
    fila: 5,
    pista: "Cruza Dorada del Sur y Noche Púrpura",
  },
  {
    id: null,
    nombre: "Escarcha Azul",
    rareza: "legendaria",
    hoja: "cristal",
    fila: 5,
    pista: "Cruza Cristal Helado y Hoja Azul",
  },
  {
    id: null,
    nombre: "Ámbar Antiguo",
    rareza: "rara",
    hoja: "dorada",
    fila: 4,
    pista: "Medalla de oro en Dorada del Sur",
  },
  {
    id: null,
    nombre: "Aurora",
    rareza: "legendaria",
    hoja: "cristal",
    fila: 7,
    pista: "Completa el 75 % de la colección",
  },
];

/** Premios por llegar a cierto porcentaje de la colección. */
export const HITOS: { pct: 25 | 50 | 75 | 100; premio: string }[] = [
  { pct: 25, premio: "500 monedas" },
  { pct: 50, premio: "Maceta de cerámica" },
  { pct: 75, premio: "Marco «Botánico»" },
  { pct: 100, premio: "Título «Enciclopedia viviente»" },
];

export interface Titulo {
  id: string;
  nombre: string;
  requisito: string;
}

export const TITULOS: { categoria: string; titulos: Titulo[] }[] = [
  {
    categoria: "Riego",
    titulos: [
      { id: "aprendiz_riego", nombre: "Aprendiz del riego", requisito: "Riega 100 veces" },
      { id: "experto_riego", nombre: "Experto del riego", requisito: "Riega 1.000 veces" },
      { id: "maestro_riego", nombre: "Maestro del riego", requisito: "Riega 5.000 veces" },
    ],
  },
  {
    categoria: "Cruces",
    titulos: [
      { id: "curioso", nombre: "Curioso de la genética", requisito: "Haz tu primer cruce" },
      { id: "genetista", nombre: "Genetista", requisito: "Haz 50 cruces" },
      { id: "creador", nombre: "Creador de variedades", requisito: "Descubre 10 híbridos" },
    ],
  },
  {
    categoria: "Colección",
    titulos: [
      { id: "coleccionista", nombre: "Coleccionista", requisito: "25 % de la colección" },
      { id: "botanico", nombre: "Botánico", requisito: "75 % de la colección" },
      { id: "enciclopedia", nombre: "Enciclopedia viviente", requisito: "100 % de la colección" },
    ],
  },
];

export const TITULO_POR_ID: Record<string, Titulo> = Object.fromEntries(
  TITULOS.flatMap((c) => c.titulos).map((t) => [t.id, t]),
);

export interface MarcoPerfil {
  id: string;
  nombre: string;
  requisito: string;
  estilo: IdMarco;
}

export const MARCOS_PERFIL: MarcoPerfil[] = [
  { id: "madera", nombre: "Madera", requisito: "Inicial", estilo: "marco_madera" },
  { id: "hojas", nombre: "Hojas", requisito: "Nivel 10", estilo: "marco_hojas" },
  { id: "botanico", nombre: "Botánico", requisito: "75 % de la colección", estilo: "marco_botanico" },
  { id: "dorado", nombre: "Dorado", requisito: "Maestría de oro", estilo: "marco_dorado" },
  { id: "otono", nombre: "Otoño", requisito: "Evento Otoño dorado", estilo: "marco_otono" },
  { id: "escarcha", nombre: "Escarcha", requisito: "Evento Invierno helado", estilo: "marco_escarcha" },
  { id: "prestigio", nombre: "Prestigio", requisito: "Prestigio 3", estilo: "marco_prestigio" },
];

export const MARCO_POR_ID: Record<string, MarcoPerfil> = Object.fromEntries(MARCOS_PERFIL.map((m) => [m.id, m]));

export interface DatosProgresion {
  descubiertas: string[];
  total: number;
  pct: number;
  hitos: number[];
  nivel: number;
  riegos: number;
  titulos: Record<string, boolean>;
  marcos: Record<string, boolean>;
  titulo: string | null;
  marco: string;
}
