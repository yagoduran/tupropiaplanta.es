export type IdPerfilNegocio = "lujo" | "distribuidor" | "procesador";

export interface PerfilNegocio {
  id: IdPerfilNegocio;
  nombre: string;
  bono: string;
  pega: string;
}

export interface SaturacionVariedad {
  variedad: string;
  /** Gramos de saturación que quedan ahora. */
  g: number;
  /** Descuento actual en el precio, en %. */
  descuento: number;
}

export interface DatosNegocio {
  /** Perfil elegido; null si aún no has elegido. */
  perfil: IdPerfilNegocio | null;
  perfiles: PerfilNegocio[];
  nivel_req: number;
  nivel_ok: boolean;
  coste_cambio: number;
  saturacion: SaturacionVariedad[];
}
