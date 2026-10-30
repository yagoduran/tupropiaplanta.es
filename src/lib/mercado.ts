import type { Jugador } from "./amigos";
import { OBJETO_POR_ID } from "./tienda";
import type { Rareza } from "./variedades";

export interface OfertaMercado {
  id: number;
  objeto: string;
  precio: number;
  /** Segundos que quedan para que caduque. */
  queda: number;
  vendedor: Jugador;
  /** Ya tienes este objeto en el inventario. */
  tiene: boolean;
}

export interface VentaMia {
  id: number;
  objeto: string;
  precio: number;
  estado: "venta" | "vendida" | "caducada";
  queda: number;
  /** Lo que recibirás tras la comisión. */
  neto: number;
  comprador: string | null;
}

export interface ObjetoVendible {
  objeto: string;
  cantidad: number;
  /** Precio de tienda. */
  precio: number;
  /** Lo llevas puesto (maceta, luz o decoración): no se puede vender. */
  en_uso: boolean;
}

export interface DatosMercado {
  max: number;
  activas: number;
  compras_hoy: number;
  compras_max: number;
  ofertas: OfertaMercado[];
  mias: VentaMia[];
  inventario: ObjetoVendible[];
  ok?: boolean;
  error?: string;
  cobrado?: number;
}

/** Los precios tienen que coincidir con las reglas de `tpp.mercado_publicar()`. */
export const precioMinimo = (base: number) => Math.max(1, Math.ceil(base * 0.5));
export const precioMaximo = (base: number) => base * 5;
export const comision = (precio: number) => Math.round(precio * 0.05);

/** Rareza del objeto según su precio de tienda. */
export function rarezaObjeto(id: string): Rareza {
  const p = OBJETO_POR_ID[id]?.precio ?? 0;
  if (p <= 300) return "comun";
  if (p <= 900) return "poco_comun";
  if (p <= 1800) return "rara";
  if (p <= 3000) return "epica";
  return "legendaria";
}
