"use client";

import { useEffect, useState } from "react";
import { marco } from "@/lib/diseno";
import type { CosechaPendiente } from "@/lib/juego";
import { CosechaLista } from "./CosechaLista";
import { Icono } from "./Icono";
import { FlechaSemillita, Semillita, type DireccionFlecha, type Expresion } from "./Semillita";
import styles from "./tutorial.module.css";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Paso {
  titulo: string;
  expresion: Expresion;
  /** Valor de `data-tut` del elemento que hay que pulsar. */
  objetivo: string;
  /** Qué hay que pulsar, para el botón «Siguiente» bloqueado. */
  pulsa: string;
  /** Como mucho 140 caracteres. */
  texto: string;
}

export const TOTAL_PASOS = 8;

const PASOS: Paso[] = [
  {
    titulo: "Plantar",
    expresion: "senalando",
    objetivo: "plantar",
    pulsa: "Pulsa «Plantar»",
    texto: "¡Hola, soy Semillita! Todo empieza con una semilla: pulsa «Plantar» para ponerla en la maceta.",
  },
  {
    titulo: "Regar",
    expresion: "contenta",
    objetivo: "regar",
    pulsa: "Pulsa «Regar»",
    texto: "¡Ya asoma! La barra azul es el agua. Cuando baje de la mitad, pulsa «Regar».",
  },
  {
    titulo: "Abonar",
    expresion: "senalando",
    objetivo: "abonar",
    pulsa: "Pulsa «Abonar»",
    texto: "Para crecer fuerte necesita nutrientes. Abona una vez en cada fase.",
  },
  {
    titulo: "Plagas",
    expresion: "preocupada",
    objetivo: "tratar",
    pulsa: "Pulsa «Tratar»",
    texto: "¡Pulgones! Si no los tratas, bajarán la salud y la calidad. Pulsa «Tratar».",
  },
  {
    titulo: "Cosechar",
    expresion: "animando",
    objetivo: "cosechar",
    pulsa: "Pulsa «Cosechar»",
    texto: "Está en su punto. Cosecha ahora: si esperas demasiado, pierde calidad.",
  },
  {
    titulo: "Vender o guardar",
    expresion: "sorprendida",
    objetivo: "guardar",
    pulsa: "Elige una opción",
    texto: "Puedes vender ya o guardar los gramos. Guardados valen más en los encargos. Prueba «Guardar».",
  },
  {
    titulo: "Encargos",
    expresion: "senalando",
    objetivo: "pestana-encargos",
    pulsa: "Pulsa «Encargos»",
    texto: "Los clientes te piden gramos de una variedad a cambio de premios. Mira tu primer encargo.",
  },
  {
    titulo: "Hogar",
    expresion: "contenta",
    objetivo: "pestana-habitaciones",
    pulsa: "Pulsa «Hogar»",
    texto: "Al subir de nivel abrirás más sitios de la casa para cultivar. ¡Echa un vistazo!",
  },
];

/** Cosecha de ejemplo del paso 6; no se guarda en ninguna parte. */
const COSECHA_EJEMPLO: CosechaPendiente = {
  variedad: "clasica",
  gramos: 42,
  monedas: 252,
  xp: 40,
  calidad: 4,
  dias: 3,
};

function medir(nombre: string): Rect | null {
  for (const el of document.querySelectorAll(`[data-tut="${nombre}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return { x: r.left, y: r.top, w: r.width, h: r.height };
  }
  return null;
}

/** El texto aparece letra a letra; si se pulsa, sale entero. */
function Escribir({ texto }: { texto: string }) {
  const [n, setN] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? texto.length : 0,
  );

  useEffect(() => {
    if (n >= texto.length) return;
    const id = setInterval(() => setN((v) => Math.min(texto.length, v + 2)), 30);
    return () => clearInterval(id);
  }, [n, texto]);

  return (
    <p className={styles.texto} onClick={() => setN(texto.length)}>
      {texto.slice(0, n)}
      <span className={styles.oculto}>{texto.slice(n)}</span>
    </p>
  );
}

interface Props {
  /** Paso actual, de 1 a 8. */
  paso: number;
  /** Si el tutorial quedó a medias, pregunta antes si seguir donde se dejó. */
  retomar: boolean;
  /** Repetido desde Ajustes: no da regalo. */
  repeticion: boolean;
  /** Cambia de paso; el padre lo guarda. */
  alIr: (paso: number) => void;
  alSaltar: () => void;
  alTerminar: () => void;
  /** Pide permiso de notificaciones. Devuelve true si se ha concedido. */
  alActivarAvisos: () => Promise<boolean>;
}

export function Tutorial({ paso: n, retomar, repeticion, alIr, alSaltar, alTerminar, alActivarAvisos }: Props) {
  const [cuadro, setCuadro] = useState(0);
  const [vista, setVista] = useState<{ w: number; h: number } | null>(null);
  const [foco, setFoco] = useState<Rect | null>(null);
  const [fin, setFin] = useState(false);
  const [pregunta, setPregunta] = useState(retomar);
  const [confirmando, setConfirmando] = useState(false);
  const [avisosPuestos, setAvisosPuestos] = useState(false);
  const paso = PASOS[Math.min(TOTAL_PASOS, Math.max(1, n)) - 1];
  const modal = fin || pregunta || confirmando;

  useEffect(() => {
    const id = setInterval(() => setCuadro((c) => 1 - c), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const medirTodo = () => {
      setVista({ w: window.innerWidth, h: window.innerHeight });
      const r = medir(paso.objetivo);
      setFoco((previo) => (JSON.stringify(previo) === JSON.stringify(r) ? previo : r));
    };
    medirTodo();
    const id = setInterval(medirTodo, 300);
    window.addEventListener("resize", medirTodo);
    return () => {
      clearInterval(id);
      window.removeEventListener("resize", medirTodo);
    };
  }, [paso.objetivo]);

  if (!vista) return null;

  const avanzar = () => {
    if (n >= TOTAL_PASOS) setFin(true);
    else alIr(n + 1);
  };

  const { w: W, h: H } = vista;
  const movil = W < 1040;
  const margen = 6;
  const hueco = foco && { x: foco.x - margen, y: foco.y - margen, w: foco.w + 2 * margen, h: foco.h + 2 * margen };
  const oscuro =
    `M0 0H${W}V${H}H0Z` + (hueco && !modal ? `M${hueco.x} ${hueco.y}h${hueco.w}v${hueco.h}h${-hueco.w}Z` : "");

  // Bocadillo junto a la zona señalada: al lado en escritorio si cabe; si no, encima o debajo.
  const A = 16 * (movil ? 3 : 4);
  const sep = 8;
  const ancho = Math.min(movil ? 440 : 520, W - 24);
  const limitar = (v: number, max: number) => Math.max(12, Math.min(max, v));
  let flecha: { dir: DireccionFlecha; x: number; y: number } | null = null;
  let pos: { left: number; top?: number; bottom?: number } = { left: (W - ancho) / 2, top: Math.max(12, H / 2 - 120) };
  if (hueco && !modal) {
    const cx = hueco.x + hueco.w / 2;
    const cy = hueco.y + hueco.h / 2;
    if (!movil && hueco.x + hueco.w + sep + A + ancho + 12 <= W) {
      flecha = { dir: "izquierda", x: hueco.x + hueco.w + sep, y: cy - A / 2 };
      pos = { left: hueco.x + hueco.w + sep + A + sep, top: limitar(cy - 100, H - 232) };
    } else if (!movil && hueco.x - sep - A - ancho - 12 >= 0) {
      flecha = { dir: "derecha", x: hueco.x - sep - A, y: cy - A / 2 };
      pos = { left: hueco.x - sep - A - sep - ancho, top: limitar(cy - 100, H - 232) };
    } else if (H - (hueco.y + hueco.h) >= hueco.y) {
      flecha = { dir: "arriba", x: cx - A / 2, y: hueco.y + hueco.h + sep };
      pos = { left: limitar(cx - ancho / 2, W - ancho - 12), top: hueco.y + hueco.h + sep + A + sep };
    } else {
      flecha = { dir: "abajo", x: cx - A / 2, y: hueco.y - sep - A };
      pos = { left: limitar(cx - ancho / 2, W - ancho - 12), bottom: H - (hueco.y - sep - A - sep) };
    }
  }

  const tarjeta = marco("tarjeta", "var(--u)");
  const panel = marco("panel", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const sec = marco("boton_secundario", "var(--u)");
  const bloqueado = marco("boton_desactivado", "var(--u)");

  const activarAvisos = async () => {
    setAvisosPuestos(await alActivarAvisos());
  };

  const centrado = (expresion: Expresion, titulo: string, texto: string, contenido: React.ReactNode) => (
    <div className={styles.centro}>
      <div className={styles.modal} style={panel}>
        <div className={styles.cabeceraModal}>
          <Semillita expresion={expresion} cuadro={cuadro} />
          <div className={styles.cuerpo}>
            <h2 className={styles.titulo}>{titulo}</h2>
            <p className={styles.texto}>{texto}</p>
          </div>
        </div>
        {contenido}
      </div>
    </div>
  );

  return (
    <div
      className={styles.capa}
      data-libre={n === 6 && !modal}
      role="dialog"
      aria-modal={n === 6 && !modal ? undefined : true}
      aria-label="Tutorial"
    >
      {n === 6 && !modal && (
        <CosechaLista cosecha={COSECHA_EJEMPLO} ocupado={false} alVender={avanzar} alGuardar={avanzar} />
      )}
      {!(n === 6 && !modal) && (
        <svg className={styles.oscuro} width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
          <path d={oscuro} fillRule="evenodd" />
        </svg>
      )}

      {hueco && !modal && (
        <button
          type="button"
          className={styles.foco}
          data-cuadro={cuadro}
          aria-label={paso.pulsa}
          style={{ left: hueco.x, top: hueco.y, width: hueco.w, height: hueco.h }}
          onClick={avanzar}
        />
      )}
      {flecha && (
        <FlechaSemillita
          direccion={flecha.dir}
          cuadro={cuadro}
          px={A}
          style={{ left: flecha.x, top: flecha.y, zIndex: 60 }}
        />
      )}

      {!modal && (
        <div className={styles.bocadillo} style={{ ...pos, width: ancho }}>
          <Semillita expresion={paso.expresion} cuadro={cuadro} />
          <div className={styles.globo} style={tarjeta}>
            <div className={styles.paso}>
              <span>
                Paso {n} de {TOTAL_PASOS} · {paso.titulo}
              </span>
              <span className={styles.puntos}>
                {PASOS.map((p, i) => (
                  <span
                    key={p.titulo}
                    title={p.titulo}
                    data-estado={i + 1 < n ? "hecho" : i + 1 === n ? "actual" : "falta"}
                  />
                ))}
              </span>
            </div>
            <Escribir key={paso.titulo} texto={paso.texto} />
            <div className={styles.botones}>
              <button type="button" className={styles.saltar} onClick={() => setConfirmando(true)}>
                Saltar ›
              </button>
              <span className={styles.espacio} />
              {n > 1 && (
                <button type="button" className={styles.btn} style={sec} onClick={() => alIr(n - 1)}>
                  Atrás
                </button>
              )}
              <button type="button" className={styles.btn} style={bloqueado} disabled aria-disabled>
                {paso.pulsa}
              </button>
            </div>
          </div>
        </div>
      )}

      {pregunta &&
        !fin &&
        !confirmando &&
        centrado(
          "contenta",
          `Te quedaste en el paso ${n} de ${TOTAL_PASOS}`,
          "¿Quieres seguir donde lo dejaste o empezar desde el principio?",
          <div className={styles.botones}>
            <span className={styles.espacio} />
            <button
              type="button"
              className={styles.btn}
              style={sec}
              onClick={() => {
                alIr(1);
                setPregunta(false);
              }}
            >
              Desde el principio
            </button>
            <button type="button" className={styles.btn} style={boton} onClick={() => setPregunta(false)}>
              Seguir
            </button>
          </div>,
        )}

      {confirmando &&
        !fin &&
        centrado(
          "preocupada",
          "¿Saltar el tutorial?",
          repeticion
            ? "Puedes repetirlo cuando quieras desde Más › Tutorial."
            : "Puedes repetirlo cuando quieras desde Más › Tutorial. Si lo saltas, no recibes el regalo del final.",
          <div className={styles.botones}>
            <span className={styles.espacio} />
            <button
              type="button"
              className={styles.btn}
              style={sec}
              onClick={() => {
                setConfirmando(false);
                alSaltar();
              }}
            >
              Saltar
            </button>
            <button type="button" className={styles.btn} style={boton} onClick={() => setConfirmando(false)}>
              Seguir
            </button>
          </div>,
        )}

      {fin &&
        centrado(
          "animando",
          "¡Tutorial completado!",
          "Ya sabes lo básico. Si quieres repasar algo, repite el tutorial desde Más › Tutorial.",
          <>
            {!repeticion && (
              <div className={styles.regalo} style={tarjeta}>
                <Icono id="moneda" k={4} />
                <div>
                  <strong>+100 monedas</strong>
                  <span>Regalo de bienvenida para tus primeras compras.</span>
                </div>
              </div>
            )}
            <div className={styles.botones}>
              <span className={styles.espacio} />
              {!avisosPuestos && typeof Notification !== "undefined" && Notification.permission !== "granted" && (
                <button type="button" className={styles.btn} style={sec} onClick={activarAvisos}>
                  Activar avisos
                </button>
              )}
              <button type="button" className={styles.btn} style={boton} onClick={alTerminar}>
                Empezar a jugar
              </button>
            </div>
          </>,
        )}
    </div>
  );
}
