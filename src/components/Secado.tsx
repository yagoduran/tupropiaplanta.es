"use client";

import { useEffect, useRef, useState } from "react";
import { marco } from "@/lib/diseno";
import { Estrellas } from "./Estrellas";
import {
  ESTADO_TEXTO,
  columnaPercha,
  columnaTarro,
  conTiempo,
  familiaDe,
  tiempoCorto,
  type DatosSecado,
  type ItemSecado,
} from "@/lib/secado";
import { VARIEDAD_POR_ID } from "@/lib/variedades";
import styles from "./secado.module.css";

interface Props {
  datos: DatosSecado | null;
  ocupado: boolean;
  alSacar: (id: number, modo: "vender" | "guardar" | "tirar") => void;
  /** Devuelve el bonus (%) conseguido, o null si no se pudo abrir. */
  alAbrir: (id: number, humedad: number) => Promise<number | null>;
  alRecargar: () => void;
}

// Centros de las perchas y los tarros en la escena de 192 × 112 px de arte.
const PERCHAS = [24, 52, 81, 109, 138, 166];
const TARROS: [number, number][] = [
  [40, 50],
  [96, 50],
  [152, 50],
  [40, 104],
  [96, 104],
  [152, 104],
];

/** Bloque 8e: armario de secado (perchas), estante de tarros y minijuego de abrir el tarro. */
export function Secado({ datos, ocupado, alSacar, alAbrir, alRecargar }: Props) {
  const panel = marco("panel", "var(--u)");
  const tarjeta = marco("tarjeta", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");
  const [ahora, setAhora] = useState<number | null>(null);
  const [elegido, setElegido] = useState<number | null>(null);
  const [abriendo, setAbriendo] = useState<number | null>(null);

  useEffect(() => {
    const un = setTimeout(() => setAhora(Date.now()), 0);
    const t = setInterval(() => setAhora(Date.now()), 1000);
    const r = setInterval(alRecargar, 60000);
    return () => {
      clearTimeout(un);
      clearInterval(t);
      clearInterval(r);
    };
  }, [alRecargar]);

  if (!datos) {
    return (
      <div className={styles.contenedor}>
        <h1 className={styles.titulo}>Secado y curado</h1>
        <p className={styles.nota} style={{ color: "#f6eed6" }}>
          Cargando…
        </p>
      </div>
    );
  }

  const t = ahora && datos.recibido ? Math.max(0, (ahora - datos.recibido) / 1000) : 0;
  const items = datos.items.map((i) => conTiempo(i, t));
  const percha = (n: number) =>
    items.filter((i) => i.curar === 0 || i.estado === "secando").filter((_, k) => k === n)[0] ?? null;
  const tarro = (n: number) => items.filter((i) => i.curar > 0)[n] ?? null;
  const sel = items.find((i) => i.id === elegido) ?? null;
  const frameA = ahora && Math.floor(ahora / 1000) % 2 === 0 ? 0 : 1;

  return (
    <div className={styles.contenedor}>
      <h1 className={styles.titulo}>Secado y curado</h1>
      <div className={styles.escenas}>
        <section className={styles.bloque} style={panel} aria-label="Armario de secado">
          <p className={styles.subtitulo}>
            <span>Armario de secado</span>
            <span className="numero">
              {items.filter((i) => i.curar === 0 || i.estado === "secando").length}/{datos.capacidad} perchas
            </span>
          </p>
          <div className={styles.escena} style={{ backgroundPosition: `${frameA * 50}% 0` }}>
            {PERCHAS.slice(0, datos.capacidad).map((x, n) => {
              const i = percha(n);
              return (
                <Ranura
                  key={n}
                  item={i}
                  tipo="percha"
                  izq={(x - 16) / 192}
                  arriba={14 / 112}
                  etiqueta={`Percha ${n + 1}`}
                  elegido={i?.id === elegido}
                  alElegir={() => i && setElegido(i.id)}
                />
              );
            })}
          </div>
        </section>
        <section className={styles.bloque} style={panel} aria-label="Estante de tarros">
          <p className={styles.subtitulo}>
            <span>Estante de tarros</span>
            <span className="numero">
              {items.filter((i) => i.curar > 0).length}/{datos.capacidad} tarros
            </span>
          </p>
          <div className={styles.escena} style={{ backgroundPosition: "100% 0" }}>
            {TARROS.slice(0, datos.capacidad).map(([x, y], n) => {
              const i = tarro(n);
              return (
                <Ranura
                  key={n}
                  item={i}
                  tipo="tarro"
                  izq={(x - 16) / 192}
                  arriba={(y - 30) / 112}
                  etiqueta={`Tarro ${n + 1}`}
                  elegido={i?.id === elegido}
                  alElegir={() => i && setElegido(i.id)}
                />
              );
            })}
          </div>
        </section>
      </div>

      <section className={styles.ficha} style={tarjeta} aria-live="polite">
        {sel ? (
          <Ficha
            item={sel}
            ocupado={ocupado}
            boton={boton}
            secundario={secundario}
            alSacar={alSacar}
            alAbrir={() => setAbriendo(sel.id)}
          />
        ) : (
          <p className={styles.nota}>
            Toca una percha o un tarro. Cuando coseches, elige secar o curar y tu cosecha aparecerá aquí.
          </p>
        )}
      </section>

      {abriendo !== null && (
        <AbrirTarro
          item={items.find((i) => i.id === abriendo) ?? null}
          alAbrir={alAbrir}
          alCerrar={() => setAbriendo(null)}
        />
      )}
    </div>
  );
}

function Ranura({
  item,
  tipo,
  izq,
  arriba,
  etiqueta,
  elegido,
  alElegir,
}: {
  item: ItemSecado | null;
  tipo: "percha" | "tarro";
  izq: number;
  arriba: number;
  etiqueta: string;
  elegido: boolean;
  alElegir: () => void;
}) {
  const fila = item ? familiaDe(item.variedad) : 0;
  const col = tipo === "percha" ? columnaPercha(item) : columnaTarro(item);
  const cols = tipo === "percha" ? 6 : 9;
  const hoja = tipo === "percha" ? "perchas" : "tarros";
  const aviso =
    item &&
    (item.estado === "listo"
      ? tipo === "percha"
        ? 1
        : item.curar === 72
          ? 5
          : 0
      : item.estado === "moho"
        ? 3
        : item.estado === "reseca"
          ? 4
          : item.puede_abrir
            ? 2
            : -1);
  return (
    <>
      <button
        type="button"
        className={styles.ranura}
        style={{
          left: `${izq * 100}%`,
          top: `${arriba * 100}%`,
          backgroundImage: `url(/assets/secado/tpp-secado-${hoja}-32-1x.png)`,
          backgroundSize: `${cols * 100}% 500%`,
          backgroundPosition: `${(col / (cols - 1)) * 100}% ${(fila / 4) * 100}%`,
        }}
        aria-label={
          item
            ? `${etiqueta}: ${VARIEDAD_POR_ID[item.variedad]?.nombre ?? item.variedad}, ${ESTADO_TEXTO[item.estado]}`
            : `${etiqueta}: libre`
        }
        aria-pressed={elegido}
        disabled={!item}
        onClick={alElegir}
      />
      {aviso !== null && aviso !== undefined && aviso >= 0 && (
        <span
          className={styles.aviso}
          aria-hidden
          style={{
            left: `${(izq + (tipo === "percha" ? 8 / 192 : 20 / 192)) * 100}%`,
            top: `${(arriba + (tipo === "percha" ? 36 / 112 : -10 / 112)) * 100}%`,
            backgroundPosition: `${(aviso / 8) * 100}% 0`,
          }}
        />
      )}
    </>
  );
}

function Ficha({
  item,
  ocupado,
  boton,
  secundario,
  alSacar,
  alAbrir,
}: {
  item: ItemSecado;
  ocupado: boolean;
  boton: React.CSSProperties;
  secundario: React.CSSProperties;
  alSacar: (id: number, modo: "vender" | "guardar" | "tirar") => void;
  alAbrir: () => void;
}) {
  const nombre = VARIEDAD_POR_ID[item.variedad]?.nombre ?? item.variedad;
  const listo = item.estado === "listo" || item.estado === "reseca" || item.estado === "moho";
  const pasado = item.estado === "reseca" || item.estado === "moho";
  const nota =
    item.estado === "secando"
      ? `Sale de la percha en ${tiempoCorto(item.faltan_percha)}${item.curar ? " y pasa al tarro." : "."}`
      : item.estado === "curando"
        ? `Lista en ${tiempoCorto(item.faltan)}. ${item.aperturas_hechas}/${item.dias_curado} aperturas.`
        : item.estado === "listo"
          ? `Sácala en ${tiempoCorto(item.expira_en)}: después se estropea.`
          : item.estado === "reseca"
            ? "Se ha resecado: ×0,8 y una estrella menos."
            : "Tiene moho: ×0,5 y una estrella menos.";
  return (
    <>
      <p className={styles.fichaCabeza}>
        <span>
          {nombre} · {item.gramos} g
        </span>
        <span>{ESTADO_TEXTO[item.estado]}</span>
      </p>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Estrellas calidad={item.cal} k={1.5} />
        <span className="numero">
          ×{String(item.mult).replace(".", ",")}
          {item.bonus ? ` +${item.bonus} %` : ""} · {item.precio} monedas
        </span>
      </span>
      <p className={styles.nota}>{nota}</p>
      <div className={styles.botones}>
        {item.puede_abrir && (
          <button type="button" className={styles.boton} style={boton} disabled={ocupado} onClick={alAbrir}>
            Abrir el tarro
          </button>
        )}
        <button
          type="button"
          className={styles.boton}
          style={listo ? boton : secundario}
          disabled={ocupado || !listo}
          onClick={() => alSacar(item.id, "vender")}
        >
          Vender
        </button>
        <button
          type="button"
          className={styles.boton}
          style={secundario}
          disabled={ocupado || !listo}
          onClick={() => alSacar(item.id, "guardar")}
        >
          Guardar para encargos
        </button>
        {pasado && (
          <button
            type="button"
            className={styles.boton}
            style={secundario}
            disabled={ocupado}
            onClick={() => alSacar(item.id, "tirar")}
          >
            Tirar
          </button>
        )}
      </div>
    </>
  );
}

const HUMEDAD_INICIAL = 68;
const BAJADA = 4.5;

/** Mantén pulsado para abrir la tapa: la humedad baja; suelta entre 58 y 62 % para el mayor bonus. */
function AbrirTarro({
  item,
  alAbrir,
  alCerrar,
}: {
  item: ItemSecado | null;
  alAbrir: (id: number, humedad: number) => Promise<number | null>;
  alCerrar: () => void;
}) {
  const panel = marco("panel", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");
  const [humedad, setHumedad] = useState(HUMEDAD_INICIAL);
  const [pulsado, setPulsado] = useState(false);
  const [resultado, setResultado] = useState<{ bonus: number | null; humedad: number } | null>(null);
  const hum = useRef(HUMEDAD_INICIAL);

  useEffect(() => {
    if (!pulsado) return;
    let ultimo = performance.now();
    let id = requestAnimationFrame(function paso(n) {
      hum.current = Math.max(40, hum.current - ((n - ultimo) / 1000) * BAJADA);
      ultimo = n;
      setHumedad(hum.current);
      id = requestAnimationFrame(paso);
    });
    return () => cancelAnimationFrame(id);
  }, [pulsado]);

  if (!item) return null;
  const soltar = async () => {
    if (!pulsado || resultado) return;
    setPulsado(false);
    const h = Math.round(hum.current * 10) / 10;
    setResultado({ bonus: await alAbrir(item.id, h), humedad: h });
  };
  const pos = ((humedad - 40) / 40) * 100;
  const fila = familiaDe(item.variedad);
  const col = resultado ? 5 : pulsado ? (Math.floor(humedad) % 2 ? 4 : 5) : 3;
  return (
    <div className={styles.velo}>
      <div className={styles.juego} style={panel} role="dialog" aria-modal="true" aria-label="Abrir el tarro">
        <h2 className={styles.titulo} style={{ color: "#1c1626" }}>
          Abrir el tarro
        </h2>
        <span
          className={styles.tarro}
          aria-hidden
          style={{ backgroundSize: "900% 500%", backgroundPosition: `${(col / 8) * 100}% ${(fila / 4) * 100}%` }}
        />
        <div className={styles.medidor} role="img" aria-label={`Humedad ${humedad.toFixed(1)} %`}>
          <span className={styles.franjaAmarilla} style={{ left: "37.5%", width: "25%" }} />
          <span className={styles.franjaVerde} style={{ left: "45%", width: "10%" }} />
          <span className={styles.marca} style={{ left: `${pos}%` }} />
        </div>
        <p className="numero">{humedad.toFixed(1)} %</p>
        {resultado ? (
          <>
            <p className={styles.nota}>
              {resultado.bonus === null
                ? "No se ha podido abrir."
                : resultado.bonus > 0
                  ? `¡Bien! Humedad ${resultado.humedad} %: +${resultado.bonus} % de precio.`
                  : `Humedad ${resultado.humedad} %: sin bonus. Mañana puedes probar otra vez.`}
            </p>
            <button type="button" className={styles.mantener} style={boton} onClick={alCerrar}>
              Cerrar
            </button>
          </>
        ) : (
          <>
            <p className={styles.nota}>
              Mantén pulsado para abrir la tapa y suelta cuando la humedad esté en la franja verde (58–62 %). Amarilla:
              55–65 %.
            </p>
            <button
              type="button"
              className={styles.mantener}
              style={boton}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setPulsado(true);
              }}
              onPointerUp={soltar}
              onPointerCancel={soltar}
              onKeyDown={(e) => {
                if ((e.key === " " || e.key === "Enter") && !e.repeat) setPulsado(true);
              }}
              onKeyUp={(e) => {
                if (e.key === " " || e.key === "Enter") soltar();
              }}
            >
              {pulsado ? "Suelta…" : "Mantén pulsado"}
            </button>
            <button type="button" className={styles.mantener} style={secundario} onClick={alCerrar}>
              Saltar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
