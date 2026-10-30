"use client";

import { useState } from "react";
import { marco } from "@/lib/diseno";
import { MENSAJES_ERROR } from "@/lib/juego";
import { comision, precioMaximo, precioMinimo, rarezaObjeto, type DatosMercado } from "@/lib/mercado";
import { OBJETO_POR_ID } from "@/lib/tienda";
import { RAREZAS, type Rareza } from "@/lib/variedades";
import { Icono } from "./Icono";
import { IconoObjeto } from "./IconoObjeto";
import styles from "./progresion.module.css";

interface Props {
  datos: DatosMercado | null;
  monedas: number;
  ocupado: boolean;
  error: string | null;
  alPublicar: (objeto: string, precio: number) => void;
  alComprar: (id: number) => void;
  alRetirar: (id: number) => void;
  alRepublicar: (id: number) => void;
  alCobrar: (id: number) => void;
}

type Pestana = "comprar" | "vender" | "mias";

const miles = (n: number) => n.toLocaleString("es-ES", { useGrouping: "always" });

function quedan(segundos: number): string {
  if (segundos <= 0) return "caduca ya";
  const h = Math.floor(segundos / 3600);
  if (h >= 24) return `quedan ${Math.floor(h / 24)} d ${h % 24} h`;
  if (h >= 1) return `quedan ${h} h`;
  return `quedan ${Math.max(1, Math.floor(segundos / 60))} min`;
}

const ESTADOS = {
  venta: { texto: "En venta", fondo: "#2f6fb0" },
  vendida: { texto: "Vendida", fondo: "#1d6630" },
  caducada: { texto: "Caducada", fondo: "#8c6a48" },
} as const;

function Rareza({ r }: { r: Rareza }) {
  return (
    <span
      style={{
        alignSelf: "flex-start",
        background: RAREZAS[r].fondo,
        color: RAREZAS[r].texto,
        padding: "1px 6px",
        fontSize: "var(--f-small)",
        fontWeight: 700,
      }}
    >
      {RAREZAS[r].etiqueta}
    </span>
  );
}

/** Mercado entre jugadores: comprar, vender objetos y cobrar tus ventas. */
export function Mercado({
  datos,
  monedas,
  ocupado,
  error,
  alPublicar,
  alComprar,
  alRetirar,
  alRepublicar,
  alCobrar,
}: Props) {
  const [pestana, setPestana] = useState<Pestana>("comprar");
  const [rareza, setRareza] = useState<Rareza | "todas">("todas");
  const [elegido, setElegido] = useState<string | null>(null);
  const [precio, setPrecio] = useState("");
  const tarjeta = marco("tarjeta", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");
  const apagado = marco("boton_desactivado", "var(--u)");

  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Mercado</h1>
        <p className={styles.resumen}>Cargando…</p>
      </div>
    );
  }

  const ofertas = datos.ofertas.filter((o) => rareza === "todas" || rarezaObjeto(o.objeto) === rareza);
  const vendibles = datos.inventario.filter((i) => !i.en_uso);
  const sel = vendibles.find((i) => i.objeto === elegido) ?? null;
  const num = Math.trunc(Number(precio));
  const min = sel ? precioMinimo(sel.precio) : 0;
  const max = sel ? precioMaximo(sel.precio) : 0;
  const valido = sel !== null && Number.isFinite(num) && num >= min && num <= max;
  const tasa = valido ? comision(num) : 0;
  const similares = sel ? datos.ofertas.filter((o) => o.objeto === sel.objeto) : [];
  const medio = similares.length ? Math.round(similares.reduce((t, o) => t + o.precio, 0) / similares.length) : null;
  const pendientes = datos.mias.filter((m) => m.estado === "vendida").length;

  const elegir = (id: string, base: number) => {
    setElegido(id);
    setPrecio(String(base));
  };

  const pestanas: [Pestana, string][] = [
    ["comprar", "Comprar"],
    ["vender", "Vender"],
    ["mias", pendientes > 0 ? `Mis ventas (${pendientes})` : "Mis ventas"],
  ];

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Mercado</h1>
        <span className={styles.resumen}>
          Saldo: <strong>{miles(monedas)} monedas</strong>
        </span>
      </div>

      <div className={styles.eventoPestanas} role="tablist">
        {pestanas.map(([id, etq]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pestana === id}
            className={styles.eventoPestana}
            style={marco(pestana === id ? "dorado" : "tarjeta", "var(--u)")}
            onClick={() => setPestana(id)}
          >
            {etq}
          </button>
        ))}
      </div>

      {error && (
        <p className={styles.resumen} style={{ color: "#7c2e1b" }}>
          {MENSAJES_ERROR[error] ?? MENSAJES_ERROR.red}
        </p>
      )}

      {pestana === "comprar" && (
        <>
          <div className={styles.eventoPestanas}>
            {(["todas", "comun", "poco_comun", "rara", "epica", "legendaria"] as const).map((r) => (
              <button
                key={r}
                type="button"
                className={styles.eventoPestana}
                style={marco(rareza === r ? "dorado" : "boton_secundario", "var(--u)")}
                aria-pressed={rareza === r}
                onClick={() => setRareza(r)}
              >
                {r === "todas" ? "Todas" : RAREZAS[r].etiqueta}
              </button>
            ))}
          </div>
          <p className={styles.resumen}>
            Compras de hoy: {datos.compras_hoy} de {datos.compras_max}
          </p>
          {ofertas.length === 0 ? (
            <section className={styles.tarjeta} style={tarjeta}>
              <p className={styles.nota}>Ahora no hay ofertas{rareza !== "todas" ? " de esa rareza" : ""}.</p>
            </section>
          ) : (
            <div className={styles.jugadores}>
              {ofertas.map((o) => {
                const obj = OBJETO_POR_ID[o.objeto];
                if (!obj) return null;
                const pobre = o.precio > monedas;
                const repetido = obj.tipo !== "consumible" && o.tiene;
                const bloqueado = ocupado || pobre || repetido;
                return (
                  <div key={o.id} className={styles.jugador} style={tarjeta}>
                    <IconoObjeto celda={obj.celda} k={2} />
                    <span className={styles.jugadorTexto}>
                      <strong>{obj.nombre}</strong>
                      <Rareza r={rarezaObjeto(o.objeto)} />
                      <span>
                        por {o.vendedor.usuario} · {quedan(o.queda)}
                      </span>
                    </span>
                    <span className={styles.jugadorAcciones} style={{ alignItems: "center" }}>
                      <strong
                        style={{ display: "flex", alignItems: "center", gap: 4, color: pobre ? "#b9512a" : undefined }}
                      >
                        <Icono id="moneda" k={1} />
                        {miles(o.precio)}
                      </strong>
                      <button
                        type="button"
                        className={styles.boton}
                        style={bloqueado ? apagado : boton}
                        disabled={bloqueado}
                        onClick={() => alComprar(o.id)}
                      >
                        {repetido ? "Ya lo tienes" : pobre ? "Sin monedas" : "Comprar"}
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {pestana === "vender" && (
        <section className={styles.tarjeta} style={tarjeta}>
          <p className={styles.subtitulo}>Elige qué vender</p>
          {vendibles.length === 0 ? (
            <p className={styles.nota}>No tienes objetos para vender. Los que llevas puestos no se pueden vender.</p>
          ) : (
            <div className={styles.jugadores}>
              {vendibles.map((i) => {
                const obj = OBJETO_POR_ID[i.objeto];
                if (!obj) return null;
                return (
                  <button
                    key={i.objeto}
                    type="button"
                    className={styles.jugador}
                    style={{
                      ...marco(elegido === i.objeto ? "dorado" : "tarjeta", "var(--u)"),
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    aria-pressed={elegido === i.objeto}
                    onClick={() => elegir(i.objeto, i.precio)}
                  >
                    <IconoObjeto celda={obj.celda} k={2} />
                    <span className={styles.jugadorTexto}>
                      <strong>{obj.nombre}</strong>
                      <span>
                        Tienes {i.cantidad} · precio de tienda {miles(i.precio)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {sel && (
            <>
              <label className={styles.subtitulo} htmlFor="precio-oferta">
                Precio en monedas
              </label>
              <input
                id="precio-oferta"
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                style={{
                  minHeight: 48,
                  fontSize: 16,
                  padding: "8px 12px",
                  border: "3px solid #1c1626",
                  background: "#fff",
                }}
              />
              <p className={styles.nota}>
                Entre {miles(min)} y {miles(max)} monedas.
                {medio !== null && (
                  <>
                    <br />
                    Precio medio en el mercado: <strong>{miles(medio)} monedas</strong>
                  </>
                )}
                <br />
                Comisión del mercado (5 %): <strong>{miles(tasa)} monedas</strong>
                <br />
                Recibirás: <strong>{valido ? miles(num - tasa) : "—"} monedas</strong>
              </p>
              <button
                type="button"
                className={styles.accion}
                style={ocupado || !valido || datos.activas >= datos.max ? apagado : boton}
                disabled={ocupado || !valido || datos.activas >= datos.max}
                onClick={() => {
                  alPublicar(sel.objeto, num);
                  setElegido(null);
                  setPrecio("");
                }}
              >
                Poner a la venta
              </button>
            </>
          )}
          <p className={styles.nota}>
            Las ofertas caducan a los 3 días si nadie las compra y el objeto vuelve a tu inventario. Ofertas activas:{" "}
            {datos.activas} de {datos.max}.
          </p>
        </section>
      )}

      {pestana === "mias" && (
        <section className={styles.tarjeta} style={tarjeta}>
          {datos.mias.length === 0 ? (
            <p className={styles.nota}>Todavía no has puesto nada a la venta.</p>
          ) : (
            <div className={styles.jugadores}>
              {datos.mias.map((m) => {
                const obj = OBJETO_POR_ID[m.objeto];
                if (!obj) return null;
                const est = ESTADOS[m.estado];
                const meta =
                  m.estado === "venta"
                    ? `${miles(m.precio)} monedas · ${quedan(m.queda)}`
                    : m.estado === "vendida"
                      ? `${miles(m.precio)} monedas · comprada por ${m.comprador ?? "un jugador"}`
                      : `${miles(m.precio)} monedas · nadie la compró`;
                return (
                  <div key={m.id} className={styles.jugador} style={marco("tarjeta", "var(--u)")}>
                    <IconoObjeto celda={obj.celda} k={2} />
                    <span className={styles.jugadorTexto}>
                      <strong>{obj.nombre}</strong>
                      <span>
                        <span
                          style={{
                            background: est.fondo,
                            color: "#f6eed6",
                            padding: "1px 6px",
                            fontWeight: 700,
                            marginRight: 6,
                          }}
                        >
                          {est.texto}
                        </span>
                        {meta}
                      </span>
                    </span>
                    <button
                      type="button"
                      className={styles.boton}
                      style={ocupado ? apagado : m.estado === "vendida" ? boton : secundario}
                      disabled={ocupado}
                      onClick={() =>
                        m.estado === "venta"
                          ? alRetirar(m.id)
                          : m.estado === "vendida"
                            ? alCobrar(m.id)
                            : alRepublicar(m.id)
                      }
                    >
                      {m.estado === "venta"
                        ? "Retirar"
                        : m.estado === "vendida"
                          ? `Cobrar ${miles(m.neto)}`
                          : "Volver a publicar"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
