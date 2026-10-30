import type { TipoSemilla } from "./juego";
import type { Variedad } from "./variedades";

export interface InfoTipoSemilla {
  id: TipoSemilla;
  nombre: string;
  /** Fila del icono en `tpp-semillas-tipos-1x.png`. */
  fila: number;
  /** Monedas que cuesta plantar; tiene que coincidir con `tpp.plantar`. */
  precio: number;
  descripcion: string;
}

export const TIPOS_SEMILLA: InfoTipoSemilla[] = [
  {
    id: "foto",
    nombre: "Fotoperiódica",
    fila: 0,
    precio: 0,
    descripcion: "La normal. Puede salir macho. Necesita luz 18/6 al crecer y 12/12 al florecer.",
  },
  {
    id: "auto",
    nombre: "Autofloreciente",
    fila: 1,
    precio: 60,
    descripcion: "Ciclo más corto y cosecha menor. No depende de la luz. Puede salir macho.",
  },
  {
    id: "fem",
    nombre: "Feminizada",
    fila: 2,
    precio: 150,
    descripcion: "Nunca sale macho. Necesita luz 18/6 al crecer y 12/12 al florecer.",
  },
  {
    id: "autofem",
    nombre: "Autofloreciente feminizada",
    fila: 3,
    precio: 250,
    descripcion: "Ciclo corto, cosecha menor y nunca sale macho.",
  },
];

export const TIPO_POR_ID = Object.fromEntries(TIPOS_SEMILLA.map((t) => [t.id, t])) as Record<
  TipoSemilla,
  InfoTipoSemilla
>;

/** Las autoflorecientes completan el ciclo en el 65 % del tiempo. */
export const esAuto = (tipo: TipoSemilla) => tipo === "auto" || tipo === "autofem";

/** Días que tarda en llegar a la cosecha: 3 por el multiplicador de la variedad. */
export const diasDeCiclo = (v: Variedad, tipo: TipoSemilla = "foto") =>
  Math.round(3 * v.ciclo * (esAuto(tipo) ? 0.65 : 1) * 10) / 10;
