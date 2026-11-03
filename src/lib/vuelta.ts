/** Bloque 8f: eventos al volver. Los datos vienen de `tpp.mis_eventos()`; los textos son del diseño. */

export type TipoEvento = "apagon" | "gato" | "calor" | "visita" | "regalo" | "plaga";
export type Resultado = "resuelto" | "gasto" | "asumido" | "sin_cambios";

/** Orden de los iconos en la hoja tpp-eventos-iconos-16 (16 × 1). */
export const ICONOS_EVENTO = [
  "apagon",
  "gato",
  "calor",
  "visita",
  "regalo",
  "plaga",
  "monedas",
  "salud",
  "tiempo",
  "semilla",
  "agua",
  "crecimiento",
  "xp",
  "frio",
  "ok",
  "mal",
] as const;
export type IconoEvento = (typeof ICONOS_EVENTO)[number];

/** Columna de cada evento en la hoja de ilustraciones de 64 × 64 (6 × 2). */
export const COLUMNA_EVENTO: Record<TipoEvento, number> = {
  apagon: 0,
  gato: 1,
  calor: 2,
  visita: 3,
  regalo: 4,
  plaga: 5,
};

export interface EventoPendiente {
  id: number;
  tipo: TipoEvento;
  datos: Record<string, unknown>;
}

export interface Decidido {
  tipo: TipoEvento;
  op: number;
  resultado: Resultado;
  coste: number;
  en: string;
}

export interface DatosVuelta {
  pendientes: EventoPendiente[];
  resumen: {
    horas: number;
    crecimiento?: number;
    agua?: number;
    secado_listos?: number;
  } | null;
  vuelta: Decidido[];
  registro: Decidido[];
  monedas: number;
}

/** Efecto en forma de chip: [icono, texto, malo]. */
export type Chip = [IconoEvento, string, boolean];

export interface OpcionEvento {
  l: string;
  coste: number;
  /** Texto del coste cuando no son monedas (p. ej. «30 min»). */
  costeTexto?: string;
  costeIcono?: IconoEvento;
  ef: string;
  /** Fila de la ilustración al resolver: 0 = el evento, 1 = resuelto. */
  img: 0 | 1;
  rt: string;
  rd: string;
  fx: Chip[];
}

export interface DefEvento {
  t: string;
  d: string;
  ya: Chip[];
  ops: OpcionEvento[];
}

export const EVENTOS: Record<TipoEvento, DefEvento> = {
  apagon: {
    t: "Corte de luz en el barrio",
    d: "Saltó la luz en toda la calle y las lámparas estuvieron apagadas 3 h. Las plantas no crecieron en ese tiempo.",
    ya: [["tiempo", "Luz parada 3 h", true]],
    ops: [
      {
        l: "Comprar generador",
        coste: 1200,
        ef: "Recuperas las 3 h y los próximos cortes no te afectan.",
        img: 1,
        rt: "Generador en marcha",
        rd: "Queda instalado junto a las lámparas. Recuperas las 3 h perdidas y el próximo corte no lo notarás.",
        fx: [
          ["monedas", "−1.200", true],
          ["tiempo", "+3 h recuperadas", false],
          ["ok", "Protegido de cortes", false],
        ],
      },
      {
        l: "Asumir el retraso",
        coste: 0,
        ef: "Las cosechas pendientes llegan 3 h más tarde.",
        img: 0,
        rt: "Toca esperar",
        rd: "Todas las macetas con lámpara van 3 h por detrás. No pierdes calidad.",
        fx: [["tiempo", "Cosechas +3 h", true]],
      },
    ],
  },
  gato: {
    t: "Gato curioso",
    d: "Un gato se coló por la ventana y mordisqueó una hoja de tu planta. Antes de irse dejó una semilla.",
    ya: [
      ["salud", "−5 % salud", true],
      ["semilla", "+1 semilla", false],
    ],
    ops: [
      {
        l: "Recoger la semilla",
        coste: 0,
        ef: "Te la quedas. El gato puede volver.",
        img: 1,
        rt: "Semilla guardada",
        rd: "Va al inventario. La plantarás gratis cuando quieras.",
        fx: [["semilla", "+1 semilla", false]],
      },
      {
        l: "Poner una malla",
        coste: 300,
        ef: "Recoges la semilla y el gato no vuelve a entrar.",
        img: 1,
        rt: "Ventana protegida",
        rd: "La malla queda puesta. Se acabaron los mordiscos y los regalos.",
        fx: [
          ["monedas", "−300", true],
          ["semilla", "+1 semilla", false],
          ["ok", "Sin más visitas", false],
        ],
      },
      {
        l: "Dejarle agua",
        coste: 0,
        ef: "Vuelve más a menudo: unas veces muerde y otras trae regalos.",
        img: 1,
        rt: "Nuevo amigo",
        rd: "El gato se acostumbra a pasar. Su evento sale el doble de veces durante 7 días.",
        fx: [
          ["semilla", "+1 semilla", false],
          ["gato", "Visitas ×2 · 7 días", false],
        ],
      },
    ],
  },
  calor: {
    t: "Ola de calor",
    d: "La casa sube 6 °C durante 12 h. Por encima de 30 °C las plantas crecen más lento y beben el doble.",
    ya: [["calor", "+6 °C · 12 h", true]],
    ops: [
      {
        l: "Usar ventilador",
        coste: 450,
        ef: "−4 °C las 12 h. Se queda en el inventario.",
        img: 1,
        rt: "Aire en movimiento",
        rd: "La casa baja unos grados. El ventilador queda guardado en tu inventario.",
        fx: [
          ["monedas", "−450", true],
          ["frio", "−4 °C · 12 h", false],
        ],
      },
      {
        l: "Poner hielo",
        coste: 120,
        ef: "−6 °C, pero solo dura 4 h.",
        img: 1,
        rt: "Hielo en las bandejas",
        rd: "Las primeras 4 h la ola no se nota. Después vuelve el calor las 8 h que quedan.",
        fx: [
          ["monedas", "−120", true],
          ["frio", "−6 °C · 4 h", false],
          ["calor", "+6 °C · 8 h", true],
        ],
      },
      {
        l: "Aguantar",
        coste: 0,
        ef: "−10 % de crecimiento y el doble de agua durante 12 h.",
        img: 0,
        rt: "Plantas sedientas",
        rd: "Riega más a menudo durante 12 h. Si una maceta se queda seca, pierde salud.",
        fx: [
          ["crecimiento", "−10 % · 12 h", true],
          ["agua", "Agua ×2", true],
        ],
      },
    ],
  },
  visita: {
    t: "Visita inesperada",
    d: "Tu prima Lucía se presentó sin avisar. Quiere ver tus plantas y tiene media hora.",
    ya: [],
    ops: [
      {
        l: "Enseñarle la casa",
        coste: 0,
        costeTexto: "30 min",
        costeIcono: "tiempo",
        ef: "+40 XP.",
        img: 1,
        rt: "Visita guiada",
        rd: "Le encanta tu casa. Ganas experiencia y Lucía promete volver.",
        fx: [["xp", "+40 XP", false]],
      },
      {
        l: "Regalarle un esqueje",
        coste: 0,
        costeTexto: "1 esqueje",
        costeIcono: "semilla",
        ef: "Lucía se hace clienta fija: +10 % al vender durante 3 días.",
        img: 1,
        rt: "Clienta fija",
        rd: "Se lleva un esqueje. Durante 3 días te paga un 10 % más.",
        fx: [["monedas", "+10 % ventas · 3 días", false]],
      },
      {
        l: "Despedirla en la puerta",
        coste: 0,
        ef: "No pasa nada.",
        img: 0,
        rt: "Otro día será",
        rd: "Lucía se va. No ganas ni pierdes nada.",
        fx: [],
      },
    ],
  },
  regalo: {
    t: "Regalo de un vecino",
    d: "Ernesto, el del 3.º B, te dejó una bolsa en la puerta: abono casero de su huerto.",
    ya: [["regalo", "+1 abono casero", false]],
    ops: [
      {
        l: "Usarlo ya",
        coste: 0,
        ef: "+15 % de crecimiento durante 24 h.",
        img: 1,
        rt: "Abono repartido",
        rd: "Lo echas en tus macetas. Crecerán un 15 % más rápido durante 24 h.",
        fx: [["crecimiento", "+15 % · 24 h", false]],
      },
      {
        l: "Guardarlo",
        coste: 0,
        ef: "Va al inventario para cuando lo necesites.",
        img: 1,
        rt: "Al inventario",
        rd: "Tienes el abono casero guardado. Lo usas desde el Inventario.",
        fx: [["regalo", "+1 en inventario", false]],
      },
      {
        l: "Devolverle el favor",
        coste: 150,
        ef: "Usas el abono y Ernesto traerá más regalos.",
        img: 1,
        rt: "Buen vecino",
        rd: "Le llevas unas pastas. Sus próximos regalos serán el doble de generosos.",
        fx: [
          ["monedas", "−150", true],
          ["crecimiento", "+15 % · 24 h", false],
          ["xp", "Regalos mejores", false],
        ],
      },
    ],
  },
  plaga: {
    t: "Plaga sorpresa",
    d: "Han aparecido pulgones en 2 macetas. Si no haces nada, la salud baja cada hora.",
    ya: [
      ["plaga", "2 macetas", true],
      ["salud", "−2 % por hora", true],
    ],
    ops: [
      {
        l: "Spray de neem",
        coste: 200,
        ef: "Limpia las 2 macetas.",
        img: 1,
        rt: "Pulgones fuera",
        rd: "No queda ninguno. La salud deja de bajar.",
        fx: [
          ["monedas", "−200", true],
          ["ok", "2 macetas limpias", false],
        ],
      },
      {
        l: "Soltar mariquitas",
        coste: 350,
        ef: "Limpian las macetas y las protegen 3 días.",
        img: 1,
        rt: "Patrulla de mariquitas",
        rd: "Se comen los pulgones y se quedan. Tus plantas no tendrán plagas en 3 días.",
        fx: [
          ["monedas", "−350", true],
          ["ok", "Protegido 3 días", false],
        ],
      },
      {
        l: "Quitarlos a mano",
        coste: 0,
        costeTexto: "2 h",
        costeIcono: "tiempo",
        ef: "Limpia 1 maceta. La otra sigue con plaga.",
        img: 0,
        rt: "A medias",
        rd: "Una maceta queda limpia. La otra sigue con pulgones: trátala cuanto antes.",
        fx: [
          ["ok", "1 maceta limpia", false],
          ["plaga", "1 maceta con plaga", true],
        ],
      },
    ],
  },
};

export const ETIQUETA_RESULTADO: Record<Resultado, [string, string]> = {
  resuelto: ["Resuelto", "#c9f26b"],
  gasto: ["Con gasto", "#f4d36a"],
  asumido: ["Asumido", "#f7b072"],
  sin_cambios: ["Sin cambios", "#ffffff"],
};

export function cuando(iso: string, ahora: number): string {
  const min = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 60000));
  if (min < 60) return `Hace ${min} min`;
  if (min < 1440) return `Hace ${Math.floor(min / 60)} h`;
  return `Hace ${Math.floor(min / 1440)} d`;
}
