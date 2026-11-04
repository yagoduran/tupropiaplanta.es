"use client";

import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { HABITACION_POR_ID } from "@/lib/casa";
import {
  ALTO,
  ANCHO,
  COLS,
  COL_ACCION,
  COL_CAMINAR,
  FILAS,
  FILA_PLANTA_ISO,
  PASOS,
  SALIDA,
  SITIOS,
  VISTA,
  camino,
  centro,
  claveCasilla,
  diseno,
  esquina,
  mirar,
  profundidad,
  type AccionAvatar,
  type AvatarCasa,
  type Casilla,
  type Direccion,
} from "@/lib/casaIso";
import type { HuecosJuego, PantallaJuego } from "@/lib/juego";
import { hojaDe } from "@/lib/variedades";
import { Semillita, type Expresion } from "./Semillita";
import styles from "./casaIso.module.css";

const RUTA = "/assets/casa-iso/";

export interface CasaIsoApi {
  /** El avatar va junto a la planta elegida y hace la acción. */
  animar: (tipo: AccionAvatar) => void;
}

interface Props {
  habitacion: string;
  huecos: HuecosJuego;
  avatar: AvatarCasa;
  ocupado: boolean;
  alElegirHueco: (hueco: number) => void;
  alAbrir: (pantalla: PantallaJuego) => void;
  ref?: Ref<CasaIsoApi>;
  /** Avisos y botones que van por encima de la casa. */
  children?: ReactNode;
}

interface PropsSprite {
  hoja: string;
  w: number;
  h: number;
  col: number;
  fila: number;
  x: number;
  y: number;
  z: number;
  suave?: boolean;
  opacidad?: number;
}

/** Un recorte de una hoja de sprites a 1×; el lienzo entero se amplía después. */
function Sprite({ hoja, w, h, col, fila, x, y, z, suave, opacidad }: PropsSprite) {
  return (
    <div
      className={`pixel ${suave ? styles.suave : ""}`}
      aria-hidden
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        zIndex: z,
        opacity: opacidad,
        backgroundImage: `url(${RUTA}${hoja}-1x.png)`,
        backgroundPosition: `${-col * w}px ${-fila * h}px`,
      }}
    />
  );
}

const BURBUJA = { aviso: 0, agua: 1, plaga: 2, cosechar: 3, encargo: 4, tienda: 5, ordenador: 6 } as const;

/** La casa en isométrico: el jugador camina por la habitación y toca plantas y muebles. */
export function CasaIso({ habitacion, huecos, avatar, ocupado, alElegirHueco, alAbrir, ref, children }: Props) {
  const hab = HABITACION_POR_ID[habitacion];
  const plano = diseno(habitacion);
  const fuera = !!hab?.fuera;

  const contenedor = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  const [caja, setCaja] = useState({ w: ANCHO, h: ALTO });

  const [pos, setPos] = useState<Casilla>(SALIDA);
  const [previo, setPrevio] = useState<Casilla>(SALIDA);
  const [dir, setDir] = useState<Direccion>(1);
  const [caminando, setCaminando] = useState(false);
  const [anim, setAnim] = useState<AccionAvatar | null>(null);
  const [tick, setTick] = useState(0);
  const [dormida, setDormida] = useState(false);
  const [hover, setHover] = useState<Casilla | null>(null);
  const [rutaVista, setRutaVista] = useState<Casilla[]>([]);

  const posRef = useRef<Casilla>(SALIDA);
  const ruta = useRef<Casilla[]>([]);
  const llegada = useRef<(() => void) | null>(null);
  const caminandoRef = useRef(false);
  const animRef = useRef(false);
  const actividad = useRef(0);
  const finAnim = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sitios = huecos.lista.filter((h) => h.habitacion === habitacion);
  const plantas = sitios
    .map((h) => ({ h, c: SITIOS[h.sitio - 1] }))
    .filter((p): p is { h: (typeof sitios)[number]; c: Casilla } => !!p.c);

  const bloqueadas = new Set<string>();
  for (const mu of plano.muebles) if (!mu.pisable) bloqueadas.add(claveCasilla(mu));
  for (const p of plantas) bloqueadas.add(claveCasilla(p.c));
  const ultima = useRef({ bloqueadas, plantas, activo: huecos.activo, ocupado });
  useEffect(() => {
    ultima.current = { bloqueadas, plantas, activo: huecos.activo, ocupado };
  });

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const medir = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setK(Math.max(0.1, Math.min(w / VISTA.w, h / VISTA.h)));
      setCaja({ w, h });
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let n = 0;
    actividad.current = Date.now();
    const id = setInterval(() => {
      n++;
      if (caminandoRef.current || animRef.current || n % 5 === 0) setTick(n);
      setDormida(Date.now() - actividad.current > 25_000);
      if (n % 2 !== 0) return;
      const siguiente = ruta.current.shift();
      if (siguiente) {
        const anterior = posRef.current;
        posRef.current = siguiente;
        caminandoRef.current = true;
        setDir(mirar(anterior, siguiente));
        setPrevio(anterior);
        setPos(siguiente);
        setRutaVista([...ruta.current]);
        setCaminando(true);
      } else if (caminandoRef.current) {
        caminandoRef.current = false;
        setCaminando(false);
        const f = llegada.current;
        llegada.current = null;
        f?.();
      }
    }, 110);
    return () => {
      clearInterval(id);
      if (finAnim.current) clearTimeout(finAnim.current);
    };
  }, []);

  const reproducir = (tipo: AccionAvatar) => {
    actividad.current = Date.now();
    animRef.current = true;
    setAnim(tipo);
    if (finAnim.current) clearTimeout(finAnim.current);
    finAnim.current = setTimeout(() => {
      animRef.current = false;
      setAnim(null);
    }, 1100);
  };

  const empezar = (nueva: Casilla[], alLlegar: (() => void) | null) => {
    actividad.current = Date.now();
    ruta.current = nueva;
    llegada.current = alLlegar;
    setRutaVista([...nueva]);
    if (nueva.length === 0 && alLlegar) alLlegar();
    else if (nueva.length > 0) caminandoRef.current = true;
  };

  /** Camina hasta la casilla de al lado de un objetivo y mira hacia él. */
  const irJunto = (objetivo: Casilla, alLlegar: () => void) => {
    const { bloqueadas: bl } = ultima.current;
    const desde = posRef.current;
    let mejor: Casilla[] | null = null;
    let junto: Casilla | null = null;
    for (const [dx, dy] of Object.values(PASOS)) {
      const c = { x: objetivo.x + dx, y: objetivo.y + dy };
      if (c.x < 0 || c.y < 0 || c.x >= COLS || c.y >= FILAS || bl.has(claveCasilla(c))) continue;
      const r = camino(desde, c, bl);
      if (c.x === desde.x && c.y === desde.y) {
        mejor = [];
        junto = c;
        break;
      }
      if (r.length > 0 && (!mejor || r.length < mejor.length)) {
        mejor = r;
        junto = c;
      }
    }
    if (!mejor || !junto) return;
    const termina = () => {
      setDir(mirar(posRef.current, objetivo));
      alLlegar();
    };
    empezar(mejor, termina);
  };

  useImperativeHandle(ref, () => ({
    animar: (tipo) => {
      const { plantas: pl, activo } = ultima.current;
      const objetivo = pl.find((p) => p.h.hueco === activo)?.c;
      if (!objetivo) return reproducir(tipo);
      irJunto(objetivo, () => reproducir(tipo));
    },
  }));

  const pisar = (c: Casilla) => {
    if (ultima.current.ocupado || ultima.current.bloqueadas.has(claveCasilla(c))) return;
    empezar(camino(posRef.current, c, ultima.current.bloqueadas), null);
  };

  const atencion = plantas.some(
    (p) => p.h.vida === "viva" && (p.h.plaga || (p.h.agua ?? 100) < 30 || (p.h.fase ?? 0) >= 8),
  );
  const expresion: Expresion = anim ? "animando" : dormida ? "durmiendo" : atencion ? "preocupada" : "contenta";

  const c = centro(pos.x, pos.y);
  const zAvatar = profundidad(pos.x, pos.y) + 6;
  const fotograma = Math.floor(tick / 2) % 2;
  const colAvatar = anim ? COL_ACCION[anim] + fotograma : caminando ? COL_CAMINAR[tick % 4] : 0;
  const cp = centro(previo.x, previo.y);

  const celdas: Casilla[] = [];
  for (let x = 0; x < COLS; x++) for (let y = 0; y < FILAS; y++) celdas.push({ x, y });

  const quieto = !caminando && !anim;
  const destino = rutaVista.length ? rutaVista[rutaVista.length - 1] : null;

  return (
    <div ref={contenedor} className={styles.contenedor}>
      <div
        className={styles.lienzo}
        style={{
          width: ANCHO,
          height: ALTO,
          transform: `scale(${k})`,
          left: (caja.w - VISTA.w * k) / 2 - VISTA.x * k,
          top: (caja.h - VISTA.h * k) / 2 - VISTA.y * k,
        }}
      >
        {/* Paredes de fondo */}
        {Array.from({ length: FILAS }, (_, y) => {
          const v = esquina(0, y);
          return fuera ? (
            <Sprite
              key={`pl${y}`}
              hoja="tpp-iso-muros-bajos-16x24"
              w={16}
              h={24}
              col={0}
              fila={plano.pared}
              x={v.x}
              y={v.y - 16}
              z={profundidad(0, y) + 2}
            />
          ) : (
            <Sprite
              key={`pl${y}`}
              hoja="tpp-iso-paredes-16x72"
              w={16}
              h={72}
              col={y === 2 ? 1 : 0}
              fila={plano.pared}
              x={v.x}
              y={v.y - 64}
              z={50}
            />
          );
        })}
        {Array.from({ length: COLS }, (_, x) => {
          const v = esquina(x, 0);
          return fuera ? (
            <Sprite
              key={`pr${x}`}
              hoja="tpp-iso-muros-bajos-16x24"
              w={16}
              h={24}
              col={1}
              fila={plano.pared}
              x={v.x + 16}
              y={v.y - 16}
              z={profundidad(x, 0) + 2}
            />
          ) : (
            <Sprite
              key={`pr${x}`}
              hoja="tpp-iso-paredes-16x72"
              w={16}
              h={72}
              col={x === 3 ? 5 : 4}
              fila={plano.pared}
              x={v.x + 16}
              y={v.y - 64}
              z={50}
            />
          );
        })}

        {/* Suelo y cantos */}
        {celdas.map(({ x, y }) => {
          const e = esquina(x, y);
          return (
            <div key={`s${x},${y}`} className={styles.grupo}>
              <div
                className={`pixel ${styles.suelo}`}
                role="presentation"
                style={{
                  left: e.x,
                  top: e.y,
                  backgroundImage: `url(${RUTA}tpp-iso-suelos-32x16-1x.png)`,
                  backgroundPosition: `${-plano.suelo * 32}px 0`,
                }}
                onPointerEnter={(ev) => ev.pointerType === "mouse" && setHover({ x, y })}
                onPointerLeave={() => setHover(null)}
                onClick={() => pisar({ x, y })}
              />
              {y === FILAS - 1 && (
                <Sprite hoja="tpp-iso-cantos-32x24" w={32} h={24} col={fuera ? 2 : 0} fila={0} x={e.x} y={e.y} z={9} />
              )}
              {x === COLS - 1 && (
                <Sprite hoja="tpp-iso-cantos-32x24" w={32} h={24} col={fuera ? 3 : 1} fila={0} x={e.x} y={e.y} z={9} />
              )}
            </div>
          );
        })}

        {/* Marcas del suelo: camino, destino y casilla bajo el ratón */}
        {rutaVista.slice(0, -1).map((r) => {
          const e = esquina(r.x, r.y);
          return (
            <Sprite
              key={`c${r.x},${r.y}`}
              hoja="tpp-iso-suelos-32x16"
              w={32}
              h={16}
              col={8}
              fila={0}
              x={e.x}
              y={e.y}
              z={12}
            />
          );
        })}
        {destino && (
          <Sprite
            hoja="tpp-iso-suelos-32x16"
            w={32}
            h={16}
            col={7}
            fila={0}
            x={esquina(destino.x, destino.y).x}
            y={esquina(destino.x, destino.y).y}
            z={12}
          />
        )}
        {hover && !bloqueadas.has(claveCasilla(hover)) && (
          <Sprite
            hoja="tpp-iso-suelos-32x16"
            w={32}
            h={16}
            col={6}
            fila={0}
            x={esquina(hover.x, hover.y).x}
            y={esquina(hover.x, hover.y).y}
            z={12}
          />
        )}

        {/* Muebles */}
        {plano.muebles.map((mu, i) => {
          const v = esquina(mu.x, mu.y);
          const z = mu.pisable ? 15 : profundidad(mu.x, mu.y) + 5;
          return (
            <div key={`m${i}`} className={styles.grupo}>
              <Sprite
                hoja="tpp-iso-muebles-64x96"
                w={64}
                h={96}
                col={mu.sprite}
                fila={0}
                x={v.x + 16 - 24}
                y={v.y - 72}
                z={z}
              />
              {!mu.pisable && (
                <button
                  type="button"
                  className={styles.zona}
                  aria-label={mu.nombre}
                  title={mu.nombre}
                  style={{ left: v.x + 16 - 16, top: v.y - 40, width: 32, height: 48, zIndex: z + 1 }}
                  onClick={() => {
                    if (ultima.current.ocupado) return;
                    irJunto(mu, () => mu.abre && alAbrir(mu.abre));
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Plantas */}
        {plantas.map(({ h, c: casilla }) => {
          const cc = centro(casilla.x, casilla.y);
          const z = profundidad(casilla.x, casilla.y) + 5;
          const hoja = h.variedad ? hojaDe(h.variedad) : null;
          const fila = hoja ? (FILA_PLANTA_ISO[hoja] ?? 0) : 0;
          const sedienta = h.vida === "viva" && (h.agua ?? 100) < 15;
          const col = h.vida === "muerta" ? 9 : sedienta ? 8 : (h.fase ?? 1) - 1;
          const activa = h.hueco === huecos.activo;
          const burbuja =
            h.vida === "muerta"
              ? BURBUJA.aviso
              : h.vida !== "viva"
                ? null
                : h.plaga
                  ? BURBUJA.plaga
                  : (h.agua ?? 100) < 30
                    ? BURBUJA.agua
                    : (h.fase ?? 0) >= 8
                      ? BURBUJA.cosechar
                      : null;
          return (
            <div key={`p${h.hueco}`} className={styles.grupo}>
              {hoja && (h.vida === "viva" || h.vida === "muerta") ? (
                <Sprite
                  hoja="tpp-iso-plantas-32x48"
                  w={32}
                  h={48}
                  col={col}
                  fila={fila}
                  x={cc.x - 16}
                  y={cc.y - 44}
                  z={z}
                />
              ) : (
                <Sprite
                  hoja="tpp-iso-suelos-32x16"
                  w={32}
                  h={16}
                  col={10}
                  fila={0}
                  x={cc.x - 16}
                  y={cc.y - 8}
                  z={12}
                  opacidad={0.7}
                />
              )}
              {activa && (
                <Sprite hoja="tpp-iso-suelos-32x16" w={32} h={16} col={7} fila={0} x={cc.x - 16} y={cc.y - 8} z={12} />
              )}
              {burbuja !== null && (
                <Sprite
                  hoja="tpp-iso-burbujas-16"
                  w={16}
                  h={16}
                  col={burbuja}
                  fila={0}
                  x={cc.x - 8}
                  y={cc.y - 62}
                  z={1500}
                  suave
                />
              )}
              <button
                type="button"
                className={styles.zona}
                aria-label={`Planta del sitio ${h.sitio}`}
                style={{ left: cc.x - 14, top: cc.y - 40, width: 28, height: 44, zIndex: z + 1 }}
                onClick={() => {
                  if (ultima.current.ocupado) return;
                  if (!activa) alElegirHueco(h.hueco);
                  irJunto(casilla, () => undefined);
                }}
              />
            </div>
          );
        })}

        {/* Avatar: cuerpo, ropa, pelo y herramienta */}
        <div className={styles.avatar} style={{ left: c.x - 16, top: c.y - 44, zIndex: zAvatar }} aria-hidden>
          {(
            [
              ["tpp-avatar-cuerpo-32x48", avatar.tono * 4 + dir],
              ["tpp-avatar-ropa-32x48", (avatar.ropa * 4 + avatar.color_ropa) * 4 + dir],
              ["tpp-avatar-pelo-32x48", (avatar.pelo * 4 + avatar.color_pelo) * 4 + dir],
              ...(anim ? [["tpp-avatar-objetos-32x48", dir] as [string, number]] : []),
            ] as [string, number][]
          ).map(([hoja, fila]) => (
            <div
              key={hoja}
              className="pixel"
              style={{
                backgroundImage: `url(${RUTA}${hoja}-1x.png)`,
                backgroundPosition: `${-colAvatar * 32}px ${-fila * 48}px`,
              }}
            />
          ))}
        </div>

        {/* Semillita va detrás del jugador */}
        <div className={styles.semillita} style={{ left: cp.x - 26, top: cp.y - 56, zIndex: zAvatar - 1 }} aria-hidden>
          <Semillita expresion={expresion} cuadro={quieto ? Math.floor(tick / 5) % 2 : fotograma} tamano="32px" />
        </div>
      </div>
      {children}
    </div>
  );
}
