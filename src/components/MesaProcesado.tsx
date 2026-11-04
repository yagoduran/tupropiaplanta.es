"use client";

import { useEffect, useState } from "react";
import {
  calidadResultante,
  duracion,
  esComestible,
  ICONO_PROC,
  NOMBRE_PROC,
  precioProducto,
  PRECIO_MASA,
  PUESTOS,
  tengoIngrediente,
  trabajoAhora,
  type DatosProcesado,
  type IdIconoProc,
  type Puesto,
  type TrabajoProc,
} from "@/lib/procesado";
import { cuentaAtras } from "@/lib/mercadoSemanal";
import { marco } from "@/lib/diseno";
import { Estrellas } from "./Estrellas";
import { Retrato } from "./EcoSprites";
import { RetratoCliente } from "./RetratoCliente";
import styles from "./mesaProcesado.module.css";

interface Props {
  datos: DatosProcesado | null;
  monedas: number;
  ocupado: boolean;
  alAnadir: (receta: string) => void;
  alQuitar: (puesto: Puesto, idx: number) => void;
  alRecoger: (puesto: Puesto) => void;
  alVender: (producto: string, cantidad: number) => void;
  alComprarMasa: (masa: string, cantidad: number) => void;
  alEntregar: (clave: string) => void;
}

type Pestana = "mesa" | "recetas" | "almacen" | "encargos";

const miles = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const nombre = (id: string) => NOMBRE_PROC[id] ?? id;

/** Icono de la hoja de procesado (16 × 1 o 32 × 1). */
function IconoProc({ id, k = 2, grande }: { id: IdIconoProc; k?: number; grande?: boolean }) {
  const t = grande ? 32 : 16;
  const f = (n: number) => `${n * k}px`;
  return (
    <span
      className="pixel"
      aria-hidden
      style={{
        display: "block",
        flex: "none",
        width: f(t),
        height: f(t),
        backgroundImage: `url(/assets/procesado/tpp-proc-iconos-${t}-1x.png)`,
        backgroundSize: `${f(t * 16)} ${f(t)}`,
        backgroundPosition: `${f(-ICONO_PROC[id] * t)} 0`,
      }}
    />
  );
}

const iconoDe = (id: string): IdIconoProc => (id in ICONO_PROC ? (id as IdIconoProc) : "restos");

const ETIQUETA_ESTADO = {
  vacio: "Vacío",
  espera: "En espera",
  procesando: "Procesando",
  listo: "Listo",
  estropeado: "Estropeado",
} as const;

/** Pantalla de la mesa de procesado (8j). */
export function MesaProcesado({
  datos,
  monedas,
  ocupado,
  alAnadir,
  alQuitar,
  alRecoger,
  alVender,
  alComprarMasa,
  alEntregar,
}: Props) {
  const [pestana, setPestana] = useState<Pestana>("mesa");
  const [ahora, setAhora] = useState(0);
  const [fase, setFase] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setAhora(Date.now());
      setFase((f) => f + 1);
    }, 400);
    return () => clearInterval(id);
  }, []);

  if (!datos) return <p className={styles.texto}>Cargando la mesa…</p>;

  const pasado = datos.recibido && ahora > datos.recibido ? Math.floor((ahora - datos.recibido) / 1000) : 0;
  const cabezas = PUESTOS.map((p) => {
    const cola = datos.puestos[p.id] ?? [];
    const cola2 = cola.map((t) => trabajoAhora(t, datos.recetas[t.rec], pasado));
    return { ...p, cola: cola2 };
  });
  const lista = cabezas.filter(
    (p) => p.cola[0] && (p.cola[0].estado === "listo" || p.cola[0].estado === "estropeado"),
  ).length;
  const queda = Math.max(0, datos.queda - pasado);

  const pestanas: [Pestana, string][] = [
    ["mesa", "Mesa"],
    ["recetas", "Recetas"],
    ["almacen", "Almacén"],
    ["encargos", "Encargos"],
  ];

  return (
    <section className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h2 className={styles.titulo}>Mesa de procesado</h2>
        {lista > 0 && (
          <span className={styles.chipInfo}>
            <IconoProc id="recoger" /> {lista} por recoger
          </span>
        )}
        <span className={styles.chipInfo}>{miles(monedas)} monedas</span>
      </div>

      <div className={styles.pestanas} role="tablist">
        {pestanas.map(([id, t]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pestana === id}
            className={styles.pestana}
            style={marco(pestana === id ? "panel" : "panel_oscuro", "var(--u)")}
            onClick={() => setPestana(id)}
          >
            {t}
          </button>
        ))}
      </div>

      {pestana === "mesa" && (
        <>
          <Escena cabezas={cabezas} fase={fase} />
          <div className={styles.puestos}>
            {cabezas.map((p) => (
              <TarjetaPuesto
                key={p.id}
                id={p.id}
                nombre={p.nombre}
                cola={p.cola}
                datos={datos}
                ocupado={ocupado}
                alRecoger={() => alRecoger(p.id)}
                alQuitar={(i) => alQuitar(p.id, i)}
                alIrARecetas={() => setPestana("recetas")}
              />
            ))}
          </div>
        </>
      )}

      {pestana === "recetas" && (
        <div className={styles.recetas}>
          {PUESTOS.map((p) => (
            <div key={p.id} className={styles.grupo}>
              <h3 className={styles.subtituloClaro}>{p.nombre}</h3>
              {Object.entries(datos.recetas)
                .filter(([, r]) => r.st === p.id)
                .map(([id, r]) => {
                  const q = calidadResultante(datos, r);
                  const puede = r.ins.every(([i, n]) => tengoIngrediente(datos, i) >= n);
                  const llena = (datos.puestos[p.id] ?? []).length >= 3;
                  const precio = Math.round(precioProducto(r, q) * datos.mult_ventas);
                  return (
                    <article key={id} className={styles.receta} style={marco("panel", "var(--u)")}>
                      <div className={styles.recetaCab}>
                        <IconoProc id={iconoDe(id)} k={3} grande />
                        <div className={styles.recetaNombre}>
                          <strong>{nombre(id)}</strong>
                          <span>
                            {r.out} {esComestible(r) ? "ud" : "g"} · {duracion(r.t)}
                          </span>
                        </div>
                      </div>
                      <ul className={styles.ingredientes}>
                        {r.ins.map(([i, n]) => {
                          const tengo = tengoIngrediente(datos, i);
                          return (
                            <li key={i} className={tengo < n ? styles.falta : undefined}>
                              <IconoProc id={iconoDe(i)} />
                              <span>{nombre(i)}</span>
                              <b>
                                {tengo}/{n}
                              </b>
                            </li>
                          );
                        })}
                      </ul>
                      <dl className={styles.datos}>
                        <div>
                          <dt>Ventana</dt>
                          <dd>{duracion(r.win)}</dd>
                        </div>
                        <div>
                          <dt>Si te pasas</dt>
                          <dd>{r.ruin === "all" ? "Se pierde" : "Mitad y −1★"}</dd>
                        </div>
                      </dl>
                      <div className={styles.resultado}>
                        <Estrellas calidad={q} k={1.5} />
                        <span>
                          {miles(precio)} monedas {esComestible(r) ? "/ ud" : "/ g"}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={styles.accion}
                        style={marco("panel", "var(--u)")}
                        disabled={ocupado || !puede || llena}
                        onClick={() => alAnadir(id)}
                      >
                        {llena ? "Cola llena" : puede ? "Añadir a la cola" : "Faltan ingredientes"}
                      </button>
                    </article>
                  );
                })}
            </div>
          ))}
        </div>
      )}

      {pestana === "almacen" && (
        <div className={styles.almacen}>
          <h3 className={styles.subtituloClaro}>Materias primas</h3>
          <ul className={styles.lista}>
            <li className={styles.fila} style={marco("panel", "var(--u)")}>
              <IconoProc id="restos" k={2} />
              <span className={styles.filaNombre}>
                <strong>Restos de poda</strong>
                <small>Los da la cosecha (30 % de los gramos)</small>
              </span>
              <b>{datos.restos.n} g</b>
              <Estrellas calidad={Math.round(datos.restos.q)} k={1} />
            </li>
            <li className={styles.fila} style={marco("panel", "var(--u)")}>
              <IconoProc id="cogollos" k={2} />
              <span className={styles.filaNombre}>
                <strong>Cogollos de 1–2★</strong>
                <small>Salen del almacén</small>
              </span>
              <b>{datos.cogollos.n} g</b>
              <Estrellas calidad={datos.cogollos.q} k={1} />
            </li>
            {Object.entries(PRECIO_MASA).map(([id, precio]) => (
              <li key={id} className={styles.fila} style={marco("panel", "var(--u)")}>
                <IconoProc id={iconoDe(id)} k={2} />
                <span className={styles.filaNombre}>
                  <strong>{nombre(id)}</strong>
                  <small>{precio} monedas cada una</small>
                </span>
                <b>{datos.masas[id] ?? 0}</b>
                <button
                  type="button"
                  className={styles.mini}
                  style={marco("panel", "var(--u)")}
                  disabled={ocupado || monedas < precio}
                  onClick={() => alComprarMasa(id, 1)}
                >
                  Comprar
                </button>
              </li>
            ))}
          </ul>

          <h3 className={styles.subtituloClaro}>Productos</h3>
          {(() => {
            const filas = Object.entries(datos.prod).filter(([, p]) => p.n > 0);
            if (filas.length === 0) return <p className={styles.texto}>Aún no tienes nada procesado.</p>;
            return (
              <ul className={styles.productos}>
                {filas.map(([id, p]) => {
                  const r = datos.recetas[id];
                  const unit = Math.round(precioProducto(r, p.q) * datos.mult_ventas);
                  return (
                    <li key={id} className={styles.producto} style={marco("panel", "var(--u)")}>
                      <IconoProc id={iconoDe(id)} k={2} grande />
                      <strong>{nombre(id)}</strong>
                      <span>
                        {p.n} {esComestible(r) ? "ud" : "g"}
                      </span>
                      <Estrellas calidad={p.q} k={1} />
                      <span>
                        {miles(unit)} / {esComestible(r) ? "ud" : "g"}
                      </span>
                      <button
                        type="button"
                        className={styles.mini}
                        style={marco("panel", "var(--u)")}
                        disabled={ocupado}
                        onClick={() => alVender(id, p.n)}
                      >
                        Vender todo ({miles(unit * p.n)})
                      </button>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </div>
      )}

      {pestana === "encargos" && (
        <div className={styles.almacen}>
          <p className={styles.texto}>Encargos especiales. Se renuevan en {cuentaAtras(queda)}.</p>
          <ul className={styles.lista}>
            {datos.encargos.map((e) => {
              const puede = !e.hecho && e.tengo >= e.need;
              return (
                <li
                  key={e.k}
                  className={`${styles.fila} ${e.hecho ? styles.hecho : ""}`}
                  style={marco("panel", "var(--u)")}
                >
                  {e.sh === "cli" ? <RetratoCliente cliente={e.i} k={2} /> : <Retrato n={e.i} k={2} />}
                  <span className={styles.filaNombre}>
                    <strong>{e.n}</strong>
                    <small>
                      {e.need} {datos.recetas[e.p] && esComestible(datos.recetas[e.p]) ? "ud" : "g"} de{" "}
                      {nombre(e.p).toLowerCase()} de {e.q}★ o más · tienes {e.tengo}
                    </small>
                  </span>
                  <b>{miles(e.pay)}</b>
                  <button
                    type="button"
                    className={styles.mini}
                    style={marco("panel", "var(--u)")}
                    disabled={ocupado || !puede}
                    onClick={() => alEntregar(e.k)}
                  >
                    {e.hecho ? "Entregado" : "Entregar"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

type Cabeza = { id: Puesto; nombre: string; col: number; cola: TrabajoProc[] };

/** Escena con los tres puestos sobre el banco y su burbuja de aviso. */
function Escena({ cabezas, fase }: { cabezas: Cabeza[]; fase: number }) {
  return (
    <div className={styles.escena} role="img" aria-label="Mesa de procesado con prensa, extractor y horno">
      {cabezas.map((p, i) => {
        const t = p.cola.at(0);
        const estado = t?.estado ?? "vacio";
        const columna =
          estado === "vacio" || estado === "espera"
            ? 0
            : estado === "procesando"
              ? 1 + (fase % 2)
              : estado === "listo"
                ? 3
                : 4;
        const cx = [40, 96, 152][i];
        return (
          <span key={p.id}>
            <span
              className={`${styles.sprite} pixel`}
              style={{
                left: `calc((${cx}px - 24px) * var(--k))`,
                backgroundPosition: `calc(${-columna * 48}px * var(--k)) calc(${-i * 48}px * var(--k))`,
              }}
            />
            {(estado === "listo" || estado === "estropeado") && (
              <span className={styles.burbuja} style={{ left: `calc(${cx}px * var(--k))` }}>
                <IconoProc id={estado === "listo" ? "recoger" : "estropeado"} k={2} />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

interface PropsPuesto {
  id: Puesto;
  nombre: string;
  cola: TrabajoProc[];
  datos: DatosProcesado;
  ocupado: boolean;
  alRecoger: () => void;
  alQuitar: (idx: number) => void;
  alIrARecetas: () => void;
}

function TarjetaPuesto({ id, nombre: titulo, cola, datos, ocupado, alRecoger, alQuitar, alIrARecetas }: PropsPuesto) {
  const t = cola.at(0);
  const r = t ? datos.recetas[t.rec] : null;
  const estado = t?.estado ?? "vacio";
  const total = r?.t ?? 1;
  const fraccion =
    t && estado === "procesando" && t.restan !== null
      ? 1 - t.restan / total
      : estado === "listo" || estado === "estropeado"
        ? 1
        : 0;
  const puedeRecoger = estado === "listo" || estado === "estropeado";
  return (
    <article
      className={`${styles.puesto} ${estado === "listo" ? styles.puestoListo : ""}`}
      style={marco("panel", "var(--u)")}
    >
      <div className={styles.puestoCab}>
        <IconoProc id={id} k={2} />
        <strong>{titulo}</strong>
        <span className={`${styles.chip} ${styles[`chip_${estado}`]}`}>{ETIQUETA_ESTADO[estado]}</span>
      </div>
      {t && r ? (
        <>
          <div className={styles.trabajo}>
            <IconoProc id={iconoDe(t.rec)} k={2} grande />
            <div className={styles.trabajoTexto}>
              <strong>{nombre(t.rec)}</strong>
              <Estrellas calidad={t.q} k={1} />
              <small>
                {estado === "procesando" && t.restan !== null && `Faltan ${duracion(t.restan)}`}
                {estado === "listo" && t.caduca !== null && `Recoge antes de ${duracion(t.caduca)}`}
                {estado === "estropeado" && (r.ruin === "all" ? "Se ha perdido" : "Se ha pasado: mitad y −1★")}
              </small>
            </div>
          </div>
          <span className={styles.barra} aria-hidden>
            <span
              className={`${styles.barraRelleno} ${styles[`barra_${estado}`]}`}
              style={{ width: `${Math.min(100, fraccion * 100)}%` }}
            />
          </span>
          <button
            type="button"
            className={styles.accion}
            style={marco("panel", "var(--u)")}
            disabled={ocupado || !puedeRecoger}
            onClick={alRecoger}
          >
            <IconoProc id="recoger" /> Recoger
          </button>
        </>
      ) : (
        <button type="button" className={styles.accion} style={marco("panel", "var(--u)")} onClick={alIrARecetas}>
          Elegir receta
        </button>
      )}
      <div className={styles.cola} aria-label="Cola">
        {[0, 1, 2].map((i) => {
          const c = cola[i];
          return (
            <div key={i} className={styles.hueco} style={marco("panel_oscuro", "var(--u)")}>
              {c ? (
                <>
                  <IconoProc id={iconoDe(c.rec)} k={2} />
                  {i > 0 && (
                    <button
                      type="button"
                      className={styles.quitar}
                      aria-label={`Quitar ${nombre(c.rec)} de la cola`}
                      disabled={ocupado}
                      onClick={() => alQuitar(i)}
                    >
                      ×
                    </button>
                  )}
                </>
              ) : (
                <IconoProc id="cola" k={2} />
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
