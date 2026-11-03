"use client";

import { useState } from "react";
import { marco } from "@/lib/diseno";
import {
  COLOR_FASES,
  EFECTOS_FICHA,
  FICHAS,
  FICHA_POR_ID,
  FONDO_FICHA,
  ICONOS_FICHA,
  NOMBRE_FASES,
  RAREZA_FICHA,
  RASGOS_FICHA,
  TEXTO_BARRA,
  hojaFicha,
  horasMin,
  type BarrasFicha,
  type FichaVariedad,
  type IconoFicha,
  type RarezaFicha,
} from "@/lib/fichas";
import styles from "./fichas.module.css";

function Icono({ id, n = 16, k = 1 }: { id: IconoFicha; n?: 16 | 32; k?: number }) {
  const t = n * k;
  return (
    <span
      className="pixel"
      aria-hidden
      style={{
        display: "inline-block",
        flex: "none",
        width: t,
        height: t,
        backgroundImage: `url(/assets/fichas/tpp-ficha-iconos-${n}-1x.png)`,
        backgroundSize: `${ICONOS_FICHA.length * t}px ${t}px`,
        backgroundPosition: `-${ICONOS_FICHA.indexOf(id) * t}px 0`,
      }}
    />
  );
}

function Planta({ id, fase, k }: { id: string; fase: number; k: number }) {
  return (
    <span
      className="pixel"
      role="img"
      aria-label={FICHA_POR_ID[id]?.nombre}
      style={{
        display: "block",
        flex: "none",
        width: 64 * k,
        height: 64 * k,
        backgroundImage: `url(${hojaFicha(id)})`,
        backgroundSize: `${384 * k}px ${512 * k}px`,
        backgroundPosition: `0 -${fase * 64 * k}px`,
      }}
    />
  );
}

function Etiqueta({ rareza }: { rareza: RarezaFicha }) {
  const r = RAREZA_FICHA[rareza];
  return (
    <span className={styles.etiqueta} style={{ background: r.fondo, color: r.texto }}>
      {r.nombre}
    </span>
  );
}

const FILTROS: [RarezaFicha | "todas", string][] = [
  ["todas", "Todas"],
  ["comun", "Común"],
  ["poco_comun", "Poco común"],
  ["rara", "Rara"],
  ["epica", "Épica"],
  ["legendaria", "Legendaria"],
  ["especial", "Especial"],
];
const ORDENES = [
  ["nivel", "Nivel"],
  ["semilla", "Precio"],
  ["total", "Tiempo"],
  ["gramos", "Rendimiento"],
] as const;
type Orden = (typeof ORDENES)[number][0];

interface Props {
  nivel: number;
  /** Variedad con la que se abre la ficha. */
  inicial?: string;
}

/** Bloque 8d: lista de variedades, ficha de cada una y comparador. */
export function Fichas({ nivel, inicial }: Props) {
  const [vista, setVista] = useState<"lista" | "ficha" | "comparar">(inicial ? "ficha" : "lista");
  const [sel, setSel] = useState(inicial ?? "dorada");
  const [otra, setOtra] = useState("clasica");
  const [filtro, setFiltro] = useState<RarezaFicha | "todas">("todas");
  const [orden, setOrden] = useState<Orden>("nivel");

  const abrir = (id: string) => {
    setSel(id);
    setVista("ficha");
  };
  const f = FICHA_POR_ID[sel] ?? FICHAS[0];
  const indice = FICHAS.indexOf(f);
  const vecina = (d: number) => FICHAS[(indice + d + FICHAS.length) % FICHAS.length].id;

  return (
    <div className={styles.contenedor}>
      <div className={styles.pestanas}>
        {(
          [
            ["lista", "Variedades"],
            ["ficha", "Ficha"],
            ["comparar", "Comparador"],
          ] as const
        ).map(([id, texto]) => (
          <button
            key={id}
            type="button"
            className={styles.pestana}
            style={marco(vista === id ? "pestana_activa" : "pestana", "var(--u)")}
            onClick={() => setVista(id)}
          >
            {texto}
          </button>
        ))}
      </div>
      {vista === "lista" && (
        <Lista nivel={nivel} filtro={filtro} orden={orden} alFiltrar={setFiltro} alOrdenar={setOrden} alAbrir={abrir} />
      )}
      {vista === "ficha" && (
        <Ficha
          f={f}
          nivel={nivel}
          alComparar={() => {
            setOtra(f.id === "clasica" ? "hoja-azul" : "clasica");
            setVista("comparar");
          }}
          alAbrir={abrir}
          anterior={vecina(-1)}
          siguiente={vecina(1)}
        />
      )}
      {vista === "comparar" && <Comparador a={f.id} b={otra} alA={setSel} alB={setOtra} />}
    </div>
  );
}

function Boton({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={styles.filtro}
      style={marco(activo ? "dorado" : "boton_secundario", "var(--u)")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Lista({
  nivel,
  filtro,
  orden,
  alFiltrar,
  alOrdenar,
  alAbrir,
}: {
  nivel: number;
  filtro: RarezaFicha | "todas";
  orden: Orden;
  alFiltrar: (f: RarezaFicha | "todas") => void;
  alOrdenar: (o: Orden) => void;
  alAbrir: (id: string) => void;
}) {
  const lista = FICHAS.filter((v) => filtro === "todas" || v.rareza === filtro)
    .slice()
    .sort((a, b) => (orden === "gramos" ? b.gramos - a.gramos : a[orden] - b[orden] || a.nivel - b.nivel));
  return (
    <>
      <div className={styles.barra}>
        <div className={styles.grupo}>
          {FILTROS.map(([id, texto]) => (
            <Boton key={id} activo={filtro === id} onClick={() => alFiltrar(id)}>
              {texto}
            </Boton>
          ))}
        </div>
        <div className={styles.grupo}>
          <strong>Ordenar</strong>
          {ORDENES.map(([id, texto]) => (
            <Boton key={id} activo={orden === id} onClick={() => alOrdenar(id)}>
              {texto}
            </Boton>
          ))}
        </div>
      </div>
      <div className={styles.rejilla}>
        {lista.map((v) => (
          <button
            key={v.id}
            type="button"
            className={styles.tarjeta}
            style={marco("tarjeta", "var(--u)")}
            onClick={() => alAbrir(v.id)}
          >
            <span className={styles.escena} style={{ background: FONDO_FICHA[v.id] }}>
              <span className={styles.suelo} />
              <span className={styles.plantaTarjeta}>
                <Planta id={v.id} fase={6} k={2} />
              </span>
              <span className={styles.etiquetaArriba}>
                <Etiqueta rareza={v.rareza} />
              </span>
              {v.nivel > nivel && (
                <span className={styles.candado}>
                  <Icono id="desbloqueo" /> Nv. {v.nivel}
                </span>
              )}
            </span>
            <span className={styles.nombre}>{v.nombre}</span>
            <span className={styles.lema}>
              {EFECTOS_FICHA[v.efecto].nombre} · {RASGOS_FICHA[v.rasgos[0]]?.texto}
            </span>
            <span className={styles.cifras}>
              <span>
                <Icono id="precio-semilla" />
                <strong>{v.semilla.toLocaleString("es-ES")}</strong>
                <small>la semilla</small>
              </span>
              <span>
                <Icono id="duracion" />
                <strong>{horasMin(v.total)}</strong>
                <small>hasta cosechar</small>
              </span>
              <span>
                <Icono id="rendimiento" />
                <strong>{v.gramos} g</strong>
                <small>por cosecha</small>
              </span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function Ficha({
  f,
  nivel,
  alComparar,
  alAbrir,
  anterior,
  siguiente,
}: {
  f: FichaVariedad;
  nivel: number;
  alComparar: () => void;
  alAbrir: (id: string) => void;
  anterior: string;
  siguiente: string;
}) {
  const [fase, setFase] = useState(6);
  const panel = marco("panel", "var(--u)");
  const clasica = FICHA_POR_ID.clasica;
  const esClasica = f.id === "clasica";
  const r = RAREZA_FICHA[f.rareza];
  const ef = EFECTOS_FICHA[f.efecto];
  const ancho = Math.max(f.tMax - f.tMin, 0);
  const escalaT = 35;

  return (
    <section className={styles.ficha} style={panel} aria-label={f.nombre}>
      <div className={styles.cabeza}>
        <div className={styles.izquierda}>
          <div className={styles.escenaGrande} style={{ background: FONDO_FICHA[f.id] }}>
            <span className={styles.suelo} />
            <span className={styles.plantaGrande}>
              <Planta id={f.id} fase={fase} k={4} />
            </span>
          </div>
          <div className={styles.fases}>
            {NOMBRE_FASES.map((n, i) => (
              <button
                key={n}
                type="button"
                className={styles.fase}
                title={n}
                style={marco(fase === i ? "dorado" : "boton_secundario", "var(--u)")}
                onClick={() => setFase(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <span className={styles.nota}>
            Fase {fase + 1} · {NOMBRE_FASES[fase]}
          </span>
        </div>
        <div className={styles.derecha}>
          <div className={styles.titulo}>
            <h2 className={styles.nombreGrande}>{f.nombre}</h2>
            <span className={styles.etiqueta} style={{ background: r.fondo, color: r.texto }}>
              {r.nombre}
            </span>
          </div>
          <span className={styles.nota}>
            {f.origen} · se desbloquea en nivel {f.nivel}
            {f.nivel > nivel ? ` (tienes ${nivel})` : ""}
          </span>
          <div className={styles.casillas}>
            {(
              [
                ["precio-semilla", f.semilla.toLocaleString("es-ES"), "monedas la semilla"],
                ["precio-gramo", `${f.gramo} / g`, "precio de venta"],
                ["desbloqueo", `Nivel ${f.nivel}`, "desbloqueo"],
                ["rareza", r.nombre, "rareza"],
              ] as [IconoFicha, string, string][]
            ).map(([ic, v, l]) => (
              <span key={l} className={styles.casilla}>
                <Icono id={ic} n={32} />
                <span>
                  <strong>{v}</strong>
                  <small>{l}</small>
                </span>
              </span>
            ))}
          </div>
          <div className={styles.efecto} style={{ background: FONDO_FICHA[f.id] }}>
            <Icono id={ef.icono} n={32} />
            <span>
              <small>EFECTO · {ef.nombre}</small>
              <strong>«{f.sensacion}»</strong>
            </span>
          </div>
          <div className={styles.rasgos}>
            <small>RASGOS ESPECIALES</small>
            <span className={styles.chips}>
              {f.rasgos.map((id) => {
                const t = RASGOS_FICHA[id];
                if (!t) return null;
                return (
                  <span
                    key={id}
                    className={styles.chip}
                    style={{ background: t.signo > 0 ? "#c9f26b" : t.signo < 0 ? "#f7b072" : "#ffffff" }}
                  >
                    <Icono id={t.icono as IconoFicha} />
                    {t.texto}
                  </span>
                );
              })}
            </span>
          </div>
          <div className={styles.botones}>
            <button type="button" className={styles.accion} style={marco("boton", "var(--u)")} onClick={alComparar}>
              <Icono id="comparar" /> Comparar
            </button>
            <button
              type="button"
              className={styles.accion}
              style={marco("boton_secundario", "var(--u)")}
              onClick={() => alAbrir(anterior)}
            >
              ‹ Anterior
            </button>
            <button
              type="button"
              className={styles.accion}
              style={marco("boton_secundario", "var(--u)")}
              onClick={() => alAbrir(siguiente)}
            >
              Siguiente ›
            </button>
          </div>
        </div>
      </div>

      <div className={styles.bloque}>
        <div className={styles.tiempos}>
          <strong>Tiempos</strong>
          <span>
            <Icono id="duracion" /> <b>Total</b> {horasMin(f.total)}
          </span>
          <span>
            <Icono id="riego" /> <b>Riego</b> cada {horasMin(f.riego)}
          </span>
          <span>
            <Icono id="ventana-cosecha" /> <b>Ventana de cosecha</b> {horasMin(f.ventana)}
          </span>
        </div>
        <div className={styles.linea} role="img" aria-label="Fases de crecimiento">
          {f.fases.map((m, i) => (
            <span
              key={i}
              title={`${NOMBRE_FASES[i]} · ${horasMin(m)}`}
              className={styles.tramo}
              style={{
                width: `${(m / f.total) * 100}%`,
                background: COLOR_FASES[i],
                color: i === 3 || i === 4 ? "#fff" : "#1c1626",
              }}
            >
              {m / f.total >= 0.12 ? NOMBRE_FASES[i] : m / f.total >= 0.07 ? i + 1 : ""}
            </span>
          ))}
        </div>
        {!esClasica && (
          <span className={styles.nota}>
            Verde Clásica: {horasMin(clasica.total)} · esta variedad: {horasMin(f.total)}
          </span>
        )}
      </div>

      <div className={styles.bloque}>
        <strong>Características</strong>
        <div className={styles.barras}>
          {(Object.keys(TEXTO_BARRA) as (keyof BarrasFicha)[]).map((k) => {
            const [nombre, ic, signo, texto] = TEXTO_BARRA[k];
            const val = f.barras[k];
            const d = (val - clasica.barras[k]) * signo;
            return (
              <div key={k} className={styles.barra5}>
                <span className={styles.barraNombre}>
                  <Icono id={ic} /> {nombre}
                </span>
                <span className={styles.celdas} aria-label={`${val} de 5`}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className={styles.celda}
                      style={{ background: i <= val ? (signo < 0 ? "#e07b3f" : "#36a33b") : "#efe3c6" }}
                    />
                  ))}
                  <span className={styles.referencia} style={{ width: `${clasica.barras[k] * 20}%` }} />
                </span>
                <span className={styles.barraTexto}>{texto(f)}</span>
                <span
                  className={styles.delta}
                  style={{ color: esClasica || d === 0 ? "#5f3c26" : d > 0 ? "#1d6630" : "#a02a32" }}
                >
                  {esClasica ? "Referencia" : d === 0 ? "Igual que Clásica" : `${d > 0 ? "Mejor" : "Peor"} que Clásica`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.bloque}>
        <div className={styles.tiempos}>
          <strong>Temperatura</strong>
          <span>
            <Icono id="temperatura" /> {f.tMin}–{f.tMax} °C
          </span>
        </div>
        <div className={styles.termometro} role="img" aria-label={`De ${f.tMin} a ${f.tMax} grados`}>
          <span
            className={styles.rango}
            style={{ left: `${(f.tMin / escalaT) * 100}%`, width: `${(ancho / escalaT) * 100}%` }}
          />
        </div>
        <div className={styles.escala}>
          <span>0 °C</span>
          <span>35 °C</span>
        </div>
      </div>
    </section>
  );
}

const FILAS: {
  k: string;
  nombre: string;
  valor: (f: FichaVariedad) => number;
  texto: (f: FichaVariedad) => string;
  mejorMenor?: boolean;
}[] = [
  {
    k: "semilla",
    nombre: "Precio de semilla",
    valor: (f) => f.semilla,
    texto: (f) => `${f.semilla.toLocaleString("es-ES")} monedas`,
    mejorMenor: true,
  },
  { k: "gramo", nombre: "Precio por gramo", valor: (f) => f.gramo, texto: (f) => `${f.gramo} monedas` },
  { k: "gramos", nombre: "Gramos por cosecha", valor: (f) => f.gramos, texto: (f) => `${f.gramos} g` },
  { k: "total", nombre: "Tiempo total", valor: (f) => f.total, texto: (f) => horasMin(f.total), mejorMenor: true },
  { k: "riego", nombre: "Riego cada", valor: (f) => f.riego, texto: (f) => horasMin(f.riego) },
  { k: "ventana", nombre: "Ventana de cosecha", valor: (f) => f.ventana, texto: (f) => horasMin(f.ventana) },
  { k: "nivel", nombre: "Nivel", valor: (f) => f.nivel, texto: (f) => `Nivel ${f.nivel}`, mejorMenor: true },
  {
    k: "beneficio",
    nombre: "Beneficio por cosecha",
    valor: (f) => f.gramos * f.gramo - f.semilla,
    texto: (f) => `${(f.gramos * f.gramo - f.semilla).toLocaleString("es-ES")} monedas`,
  },
  { k: "temp", nombre: "Temperatura ideal", valor: (f) => f.tMax - f.tMin, texto: (f) => `${f.tMin}–${f.tMax} °C` },
];

function Comparador({
  a,
  b,
  alA,
  alB,
}: {
  a: string;
  b: string;
  alA: (id: string) => void;
  alB: (id: string) => void;
}) {
  const A = FICHA_POR_ID[a] ?? FICHAS[0];
  const B = FICHA_POR_ID[b] ?? FICHAS[1];
  const panel = marco("panel", "var(--u)");
  const selector = (valor: string, cambiar: (id: string) => void, etiqueta: string) => (
    <label className={styles.selector}>
      {etiqueta}
      <select value={valor} onChange={(e) => cambiar(e.target.value)}>
        {FICHAS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.nombre}
          </option>
        ))}
      </select>
    </label>
  );
  const mejor = (x: number, y: number, menor?: boolean) => (x === y ? 0 : x < y === !!menor ? 1 : -1);

  return (
    <section className={styles.ficha} style={panel} aria-label="Comparador">
      <div className={styles.comparaCabeza}>
        {[A, B].map((v, i) => (
          <div key={i} className={styles.comparaLado}>
            {selector(v.id, i === 0 ? alA : alB, i === 0 ? "Variedad 1" : "Variedad 2")}
            <div className={styles.escenaMedia} style={{ background: FONDO_FICHA[v.id] }}>
              <span className={styles.suelo} />
              <span className={styles.plantaMedia}>
                <Planta id={v.id} fase={6} k={3} />
              </span>
            </div>
            <strong>{v.nombre}</strong>
            <Etiqueta rareza={v.rareza} />
          </div>
        ))}
      </div>
      <div className={styles.tabla}>
        {FILAS.map((fila) => {
          const m = mejor(fila.valor(A), fila.valor(B), fila.mejorMenor);
          return (
            <div key={fila.k} className={styles.filaComp}>
              <span className={styles.celdaComp} style={{ background: m > 0 ? "#c9f26b" : undefined }}>
                {fila.texto(A)}
              </span>
              <span className={styles.celdaNombre}>{fila.nombre}</span>
              <span className={styles.celdaComp} style={{ background: m < 0 ? "#c9f26b" : undefined }}>
                {fila.texto(B)}
              </span>
            </div>
          );
        })}
        {(Object.keys(TEXTO_BARRA) as (keyof BarrasFicha)[]).map((k) => {
          const [nombre, , signo] = TEXTO_BARRA[k];
          const m = mejor(A.barras[k] * signo, B.barras[k] * signo, false) * 1;
          const pinta = (v: FichaVariedad) => (
            <span className={styles.celdas}>
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className={styles.celda}
                  style={{ background: i <= v.barras[k] ? (signo < 0 ? "#e07b3f" : "#36a33b") : "#efe3c6" }}
                />
              ))}
            </span>
          );
          return (
            <div key={k} className={styles.filaComp}>
              <span className={styles.celdaComp} style={{ background: m > 0 ? "#c9f26b" : undefined }}>
                {pinta(A)}
              </span>
              <span className={styles.celdaNombre}>{nombre}</span>
              <span className={styles.celdaComp} style={{ background: m < 0 ? "#c9f26b" : undefined }}>
                {pinta(B)}
              </span>
            </div>
          );
        })}
      </div>
      <p className={styles.nota}>Fondo verde: la mejor de cada fila. El beneficio es gramos × precio − semilla.</p>
    </section>
  );
}
