"use client";

import { useState } from "react";
import { marco } from "@/lib/diseno";
import { CLIENTES, TIPOS_ENCARGO, formatoTiempo, type DatosEncargos, type Encargo } from "@/lib/encargos";
import { Icono } from "./Icono";
import { RetratoCliente } from "./RetratoCliente";
import {
  ESTADOS,
  estadoVisual,
  miles,
  nombreVariedad,
  resumen,
  textoMensaje,
  textoTiempo,
  useSegundosTranscurridos,
} from "./encargosComun";
import styles from "./encargos.module.css";

interface Props {
  datos: DatosEncargos | null;
  ocupado: boolean;
  alEntregar: (id: string) => void;
  alAceptar: (id: string) => void;
  alRechazar: (id: string) => void;
}

type Pestana = "nuevos" | "curso" | "historial";

const POR: Record<string, string> = {
  "sin responder": "Caducó sin responder",
  "sin entregar": "Caducó sin entregar",
  cancelado: "Cancelado por ti",
};

/** Móvil del juego: mensajes de clientes que piden gramos de planta a cambio de monedas y XP. */
export function Encargos({ datos, ocupado, alEntregar, alAceptar, alRechazar }: Props) {
  const [pestana, setPestana] = useState<Pestana>("nuevos");
  const [elegido, setElegido] = useState<string | null>(null);
  const [detalleMovil, setDetalleMovil] = useState(false);
  const transcurridos = useSegundosTranscurridos(datos);
  const tarjeta = marco("tarjeta", "var(--u)");
  const panel = marco("panel", "var(--u)");
  const pestanaOff = marco("pestana", "var(--u)");
  const pestanaOn = marco("pestana_activa", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");
  const apagado = marco("boton_desactivado", "var(--u)");

  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Encargos</h1>
        <p className={styles.texto}>Cargando…</p>
      </div>
    );
  }

  const restan = (e: Encargo) => Math.max(0, e.restan - transcurridos);
  const abiertos = datos.lista.filter((e) => restan(e) > 0);
  const nuevos = abiertos.filter((e) => (e.estado ?? "aceptado") === "nuevo");
  const enCurso = abiertos.filter((e) => (e.estado ?? "aceptado") === "aceptado");
  const historial = datos.historial ?? [];
  const lista = pestana === "nuevos" ? nuevos : pestana === "curso" ? enCurso : [];
  const guardadas = Object.entries(datos.almacen).filter(([, g]) => g > 0);
  const e = abiertos.find((x) => x.id === elegido) ?? null;

  const pestanas: [Pestana, string, number][] = [
    ["nuevos", "Nuevos", nuevos.length],
    ["curso", "En curso", enCurso.length],
    ["historial", "Historial", historial.length],
  ];

  const detalle = (x: Encargo) => {
    const v = estadoVisual(x, restan(x));
    const nuevo = v === "nuevo";
    const tiene = Math.min(x.tengo, x.g);
    const listo = x.tengo >= x.g;
    const cliente = x.cliente !== undefined ? CLIENTES[x.cliente] : undefined;
    return (
      <div className={styles.detalle} style={panel}>
        <button type="button" className={styles.atras} onClick={() => setDetalleMovil(false)}>
          ‹ Encargo
        </button>
        <div className={styles.detalleCabeza}>
          <RetratoCliente cliente={x.cliente} k={3} />
          <div className={styles.detalleNombre}>
            <strong>{x.remite}</strong>
            <span>
              {cliente?.rol ?? "Cliente"} · {TIPOS_ENCARGO[x.tipo ?? "normal"].nombre}
            </span>
            <span className={styles.etiqueta} style={{ background: ESTADOS[v].fondo, borderColor: ESTADOS[v].borde }}>
              {ESTADOS[v].texto}
            </span>
          </div>
        </div>
        <p className={styles.mensaje}>«{textoMensaje(x)}»</p>
        <h3 className={styles.subtitulo}>Lo que pide</h3>
        <div className={styles.requisito}>
          <span className={styles.marca} style={{ background: listo ? "#c9f26b" : "#f7b072" }}>
            {listo ? "✓" : "!"}
          </span>
          <span className={styles.requisitoTexto}>
            <strong>{resumen(x)}</strong>
            <span style={{ color: listo ? "#1d6630" : "#b9512a" }}>Tienes {x.tengo} g</span>
          </span>
        </div>
        <div className={styles.pista} aria-hidden>
          <span
            className={styles.relleno}
            style={{
              width: `${Math.min(100, Math.round((tiene / x.g) * 100))}%`,
              background: listo ? "#36a33b" : "#e07b3f",
            }}
          />
        </div>
        <h3 className={styles.subtitulo}>Recompensa</h3>
        <div className={styles.premios}>
          <span>
            <Icono id="moneda" /> {miles(x.monedas)}
          </span>
          <span>
            <Icono id="nivel" /> +{miles(x.xp)} XP
          </span>
        </div>
        <div className={styles.relojes}>
          {nuevo ? (
            <>
              <span>Si no respondes, caduca en</span>
              <strong className={restan(x) < 1800 ? styles.parpadeo : undefined}>{formatoTiempo(restan(x))}</strong>
              <span>Si aceptas, tendrás para entregar</span>
              <strong>{TIPOS_ENCARGO[x.tipo ?? "normal"].plazo}</strong>
            </>
          ) : (
            <>
              <span>Tiempo para entregar</span>
              <strong className={v === "urge" ? styles.parpadeo : undefined}>{formatoTiempo(restan(x))}</strong>
            </>
          )}
        </div>
        <div className={styles.botones}>
          {nuevo ? (
            <>
              <button
                type="button"
                className={styles.accion}
                style={secundario}
                disabled={ocupado}
                onClick={() => alRechazar(x.id)}
              >
                Rechazar
              </button>
              <button
                type="button"
                className={styles.accion}
                style={boton}
                disabled={ocupado}
                onClick={() => alAceptar(x.id)}
              >
                Aceptar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.accion}
                style={listo ? boton : apagado}
                disabled={ocupado || !listo}
                onClick={() => alEntregar(x.id)}
              >
                {listo ? `Entregar ${x.g} g` : `Te faltan ${x.g - x.tengo} g`}
              </button>
              <button
                type="button"
                className={styles.accion}
                style={secundario}
                disabled={ocupado}
                onClick={() => alRechazar(x.id)}
              >
                Cancelar encargo
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Encargos</h1>
        <span className={styles.texto}>
          Los clientes te escriben. Acepta los que quieras y entrégalos antes de que se acabe el plazo.
        </span>
      </div>
      <p className={styles.texto}>
        <strong>Tu almacén:</strong>{" "}
        {guardadas.length === 0
          ? "todavía no tienes gramos. Cosecha una planta para conseguirlos."
          : guardadas.map(([v, g]) => `${nombreVariedad(v)}: ${miles(g)} g`).join(" · ")}
      </p>
      <div className={styles.pestanas} role="tablist">
        {pestanas.map(([id, texto, n]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pestana === id}
            className={styles.pestana}
            style={{ ...(pestana === id ? pestanaOn : pestanaOff), color: pestana === id ? "#1c1626" : "#f6eed6" }}
            onClick={() => {
              setPestana(id);
              setElegido(null);
              setDetalleMovil(false);
            }}
          >
            {texto} ({n})
          </button>
        ))}
      </div>
      <div className={`${styles.cuerpo} ${detalleMovil && e ? styles.conDetalle : ""}`}>
        <div className={styles.lista}>
          {pestana === "historial" ? (
            historial.length === 0 ? (
              <p className={styles.texto}>Todavía no hay encargos terminados.</p>
            ) : (
              historial.map((h) => (
                <article key={h.id} className={styles.tarjeta} style={tarjeta}>
                  <RetratoCliente cliente={h.cliente} k={2} apagado={h.estado === "caducado"} />
                  <span className={styles.tarjetaTexto}>
                    <strong>{h.remite}</strong>
                    <span>{resumen(h)}</span>
                    <span className={styles.tiempo}>
                      {h.estado === "entregado" ? "Recompensa cobrada" : (POR[h.por ?? ""] ?? "Caducado")}
                    </span>
                  </span>
                  {h.estado === "entregado" && <span className={styles.premio}>+{miles(h.monedas)}</span>}
                </article>
              ))
            )
          ) : lista.length === 0 ? (
            <p className={styles.texto}>
              {pestana === "nuevos"
                ? `No tienes mensajes nuevos.${datos.siguiente_en !== null ? ` Llegan encargos nuevos cada 3 horas; el próximo en ${formatoTiempo(Math.max(0, datos.siguiente_en - transcurridos))}.` : ""}`
                : "No tienes encargos en curso. Acepta alguno de los nuevos."}
            </p>
          ) : (
            lista.map((x) => {
              const v = estadoVisual(x, restan(x));
              return (
                <button
                  key={x.id}
                  type="button"
                  className={styles.tarjeta}
                  style={{ ...tarjeta, outline: elegido === x.id ? "3px solid #f4d36a" : undefined }}
                  onClick={() => {
                    setElegido(x.id);
                    setDetalleMovil(true);
                  }}
                >
                  <RetratoCliente cliente={x.cliente} k={2} />
                  <span className={styles.tarjetaTexto}>
                    <strong>{x.remite}</strong>
                    <span>{resumen(x)}</span>
                    <span className={`${styles.tiempo} ${v === "urge" ? styles.parpadeo : ""}`}>
                      {textoTiempo(x, restan(x))}
                    </span>
                  </span>
                  <span
                    className={styles.etiqueta}
                    style={{ background: ESTADOS[v].fondo, borderColor: ESTADOS[v].borde }}
                  >
                    {ESTADOS[v].texto}
                  </span>
                </button>
              );
            })
          )}
        </div>
        {pestana !== "historial" && (
          <div className={styles.lado}>
            {e ? detalle(e) : <p className={styles.texto}>Elige un encargo de la lista.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
