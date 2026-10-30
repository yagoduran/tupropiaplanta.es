"use client";

import { useEffect, useState } from "react";
import { marco } from "@/lib/diseno";
import { Icono } from "./Icono";
import styles from "./tutorial.module.css";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Flecha = "arriba" | "izquierda" | "derecha" | "ambas";

interface Paso {
  tipo: "modal" | "bocadillo";
  anim: "hablar" | "saludar" | "senalar" | "celebrar";
  titulo: string;
  texto: string;
  boton: string;
  /** Zonas a resaltar. `escena:x,y,w,h` es un recorte de la escena en su rejilla de 96x80. */
  focos?: string[];
  flecha?: Flecha;
}

const FILA_ANIM = { hablar: 0, saludar: 1, senalar: 2, celebrar: 3 } as const;
const TOTAL = 8;

function pasos(agua: number): Record<number, Paso> {
  return {
    1: {
      tipo: "modal",
      anim: "saludar",
      titulo: "¡Hola! Soy Semillita",
      texto:
        "Te acompaño en tu primera planta. Tu semilla ya está lista: la Verde Clásica es gratis y perfecta para aprender.",
      boton: "Siguiente",
    },
    2: {
      tipo: "bocadillo",
      anim: "senalar",
      titulo: "Tu maceta",
      texto: "Aquí vive tu planta. Ya está plantada: en unas horas verás cómo crece el primer brote.",
      boton: "Siguiente",
      focos: ["escena:31,37,34,35"],
      flecha: "arriba",
    },
    3: {
      tipo: "bocadillo",
      anim: "hablar",
      titulo: "Las barras de estado",
      texto: "Aquí ves lo que necesita tu planta. Mantén cada barra en verde; en naranja o rojo, actúa.",
      boton: "Siguiente",
      focos: ["estado"],
      flecha: "izquierda",
    },
    4: {
      tipo: "bocadillo",
      anim: "senalar",
      titulo: "Riega cuando haga falta",
      texto: `El agua está al ${Math.round(agua)} %. Pulsa Regar para subirla. Después el botón descansa un rato.`,
      boton: "Siguiente",
      focos: ["regar"],
      flecha: "derecha",
    },
    5: {
      tipo: "bocadillo",
      anim: "hablar",
      titulo: "El tiempo no se para",
      texto:
        "Tu planta vive en tiempo real y tarda unos 3 días en estar lista. Aunque cierres la web, sigue creciendo y gastando agua. Si aparece una plaga, trátala pronto.",
      boton: "Siguiente",
      focos: ["escena:3,5,23,27"],
      flecha: "izquierda",
    },
    6: {
      tipo: "modal",
      anim: "hablar",
      titulo: "¿Te aviso cuando me necesite?",
      texto: "Con las notificaciones del navegador sabrás cuándo regar o cosechar sin tener la web abierta.",
      boton: "Activar avisos",
    },
    7: {
      tipo: "bocadillo",
      anim: "senalar",
      titulo: "Monedas y tienda",
      texto:
        "Ganas monedas al cuidar y cosechar. Al cosechar puedes vender o guardar los gramos para los encargos del móvil, que pagan más.",
      boton: "Siguiente",
      focos: ["monedas", "pestana-tienda"],
      flecha: "ambas",
    },
    8: {
      tipo: "modal",
      anim: "celebrar",
      titulo: "¡Ya eres cultivador!",
      texto: "Has completado el tutorial. Aquí tienes un regalo de bienvenida para tu primera cosecha.",
      boton: "¡A cultivar!",
    },
  };
}

const ESTADOS = [
  { id: "agua", nombre: "Agua", detalle: "baja cada hora" },
  { id: "nutrientes", nombre: "Nutrientes", detalle: "con abono" },
  { id: "luz", nombre: "Luz", detalle: "según la lámpara" },
  { id: "temperatura", nombre: "Temp.", detalle: "ideal 18-30 °C" },
  { id: "ph", nombre: "pH", detalle: "ideal 5,8-7,4" },
  { id: "salud", nombre: "Salud", detalle: "resume todo" },
] as const;

const SEMILLAS = [
  { id: "clasica", nombre: "Verde Clásica", rareza: "Común", precio: "Gratis", libre: true },
  { id: "hoja-azul", nombre: "Hoja Azul", rareza: "Poco común", precio: "Nivel 3", libre: false },
  { id: "dorada", nombre: "Dorada del Sur", rareza: "Rara", precio: "Nivel 6", libre: false },
];

function medir(nombre: string): Rect | null {
  for (const el of document.querySelectorAll(`[data-tut="${nombre}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return { x: r.left, y: r.top, w: r.width, h: r.height };
  }
  return null;
}

function resolverFoco(foco: string): Rect | null {
  const [nombre, recorte] = foco.split(":");
  const base = medir(nombre);
  if (!base || !recorte) return base;
  const [x, y, w, h] = recorte.split(",").map(Number);
  const k = base.w / 96;
  return { x: base.x + x * k, y: base.y + y * k, w: w * k, h: h * k };
}

interface Props {
  pasoInicial: number;
  agua: number;
  /** Al avanzar o retroceder: guarda el paso. */
  alCambiarPaso: (paso: number) => void;
  alSaltar: () => void;
  alTerminar: () => void;
  /** Pide permiso de notificaciones. Devuelve true si se ha concedido. */
  alActivarAvisos: () => Promise<boolean>;
}

export function Tutorial({ pasoInicial, agua, alCambiarPaso, alSaltar, alTerminar, alActivarAvisos }: Props) {
  const [n, setN] = useState(Math.min(TOTAL, Math.max(1, pasoInicial)));
  const [cuadro, setCuadro] = useState(0);
  const [vista, setVista] = useState<{ w: number; h: number } | null>(null);
  const [focos, setFocos] = useState<Rect[]>([]);
  const [trabajando, setTrabajando] = useState(false);
  const paso = pasos(agua)[n];

  useEffect(() => {
    const id = setInterval(() => setCuadro((c) => (c + 1) % 4), 220);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const medirTodo = () => {
      setVista({ w: window.innerWidth, h: window.innerHeight });
      const rs = (paso.focos ?? []).map(resolverFoco).filter((r): r is Rect => !!r);
      setFocos((previos) => (JSON.stringify(previos) === JSON.stringify(rs) ? previos : rs));
    };
    medirTodo();
    const id = setInterval(medirTodo, 400);
    window.addEventListener("resize", medirTodo);
    return () => {
      clearInterval(id);
      window.removeEventListener("resize", medirTodo);
    };
  }, [paso]);

  if (!vista) return null;

  const ir = (nuevo: number) => {
    setN(nuevo);
    alCambiarPaso(nuevo);
  };

  const siguiente = async () => {
    if (n === 6) {
      setTrabajando(true);
      await alActivarAvisos();
      setTrabajando(false);
    }
    if (n === TOTAL) alTerminar();
    else ir(n + 1);
  };

  const { w: W, h: H } = vista;
  const movil = W < 1040;
  const margen = movil ? 6 : 8;
  const hueco = (r: Rect) => ({ x: r.x - margen, y: r.y - margen, w: r.w + 2 * margen, h: r.h + 2 * margen });
  const huecos = focos.map(hueco);
  const oscuro = `M0 0H${W}V${H}H0Z` + huecos.map((r) => `M${r.x} ${r.y}h${r.w}v${r.h}h${-r.w}Z`).join("");

  // Posición del bocadillo: junto al foco en pantallas anchas, arriba o abajo en móvil.
  const ancho = Math.min(movil ? 400 : 520, W - 24);
  const alto = n === 3 || n === 5 ? 330 : 250;
  const limitar = (v: number, max: number) => Math.max(12, Math.min(max - 12, v));
  let bx = (W - ancho) / 2;
  let by = (H - alto) / 2;
  const f0 = huecos[0];
  const flechas: { x: number; y: number; giro: number }[] = [];
  const A = 32 * (movil ? 2 : 3);
  if (f0 && paso.tipo === "bocadillo") {
    const cx = f0.x + f0.w / 2;
    const cy = f0.y + f0.h / 2;
    if (movil) {
      by = cy > H / 2 ? 72 : H - alto - 72;
      flechas.push({ x: cx - A / 2, y: cy > H / 2 ? f0.y - A - 2 : f0.y + f0.h + 2, giro: cy > H / 2 ? 0 : 180 });
    } else if (paso.flecha === "arriba") {
      flechas.push({ x: cx - A / 2, y: f0.y - A - 2, giro: 0 });
      bx = f0.x + f0.w + 20;
      by = cy - alto / 2;
    } else if (paso.flecha === "izquierda") {
      flechas.push({ x: f0.x + f0.w + 4, y: cy - A / 2, giro: 90 });
      bx = f0.x + f0.w + A + 12;
      by = f0.y;
    } else if (paso.flecha === "derecha") {
      flechas.push({ x: f0.x - A - 4, y: cy - A / 2, giro: -90 });
      bx = f0.x - A - 12 - ancho;
      by = cy - alto / 2;
    } else if (paso.flecha === "ambas") {
      flechas.push({ x: cx - A / 2, y: f0.y + f0.h + 4, giro: 180 });
      const f1 = huecos[1];
      if (f1) flechas.push({ x: f1.x + f1.w / 2 - A / 2, y: f1.y - A - 4, giro: 0 });
    }
  }
  bx = limitar(bx, W - ancho + 12);
  by = limitar(by, H - alto + 12);

  const panel = marco("panel", "var(--u)");
  const boc = marco("tarjeta", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const sec = marco("boton_secundario", "var(--u)");
  const tarjeta = marco("tarjeta", "var(--u)");
  const bloqueada = marco("boton_desactivado", "var(--u)");
  const guia = {
    backgroundPosition: `calc(${-cuadro * 32}px * var(--ik)) calc(${-FILA_ANIM[paso.anim] * 32}px * var(--ik))`,
  };

  const cabecera = (
    <>
      <div className={styles.paso}>
        <span>
          Paso {n} de {TOTAL}
        </span>
        <span className={styles.puntos} aria-hidden>
          {Array.from({ length: TOTAL }, (_, i) => (
            <span key={i} data-hecho={i < n} />
          ))}
        </span>
      </div>
      <h2 className={styles.titulo}>{paso.titulo}</h2>
      <p className={styles.texto}>{paso.texto}</p>
    </>
  );

  const botones = (
    <div className={styles.botones}>
      {n < TOTAL && (
        <button type="button" className={styles.saltar} onClick={alSaltar}>
          Saltar tutorial
        </button>
      )}
      <span className={styles.espacio} />
      {n > 1 && (
        <button type="button" className={styles.btn} style={sec} onClick={() => ir(n - 1)}>
          Atrás
        </button>
      )}
      {n === 6 && (
        <button type="button" className={styles.btn} style={sec} onClick={() => ir(n + 1)}>
          Ahora no
        </button>
      )}
      <button
        type="button"
        className={`${styles.btn} ${styles.principal}`}
        style={boton}
        disabled={trabajando}
        onClick={siguiente}
      >
        {paso.boton}
      </button>
    </div>
  );

  return (
    <div className={styles.capa} role="dialog" aria-modal="true" aria-label="Tutorial">
      <svg className={styles.oscuro} width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
        <path d={oscuro} fillRule="evenodd" />
      </svg>
      {huecos.map((r, i) => (
        <div key={i} className={styles.foco} style={{ left: r.x, top: r.y, width: r.w, height: r.h }} />
      ))}
      {flechas.map((f, i) => (
        <div
          key={i}
          className={`pixel ${styles.flecha}`}
          style={{
            left: f.x,
            top: f.y,
            width: A,
            height: A,
            transform: `rotate(${f.giro}deg)`,
            backgroundSize: `calc(128px * var(--ik)) calc(160px * var(--ik))`,
            backgroundPosition: `calc(${-cuadro * 32}px * var(--ik)) calc(${-4 * 32}px * var(--ik))`,
          }}
        />
      ))}

      {paso.tipo === "bocadillo" ? (
        <div className={styles.bocadillo} style={{ ...boc, left: bx, top: by, width: ancho }}>
          <div className={`pixel ${styles.guia}`} style={guia} />
          <div className={styles.cuerpo}>
            {cabecera}
            {n === 3 && (
              <ul className={styles.estados}>
                {ESTADOS.map((e) => (
                  <li key={e.id}>
                    <Icono id={e.id} k={2} />
                    <span>
                      <strong>{e.nombre}</strong> {e.detalle}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {n === 5 && (
              <div className={styles.horas}>
                {["amanecer", "dia", "atardecer", "noche"].map((h, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={h} src={`/assets/escena/escena-${h}-1x.png`} alt="" data-actual={i === cuadro} />
                ))}
              </div>
            )}
            {botones}
          </div>
        </div>
      ) : (
        <div className={styles.centro}>
          <div className={styles.modal} style={panel}>
            <div className={styles.cabeceraModal}>
              <div className={`pixel ${styles.guia}`} style={guia} />
              <div className={styles.cuerpo}>{cabecera}</div>
            </div>
            {n === 1 && (
              <div className={styles.semillas}>
                {SEMILLAS.map((s) => (
                  <div
                    key={s.id}
                    className={styles.semilla}
                    style={
                      s.libre ? { ...tarjeta, outline: "var(--u) solid #36a33b", outlineOffset: 2 } : { ...bloqueada }
                    }
                  >
                    <div
                      className={`pixel ${styles.maceta}`}
                      style={{
                        backgroundImage: `url(/assets/sprites/tpp-variedad-${s.id}-1x.png)`,
                        filter: s.libre ? "none" : "brightness(0)",
                        opacity: s.libre ? 1 : 0.3,
                      }}
                    />
                    <strong>{s.libre ? s.nombre : "???"}</strong>
                    <span>
                      {s.rareza} · {s.precio}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {n === 6 && (
              <p className={styles.nota}>
                Tu navegador te pedirá permiso a continuación. Puedes desactivarlo cuando quieras en Ajustes.
              </p>
            )}
            {n === 8 && (
              <div className={styles.regalo} style={tarjeta}>
                <Icono id="moneda" k={4} />
                <div>
                  <strong>+100 monedas</strong>
                  <span>Para tus primeras compras en la tienda.</span>
                </div>
              </div>
            )}
            {botones}
          </div>
        </div>
      )}
    </div>
  );
}
