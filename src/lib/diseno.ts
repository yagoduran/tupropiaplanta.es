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
  barra: { t: ["o"], l: ["o"], r: ["o"], b: ["o"], f: "d1" },
  bocadillo: { t: ["o"], l: ["o"], r: ["o"], b: ["o", "sd2"], f: "w" },
  pestana: { t: ["o", "b1"], l: ["o", "b1"], r: ["o", "d2"], b: ["o", "d2"], f: "b2" },
  pestana_activa: { t: ["o", "w"], l: ["o", "w"], r: ["o", "sd2"], b: ["o", "sd2"], f: "c" },
  tarjeta: { t: ["o", "w"], l: ["o", "w"], r: ["o", "sd2"], b: ["o", "sd2"], f: "c" },
  plano: { t: ["o"], l: ["o"], r: ["o"], b: ["o"], f: "s" },
  campo: { t: ["o", "sd2"], l: ["o", "sd2"], r: ["o", "w"], b: ["o", "w"], f: "w" },
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
