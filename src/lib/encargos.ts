export interface Encargo {
  id: string;
  remite: string;
  /** Tipo de pedido. Los antiguos no lo traen. */
  tipo?: "normal" | "urgente" | "grande";
  /** Mensaje con {g} y {v} para el gramaje y la variedad. */
  mensaje?: string;
  variedad: string;
  /** Gramos que pide. */
  g: number;
  monedas: number;
  xp: number;
  /** Gramos de esa variedad que tiene el jugador. */
  tengo: number;
  /** Segundos que quedan para entregarlo. */
  restan: number;
}

export interface DatosEncargos {
  lista: Encargo[];
  /** Gramos guardados de cada variedad. */
  almacen: Record<string, number>;
  /** Segundos que faltan para el próximo encargo, o null si ya tiene 3. */
  siguiente_en: number | null;
}
