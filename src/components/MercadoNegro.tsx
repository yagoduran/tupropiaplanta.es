"use client";

import { useEffect, useState } from "react";
import { ORDEN_NEGRO, type DatosNegro } from "@/lib/clientes";
import { marco } from "@/lib/diseno";
import { cuentaAtras } from "@/lib/mercadoSemanal";
import { IconoEco, ObjetoNegroSprite, Retrato } from "./EcoSprites";
import styles from "./mercadoNegro.module.css";

interface Props {
  datos: DatosNegro | null;
  monedas: number;
  ocupado: boolean;
  alComprar: (id: string) => void;
  alInspeccion: (opcion: "multa" | "esconder" | "registrar") => void;
}

const miles = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const MULTA = 1500;

/** Mercado negro de El Topo, sospecha e inspección (8i, parte B). */
export function MercadoNegro({ datos, monedas, ocupado, alComprar, alInspeccion }: Props) {
  const [elegido, setElegido] = useState<string | null>(null);
  const [ahora, setAhora] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const tarjeta = marco("tarjeta", "var(--u)");
  const panel = marco("panel", "var(--u)");
  const dorado = marco("dorado", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const secundario = marco("boton_secundario", "var(--u)");
  const apagado = marco("boton_desactivado", "var(--u)");

  if (!datos) return <p className={styles.textoClaro}>Cargando…</p>;

  if (!datos.abierto) {
    return (
      <section className={styles.cerrado} style={panel}>
        <Retrato n={4} k={3} />
        <div>
          <strong>Aquí no hay nada</strong>
          <p className={styles.texto}>
            Cuando seas «Conocido en la calle» (1.500 de reputación global), alguien te dejará una nota debajo de la
            puerta.
          </p>
        </div>
        <IconoEco id="candado" k={2} />
      </section>
    );
  }

  const pasados = datos.recibido && ahora > datos.recibido ? Math.floor((ahora - datos.recibido) / 1000) : 0;
  const resta = (s: number) => Math.max(0, s - pasados);
  const cerrado = resta(datos.cerrado);
  const sel = datos.objetos.find((o) => o.id === elegido) ?? datos.objetos[0];
  const color = datos.sospecha >= 70 ? "#e04a3a" : datos.sospecha >= 40 ? "#e0a03a" : "#36a33b";
  const escondite = Object.entries(datos.escondite).filter(([, n]) => n > 0);
  const nombreDe = (id: string) => datos.objetos.find((o) => o.id === id)?.n ?? id.replaceAll("-", " ");
  const tieneMaceta = (datos.escondite["maceta-doble"] ?? 0) > 0;

  return (
    <div className={styles.contenedor}>
      <section className={styles.sospecha} style={dorado} aria-label="Sospecha">
        <div className={styles.cab}>
          <IconoEco id="riesgo" k={2} />
          <strong>Sospecha: {datos.sospecha} / 100</strong>
          <span className={styles.texto}>Baja 10 al día.</span>
        </div>
        <span className={styles.barra} aria-hidden>
          <span className={styles.relleno} style={{ width: `${datos.sospecha}%`, background: color }} />
        </span>
        {datos.antiolor > 0 && (
          <span className={styles.texto}>Bolsa antiolor activa: {cuentaAtras(resta(datos.antiolor))}</span>
        )}
      </section>

      {datos.inspeccion && (
        <section className={styles.inspeccion} style={panel} role="alertdialog" aria-label="Inspección">
          <div className={styles.cab}>
            <Retrato n={5} k={3} />
            <div>
              <strong>¡Inspección! Han llamado a tu puerta.</strong>
              <p className={styles.texto}>Decide rápido qué haces.</p>
            </div>
          </div>
          <div className={styles.opciones}>
            <button
              type="button"
              className={styles.accion}
              style={ocupado || monedas < MULTA ? apagado : boton}
              disabled={ocupado || monedas < MULTA}
              onClick={() => alInspeccion("multa")}
            >
              Pagar la multa ({miles(MULTA)}) · sospecha 20
            </button>
            <button
              type="button"
              className={styles.accion}
              style={ocupado || !tieneMaceta ? apagado : secundario}
              disabled={ocupado || !tieneMaceta}
              onClick={() => alInspeccion("esconder")}
            >
              Esconder en la maceta de doble fondo · sospecha 30
            </button>
            <button
              type="button"
              className={styles.accion}
              style={ocupado ? apagado : secundario}
              disabled={ocupado}
              onClick={() => alInspeccion("registrar")}
            >
              Dejar que registren: pierdes lo guardado y el mercado cierra 3 días
            </button>
          </div>
        </section>
      )}

      <section className={styles.topo} style={panel}>
        <Retrato n={4} k={3} />
        <div>
          <strong>El Topo</strong>
          <p className={styles.texto}>
            {cerrado > 0
              ? `Cerrado por el registro. Vuelve en ${cuentaAtras(cerrado)}.`
              : `La oferta cambia en ${cuentaAtras(resta(datos.queda))}. Cinco objetos por semana.`}
          </p>
        </div>
      </section>

      <div className={styles.cuerpo}>
        <ul className={styles.lista}>
          {datos.objetos.map((o) => {
            const agotado = o.quedan <= 0;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  className={styles.fila}
                  style={{ ...tarjeta, outline: sel?.id === o.id ? "3px solid #f4d36a" : undefined }}
                  aria-pressed={sel?.id === o.id}
                  onClick={() => setElegido(o.id)}
                >
                  <ObjetoNegroSprite n={ORDEN_NEGRO.indexOf(o.id as (typeof ORDEN_NEGRO)[number])} k={2} />
                  <span className={styles.nombre}>
                    <strong>{o.n}</strong>
                    <span>{o.tipo}</span>
                  </span>
                  <span className={styles.riesgo} aria-label={`Riesgo ${o.riesgo} de 3`}>
                    {[1, 2, 3].map((i) => (
                      <span key={i} className={styles.punto} style={{ opacity: i <= o.riesgo ? 1 : 0.2 }} />
                    ))}
                  </span>
                  <strong>{agotado ? "Agotado" : `${miles(o.precio)}`}</strong>
                </button>
              </li>
            );
          })}
        </ul>

        {sel && (
          <aside className={styles.detalle} style={tarjeta} aria-label="Detalle del objeto">
            <div className={styles.cab}>
              <ObjetoNegroSprite n={ORDEN_NEGRO.indexOf(sel.id as (typeof ORDEN_NEGRO)[number])} k={3} />
              <div>
                <strong>{sel.n}</strong>
                <p className={styles.texto}>{sel.tipo}</p>
              </div>
            </div>
            <p className={styles.texto}>{sel.d}</p>
            <p className={styles.texto}>
              Riesgo {sel.riesgo}/3: cada compra sube la sospecha {15 * sel.riesgo}
              {datos.antiolor > 0 ? ` (${Math.floor((15 * sel.riesgo) / 2)} con la bolsa antiolor)` : ""}.
            </p>
            <p className={styles.texto}>
              Quedan {sel.quedan} de {sel.stock} esta semana.
            </p>
            <button
              type="button"
              className={styles.accion}
              style={
                ocupado || sel.quedan <= 0 || cerrado > 0 || datos.inspeccion || monedas < sel.precio ? apagado : boton
              }
              disabled={ocupado || sel.quedan <= 0 || cerrado > 0 || datos.inspeccion || monedas < sel.precio}
              onClick={() => alComprar(sel.id)}
            >
              {monedas < sel.precio ? `Te faltan ${miles(sel.precio - monedas)}` : `Comprar por ${miles(sel.precio)}`}
            </button>
          </aside>
        )}
      </div>

      <section className={styles.escondite} style={tarjeta} aria-label="Tu escondite">
        <strong>Tu escondite</strong>
        {escondite.length === 0 ? (
          <span className={styles.texto}>Vacío.</span>
        ) : (
          <ul className={styles.guardados}>
            {escondite.map(([id, n]) => (
              <li key={id} className={styles.guardado}>
                <ObjetoNegroSprite n={ORDEN_NEGRO.indexOf(id as (typeof ORDEN_NEGRO)[number])} k={1} />
                {nombreDe(id)} ×{n}
              </li>
            ))}
          </ul>
        )}
        <span className={styles.texto}>Los efectos de estos objetos llegarán en una próxima actualización.</span>
      </section>
    </div>
  );
}
