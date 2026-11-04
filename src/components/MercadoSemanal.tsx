"use client";

import { useEffect, useState } from "react";
import { marco } from "@/lib/diseno";
import { CLIENTES, TIPOS_ENCARGO, type DatosEncargos } from "@/lib/encargos";
import {
  barra,
  cuentaAtras,
  ICONO_MERCADO,
  NOTICIA_GENERICA,
  NOTICIAS,
  precioSemana,
  TENDENCIA,
  tendencia,
  textoCambio,
  type DatosMercadoSemanal,
  type Tendencia,
} from "@/lib/mercadoSemanal";
import { hojaDe, VARIEDAD_POR_ID } from "@/lib/variedades";
import { RetratoCliente } from "./RetratoCliente";
import styles from "./mercadoSemanal.module.css";

interface Props {
  datos: DatosMercadoSemanal | null;
  encargos: DatosEncargos | null;
  monedas: number;
  ocupado: boolean;
  alVender: (variedad: string, gramos: number | null) => void;
  alIrAEncargos: () => void;
}

type Pestana = "mercado" | "vender" | "encargos";
type Orden = "cambio" | "nombre" | "precio";

const PESTANAS: [Pestana, string, keyof typeof ICONO_MERCADO][] = [
  ["mercado", "Mercado", "mercado"],
  ["vender", "Vender", "alza"],
  ["encargos", "Encargos", "noticia"],
];

const ORDENES: [Orden, string][] = [
  ["cambio", "Cambio"],
  ["nombre", "Variedad"],
  ["precio", "Esta semana"],
];

const FILTROS: [Tendencia | "todas", string][] = [
  ["todas", "Todas"],
  ["alza", "En alza"],
  ["baja", "En baja"],
];

const miles = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const nombreDe = (id: string) => VARIEDAD_POR_ID[id]?.nombre ?? id;

/** Icono de la hoja del mercado (6 × 1 de 16 px). */
function IconoMercado({ id, k = 2 }: { id: keyof typeof ICONO_MERCADO; k?: number | string }) {
  const f = (n: number) => `calc(${n}px * ${k})`;
  return (
    <span
      className="pixel"
      aria-hidden
      style={{
        display: "block",
        flex: "none",
        width: f(16),
        height: f(16),
        backgroundImage: "url(/assets/mercado/tpp-mercado-iconos-16-1x.png)",
        backgroundSize: `${f(96)} ${f(16)}`,
        backgroundPosition: `${f(-ICONO_MERCADO[id] * 16)} 0`,
      }}
    />
  );
}

/** Variedad en cosecha (última fila de la hoja de 128 px), a la escala que se pida. */
function Cosecha({ id, caja }: { id: string; caja: "lista" | "cartel" }) {
  const hoja = `url(/assets/sprites/tpp-variedad-${hojaDe(id)}-1x.png)`;
  return caja === "cartel" ? (
    <span
      className="pixel"
      aria-hidden
      style={{
        display: "block",
        flex: "none",
        width: 128,
        height: 128,
        backgroundImage: hoja,
        backgroundSize: "768px 1024px",
        backgroundPosition: "0 -896px",
      }}
    />
  ) : (
    <span className={styles.cajaCosecha} aria-hidden>
      <span
        className="pixel"
        style={{
          display: "block",
          width: 64,
          height: 64,
          margin: "-12px 0 0 -10px",
          backgroundImage: hoja,
          backgroundSize: "384px 512px",
          backgroundPosition: "0 -448px",
        }}
      />
    </span>
  );
}

function Chip({ p, grande }: { p: number; grande?: boolean }) {
  const t = tendencia(p);
  return (
    <span className={grande ? styles.chipGrande : styles.chip} style={{ background: TENDENCIA[t].fondo }}>
      <IconoMercado id={t} k={grande ? 2 : "var(--ik)"} />
      <span>{textoCambio(p)}</span>
    </span>
  );
}

function Grafico({ valores, alto, ancho }: { valores: (number | undefined)[]; alto: number; ancho: string }) {
  return (
    <span className={styles.grafico} style={{ height: alto }} aria-hidden>
      <span className={styles.cero} style={{ top: alto / 2 - 0.5 }} />
      {valores.map((p, i) => {
        const b = barra(p, i === valores.length - 1, alto);
        return (
          <span
            key={i}
            className={styles.barra}
            style={{ width: ancho, top: b.arriba, height: b.alto, background: b.color }}
          />
        );
      })}
    </span>
  );
}

/** Pantalla del mercado semanal (8h): cartel, lista de variedades, venta suelta y encargos con el precio de la semana. */
export function MercadoSemanal({ datos, encargos, monedas, ocupado, alVender, alIrAEncargos }: Props) {
  const [pestana, setPestana] = useState<Pestana>("mercado");
  const [orden, setOrden] = useState<Orden>("cambio");
  const [filtro, setFiltro] = useState<Tendencia | "todas">("todas");
  const [elegida, setElegida] = useState<string | null>(null);
  const [guardadas, setGuardadas] = useState<Record<string, boolean>>({});
  const [ahora, setAhora] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const panel = marco("panel", "var(--u)");
  const tarjeta = marco("tarjeta", "var(--u)");
  const dorado = marco("dorado", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");
  const apagado = marco("boton_desactivado", "var(--u)");
  const pestanaOff = marco("pestana", "var(--u)");
  const pestanaOn = marco("pestana_activa", "var(--u)");
  const segOff = marco("boton_secundario", "var(--u)");
  const segOn = marco("dorado", "var(--u)");

  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Mercado semanal</h1>
        <p className={styles.texto}>Cargando…</p>
      </div>
    );
  }

  const transcurridos = datos.recibido && ahora > datos.recibido ? Math.floor((ahora - datos.recibido) / 1000) : 0;
  const queda = Math.max(0, datos.queda - transcurridos);
  const semana = datos.semanas[datos.semanas.length - 1];
  const ids = Object.keys(semana.mods);
  const cambio = (id: string) => semana.mods[id] ?? 0;
  const base = (id: string) => datos.base[id] ?? 0;
  const ahoraPrecio = (id: string) => precioSemana(base(id), cambio(id));

  const lista = ids
    .filter((id) => filtro === "todas" || tendencia(cambio(id)) === filtro)
    .toSorted((a, b) =>
      orden === "cambio"
        ? cambio(b) - cambio(a)
        : orden === "nombre"
          ? nombreDe(a).localeCompare(nombreDe(b))
          : ahoraPrecio(b) - ahoraPrecio(a),
    );
  const sel = elegida && ids.includes(elegida) ? elegida : semana.top;

  const noticia = NOTICIAS[semana.top] ?? NOTICIA_GENERICA;
  const cliente = CLIENTES[noticia[0]];
  const etiqueta = (id: string) =>
    id === semana.top
      ? { texto: "Estrella de la semana", fondo: "#f4d36a" }
      : id === semana.low
        ? { texto: "Sobra en la calle", fondo: "#f7b072" }
        : id === datos.edicion
          ? { texto: "Temporada", fondo: "#f6eed6" }
          : null;

  const historial = (id: string) => datos.semanas.map((s) => s.mods[id]);

  const cartel = (
    <section className={styles.cartel} style={panel} aria-label="Cartel de la semana">
      <div className={styles.cartelCliente}>
        <RetratoCliente cliente={noticia[0]} k="var(--kc)" />
        <strong>{cliente?.nombre ?? "¿?"}</strong>
        <span>{cliente?.rol ?? "Cliente misterioso"}</span>
      </div>
      <div className={styles.cartelTexto}>
        <span className={styles.kicker}>
          <IconoMercado id="noticia" k={1} /> Mercado semanal · semana del {semana.lunes.split("-").reverse().join("/")}
        </span>
        <h2 className={styles.cartelTitulo}>Esta semana se paga más la {nombreDe(semana.top)}</h2>
        <p className={styles.texto}>{noticia[1]}</p>
        <p className={styles.cita}>«{noticia[2]}»</p>
        <p className={styles.baja}>
          <IconoMercado id="baja" k={1} /> En baja: {nombreDe(semana.low)} {textoCambio(cambio(semana.low))}. Sobra{" "}
          {nombreDe(semana.low)}: medio barrio la cosechó a la vez.
        </p>
      </div>
      <div className={styles.cartelVariedad}>
        <Cosecha id={semana.top} caja="cartel" />
        <Chip p={cambio(semana.top)} grande />
        <span className={styles.precioCartel}>
          <s>{base(semana.top)}</s> → <strong>{ahoraPrecio(semana.top)} / g</strong>
        </span>
      </div>
    </section>
  );

  const pestanaMercado = (
    <>
      {cartel}
      <div className={styles.controles}>
        <div className={styles.segmentos} role="group" aria-label="Filtrar">
          {FILTROS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              className={styles.segmento}
              style={filtro === k ? segOn : segOff}
              aria-pressed={filtro === k}
              onClick={() => setFiltro(k)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className={styles.segmentos} role="group" aria-label="Ordenar">
          <span className={styles.etiquetaOrden}>Ordenar</span>
          {ORDENES.map(([k, l]) => (
            <button
              key={k}
              type="button"
              className={styles.segmento}
              style={orden === k ? segOn : segOff}
              aria-pressed={orden === k}
              onClick={() => setOrden(k)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.cuerpo}>
        <ul className={styles.lista}>
          {lista.length === 0 && <li className={styles.texto}>No hay variedades con ese filtro esta semana.</li>}
          {lista.map((id) => {
            const et = etiqueta(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  className={styles.fila}
                  style={{
                    ...tarjeta,
                    background: id === semana.top ? "#f2ec9a" : undefined,
                    outline: sel === id ? "3px solid #d9a43a" : undefined,
                  }}
                  aria-pressed={sel === id}
                  onClick={() => setElegida(id)}
                >
                  <Cosecha id={id} caja="lista" />
                  <span className={styles.nombre}>
                    <strong>{nombreDe(id)}</strong>
                    {et && (
                      <span className={styles.etiqueta} style={{ background: et.fondo }}>
                        {et.texto}
                      </span>
                    )}
                  </span>
                  <span className={styles.base}>{base(id)} / g</span>
                  <strong className={styles.ahora}>{ahoraPrecio(id)} / g</strong>
                  <Chip p={cambio(id)} />
                  <Grafico valores={historial(id)} alto={32} ancho="var(--bw)" />
                </button>
              </li>
            );
          })}
        </ul>
        <aside className={styles.detalle} style={tarjeta} aria-label="Detalle de la variedad">
          <div className={styles.detalleCab}>
            <Cosecha id={sel} caja="lista" />
            <div>
              <h3 className={styles.subtitulo}>{nombreDe(sel)}</h3>
              <span className={styles.texto}>{TENDENCIA[tendencia(cambio(sel))].texto}</span>
            </div>
            <Chip p={cambio(sel)} />
          </div>
          <Grafico valores={historial(sel)} alto={96} ancho="calc((100% - 14px) / 8)" />
          <div className={styles.etiquetasSemanas} aria-hidden>
            {["−7", "−6", "−5", "−4", "−3", "−2", "−1", "Esta"].map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
          <dl className={styles.datos}>
            {(() => {
              const hp = historial(sel).filter((x): x is number => x !== undefined);
              const media = hp.length ? Math.round(hp.reduce((a, b) => a + b, 0) / hp.length) : 0;
              return [
                ["Precio base", `${base(sel)} / g`],
                ["Esta semana", `${ahoraPrecio(sel)} / g`],
                ["Mejor de las 8", textoCambio(hp.length ? Math.max(...hp) : 0)],
                ["Peor de las 8", textoCambio(hp.length ? Math.min(...hp) : 0)],
                ["Media", textoCambio(media)],
              ].map(([l, v]) => (
                <div key={l}>
                  <dt>{l}</dt>
                  <dd>{v}</dd>
                </div>
              ));
            })()}
          </dl>
        </aside>
      </div>
    </>
  );

  const venta = ids
    .filter((id) => (datos.almacen[id] ?? 0) > 0)
    .toSorted((a, b) => nombreDe(a).localeCompare(nombreDe(b)));
  const pestanaVender = (
    <>
      <h2 className={styles.subtituloClaro}>Vender gramos</h2>
      <p className={styles.texto}>
        El precio por gramo de esta semana ya incluye el mercado. Vale hasta que cambie el lunes.
      </p>
      {venta.length === 0 && <p className={styles.texto}>No tienes gramos guardados. Cosecha para poder vender.</p>}
      <div className={styles.ventas}>
        {venta.map((id) => {
          const g = datos.almacen[id];
          const p = cambio(id);
          const t = tendencia(p);
          const unit = ahoraPrecio(id);
          const total = Math.round(g * unit * datos.mult_ventas);
          const dif = Math.round(g * (unit - base(id)) * datos.mult_ventas);
          const q = Math.round(datos.calidad[id] ?? 0);
          const nota =
            t === "alza"
              ? `En alza: ganas ${miles(dif)} monedas más que a precio base. El precio vale ${cuentaAtras(queda, true)}.`
              : t === "baja"
                ? `En baja: pierdes ${miles(-dif)} monedas. Puedes guardarla y vender cuando cambie el mercado, o curarla en un tarro.`
                : "Precio estable: casi igual que el precio base.";
          return (
            <article
              key={id}
              className={styles.venta}
              style={t === "alza" ? dorado : tarjeta}
              aria-label={`Vender ${nombreDe(id)}`}
            >
              <header className={styles.ventaCab}>
                <Cosecha id={id} caja="lista" />
                <div>
                  <strong>
                    {g} g de {nombreDe(id)}
                  </strong>
                  {q > 0 && (
                    <span className={styles.estrellas} aria-label={`${q} estrellas`}>
                      {"★".repeat(q)}
                      <span style={{ opacity: 0.25 }}>{"★".repeat(Math.max(0, 5 - q))}</span>
                    </span>
                  )}
                </div>
                <Chip p={p} />
              </header>
              <p className={styles.precioVenta}>
                <s>{base(id)}</s> → <strong>{unit} / g</strong> · {miles(total)} monedas
              </p>
              <p
                className={styles.nota}
                style={{ background: t === "alza" ? "#e6f5c8" : t === "baja" ? "#fbe0c8" : "#f6eed6" }}
              >
                {guardadas[id] ? `Guardada: ${g} g en el inventario hasta que cambie el mercado.` : nota}
              </p>
              <div className={styles.botones}>
                {g > 10 && (
                  <button
                    type="button"
                    className={styles.accion}
                    style={ocupado ? apagado : secundario}
                    disabled={ocupado}
                    onClick={() => alVender(id, 10)}
                  >
                    Vender 10 g
                  </button>
                )}
                <button
                  type="button"
                  className={styles.accion}
                  style={ocupado ? apagado : boton}
                  disabled={ocupado}
                  onClick={() => alVender(id, null)}
                >
                  Vender por {miles(total)}
                </button>
                {t === "baja" && (
                  <button
                    type="button"
                    className={styles.accion}
                    style={secundario}
                    onClick={() => setGuardadas((s) => ({ ...s, [id]: true }))}
                  >
                    Guardar hasta el lunes
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );

  const abiertos = (encargos?.lista ?? []).filter((e) => e.restan > 0);
  const pestanaEncargos = (
    <>
      <h2 className={styles.subtituloClaro}>Encargos</h2>
      <p className={styles.texto}>
        Los encargos que llegan esta semana se mueven la mitad que el mercado. Los ya aceptados mantienen su precio.
      </p>
      {abiertos.length === 0 && <p className={styles.texto}>No tienes encargos abiertos ahora mismo.</p>}
      <ul className={styles.encargos}>
        {abiertos.map((e) => {
          const aceptado = (e.estado ?? "aceptado") === "aceptado";
          const p = e.mercado ?? 0;
          const t = tendencia(p);
          const cambiado = e.monedas_base !== undefined && e.monedas_base !== e.monedas;
          return (
            <li
              key={e.id}
              className={styles.encargo}
              style={{ ...tarjeta, outline: !aceptado && t === "alza" ? "3px solid #d9a43a" : undefined }}
            >
              <RetratoCliente cliente={e.cliente} k={2} />
              <div className={styles.encargoTexto}>
                <strong>
                  {e.remite} · {TIPOS_ENCARGO[e.tipo ?? "normal"].nombre}
                </strong>
                <span>
                  {e.g} g de {nombreDe(e.variedad)}
                  {aceptado ? " · aceptado" : ""}
                </span>
                <span className={styles.nota}>
                  {aceptado
                    ? "Precio fijado al aceptar"
                    : e.mercado === undefined || t === "estable"
                      ? "Mercado estable"
                      : `Mercado ${textoCambio(Math.round(p / 2))}: ${nombreDe(e.variedad)} ${t === "alza" ? "en alza" : "en baja"}`}
                </span>
              </div>
              <div className={styles.encargoPrecio}>
                {!aceptado && e.mercado !== undefined && <Chip p={Math.round(p / 2)} />}
                <strong>{miles(e.monedas)} monedas</strong>
                {cambiado && !aceptado && <s>{miles(e.monedas_base ?? 0)}</s>}
              </div>
            </li>
          );
        })}
      </ul>
      <button type="button" className={styles.accionAncha} style={secundario} onClick={alIrAEncargos}>
        Abrir el móvil de encargos
      </button>
    </>
  );

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Mercado semanal</h1>
        <span className={styles.reloj}>
          <IconoMercado id="calendario" k={2} /> Cambia en <strong>{cuentaAtras(queda)}</strong>
        </span>
        <span className={styles.monedero}>{miles(monedas)} monedas</span>
      </div>
      <div className={styles.pestanas} role="tablist">
        {PESTANAS.map(([k, l, ic]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={pestana === k}
            className={styles.pestana}
            style={pestana === k ? pestanaOn : pestanaOff}
            onClick={() => setPestana(k)}
          >
            <IconoMercado id={ic} k={2} />
            {l}
          </button>
        ))}
      </div>
      {pestana === "mercado" ? pestanaMercado : pestana === "vender" ? pestanaVender : pestanaEncargos}
    </div>
  );
}
