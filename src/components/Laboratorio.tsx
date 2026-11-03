"use client";

import { useEffect, useState } from "react";
import {
  HORAS_CRUCE,
  PRECIO_ACELERAR,
  costeCruce,
  type DatosCruces,
  type Libro,
  type PlantaCruce,
  type ResultadoCruce,
} from "@/lib/cruces";
import {
  FENOTIPOS,
  FENOTIPO_POR_ID,
  NOMBRES_CORTOS,
  PARES_F1,
  TROFEOS,
  VARIEDADES_LIBRO,
  claveDePar,
  hojaFenotipo,
  recetaDe,
} from "@/lib/genetica";
import { marco } from "@/lib/diseno";
import { RAREZAS, VARIEDAD_POR_ID } from "@/lib/variedades";
import { AnimacionCruce, ANIM_APERTURA, ANIM_CAPULLO_QUIETO, ANIM_PROBETA } from "./AnimacionCruce";
import { IconoProgresion } from "./IconoProgresion";
import styles from "./progresion.module.css";

interface Props {
  datos: DatosCruces | null;
  libro: Libro | null;
  /** Momento (ms) en que llegaron los datos, para la cuenta atrás. */
  recibidoEn: number;
  monedas: number;
  ocupado: boolean;
  alIniciar: (a: string, b: string) => void;
  alAcelerar: () => void;
  alAbrir: () => void;
  alGuardar: (nombre: string) => void;
  alReclamar: (id: string) => void;
}

function tiempo(segundos: number) {
  const s = Math.max(0, Math.floor(segundos));
  return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")} min ${String(s % 60).padStart(2, "0")} s`;
}

const corto = (id: string) => NOMBRES_CORTOS[id] ?? VARIEDAD_POR_ID[id]?.nombre ?? id;

/** Planta de una hoja de variedad en una fase (1–8), a escala k (1 = 128 px). */
function Sprite({
  hoja,
  k = 1,
  fase = 6,
  silueta = false,
}: {
  hoja: string;
  k?: number;
  fase?: number;
  silueta?: boolean;
}) {
  return (
    <span
      className="pixel"
      aria-hidden
      style={{
        display: "block",
        flex: "none",
        width: 128 * k,
        height: 128 * k,
        backgroundImage: `url(/assets/sprites/tpp-variedad-${hoja}-1x.png)`,
        backgroundSize: `${768 * k}px ${1024 * k}px`,
        backgroundPosition: `0 ${-128 * (fase - 1) * k}px`,
        filter: silueta ? "brightness(0)" : undefined,
        opacity: silueta ? 0.3 : 1,
      }}
    />
  );
}

/** Planta con fenotipo raro: hoja de la familia, fila del fenotipo, columna de la fase. */
function SpriteFenotipo({ hoja, fenotipo, silueta }: { hoja: string; fenotipo: string; silueta?: boolean }) {
  const fila = FENOTIPO_POR_ID[fenotipo]?.fila ?? 0;
  return (
    <span
      className="pixel"
      aria-hidden
      style={{
        display: "block",
        flex: "none",
        width: 64,
        height: 64,
        backgroundImage: `url(/assets/genetica/tpp-gen-fenotipos-${hojaFenotipo(hoja)}-1x.png)`,
        backgroundSize: "512px 320px",
        backgroundPosition: `${-7 * 64}px ${-fila * 64}px`,
        filter: silueta ? "brightness(0)" : undefined,
        opacity: silueta ? 0.3 : 1,
      }}
    />
  );
}

function Etiqueta({ rareza }: { rareza: keyof typeof RAREZAS }) {
  const r = RAREZAS[rareza];
  return (
    <span className={styles.etiqueta} style={{ background: r.fondo, color: r.texto }}>
      {r.etiqueta}
    </span>
  );
}

/** Resultado del cruce: se abre el capullo, se ven las semillas y se le pone nombre a la F1. */
function Resultado({
  cruce,
  ocupado,
  alGuardar,
}: {
  cruce: NonNullable<DatosCruces["cruce"]>;
  ocupado: boolean;
  alGuardar: (nombre: string) => void;
}) {
  const res = cruce.resultado as ResultadoCruce;
  const [visible, setVisible] = useState(false);
  const [nombre, setNombre] = useState(res.nombre ?? "");

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 1800);
    return () => clearTimeout(id);
  }, []);

  const f1 = res.tipo === "f1";
  const hoja = res.hoja ?? res.ficha?.hoja ?? VARIEDAD_POR_ID[res.id]?.hoja ?? "clasica";
  const titulo = f1 ? nombre : (VARIEDAD_POR_ID[res.id]?.nombre ?? res.id);
  const ficha = res.ficha as Record<string, number | string> | undefined;
  const etiqueta = f1
    ? "Híbrido F1"
    : res.tipo === "pura"
      ? "Semillas puras"
      : res.nuevo
        ? "¡Cruce secreto descubierto!"
        : "Cruce conocido";

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Resultado del cruce</h1>
        <span className={styles.resumen}>
          {corto(cruce.variedad_a)} × {corto(cruce.variedad_b)}
        </span>
      </div>
      {!visible ? (
        <section
          className={`${styles.tarjeta} ${styles.capullo}`}
          style={marco("panel", "var(--u)")}
          aria-live="polite"
        >
          <AnimacionCruce cuadros={ANIM_APERTURA} k={3} />
          <p className={styles.subtitulo}>Germinando…</p>
        </section>
      ) : (
        <section className={styles.tarjeta} style={marco("panel", "var(--u)")} aria-label="Semillas nuevas">
          <div className={styles.antesDespues}>
            <div style={{ textAlign: "center" }}>
              <Sprite hoja={hoja} fase={2} k={1} />
              <p className={styles.pequeno}>Ahora</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <Sprite hoja={hoja} fase={8} k={1} />
              <p className={styles.pequeno}>Así florecerá</p>
            </div>
          </div>
          <p className={styles.pequeno}>
            {res.rareza && <Etiqueta rareza={res.rareza} />} {etiqueta}
          </p>
          <p className={styles.vistaNombre}>{titulo || "Sin nombre"}</p>
          <p className={styles.pequeno}>
            Consigues {res.semillas ?? 3} semillas de cruce. Al plantarlas hay más opciones de fenotipos raros.
            {res.tipo === "conocido" && res.nuevo ? " Además, esta variedad queda desbloqueada." : ""}
          </p>
          {f1 && (
            <label className={styles.pequeno}>
              Nombre (solo letras y espacios)
              <input
                className={styles.campoNombre}
                value={nombre}
                maxLength={20}
                onChange={(e) => setNombre(e.target.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g, ""))}
              />
              <span> {nombre.length}/20</span>
            </label>
          )}
          {f1 && ficha && (
            <ul className={styles.bonos}>
              <li className={styles.bono} style={{ gridTemplateColumns: "1fr auto" }}>
                <span>Gramos por planta</span>
                <strong>{String(ficha.gramos)}</strong>
              </li>
              <li className={styles.bono} style={{ gridTemplateColumns: "1fr auto" }}>
                <span>Monedas por gramo</span>
                <strong>{String(ficha.gramo)}</strong>
              </li>
              <li className={styles.bono} style={{ gridTemplateColumns: "1fr auto" }}>
                <span>Calidad · Tolerancia · Plagas</span>
                <strong>
                  {String(ficha.calidad)} · {String(ficha.tolerancia)} · {String(ficha.plagas)}
                </strong>
              </li>
            </ul>
          )}
          <button
            type="button"
            className={styles.accion}
            style={marco("boton", "var(--u)")}
            disabled={ocupado || (f1 && nombre.trim() === "")}
            onClick={() => alGuardar(nombre)}
          >
            Guardar semillas
          </button>
        </section>
      )}
    </div>
  );
}

function ListaPlantas({
  titulo,
  vacio,
  plantas,
  elegida,
  bloqueado,
  alElegir,
}: {
  titulo: string;
  vacio: string;
  plantas: PlantaCruce[];
  elegida: string | null;
  bloqueado: boolean;
  alElegir: (id: string) => void;
}) {
  return (
    <section className={styles.tarjeta} style={marco("panel", "var(--u)")} aria-label={titulo}>
      <p className={styles.subtitulo}>
        {titulo}
        <span>{plantas.length}</span>
      </p>
      {plantas.length === 0 ? (
        <p className={styles.nota}>{vacio}</p>
      ) : (
        <div className={styles.lista}>
          {plantas.map((p) => {
            const v = VARIEDAD_POR_ID[p.variedad];
            const sel = p.id === elegida;
            return (
              <button
                key={p.id}
                type="button"
                className={styles.cosecha}
                style={{ background: sel ? "#e9dcbc" : "#fff", borderColor: sel ? "#36a33b" : "#a8845c" }}
                disabled={bloqueado}
                onClick={() => alElegir(p.id)}
              >
                <strong>{v?.nombre ?? p.variedad}</strong>
                {v && <Etiqueta rareza={v.rareza} />}
                <span>
                  Ranura {p.hueco} · Salud {p.salud} %
                </span>
                <span>{sel ? "Elegida" : "Toca para elegirla"}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PestanaLibro({
  libro,
  ocupado,
  alReclamar,
}: {
  libro: Libro | null;
  ocupado: boolean;
  alReclamar: (id: string) => void;
}) {
  const [sel, setSel] = useState<string | null>(null);
  if (!libro) return <p className={styles.resumen}>Cargando…</p>;

  type Entrada = {
    clave: string;
    nombre: string;
    hoja: string;
    fen?: string;
    ok: boolean;
    pista: string;
    detalle: string;
  };
  const entradas: Entrada[] = [
    ...VARIEDADES_LIBRO.map((id) => {
      const v = VARIEDAD_POR_ID[id];
      return {
        clave: id,
        nombre: v?.nombre ?? id,
        hoja: v?.hoja ?? id,
        ok: libro.variedades.includes(id),
        pista: v?.nivel && v.nivel > 1 ? `Variedad de nivel ${v.nivel}.` : "Variedad de la colección.",
        detalle: v?.descripcion ?? "",
      };
    }),
    ...PARES_F1.map(([a, b]) => ({
      clave: claveDePar(a, b),
      nombre: `${corto(a)} × ${corto(b)}`,
      hoja: VARIEDAD_POR_ID[a]?.hoja ?? a,
      ok: libro.f1.includes(claveDePar(a, b)),
      pista: "Híbrido F1: cruza estas dos variedades.",
      detalle: "Híbrido F1 con vigor híbrido: más gramos y mejor precio por gramo que la media de sus padres.",
    })),
    ...FENOTIPOS.map((f) => ({
      clave: f.id,
      nombre: f.nombre,
      hoja: "clasica",
      fen: f.id,
      ok: libro.fenotipos.includes(f.id),
      pista: f.pista,
      detalle: f.efecto,
    })),
  ];
  const e = entradas.find((x) => x.clave === sel);

  return (
    <>
      <section className={styles.tarjeta} style={marco("panel", "var(--u)")} aria-label="Libro de cepas">
        <p className={styles.subtitulo}>
          Libro de cepas<span>{libro.total} / 31</span>
        </p>
        <div className={styles.libroRejilla}>
          {entradas.map((x) => (
            <button
              key={x.clave}
              type="button"
              className={`${styles.entrada} ${sel === x.clave ? styles.entradaSel : ""}`}
              onClick={() => setSel(x.clave)}
            >
              {x.fen ? (
                <SpriteFenotipo hoja={x.hoja} fenotipo={x.fen} silueta={!x.ok} />
              ) : (
                <Sprite hoja={x.hoja} fase={8} k={0.5} silueta={!x.ok} />
              )}
              <span>{x.ok ? x.nombre : "???"}</span>
            </button>
          ))}
        </div>
        {e && (
          <div className={styles.cruzarCentro} aria-live="polite">
            <p className={styles.vistaNombre}>{e.ok ? e.nombre : "Sin descubrir"}</p>
            <p className={styles.pequeno}>{e.ok ? e.detalle : e.pista}</p>
          </div>
        )}
      </section>
      <section className={styles.tarjeta} style={marco("panel", "var(--u)")} aria-label="Trofeos">
        <p className={styles.subtitulo}>Trofeos</p>
        <ul className={styles.bonos}>
          {libro.trofeos.map((t) => {
            const d = TROFEOS[t.id];
            return (
              <li key={t.id} className={styles.bono} style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                <span>
                  <strong>{d?.nombre ?? t.id}</strong>
                  <br />
                  <span className={styles.pequeno}>
                    {d?.texto} Premio: {d?.premio}
                  </span>
                </span>
                {t.reclamado ? (
                  <strong>Reclamado</strong>
                ) : (
                  <button
                    type="button"
                    className={styles.accion}
                    style={marco(t.listo && !ocupado ? "boton" : "boton_desactivado", "var(--u)")}
                    disabled={!t.listo || ocupado}
                    onClick={() => alReclamar(t.id)}
                  >
                    {t.listo ? "Reclamar" : "Pendiente"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

/** Laboratorio de cruces: madre en flor + padre soltando polen = semillas nuevas. Y el libro de cepas. */
export function Laboratorio({
  datos,
  libro,
  recibidoEn,
  monedas,
  ocupado,
  alIniciar,
  alAcelerar,
  alAbrir,
  alGuardar,
  alReclamar,
}: Props) {
  const [pestana, setPestana] = useState<"cruzar" | "libro">("cruzar");
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [ahora, setAhora] = useState(recibidoEn);

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Laboratorio de cruces</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }

  const cruce = datos.cruce;
  if (cruce?.estado === "abierto" && cruce.resultado) {
    return <Resultado key={cruce.resultado.id} cruce={cruce} ocupado={ocupado} alGuardar={alGuardar} />;
  }

  const restan = cruce ? Math.max(0, cruce.restan - Math.floor((ahora - recibidoEn) / 1000)) : 0;
  const listo = !!cruce && restan === 0;
  const pa = datos.madres.find((p) => p.id === a);
  const pb = datos.padres.find((p) => p.id === b);
  const va = cruce ? cruce.variedad_a : pa?.variedad;
  const vb = cruce ? cruce.variedad_b : pb?.variedad;
  const completo = !!va && !!vb && !cruce;
  const coste = pa && pb ? costeCruce(pa.semilla, pb.semilla) : (cruce?.resultado?.coste ?? 0);

  let prevision = "—";
  if (va && vb) {
    const receta = recetaDe(va, vb);
    prevision =
      va === vb
        ? `Semillas puras de ${corto(va)}`
        : receta
          ? libro?.variedades.includes(receta)
            ? `Semillas de ${VARIEDAD_POR_ID[receta]?.nombre ?? receta}`
            : "Cruce secreto"
          : `Híbrido F1 «${corto(va)} × ${corto(vb)}»`;
  }

  const hueco = (v: string | undefined, etiqueta: string) => (
    <div className={styles.huecoCruce} style={marco(v ? "tarjeta" : "apagado", "var(--u)")}>
      <span className={styles.pequeno}>{etiqueta}</span>
      {v ? (
        <>
          <Sprite hoja={VARIEDAD_POR_ID[v]?.hoja ?? v} fase={7} k={0.75} />
          <strong>{VARIEDAD_POR_ID[v]?.nombre ?? v}</strong>
        </>
      ) : (
        <span className={styles.nota}>Elige una planta de la lista</span>
      )}
    </div>
  );

  let boton = {
    texto: "Cruzar",
    activo: completo && !ocupado && monedas >= coste,
    accion: () => a && b && alIniciar(a, b),
  };
  if (cruce && listo) boton = { texto: "Germinar", activo: !ocupado, accion: alAbrir };
  else if (cruce)
    boton = {
      texto: `Acelerar · ${PRECIO_ACELERAR} monedas`,
      activo: !ocupado && monedas >= PRECIO_ACELERAR,
      accion: alAcelerar,
    };

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Laboratorio de cruces</h1>
        <span className={styles.resumen}>
          {cruce
            ? listo
              ? "¡El cruce ha terminado!"
              : "El cruce está en marcha. Puedes seguir jugando mientras tanto."
            : "Cruza una hembra en flor con un macho soltando polen."}
        </span>
      </div>
      <div className={styles.pestanas} role="tablist">
        {(["cruzar", "libro"] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={pestana === p}
            className={`${styles.pestana} ${pestana === p ? styles.pestanaActiva : ""}`}
            onClick={() => setPestana(p)}
          >
            {p === "cruzar" ? "Cruzar" : "Libro de cepas"}
          </button>
        ))}
      </div>

      {pestana === "libro" ? (
        <PestanaLibro libro={libro} ocupado={ocupado} alReclamar={alReclamar} />
      ) : (
        <div className={styles.desafios}>
          <section className={styles.tarjeta} style={marco("panel", "var(--u)")} aria-label="Cruce">
            <div className={styles.parejaCruce}>
              {hueco(va, "Madre")}
              {cruce ? (
                <AnimacionCruce
                  key={listo ? "capullo" : "probeta"}
                  cuadros={listo ? ANIM_CAPULLO_QUIETO : ANIM_PROBETA}
                  bucle
                  k={2}
                />
              ) : (
                <IconoProgresion celda={[1, 0]} k={2} apagado={!completo} />
              )}
              {hueco(vb, "Padre")}
            </div>
            <p className={styles.subtitulo}>
              {cruce
                ? listo
                  ? "¡Listo para germinar!"
                  : "Cruzando…"
                : completo
                  ? "Listo para cruzar"
                  : "Esperando madre y padre"}
              <span>{cruce ? (listo ? "Terminado" : `Quedan ${tiempo(restan)}`) : `Tiempo: ${HORAS_CRUCE} h`}</span>
            </p>
            <p className={styles.pequeno}>
              Resultado: <strong>{prevision}</strong> · 3 semillas
            </p>
            {!cruce && completo && (
              <p className={styles.pequeno}>
                Coste: {coste.toLocaleString("es-ES")} monedas. La madre dará un 40 % menos de gramos al cosecharla.
              </p>
            )}
            <button
              type="button"
              className={styles.accion}
              style={marco(boton.activo ? "boton" : "boton_desactivado", "var(--u)")}
              disabled={!boton.activo}
              onClick={boton.accion}
            >
              {boton.texto}
            </button>
            <p className={styles.nota}>
              Las semillas de cruce tienen un 50 % más de opciones de fenotipo raro. Solo puedes tener un cruce a la
              vez.
            </p>
          </section>

          {!cruce && (
            <>
              <ListaPlantas
                titulo="Madres"
                vacio="Necesitas una hembra en prefloración o floración (la ves a partir de la fase 6)."
                plantas={datos.madres}
                elegida={a}
                bloqueado={ocupado}
                alElegir={(id) => setA(a === id ? null : id)}
              />
              <ListaPlantas
                titulo="Padres"
                vacio="Necesitas un macho soltando polen (fase 7 o más)."
                plantas={datos.padres}
                elegida={b}
                bloqueado={ocupado}
                alElegir={(id) => setB(b === id ? null : id)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
