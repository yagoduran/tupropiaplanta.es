import type { PantallaJuego } from "./juego";

/** Cuadrícula de todas las habitaciones: 6 × 6 casillas. */
export const COLS = 6;
export const FILAS = 6;
/** Origen del dibujo (px de arte a 1×): deja sitio a las paredes. */
export const OX = FILAS * 16 + 32;
export const OY = 96;
/** Tamaño del lienzo (px de arte a 1×). */
export const ANCHO = (COLS + FILAS) * 16 + 64;
export const ALTO = (COLS + FILAS) * 8 + OY + 24;
/** Zona del lienzo que se ve de verdad (sin el margen vacío): así la casa se amplía más. */
export const VISTA = { x: 40, y: 24, w: 208, h: 180 };

/** Esquina superior izquierda del recuadro de la casilla. */
export const esquina = (x: number, y: number) => ({ x: (x - y) * 16 + OX, y: (x + y) * 8 + OY });
/** Centro de la casilla. */
export const centro = (x: number, y: number) => {
  const e = esquina(x, y);
  return { x: e.x + 16, y: e.y + 8 };
};
export const profundidad = (x: number, y: number) => 100 + (x + y) * 10;

/** 0 SE · 1 SO · 2 NE · 3 NO. */
export type Direccion = 0 | 1 | 2 | 3;
export const PASOS: Record<Direccion, [number, number]> = { 0: [1, 0], 1: [0, 1], 2: [0, -1], 3: [-1, 0] };

export interface Casilla {
  x: number;
  y: number;
}

/** Posición de las macetas de una habitación: la primera es el sitio 1. */
export const SITIOS: Casilla[] = [
  { x: 2, y: 2 },
  { x: 4, y: 2 },
  { x: 2, y: 4 },
  { x: 4, y: 4 },
  { x: 3, y: 3 },
];

export const SALIDA: Casilla = { x: 5, y: 5 };

/** Índices de la hoja tpp-iso-muebles. */
export const MUEBLE = {
  armario: 0,
  tienda: 1,
  buzon: 2,
  ordenador: 3,
  sofa: 4,
  mesa: 5,
  lampara: 6,
  estanteria: 7,
  cama: 8,
  nevera: 9,
  encimera: 10,
  alfombra: 11,
  tumbona: 12,
  silla: 13,
  sube: 14,
  baja: 15,
} as const;

export interface Mueble {
  sprite: number;
  x: number;
  y: number;
  nombre: string;
  /** Pantalla que se abre al llegar; sin ella es solo decoración. */
  abre?: PantallaJuego;
  /** Se puede pisar (alfombra). */
  pisable?: boolean;
  /** Habitación a la que lleva al llegar (escaleras). */
  va?: string;
}

export interface DisenoHabitacion {
  /** Suelo de la hoja de suelos (0 madera · 1 baldosa · 2 moqueta · 3 césped · 4 hormigón · 5 parquet). */
  suelo: number;
  /** Fila de la hoja de paredes (crema, lila, menta, azul). */
  pared: number;
  muebles: Mueble[];
}

const m = (sprite: number, x: number, y: number, nombre: string, abre?: PantallaJuego, pisable?: boolean): Mueble => ({
  sprite,
  x,
  y,
  nombre,
  abre,
  pisable,
});

/** Escalera: al llegar a ella pasas a otra habitación. */
const escalera = (sprite: number, x: number, y: number, nombre: string, va: string): Mueble => ({
  ...m(sprite, x, y, nombre),
  va,
});

export const DISENOS: Record<string, DisenoHabitacion> = {
  armario: {
    suelo: 4,
    pared: 1,
    muebles: [
      m(MUEBLE.armario, 0, 1, "Armario de cultivo", "armario"),
      m(MUEBLE.estanteria, 0, 4, "Estantería"),
      m(MUEBLE.lampara, 5, 0, "Lámpara"),
      escalera(MUEBLE.sube, 3, 0, "Escalera a la azotea", "azotea"),
    ],
  },
  salon: {
    suelo: 5,
    pared: 0,
    muebles: [
      m(MUEBLE.ordenador, 2, 0, "Ordenador", "mercado"),
      m(MUEBLE.tienda, 4, 0, "Tienda", "tienda"),
      m(MUEBLE.buzon, 5, 1, "Buzón de encargos", "encargos"),
      m(MUEBLE.sofa, 0, 3, "Sofá"),
      m(MUEBLE.mesa, 0, 4, "Mesa baja"),
      m(MUEBLE.lampara, 0, 0, "Lámpara"),
      m(MUEBLE.alfombra, 3, 4, "Alfombra", undefined, true),
    ],
  },
  cocina: {
    suelo: 1,
    pared: 2,
    muebles: [
      m(MUEBLE.nevera, 0, 0, "Nevera"),
      m(MUEBLE.encimera, 0, 1, "Encimera"),
      m(MUEBLE.encimera, 1, 0, "Encimera"),
      m(MUEBLE.mesa, 4, 3, "Mesa"),
      m(MUEBLE.silla, 5, 3, "Silla"),
      escalera(MUEBLE.sube, 1, 0, "Escalera al armario", "armario"),
      escalera(MUEBLE.baja, 1, 5, "Escalera al sótano", "sotano"),
    ],
  },
  dormitorio: {
    suelo: 2,
    pared: 3,
    muebles: [
      m(MUEBLE.cama, 0, 4, "Cama"),
      m(MUEBLE.estanteria, 3, 0, "Estantería"),
      m(MUEBLE.lampara, 0, 1, "Lámpara"),
      m(MUEBLE.alfombra, 3, 3, "Alfombra", undefined, true),
    ],
  },
  bano: {
    suelo: 1,
    pared: 2,
    muebles: [m(MUEBLE.encimera, 0, 1, "Lavabo"), m(MUEBLE.lampara, 5, 0, "Lámpara")],
  },
  terraza: {
    suelo: 3,
    pared: 0,
    muebles: [
      m(MUEBLE.tumbona, 0, 4, "Tumbona"),
      m(MUEBLE.mesa, 5, 4, "Mesa"),
      m(MUEBLE.silla, 5, 3, "Silla"),
      m(MUEBLE.lampara, 0, 0, "Lámpara"),
    ],
  },
  invernadero: {
    suelo: 3,
    pared: 2,
    muebles: [
      m(MUEBLE.estanteria, 0, 1, "Estantería"),
      m(MUEBLE.estanteria, 0, 2, "Estantería"),
      m(MUEBLE.mesa, 1, 5, "Mesa"),
      m(MUEBLE.lampara, 5, 0, "Lámpara"),
    ],
  },
  sotano: {
    suelo: 4,
    pared: 1,
    muebles: [
      m(MUEBLE.estanteria, 0, 1, "Estantería"),
      m(MUEBLE.estanteria, 0, 2, "Estantería"),
      escalera(MUEBLE.sube, 1, 0, "Escalera al salón", "salon"),
    ],
  },
  azotea: {
    suelo: 4,
    pared: 3,
    muebles: [
      m(MUEBLE.tumbona, 0, 5, "Tumbona"),
      m(MUEBLE.lampara, 5, 0, "Lámpara"),
      m(MUEBLE.mesa, 0, 0, "Mesa"),
      escalera(MUEBLE.baja, 1, 0, "Escalera al armario", "armario"),
    ],
  },
};

/**
 * Decoración comprada que se ve en el salón. `fila` es la de la hoja `tpp-deco-objetos-64` (2 fotogramas por fila).
 * En el suelo ocupa una casilla; en la pared, `pared` dice el tramo (derecha: fila y = 0; izquierda: columna x = 0).
 * Las posiciones de aquí son las de salida: el jugador las cambia en el modo editar.
 */
export interface DecoIso {
  fila: number;
  x: number;
  y: number;
  pared?: "derecha" | "izquierda";
  /** Reflejado (solo en el suelo; en la pared girar es cambiar de pared). */
  rot?: boolean;
  nombre: string;
}

export const DECO_SALON: Record<string, DecoIso> = {
  gato: { fila: 14, x: 5, y: 3, nombre: "Gato" },
  radio: { fila: 15, x: 1, y: 0, nombre: "Radio" },
  planta_adorno: { fila: 9, x: 0, y: 5, nombre: "Planta de adorno" },
  lampara_lava: { fila: 12, x: 0, y: 2, nombre: "Lámpara de lava" },
  puf: { fila: 17, x: 0, y: 1, nombre: "Puf" },
  acuario: { fila: 16, x: 5, y: 4, nombre: "Acuario" },
  lampara_pie: { fila: 13, x: 1, y: 5, nombre: "Lámpara de pie" },
  poster: { fila: 0, x: 5, y: 0, pared: "derecha", nombre: "Póster" },
  banderines: { fila: 4, x: 1, y: 0, pared: "derecha", nombre: "Banderines" },
  cuadro: { fila: 1, x: 0, y: 1, pared: "izquierda", nombre: "Cuadro" },
  figura_semillita: { fila: 2, x: 0, y: 4, pared: "izquierda", nombre: "Semillita" },
  neon_tpp: { fila: 5, x: 0, y: 5, pared: "izquierda", nombre: "Letrero TPP" },
};

/** Lo que guarda el servidor de cada objeto colocado (`equipo.deco_pos`). Suelo: x, y, r. Pared: p ("d" derecha, "i" izquierda) y x = tramo. */
export interface PosDeco {
  x: number;
  y?: number;
  r?: number;
  p?: "d" | "i";
}
export type MapaDeco = Record<string, PosDeco>;

/** Objeto colocado y listo para dibujar. */
export interface DecoColocada extends DecoIso {
  id: string;
}

/** Los tramos de pared con ventana no admiten objetos. */
export const VENTANA = { derecha: 3, izquierda: 2 } as const;

const SALON_FIJAS = (() => {
  const f = new Set<string>();
  for (const mu of DISENOS.salon.muebles) if (!mu.pisable) f.add(`${mu.x},${mu.y}`);
  for (const c of SITIOS) f.add(`${c.x},${c.y}`);
  f.add(`${SALIDA.x},${SALIDA.y}`);
  return f;
})();

export const decoEnSuelo = (id: string) => !!DECO_SALON[id] && !DECO_SALON[id].pared;
/** Casilla del salón que no admite decoración de suelo (mueble, sitio de planta o salida). */
export const casillaFijaSalon = (x: number, y: number) => SALON_FIJAS.has(`${x},${y}`);
export const tramoVentana = (pared: "derecha" | "izquierda", i: number) => VENTANA[pared] === i;

/** Tramo de pared como número (0 a 5): en la derecha es la columna; en la izquierda, la fila. */
export const tramoDe = (d: Pick<DecoIso, "x" | "y" | "pared">) => (d.pared === "izquierda" ? d.y : d.x);
export const posDeTramo = (pared: "derecha" | "izquierda", i: number) =>
  pared === "derecha" ? { x: i, y: 0 } : { x: 0, y: i };

/** ¿Está libre ese sitio, sin contar al propio objeto `id`? */
export function sitioLibre(colocadas: DecoColocada[], id: string, d: Pick<DecoIso, "x" | "y" | "pared">): boolean {
  if (d.pared) {
    const t = tramoDe(d);
    if (t < 0 || t >= COLS || tramoVentana(d.pared, t)) return false;
    return !colocadas.some((o) => o.id !== id && o.pared === d.pared && tramoDe(o) === t);
  }
  if (d.x < 0 || d.y < 0 || d.x >= COLS || d.y >= FILAS || casillaFijaSalon(d.x, d.y)) return false;
  return !colocadas.some((o) => o.id !== id && !o.pared && o.x === d.x && o.y === d.y);
}

/** Sitio de salida del objeto o, si está cogido, el primer hueco libre. */
function huecoPara(fuera: DecoColocada[], id: string): DecoIso | null {
  const base = DECO_SALON[id];
  if (!base) return null;
  const salida: DecoIso = { ...base, rot: false };
  if (sitioLibre(fuera, id, salida)) return salida;
  if (base.pared) {
    for (const pared of ["derecha", "izquierda"] as const) {
      for (let i = 0; i < COLS; i++) {
        const c = { ...base, pared, ...posDeTramo(pared, i) };
        if (sitioLibre(fuera, id, c)) return c;
      }
    }
    return null;
  }
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < FILAS; y++) {
      const c = { ...base, x, y };
      if (sitioLibre(fuera, id, c)) return c;
    }
  }
  return null;
}

/** Pone un objeto nuevo en su sitio de salida o en el primer hueco libre. */
export function ponerNueva(colocadas: DecoColocada[], id: string): DecoColocada | null {
  const d = huecoPara(colocadas, id);
  return d ? { ...d, id } : null;
}

/**
 * Pone cada objeto en su sitio: el que guardó el jugador, o el de salida. Si ese sitio ya está cogido,
 * va al primer hueco libre.
 */
export function colocarDeco(ids: string[], mapa?: MapaDeco | null): DecoColocada[] {
  const fuera: DecoColocada[] = [];
  const guardada = (id: string): DecoIso | null => {
    const base = DECO_SALON[id];
    const g = mapa?.[id];
    if (!g || typeof g.x !== "number") return null;
    if (base.pared) {
      const pared = g.p === "i" ? "izquierda" : "derecha";
      return { ...base, pared, ...posDeTramo(pared, g.x) };
    }
    return { ...base, x: g.x, y: g.y ?? 0, rot: g.r === 1 };
  };
  for (const id of ids) {
    if (!DECO_SALON[id]) continue;
    const g = guardada(id);
    const d = g && sitioLibre(fuera, id, g) ? g : huecoPara(fuera, id);
    if (d) fuera.push({ ...d, id });
  }
  return fuera;
}

/** Lo que se manda al servidor al guardar. */
export function posParaGuardar(colocadas: DecoColocada[]) {
  return colocadas.map((d) =>
    d.pared
      ? { id: d.id, p: d.pared === "izquierda" ? "i" : "d", x: tramoDe(d), y: 0 }
      : { id: d.id, x: d.x, y: d.y, r: d.rot ? 1 : 0 },
  );
}

/**
 * ¿Se puede llegar andando, desde la salida, a todo lo que se toca en el salón (ordenador, tienda, buzón)
 * y a las macetas? Si no, la decoración tapa el paso.
 */
export function pasoLibre(colocadas: DecoColocada[]): boolean {
  const bloq = new Set<string>();
  for (const mu of DISENOS.salon.muebles) if (!mu.pisable) bloq.add(`${mu.x},${mu.y}`);
  for (const d of colocadas) if (!d.pared) bloq.add(`${d.x},${d.y}`);
  const objetivos: Casilla[] = [
    ...DISENOS.salon.muebles.filter((mu) => mu.abre || mu.va),
    ...SITIOS.map((c) => ({ x: c.x, y: c.y })),
  ];
  return objetivos.every((o) =>
    Object.values(PASOS).some(([dx, dy]) => {
      const c = { x: o.x + dx, y: o.y + dy };
      if (c.x < 0 || c.y < 0 || c.x >= COLS || c.y >= FILAS || bloq.has(`${c.x},${c.y}`)) return false;
      return (c.x === SALIDA.x && c.y === SALIDA.y) || camino(SALIDA, c, bloq).length > 0;
    }),
  );
}

export const diseno = (habitacion: string): DisenoHabitacion => DISENOS[habitacion] ?? DISENOS.armario;

/** Fila de la hoja de plantas isométricas por hoja de sprites de la variedad. */
export const FILA_PLANTA_ISO: Record<string, number> = { clasica: 0, "hoja-azul": 1, noche: 2, dorada: 3, cristal: 4 };

const clave = (c: Casilla) => `${c.x},${c.y}`;

/** Camino más corto (4 sentidos) entre dos casillas, sin la de salida. Vacío si no hay. */
export function camino(desde: Casilla, hasta: Casilla, bloqueadas: Set<string>): Casilla[] {
  if (desde.x === hasta.x && desde.y === hasta.y) return [];
  const previo = new Map<string, Casilla | null>([[clave(desde), null]]);
  const cola: Casilla[] = [desde];
  for (let i = 0; i < cola.length; i++) {
    const c = cola[i];
    if (c.x === hasta.x && c.y === hasta.y) break;
    for (const [dx, dy] of Object.values(PASOS)) {
      const n = { x: c.x + dx, y: c.y + dy };
      if (n.x < 0 || n.y < 0 || n.x >= COLS || n.y >= FILAS) continue;
      if (previo.has(clave(n)) || bloqueadas.has(clave(n))) continue;
      previo.set(clave(n), c);
      cola.push(n);
    }
  }
  if (!previo.has(clave(hasta))) return [];
  const ruta: Casilla[] = [];
  for (let c: Casilla | null = hasta; c && !(c.x === desde.x && c.y === desde.y); c = previo.get(clave(c)) ?? null) {
    ruta.unshift(c);
  }
  return ruta;
}

export const claveCasilla = clave;

/** Dirección para mirar de una casilla a otra contigua. */
export function mirar(desde: Casilla, hacia: Casilla): Direccion {
  if (hacia.x > desde.x) return 0;
  if (hacia.y > desde.y) return 1;
  if (hacia.y < desde.y) return 2;
  return 3;
}

/** Aspecto del avatar de la casa. Se guarda en los ajustes (`avatar_casa`). */
export interface AvatarCasa {
  tono: number;
  ropa: number;
  color_ropa: number;
  pelo: number;
  color_pelo: number;
}

export const AVATAR_INICIAL: AvatarCasa = { tono: 1, ropa: 0, color_ropa: 0, pelo: 0, color_pelo: 1 };

export const NOMBRES_TONO = ["Claro", "Medio", "Moreno", "Oscuro"];
export const NOMBRES_ROPA = ["Camiseta", "Peto"];
export const NOMBRES_COLOR_ROPA = ["Verde", "Lila", "Dorado", "Azul"];
export const NOMBRES_PELO = ["Corto", "Moño", "Melena"];
export const NOMBRES_COLOR_PELO = ["Negro", "Castaño", "Rubio", "Lila"];

/** Columnas de las animaciones del avatar. */
export const COL_QUIETO = 0;
export const COL_CAMINAR = [1, 2, 3, 4];
export const COL_ACCION = { regar: 5, abonar: 7, cosechar: 9 } as const;
export type AccionAvatar = keyof typeof COL_ACCION;

/** ¿Este mueble, al dibujarse delante, tapa a una planta que está detrás? */
export function tapaPlanta(mu: Casilla, planta: Casilla): boolean {
  if (profundidad(mu.x, mu.y) <= profundidad(planta.x, planta.y)) return false;
  const m = esquina(mu.x, mu.y);
  const p = centro(planta.x, planta.y);
  // Zona que ocupa de verdad cada dibujo (sin el aire transparente de la hoja).
  return m.x < p.x + 12 && p.x - 12 < m.x + 48 && m.y - 72 < p.y + 4 && p.y - 44 < m.y + 24;
}
