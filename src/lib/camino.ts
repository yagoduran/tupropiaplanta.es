/** Una meta de un capítulo de El Camino. `valor` ya viene recortado a `meta`. */
export interface MetaCamino {
  id: string;
  texto: string;
  meta: number;
  valor: number;
}

export interface PremioCamino {
  monedas: number;
  xp: number;
  /** Semillas aleatorias (según tu nivel). */
  semillas?: number;
}

export interface CapituloCamino {
  n: number;
  nombre: string;
  premio: PremioCamino;
  metas: MetaCamino[];
  hechas: number;
  completo: boolean;
  reclamado: boolean;
}

export interface DatosCamino {
  capitulos: CapituloCamino[];
  /** Capítulo que toca reclamar ahora (0 si ya están todos). */
  actual: number;
}
