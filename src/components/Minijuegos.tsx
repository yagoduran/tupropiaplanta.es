"use client";

import { useEffect, useRef, useState } from "react";
import { marco } from "@/lib/diseno";
import styles from "./minijuegos.module.css";

export type TipoMinijuego = "poda" | "lavado";

interface Props {
  tipo: TipoMinijuego;
  /** Fase de la planta (la poda cambia de dificultad con ella). */
  fase: number;
  ocupado: boolean;
  /** Se llama al acabar la partida con las estrellas conseguidas (0 = fallo). */
  alTerminar: (estrellas: number) => void;
  /** Cerrar sin jugar (saltar) o después de ver el resultado. */
  alCerrar: () => void;
}

/** Iconos de la hoja de minijuegos (17 × 1, celda 32). */
const ICONO = {
  hoja: 0,
  sobrante: 1,
  cortada: 2,
  sobranteCortada: 3,
  tallo: 4,
  punta: 5,
  talloCortado: 6,
  tijeras: 7,
  gota: 10,
  nutriente: 11,
  maceta: 12,
  resina: 13,
  estres: 14,
  reloj: 15,
} as const;

function Icono({ i, k = 1, estilo }: { i: number; k?: number; estilo?: React.CSSProperties }) {
  return (
    <span
      className="pixel"
      aria-hidden
      style={{
        display: "block",
        width: 32 * k,
        height: 32 * k,
        backgroundImage: "url(/assets/minijuegos/tpp-mg-iconos-32-1x.png)",
        backgroundSize: `${544 * k}px ${32 * k}px`,
        backgroundPosition: `${-i * 32 * k}px 0`,
        ...estilo,
      }}
    />
  );
}

const TEXTOS = {
  poda: {
    titulo: "Poda de precisión",
    frase: "Corta solo las hojas amarillentas que sobran. No toques el tallo ni las hojas sanas.",
    premio: "Hasta +5 % de cosecha y restos para la mesa de procesado.",
    riesgo: "Si cortas el tallo o se acaba el tiempo: 2 h de estrés (crece un 20 % más lento).",
  },
  lavado: {
    titulo: "Lavado de raíces",
    frase:
      "Ajusta el caudal para dejar los nutrientes a cero entre el segundo 25 y el 30, sin que la maceta se desborde.",
    premio: "Hasta +15 % de precio y una estrella más de calidad.",
    riesgo: "Si la maceta llega al 100 % o se acaba el tiempo, no hay premio (tampoco castigo).",
  },
} as const;

const PODA: Record<number, { hojas: number; sobran: number; tiempo: number }> = {
  3: { hojas: 6, sobran: 3, tiempo: 20 },
  4: { hojas: 8, sobran: 3, tiempo: 18 },
  5: { hojas: 8, sobran: 4, tiempo: 15 },
};

interface Hoja {
  sobra: boolean;
  cortada: boolean;
}

/** Reparte las hojas que sobran: la de abajo siempre, la de arriba nunca. */
function repartir(n: number, sobran: number): Hoja[] {
  const hojas: Hoja[] = Array.from({ length: n }, () => ({ sobra: false, cortada: false }));
  hojas[0].sobra = true;
  const libres = Array.from({ length: n - 2 }, (_, i) => i + 1);
  for (let quedan = sobran - 1; quedan > 0 && libres.length > 0; quedan--) {
    const [i] = libres.splice(Math.floor(Math.random() * libres.length), 1);
    hojas[i].sobra = true;
  }
  return hojas;
}

function Poda({ fase, alAcabar }: { fase: number; alAcabar: (estrellas: number, motivo: string) => void }) {
  const cfg = PODA[fase] ?? PODA[3];
  const [hojas, setHojas] = useState<Hoja[]>(() => repartir(cfg.hojas, cfg.sobran));
  const [resta, setResta] = useState(cfg.tiempo);
  const sanas = useRef(0);
  const fin = useRef(false);
  const acabar = useRef(alAcabar);
  useEffect(() => {
    acabar.current = alAcabar;
  });

  useEffect(() => {
    const id = setInterval(() => {
      if (fin.current) return;
      setResta((r) => {
        const n = Math.max(0, r - 0.1);
        if (n <= 0 && !fin.current) {
          fin.current = true;
          setTimeout(() => acabar.current(0, "Se acabó el tiempo."), 0);
        }
        return n;
      });
    }, 100);
    return () => clearInterval(id);
  }, []);

  const cortar = (i: number) => {
    if (fin.current || hojas[i].cortada) return;
    const nuevas = hojas.map((h, j) => (j === i ? { ...h, cortada: true } : h));
    setHojas(nuevas);
    let tiempo = resta;
    if (!hojas[i].sobra) {
      sanas.current += 1;
      tiempo = Math.max(0, resta - 3);
      setResta(tiempo);
    }
    if (nuevas.every((h) => !h.sobra || h.cortada)) {
      fin.current = true;
      const estrellas = sanas.current === 0 && tiempo >= cfg.tiempo * 0.4 ? 3 : sanas.current <= 1 ? 2 : 1;
      acabar.current(estrellas, sanas.current === 0 ? "Poda limpia." : `Has cortado ${sanas.current} hoja(s) sana(s).`);
    }
  };

  const fallar = () => {
    if (fin.current) return;
    fin.current = true;
    acabar.current(0, "Has cortado el tallo.");
  };

  const paso = cfg.hojas === 8 ? 11 : 14;
  const quedan = hojas.filter((h) => h.sobra && !h.cortada).length;

  return (
    <div className={styles.partida}>
      <div className={styles.marcador}>
        <span>
          Tiempo <strong className="numero">{resta.toFixed(1)} s</strong>
        </span>
        <span>
          Quedan <strong className="numero">{quedan}</strong>
        </span>
      </div>
      <div className={styles.barra} aria-hidden>
        <span className={styles.barraTiempo} style={{ width: `${(resta / cfg.tiempo) * 100}%` }} />
      </div>
      <div className={styles.zona}>
        <div className={styles.lienzo}>
          <button type="button" className={styles.punta} aria-label="Punta del tallo (no cortar)" onClick={fallar}>
            <Icono i={ICONO.punta} />
          </button>
          {[16, 48, 80].map((y) => (
            <span key={y} className={styles.tramo} style={{ top: y }}>
              <Icono i={ICONO.tallo} />
            </span>
          ))}
          <button type="button" className={styles.tallo} aria-label="Tallo (no cortar)" onClick={fallar} />
          <span className={styles.maceta}>
            <Icono i={ICONO.maceta} />
          </span>
          {hojas.map((h, i) => {
            const derecha = i % 2 === 0;
            const y = 104 - i * paso - 16;
            return (
              <button
                key={i}
                type="button"
                className={styles.hoja}
                style={{ left: derecha ? 58 : 22, top: y, transform: derecha ? undefined : "scaleX(-1)" }}
                aria-label={h.cortada ? "Hoja cortada" : h.sobra ? "Hoja que sobra" : "Hoja sana"}
                disabled={h.cortada}
                onClick={() => cortar(i)}
              >
                <Icono
                  i={
                    h.cortada
                      ? h.sobra
                        ? ICONO.sobranteCortada
                        : ICONO.cortada
                      : h.sobra
                        ? ICONO.sobrante
                        : ICONO.hoja
                  }
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface EstadoLavado {
  t: number;
  nutrientes: number;
  agua: number;
  maxAgua: number;
  drenaje: number;
}

const DURACION = 30;

function Lavado({ alAcabar }: { alAcabar: (estrellas: number, motivo: string) => void }) {
  const [caudal, setCaudal] = useState(50);
  const [e, setE] = useState<EstadoLavado>({ t: 0, nutrientes: 100, agua: 20, maxAgua: 20, drenaje: 50 });
  const sim = useRef({ ...e, caudal: 50, fin: false });
  const acabar = useRef(alAcabar);
  useEffect(() => {
    acabar.current = alAcabar;
  });

  useEffect(() => {
    const dt = 0.1;
    const id = setInterval(() => {
      const s = sim.current;
      if (s.fin) return;
      s.t += dt;
      const atasco = (s.t >= 7 && s.t < 10.5) || (s.t >= 18 && s.t < 21.5);
      s.drenaje = 50 + 14 * Math.sin(s.t * 0.8) - (atasco ? 30 : 0);
      s.nutrientes = Math.max(0, s.nutrientes - (s.caudal / 100) * 7.5 * dt);
      const dif = s.caudal - s.drenaje;
      s.agua = Math.max(0, Math.min(100, s.agua + dif * (dif > 0 ? 0.6 : 0.4) * dt));
      s.maxAgua = Math.max(s.maxAgua, s.agua);
      let fin: [number, string] | null = null;
      if (s.agua >= 100) fin = [0, "La maceta se ha desbordado."];
      else if (s.nutrientes <= 0)
        fin =
          s.t < 25
            ? [1, "Lavado demasiado rápido: has acabado antes del segundo 25."]
            : s.maxAgua < 75
              ? [3, "Lavado perfecto: a cero en su momento y sin encharcar."]
              : [2, "A cero en su momento, pero la maceta se encharcó."];
      else if (s.t >= DURACION) fin = [0, "Se acabó el tiempo y aún quedaban nutrientes."];
      setE({ t: s.t, nutrientes: s.nutrientes, agua: s.agua, maxAgua: s.maxAgua, drenaje: s.drenaje });
      if (fin) {
        s.fin = true;
        acabar.current(fin[0], fin[1]);
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  const mover = (d: number) => {
    const n = Math.max(0, Math.min(100, sim.current.caudal + d));
    sim.current.caudal = n;
    setCaudal(n);
  };
  const boton = marco("boton_secundario", "var(--u)");

  return (
    <div className={styles.partida}>
      <div className={styles.fila}>
        <span className={styles.etiqueta}>Tiempo {e.t.toFixed(0)} s</span>
        <div className={styles.barra}>
          <span className={styles.ventana} style={{ left: `${(25 / DURACION) * 100}%`, right: 0 }} />
          <span className={styles.barraTiempo} style={{ width: `${(e.t / DURACION) * 100}%` }} />
        </div>
      </div>
      <div className={styles.fila}>
        <span className={styles.etiqueta}>Nutrientes {Math.round(e.nutrientes)} %</span>
        <div className={styles.barra}>
          <span className={styles.barraNutrientes} style={{ width: `${e.nutrientes}%` }} />
        </div>
      </div>
      <div className={styles.fila}>
        <span className={styles.etiqueta}>Caudal {caudal} % · la raya es lo que drena</span>
        <div className={styles.barra}>
          <span
            className={styles.barraCaudal}
            style={{ width: `${caudal}%`, background: caudal > e.drenaje ? "#e07b3f" : "#5fb6e8" }}
          />
          <span className={styles.marca} style={{ left: `${Math.max(0, Math.min(100, e.drenaje))}%` }} />
        </div>
      </div>
      <div className={styles.fila}>
        <span className={styles.etiqueta}>Agua en la maceta {Math.round(e.agua)} %</span>
        <div className={styles.barra}>
          <span
            className={styles.barraCaudal}
            style={{ width: `${e.agua}%`, background: e.agua >= 75 ? "#e07b3f" : "#5fb6e8" }}
          />
          <span className={styles.marca} style={{ left: "75%" }} />
        </div>
      </div>
      <div className={styles.controles}>
        {[-10, -5, 5, 10].map((d) => (
          <button key={d} type="button" className={styles.control} style={boton} onClick={() => mover(d)}>
            {d > 0 ? `+${d}` : `−${-d}`}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Minijuego de cuidado: inicio (jugar o saltar), partida y resultado. */
export function Minijuego({ tipo, fase, ocupado, alTerminar, alCerrar }: Props) {
  const [paso, setPaso] = useState<"inicio" | "partida" | "resultado">("inicio");
  const [resultado, setResultado] = useState<{ estrellas: number; motivo: string } | null>(null);
  const t = TEXTOS[tipo];
  const panel = marco("panel", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");

  const acabar = (estrellas: number, motivo: string) => {
    setResultado({ estrellas, motivo });
    setPaso("resultado");
    alTerminar(estrellas);
  };

  const premio = (n: number) =>
    tipo === "poda"
      ? n === 0
        ? "Planta estresada: crecerá un 20 % más lento durante 2 horas."
        : `+${[0, 3, 4, 5][n]} % de cosecha, +5 de salud y restos de poda.`
      : n === 0
        ? "Sin premio esta vez."
        : `+${n * 5} % de precio en la cosecha${n === 3 ? " y una estrella más de calidad" : ""}.`;

  return (
    <div className={styles.capa} role="dialog" aria-modal="true" aria-label={t.titulo}>
      <div className={styles.caja} style={panel}>
        <h2 className={styles.titulo}>{t.titulo}</h2>
        {paso === "inicio" && (
          <>
            <div className={styles.icono}>
              <Icono i={tipo === "poda" ? ICONO.tijeras : ICONO.gota} k={2} />
            </div>
            <p className={styles.texto}>{t.frase}</p>
            <p className={styles.premio}>{t.premio}</p>
            <p className={styles.riesgo}>{t.riesgo}</p>
            <div className={styles.botones}>
              <button type="button" className={styles.boton} style={secundario} onClick={alCerrar}>
                Ahora no
              </button>
              <button type="button" className={styles.boton} style={boton} onClick={() => setPaso("partida")}>
                Jugar
              </button>
            </div>
          </>
        )}
        {paso === "partida" &&
          (tipo === "poda" ? <Poda fase={fase} alAcabar={acabar} /> : <Lavado alAcabar={acabar} />)}
        {paso === "resultado" && resultado && (
          <>
            <p className={styles.estrellas} aria-label={`${resultado.estrellas} de 3 estrellas`}>
              {[1, 2, 3].map((n) => (
                <span key={n} style={{ opacity: n <= resultado.estrellas ? 1 : 0.25 }}>
                  ★
                </span>
              ))}
            </p>
            <p className={styles.texto}>{resultado.motivo}</p>
            <p className={resultado.estrellas > 0 ? styles.premio : styles.riesgo}>{premio(resultado.estrellas)}</p>
            <div className={styles.botones}>
              <button type="button" className={styles.boton} style={boton} disabled={ocupado} onClick={alCerrar}>
                Volver a la planta
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
