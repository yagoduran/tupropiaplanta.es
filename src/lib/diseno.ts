export const COLORES = {
  o: "#1c1626",
  s: "#4b3a5e",
  l1: "#1d6630",
  l2: "#36a33b",
  l3: "#74cf45",
  l4: "#c9f26b",
  b1: "#c49a5a",
  b2: "#8a5a2e",
  d1: "#3a2418",
  d2: "#5f3c26",
  c: "#f6eed6",
  w: "#ffffff",
  sd: "#8c6a48",
  sd2: "#a8845c",
  y1: "#f2ec9a",
  g1: "#f4d36a",
  g2: "#d9a43a",
  a1: "#bfe6f7",
  a2: "#5fb6e8",
  a3: "#2f6fb0",
  v1: "#b48ee0",
  v2: "#7a52b8",
  p1: "#7c2e1b",
  p4: "#f7b072",
} as const;

type Color = keyof typeof COLORES;

interface Marco {
  t: Color[];
  l: Color[];
  r: Color[];
  b: Color[];
  f: Color;
}

const MARCOS = {
  panel: {
    t: ["o", "b1", "b2", "d2"],
    l: ["o", "b1", "b2", "d2"],
    r: ["o", "b2", "b2", "b1"],
    b: ["o", "b2", "b2", "b1"],
    f: "c",
  },
  panel_oscuro: {
    t: ["o", "b2", "d2", "o"],
    l: ["o", "b2", "d2", "o"],
    r: ["o", "d2", "d2", "b2"],
    b: ["o", "d2", "d2", "b2"],
    f: "s",
  },
  boton: { t: ["o", "l3"], l: ["o", "l3"], r: ["o", "l1"], b: ["o", "l1", "l1"], f: "l2" },
  boton_hover: { t: ["o", "l4"], l: ["o", "l4"], r: ["o", "l2"], b: ["o", "l1", "l1"], f: "l3" },
  boton_pulsado: { t: ["o", "l1"], l: ["o", "l1"], r: ["o", "l2"], b: ["o", "l2"], f: "l2" },
  boton_desactivado: { t: ["s", "sd2"], l: ["s", "sd2"], r: ["s", "sd"], b: ["s", "sd", "sd"], f: "sd2" },
  boton_espera: { t: ["o", "b2"], l: ["o", "b2"], r: ["o", "d1"], b: ["o", "d1", "d1"], f: "d2" },
  boton_secundario: { t: ["o", "w"], l: ["o", "w"], r: ["o", "sd2"], b: ["o", "sd2", "sd2"], f: "c" },
  boton_secundario_hover: { t: ["o", "w"], l: ["o", "w"], r: ["o", "c"], b: ["o", "sd2", "sd2"], f: "w" },
  boton_oscuro: { t: ["o", "d2"], l: ["o", "d2"], r: ["o", "d1"], b: ["o", "d1", "d1"], f: "s" },
  barra: { t: ["o"], l: ["o"], r: ["o"], b: ["o"], f: "d1" },
  bocadillo: { t: ["o"], l: ["o"], r: ["o"], b: ["o", "sd2"], f: "w" },
  pestana: { t: ["o", "b1"], l: ["o", "b1"], r: ["o", "d2"], b: ["o", "d2"], f: "b2" },
  pestana_activa: { t: ["o", "w"], l: ["o", "w"], r: ["o", "sd2"], b: ["o", "sd2"], f: "c" },
  tarjeta: { t: ["o", "w"], l: ["o", "w"], r: ["o", "sd2"], b: ["o", "sd2"], f: "c" },
  plano: { t: ["o"], l: ["o"], r: ["o"], b: ["o"], f: "s" },
  campo: { t: ["o", "sd2"], l: ["o", "sd2"], r: ["o", "w"], b: ["o", "w"], f: "w" },
  apagado: { t: ["s", "sd2"], l: ["s", "sd2"], r: ["s", "sd"], b: ["s", "sd", "sd"], f: "b1" },
  dorado: { t: ["o", "y1"], l: ["o", "y1"], r: ["o", "g2"], b: ["o", "g2", "g2"], f: "g1" },
  // Marcos de avatar y de rareza: borde de dos tonos y fondo crema.
  marco_madera: { t: ["o", "b1", "b2"], l: ["o", "b1", "b2"], r: ["o", "b2", "b1"], b: ["o", "b2", "b1"], f: "c" },
  marco_hojas: { t: ["o", "l3", "l1"], l: ["o", "l3", "l1"], r: ["o", "l1", "l3"], b: ["o", "l1", "l3"], f: "c" },
  marco_botanico: { t: ["o", "a1", "a3"], l: ["o", "a1", "a3"], r: ["o", "a3", "a1"], b: ["o", "a3", "a1"], f: "c" },
  marco_dorado: { t: ["o", "y1", "g2"], l: ["o", "y1", "g2"], r: ["o", "g2", "y1"], b: ["o", "g2", "y1"], f: "c" },
  marco_otono: { t: ["o", "p4", "p1"], l: ["o", "p4", "p1"], r: ["o", "p1", "p4"], b: ["o", "p1", "p4"], f: "c" },
  marco_escarcha: { t: ["o", "w", "a2"], l: ["o", "w", "a2"], r: ["o", "a2", "a1"], b: ["o", "a2", "a1"], f: "c" },
  marco_prestigio: { t: ["o", "v1", "v2"], l: ["o", "v1", "v2"], r: ["o", "v2", "v1"], b: ["o", "v2", "v1"], f: "c" },
} satisfies Record<string, Marco>;

export type IdMarco = keyof typeof MARCOS;

export interface EstiloMarco {
  border: string;
  boxShadow: string;
  background: string;
  clipPath: string;
}

/**
 * Marco pixel art hecho solo con CSS. `u` es el grosor de un píxel del marco:
 * un número en px o una expresión CSS como "var(--u)".
 */
export function marco(id: IdMarco, u: number | string): EstiloMarco {
  const m: Marco = MARCOS[id];
  const px = (k: number) => (typeof u === "number" ? `${k * u}px` : `calc(${k} * ${u})`);
  const sombras: string[] = [];
  const n = Math.max(m.t.length, m.l.length, m.r.length, m.b.length);
  for (let i = 1; i < n; i++) {
    if (m.l[i]) sombras.push(`inset ${px(i)} 0 0 ${COLORES[m.l[i]]}`);
    if (m.r[i]) sombras.push(`inset ${px(-i)} 0 0 ${COLORES[m.r[i]]}`);
    if (m.t[i]) sombras.push(`inset 0 ${px(i)} 0 ${COLORES[m.t[i]]}`);
    if (m.b[i]) sombras.push(`inset 0 ${px(-i)} 0 ${COLORES[m.b[i]]}`);
  }
  const c = px(1);
  return {
    border: `${c} solid ${COLORES[m.t[0]]}`,
    boxShadow: sombras.length ? sombras.join(",") : "none",
    background: COLORES[m.f],
    clipPath: `polygon(${c} 0, calc(100% - ${c}) 0, 100% ${c}, 100% calc(100% - ${c}), calc(100% - ${c}) 100%, ${c} 100%, 0 calc(100% - ${c}), 0 ${c})`,
  };
}

export const ICONOS = [
  "agua",
  "nutrientes",
  "luz",
  "temperatura",
  "ph",
  "salud",
  "tiempo",
  "fase",
  "regar",
  "abonar",
  "podar",
  "ajustar_luz",
  "cosechar",
  "anuncio",
  "cultivo",
  "tienda",
  "semillas",
  "logros",
  "ranking",
  "ajustes",
  "moneda",
  "nivel",
  "menu",
  "cerrar",
  "aviso",
  "email",
  "candado",
] as const;

export type IdIcono = (typeof ICONOS)[number];

export const FASES = [
  "Semilla",
  "Brote",
  "Plántula",
  "Vegetativo joven",
  "Vegetativo adulto",
  "Prefloración",
  "Floración",
  "Cosecha lista",
] as const;

export const ESTADOS = [
  "sana",
  "sedienta",
  "exceso_agua",
  "falta_nutrientes",
  "plaga",
  "hongo",
  "muriendo",
  "muerta",
] as const;

export type Estado = (typeof ESTADOS)[number];
export type Hora = "amanecer" | "dia" | "atardecer" | "noche";
