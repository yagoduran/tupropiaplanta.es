export interface Obra {
  id: "salon" | "cocina" | "sotano" | "ampliacion";
  nombre: string;
  /** Bono permanente que da al terminar. */
  desc: string;
  nivel: number;
  precio: number;
  horas: number;
  estado: "bloqueada" | "disponible" | "en_curso" | "hecha";
  /** Segundos que faltan (solo si está en curso). */
  resta: number;
  /** Monedas que cuesta acelerarla (solo si está en curso). */
  acelerar: number | null;
}

export interface DatosObras {
  obras: Obra[];
  /** Hay una obra en marcha: solo se puede hacer una a la vez. */
  ocupada: boolean;
}
