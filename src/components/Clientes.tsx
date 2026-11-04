"use client";

import { useEffect, useState } from "react";
import {
  CLIENTES_HISTORIA,
  etiquetasCapitulo,
  RANGOS_CLIENTE,
  RANGOS_GLOBALES,
  rangoCliente,
  rangoGlobal,
  type DatosClientes,
  type DatosNegro,
  type HistoriaEstado,
} from "@/lib/clientes";
import { CLIENTES } from "@/lib/encargos";
import { cuentaAtras } from "@/lib/mercadoSemanal";
import { marco } from "@/lib/diseno";
import { VARIEDAD_POR_ID } from "@/lib/variedades";
import { IconoEco, IconoRango, Retrato } from "./EcoSprites";
import { MercadoNegro } from "./MercadoNegro";
import styles from "./clientes.module.css";

interface Props {
  datos: DatosClientes | null;
  negro: DatosNegro | null;
  monedas: number;
  alComprarNegro: (id: string) => void;
  alInspeccion: (opcion: "multa" | "esconder" | "registrar") => void;
  ocupado: boolean;
  alEmpezar: (clave: string) => void;
  alEntregar: (clave: string) => void;
}

type Pestana = "clientes" | "reputacion" | "negro";
type Subpestana = "ficha" | "cadena";

const miles = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const nombreDe = (id: string) => VARIEDAD_POR_ID[id]?.nombre ?? id;

/** Barra de reputación con marcas en cada rango. */
function BarraRep({ valor, maximo, marcas }: { valor: number; maximo: number; marcas: readonly number[] }) {
  return (
    <span className={styles.barra} aria-hidden>
      <span className={styles.barraRelleno} style={{ width: `${Math.min(100, (valor / maximo) * 100)}%` }} />
      {marcas
        .filter((m) => m > 0)
        .map((m) => (
          <span key={m} className={styles.marcaRango} style={{ left: `${(m / maximo) * 100}%` }} />
        ))}
    </span>
  );
}

/** Pantalla de clientes con historia y reputación (8i, parte A). */
export function Clientes({
  datos,
  negro,
  monedas,
  ocupado,
  alEmpezar,
  alEntregar,
  alComprarNegro,
  alInspeccion,
}: Props) {
  const [pestana, setPestana] = useState<Pestana>("clientes");
  const [sub, setSub] = useState<Subpestana>("ficha");
  const [elegido, setElegido] = useState("raiz");
  const [ahora, setAhora] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const panel = marco("panel", "var(--u)");
  const tarjeta = marco("tarjeta", "var(--u)");
  const dorado = marco("dorado", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const apagado = marco("boton_desactivado", "var(--u)");
  const pestanaOff = marco("pestana", "var(--u)");
  const pestanaOn = marco("pestana_activa", "var(--u)");
  const segOff = marco("boton_secundario", "var(--u)");
  const segOn = marco("dorado", "var(--u)");

  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Clientes</h1>
        <p className={styles.texto}>Cargando…</p>
      </div>
    );
  }

  const pasados = datos.recibido && ahora > datos.recibido ? Math.floor((ahora - datos.recibido) / 1000) : 0;
  const restante = (s: number | null) => (s === null ? null : Math.max(0, s - pasados));
  const rg = rangoGlobal(datos.global);
  const estado = (id: string) => datos.historias.find((h) => h.id === id);
  const visibles = CLIENTES_HISTORIA.filter((c) => rg >= c.desde);
  const cliente = visibles.find((c) => c.id === elegido) ?? visibles[0];
  const h = cliente ? estado(cliente.id) : undefined;

  const ficha = (c: (typeof CLIENTES_HISTORIA)[number], h: HistoriaEstado) => {
    const rc = rangoCliente(h.rep);
    const sig = RANGOS_CLIENTE[rc + 1];
    const terminada = h.cap >= h.n;
    return (
      <div className={styles.ficha} style={panel}>
        <div className={styles.fichaCab}>
          <Retrato n={c.retrato} k={3} />
          <div className={styles.fichaNombre}>
            <strong>{c.nombre}</strong>
            <span>{c.rol}</span>
            <span className={styles.rango}>
              <IconoRango n={rc} /> {RANGOS_CLIENTE[rc].nombre}
            </span>
          </div>
        </div>
        <BarraRep valor={h.rep} maximo={1000} marcas={RANGOS_CLIENTE.map((r) => r.desde)} />
        <p className={styles.texto}>
          {miles(h.rep)} / 1.000{sig ? ` · siguiente: ${sig.nombre} (${miles(sig.desde)})` : " · rango máximo"}
        </p>
        {rc >= 1 ? (
          <p className={styles.cita}>«{c.presentacion}»</p>
        ) : (
          <p className={styles.texto}>Aún no te conoce. Consigue 100 de reputación.</p>
        )}
        <ul className={styles.ventajas}>
          {RANGOS_CLIENTE.slice(1).map((r, i) => (
            <li key={r.nombre} className={rc >= i + 1 ? undefined : styles.bloqueada}>
              <IconoEco id={rc >= i + 1 ? "llave" : "candado"} k={1} /> <strong>{r.nombre}:</strong> {r.nota}
            </li>
          ))}
        </ul>
        {!h.activa && !terminada && (
          <button
            type="button"
            className={styles.accion}
            style={ocupado ? apagado : boton}
            disabled={ocupado}
            onClick={() => alEmpezar(c.id)}
          >
            Empezar su historia
          </button>
        )}
        {terminada && <p className={styles.texto}>Historia terminada. Gracias por todo.</p>}
      </div>
    );
  };

  const cadena = (c: (typeof CLIENTES_HISTORIA)[number], h: HistoriaEstado) => {
    const cap = h.capitulo;
    const plan = h.plan;
    const restan = restante(h.restan);
    const viernes = restante(h.restan_viernes);
    const rapido = restante(h.restan_rapido);
    return (
      <div className={styles.cadena} style={panel}>
        <h3 className={styles.subtitulo}>
          <IconoEco id="cadena" k={1} /> La historia de {c.nombre}
        </h3>
        <ol className={styles.puntos} aria-label="Capítulos">
          {Array.from({ length: h.n }, (_, i) => (
            <li
              key={i}
              className={styles.punto}
              style={{ background: i < h.cap ? "#c9f26b" : i === h.cap && h.activa ? "#f4d36a" : "#f6eed6" }}
              aria-current={i === h.cap && h.activa ? "step" : undefined}
            >
              {i < h.cap ? "✓" : i + 1}
            </li>
          ))}
        </ol>
        {!h.activa && <p className={styles.texto}>Empieza su historia desde la ficha para ver el primer capítulo.</p>}
        {h.activa && cap && plan && (
          <>
            <h4 className={styles.capTitulo}>
              Capítulo {h.cap + 1}: {cap.t}
            </h4>
            <div className={styles.requisito}>
              <span className={styles.marca} style={{ background: plan.ok ? "#c9f26b" : "#f7b072" }}>
                {plan.ok ? "✓" : "!"}
              </span>
              <span className={styles.requisitoTexto}>
                <strong>
                  {cap.g} g
                  {cap.vars
                    ? ` de ${cap.vars.map(nombreDe).join(" o ")}`
                    : cap.efectos
                      ? ` (efecto ${cap.efectos.join(" o ")})`
                      : ""}
                </strong>
                <span style={{ color: plan.ok ? "#1d6630" : "#b9512a" }}>Tienes {plan.tengo} g que cumplen</span>
              </span>
            </div>
            <ul className={styles.etiquetas}>
              {etiquetasCapitulo(cap).map((e) => (
                <li key={e.texto} className={styles.etiqueta}>
                  <IconoEco id={e.icono} k={1} /> {e.texto}
                </li>
              ))}
              {restan !== null && (
                <li className={styles.etiqueta}>
                  <IconoEco id="plazo" k={1} /> Plazo: {cuentaAtras(restan)}
                </li>
              )}
              {viernes !== null && cap.viernes && (
                <li className={styles.etiqueta} style={{ background: "#f4d36a" }}>
                  ×{cap.viernes} hasta el viernes a las 20:00 ({cuentaAtras(viernes)})
                </li>
              )}
              {rapido !== null && cap.rapido && (
                <li className={styles.etiqueta} style={{ background: "#f4d36a" }}>
                  ×{cap.rapido.mult} si entregas en {cuentaAtras(rapido)}
                </li>
              )}
            </ul>
            <p className={styles.texto}>
              Recompensa: <strong>{miles(h.pago ?? cap.pago)} monedas</strong> · +{cap.rep} de reputación
              {cap.plazo ? " (+50 % si entregas antes de la mitad del plazo)" : ""}
              {cap.vip ? " · te hace VIP" : ""}
              {cap.rosa ? " · Doña Rosa sube a «De confianza»" : ""}
            </p>
            <button
              type="button"
              className={styles.accion}
              style={ocupado || !plan.ok ? apagado : boton}
              disabled={ocupado || !plan.ok}
              onClick={() => alEntregar(c.id)}
            >
              Entregar capítulo
            </button>
          </>
        )}
        {h.cap >= h.n && h.activa && <p className={styles.texto}>Has terminado toda su historia.</p>}
      </div>
    );
  };

  const pestanaClientes = (
    <div className={styles.cuerpo}>
      <ul className={styles.lista}>
        {CLIENTES_HISTORIA.map((c) => {
          const e = estado(c.id);
          const bloqueado = rg < c.desde;
          const rc = rangoCliente(e?.rep ?? 0);
          return (
            <li key={c.id}>
              <button
                type="button"
                className={styles.fila}
                style={{ ...tarjeta, outline: cliente?.id === c.id ? "3px solid #d9a43a" : undefined }}
                disabled={bloqueado}
                aria-pressed={cliente?.id === c.id}
                onClick={() => {
                  setElegido(c.id);
                  setSub("ficha");
                }}
              >
                <Retrato n={c.retrato} k={2} />
                <span className={styles.nombre}>
                  <strong>{bloqueado ? "???" : c.nombre}</strong>
                  <span>{bloqueado ? "Llega cuando seas una leyenda" : c.rol}</span>
                  {!bloqueado && (
                    <span className={styles.rango}>
                      <IconoRango n={rc} k={1} /> {RANGOS_CLIENTE[rc].nombre}
                      {e && e.activa && e.cap < e.n ? ` · capítulo ${e.cap + 1}/${e.n}` : ""}
                    </span>
                  )}
                </span>
                <IconoEco id={bloqueado ? "candado" : e?.activa && e.cap < e.n ? "historia" : "llave"} k={2} />
              </button>
            </li>
          );
        })}
      </ul>
      {cliente && h && (
        <div className={styles.detalle}>
          <div className={styles.subpestanas} role="tablist">
            {(
              [
                ["ficha", "Ficha"],
                ["cadena", "Historia"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={sub === k}
                className={`${styles.segmento} ${styles.soloMovil}`}
                style={sub === k ? segOn : segOff}
                onClick={() => setSub(k)}
              >
                {l}
              </button>
            ))}
          </div>
          <div className={sub === "ficha" ? undefined : styles.ocultoMovil}>{ficha(cliente, h)}</div>
          <div className={sub === "cadena" ? undefined : styles.ocultoMovil}>{cadena(cliente, h)}</div>
        </div>
      )}
    </div>
  );

  const siguienteGlobal = RANGOS_GLOBALES[rg + 1];
  const barrio = Object.entries(datos.reputacion)
    .filter(([k]) => /^\d+$/.test(k) && Number(k) < CLIENTES.length)
    .toSorted((a, b) => b[1] - a[1]);
  const pestanaReputacion = (
    <>
      <section className={styles.global} style={dorado} aria-label="Reputación global">
        <div className={styles.fichaCab}>
          <IconoRango n={rg} k={3} />
          <div className={styles.fichaNombre}>
            <strong>{RANGOS_GLOBALES[rg].nombre}</strong>
            <span>{miles(datos.global)} / 6.000 de reputación global</span>
          </div>
        </div>
        <BarraRep valor={datos.global} maximo={6000} marcas={RANGOS_GLOBALES.map((r) => r.desde)} />
        <p className={styles.texto}>
          {siguienteGlobal
            ? `Te faltan ${miles(siguienteGlobal.desde - datos.global)} para ser «${siguienteGlobal.nombre}». `
            : "Eres una leyenda. "}
          La reputación global sube el doble de lo que ganas con cada cliente.
        </p>
      </section>
      <ul className={styles.escalera}>
        {RANGOS_GLOBALES.map((r, i) => (
          <li key={r.nombre} className={styles.escalon} style={rg >= i ? tarjeta : { ...tarjeta, opacity: 0.6 }}>
            <IconoRango n={i} k={2} />
            <span className={styles.nombre}>
              <strong>{r.nombre}</strong>
              <span>{r.nota}</span>
            </span>
            <span className={styles.texto}>{miles(r.desde)}</span>
            <IconoEco id={rg >= i ? "llave" : "candado"} k={1} />
          </li>
        ))}
      </ul>
      <h2 className={styles.subtituloClaro}>Clientes del barrio</h2>
      <ul className={styles.barrio}>
        {barrio.map(([k, v]) => (
          <li key={k} className={styles.barrioFila} style={tarjeta}>
            <span className={styles.barrioNombre}>{CLIENTES[Number(k)].nombre}</span>
            <BarraRep valor={v} maximo={1000} marcas={RANGOS_CLIENTE.map((r) => r.desde)} />
            <span className={styles.rango}>{RANGOS_CLIENTE[rangoCliente(v)].nombre}</span>
          </li>
        ))}
        {barrio.length === 0 && <li className={styles.texto}>Todavía no has tratado con ningún cliente del barrio.</li>}
      </ul>
    </>
  );

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Clientes y reputación</h1>
        <span className={styles.chipInfo}>
          <IconoEco id="historia" k={1} /> Historias: {datos.activas}/{datos.limite}
        </span>
        <span className={styles.chipInfo}>
          <IconoRango n={rg} k={1} /> {RANGOS_GLOBALES[rg].nombre}
        </span>
      </div>
      <div className={styles.pestanas} role="tablist">
        {(
          [
            ["clientes", "Clientes", "historia"],
            ["reputacion", "Reputación", "reputacion"],
            ["negro", "Mercado negro", "mercado_negro"],
          ] as const
        ).map(([k, l, ic]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={pestana === k}
            className={styles.pestana}
            style={pestana === k ? pestanaOn : pestanaOff}
            onClick={() => setPestana(k)}
          >
            <IconoEco id={ic} k={2} />
            {l}
          </button>
        ))}
      </div>
      {pestana === "clientes" ? (
        pestanaClientes
      ) : pestana === "reputacion" ? (
        pestanaReputacion
      ) : (
        <MercadoNegro
          datos={negro}
          monedas={monedas}
          ocupado={ocupado}
          alComprar={alComprarNegro}
          alInspeccion={alInspeccion}
        />
      )}
    </div>
  );
}
