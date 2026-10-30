"use client";

import { useEffect, useState } from "react";
import { PRECIO_ACELERAR, rarezasPosibles, type DatosCruces, type ResultadoCruce } from "@/lib/cruces";
import { marco } from "@/lib/diseno";
import { RAREZAS, VARIEDAD_POR_ID, hojaHibridoPropio, rasgosDe, type Rasgos } from "@/lib/variedades";
import { AnimacionCruce, ANIM_APERTURA, ANIM_CAPULLO_QUIETO, ANIM_PROBETA } from "./AnimacionCruce";
import { IconoProgresion } from "./IconoProgresion";
import styles from "./progresion.module.css";

interface Props {
  datos: DatosCruces | null;
  /** Momento (ms) en que llegaron los datos, para la cuenta atrás. */
  recibidoEn: number;
  monedas: number;
  ocupado: boolean;
  alIniciar: (a: string, b: string) => void;
  alAcelerar: () => void;
  alAbrir: () => void;
  alGuardar: (nombre: string) => void;
}

const RASGOS: { id: keyof Rasgos; nombre: string }[] = [
  { id: "rendimiento", nombre: "Rendimiento" },
  { id: "resistencia", nombre: "Resistencia" },
  { id: "velocidad", nombre: "Velocidad" },
  { id: "sabor", nombre: "Sabor" },
];

function tiempo(segundos: number) {
  const s = Math.max(0, Math.floor(segundos));
  return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")} min ${String(s % 60).padStart(2, "0")} s`;
}

function Sprite({ hoja, k = 1 }: { hoja: string; k?: number }) {
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
        backgroundPosition: `0 ${-640 * k}px`,
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

/** Resultado del cruce: se abre el capullo, se ve la semilla nueva y se le pone nombre. */
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

  const fija = VARIEDAD_POR_ID[res.id];
  const datos = fija ?? {
    recompensa: res.recompensa ?? 1,
    ciclo: res.ciclo ?? 1,
    desgaste: res.desgaste ?? 1,
    sabor: res.sabor ?? 50,
  };
  const rasgos = rasgosDe(datos);
  const pa = VARIEDAD_POR_ID[cruce.variedad_a];
  const pb = VARIEDAD_POR_ID[cruce.variedad_b];
  const media = (id: keyof Rasgos) => (rasgosDe(pa)[id] + rasgosDe(pb)[id]) / 2;
  const titulo = fija?.nombre ?? nombre;

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Resultado del cruce</h1>
        <span className={styles.resumen}>
          {pa?.nombre} × {pb?.nombre}
        </span>
      </div>
      {!visible ? (
        <section
          className={`${styles.tarjeta} ${styles.capullo}`}
          style={marco("panel", "var(--u)")}
          aria-live="polite"
        >
          <AnimacionCruce cuadros={ANIM_APERTURA} k={3} />
          <p className={styles.subtitulo}>Abriendo el capullo…</p>
        </section>
      ) : (
        <section className={styles.tarjeta} style={marco("panel", "var(--u)")} aria-label="Semilla nueva">
          <div className={styles.vista}>
            <Sprite hoja={res.fija ? res.hoja : hojaHibridoPropio(res.id)} />
            <div>
              <p className={styles.pequeno}>
                <Etiqueta rareza={res.rareza} /> {res.fija ? "Variedad especial" : "Híbrido propio"}
              </p>
              <p className={styles.vistaNombre}>{titulo || "Sin nombre"}</p>
              <p className={styles.pequeno}>
                {res.nuevo
                  ? "¡Es una variedad que no tenías! Se añadirá a tu enciclopedia."
                  : "Ya la tenías. Se queda en tus semillas."}
              </p>
            </div>
          </div>
          {!res.fija && (
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
          <p className={styles.subtitulo}>Rasgos</p>
          <ul className={styles.bonos}>
            {RASGOS.map((r) => {
              const delta = Math.round(rasgos[r.id] - media(r.id));
              return (
                <li key={r.id} className={styles.bono} style={{ gridTemplateColumns: "100px minmax(0,1fr) auto" }}>
                  <strong>{r.nombre}</strong>
                  <span className={styles.pista}>
                    <span className={styles.relleno} style={{ width: `${rasgos[r.id]}%`, background: "#36a33b" }} />
                  </span>
                  <span style={{ color: delta >= 0 ? "#1d6630" : "#7c2e1b", fontWeight: 700 }}>
                    {rasgos[r.id]} {delta >= 0 ? "▲ +" : "▼ "}
                    {delta}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className={styles.nota}>La flecha compara con la media de las dos plantas de origen.</p>
          <button
            type="button"
            className={styles.accion}
            style={marco("boton", "var(--u)")}
            disabled={ocupado || (!res.fija && nombre.trim() === "")}
            onClick={() => alGuardar(nombre)}
          >
            Guardar semilla
          </button>
        </section>
      )}
    </div>
  );
}

/** Laboratorio de cruces: elige dos cosechas, espera y consigue una semilla nueva. */
export function Laboratorio({ datos, recibidoEn, monedas, ocupado, alIniciar, alAcelerar, alAbrir, alGuardar }: Props) {
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
  const ca = datos.cosechas.find((c) => c.id === a);
  const cb = datos.cosechas.find((c) => c.id === b);
  const va = cruce ? VARIEDAD_POR_ID[cruce.variedad_a] : ca ? VARIEDAD_POR_ID[ca.variedad] : null;
  const vb = cruce ? VARIEDAD_POR_ID[cruce.variedad_b] : cb ? VARIEDAD_POR_ID[cb.variedad] : null;
  const completo = !!va && !!vb;
  const rarezas = completo ? rarezasPosibles(va.rareza, vb.rareza) : [];

  const elegir = (id: string) => {
    if (cruce) return;
    if (a === id) return setA(null);
    if (b === id) return setB(null);
    if (!a) setA(id);
    else if (!b) setB(id);
    else setB(id);
  };

  const hueco = (v: typeof va, etiqueta: string) => (
    <div className={styles.huecoCruce} style={marco(v ? "tarjeta" : "apagado", "var(--u)")}>
      <span className={styles.pequeno}>{etiqueta}</span>
      {v ? (
        <>
          <Sprite hoja={v.hoja} k={0.75} />
          <strong>{v.nombre}</strong>
          <Etiqueta rareza={v.rareza} />
        </>
      ) : (
        <span className={styles.nota}>Elige una planta de «Tus cosechas»</span>
      )}
    </div>
  );

  let boton = { texto: "Cruzar", activo: completo && !ocupado, accion: () => a && b && alIniciar(a, b) };
  if (cruce && listo) boton = { texto: "Abrir capullo", activo: !ocupado, accion: alAbrir };
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
            : completo
              ? "Todo listo. Revisa las probabilidades y pulsa Cruzar."
              : "Elige dos plantas cosechadas para crear una semilla nueva."}
        </span>
      </div>

      <div className={styles.desafios}>
        <section className={styles.tarjeta} style={marco("panel", "var(--u)")} aria-label="Cruce">
          <div className={styles.parejaCruce}>
            {hueco(va, "Planta 1")}
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
            {hueco(vb, "Planta 2")}
          </div>
          <p className={styles.subtitulo}>
            {cruce
              ? listo
                ? "¡Capullo listo!"
                : "Cruzando…"
              : completo
                ? "Listo para cruzar"
                : "Esperando dos plantas"}
            <span>
              {cruce
                ? listo
                  ? "Terminado"
                  : `Quedan ${tiempo(restan)}`
                : completo
                  ? "Tiempo de cruce: 4 h 30 min"
                  : ""}
            </span>
          </p>
          <button
            type="button"
            className={styles.accion}
            style={marco(boton.activo ? "boton" : "boton_desactivado", "var(--u)")}
            disabled={!boton.activo}
            onClick={boton.accion}
          >
            {boton.texto}
          </button>
          <p className={styles.subtitulo}>
            Probabilidad de rasgos
            <span>{completo ? `${va.nombre} × ${vb.nombre}` : "Elige dos plantas para verlas"}</span>
          </p>
          <ul className={styles.bonos}>
            {RASGOS.map((r) => (
              <li key={r.id} className={styles.bono} style={{ gridTemplateColumns: "110px minmax(0,1fr) 48px" }}>
                <span>{r.nombre} alto</span>
                <span className={styles.pista}>
                  <span
                    className={styles.relleno}
                    style={{
                      width: completo ? `${Math.round(((rasgosDe(va)[r.id] + rasgosDe(vb)[r.id]) / 2) * 0.85)}%` : "0%",
                      background: "#36a33b",
                    }}
                  />
                </span>
                <span>
                  {completo ? `${Math.round(((rasgosDe(va)[r.id] + rasgosDe(vb)[r.id]) / 2) * 0.85)} %` : "—"}
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.pequeno}>
            Rareza del resultado:{" "}
            {completo ? rarezas.map((r) => `${RAREZAS[r.rareza].etiqueta} ${r.pct} %`).join(" · ") : "—"}
          </p>
          <p className={styles.nota}>
            Algunas mezclas dan variedades especiales. Cada cosecha solo sirve para un cruce.
          </p>
        </section>

        <section className={styles.tarjeta} style={marco("panel", "var(--u)")} aria-label="Tus cosechas">
          <p className={styles.subtitulo}>
            Tus cosechas<span>{datos.cosechas.length} plantas</span>
          </p>
          {datos.cosechas.length === 0 ? (
            <p className={styles.nota}>Todavía no tienes cosechas libres. Cosecha una planta para poder cruzarla.</p>
          ) : (
            <div className={styles.cosechas}>
              {datos.cosechas.map((c) => {
                const v = VARIEDAD_POR_ID[c.variedad];
                const usada = c.id === a || c.id === b;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={styles.cosecha}
                    style={{
                      opacity: usada ? 0.5 : 1,
                      background: usada ? "#e9dcbc" : "#fff",
                      borderColor: usada ? "#36a33b" : "#a8845c",
                    }}
                    disabled={!!cruce || ocupado}
                    onClick={() => elegir(c.id)}
                  >
                    <strong>{v?.nombre ?? c.variedad}</strong>
                    {v && <Etiqueta rareza={v.rareza} />}
                    <span>Salud {c.salud} %</span>
                    <span>
                      {usada ? (c.id === a ? "En la planta 1" : "En la planta 2") : cruce ? "" : "Toca para elegirla"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
