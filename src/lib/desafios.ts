import type { IdIcono } from "./diseno";

export interface Desafio {
  id: string;
  nombre: string;
  icono: IdIcono;
  descripcion: string;
  /** Reglas especiales. */
  reglas: { icono: IdIcono; titulo: string; texto: string }[];
  /** De 1 a 3. Tiene que coincidir con `tpp.desafios()` en la base de datos. */
  dificultad: 1 | 2 | 3;
  /** Multiplicador de la recompensa (1.000 monedas y 200 XP por cada punto de multiplicador). */
  mult: number;
  dias: number;
}

export const DESAFIOS: Desafio[] = [
  {
    id: "noche",
    nombre: "Noche eterna",
    icono: "luz",
    descripcion: "No entra luz natural: solo cuenta la luz de tu lámpara.",
    reglas: [
      { icono: "luz", titulo: "Sin luz natural", texto: "La luz se gasta un 50 % más rápido." },
      { icono: "tiempo", titulo: "Fases más largas", texto: "Cada fase dura un 20 % más." },
    ],
    dificultad: 2,
    mult: 3,
    dias: 7,
  },
  {
    id: "plagas",
    nombre: "Plaga doble",
    icono: "aviso",
    descripcion: "Las plagas aparecen el doble de veces y atacan antes.",
    reglas: [
      { icono: "aviso", titulo: "Plagas dobles", texto: "Pulgones y hongos aparecen el doble y desde la fase 2." },
      { icono: "salud", titulo: "Salud frágil", texto: "La salud baja un 25 % más rápido." },
    ],
    dificultad: 3,
    mult: 4,
    dias: 7,
  },
  {
    id: "sequia",
    nombre: "Sequía",
    icono: "agua",
    descripcion: "Poca agua y mucho calor. Cada riego cuenta.",
    reglas: [
      { icono: "agua", titulo: "Agua limitada", texto: "Solo puedes regar 3 veces al día." },
      { icono: "temperatura", titulo: "Calor", texto: "+4 °C durante todo el desafío." },
    ],
    dificultad: 2,
    mult: 3,
    dias: 7,
  },
  {
    id: "reloj",
    nombre: "Contrarreloj",
    icono: "tiempo",
    descripcion: "Cosecha antes de que se acabe el tiempo.",
    reglas: [
      { icono: "tiempo", titulo: "5 días", texto: "Tienes 5 días para cosechar." },
      { icono: "nutrientes", titulo: "Sin abono rápido", texto: "No puedes usar abono de crecimiento." },
    ],
    dificultad: 1,
    mult: 2,
    dias: 5,
  },
];

export const DESAFIO_POR_ID: Record<string, Desafio> = Object.fromEntries(DESAFIOS.map((d) => [d.id, d]));

export const DIFICULTAD = ["Fácil", "Normal", "Difícil"] as const;

export interface DatosDesafios {
  /** Segundos hasta que se renueva la semana (lunes). */
  renueva_en: number;
  desafios: Record<
    string,
    {
      /** Ya se ha jugado esta semana. */
      jugado: boolean;
      activo: boolean;
      /** Lo has completado alguna vez. */
      insignia: boolean;
      mejor: number | null;
      top: { puntos: number; salud: number; fecha: string }[];
    }
  >;
}
