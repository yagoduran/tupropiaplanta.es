"use client";

import { duracionCorta, textoEfecto, type PerfilJuego } from "@/lib/juego";
import { OBJETO_POR_ID, usoDe } from "@/lib/tienda";
import { VARIEDAD_POR_ID } from "@/lib/variedades";
import { IconoObjeto } from "./IconoObjeto";
import styles from "./inventarioRapido.module.css";

interface Props {
  perfil: PerfilJuego;
  ocupado: boolean;
  alVender: (variedad: string, gramos: number | null) => void;
  alAbrirCompleto: () => void;
  alUsar: (id: string) => void;
  alEquipar: (id: string) => void;
  alIrAAbonos: () => void;
  alCerrar: () => void;
}

/** Vistazo rápido al inventario encima de la casa, sin cambiar de pantalla. */
export function InventarioRapido({
  perfil,
  ocupado,
  alVender,
  alAbrirCompleto,
  alUsar,
  alEquipar,
  alIrAAbonos,
  alCerrar,
}: Props) {
  const { inventario } = perfil;
  const gramos = Object.entries(perfil.almacen ?? {}).filter(([id, g]) => g > 0 && VARIEDAD_POR_ID[id]);
  const objetos = Object.entries(inventario)
    .filter(([id, n]) => n > 0 && OBJETO_POR_ID[id])
    .map(([id, n]) => ({ objeto: OBJETO_POR_ID[id], n }));
  const semillas = Object.entries(inventario)
    .filter(([id, n]) => n > 0 && id.startsWith("semilla:"))
    .map(([id, n]) => ({ id, n, nombre: VARIEDAD_POR_ID[id.split(":")[1]]?.nombre ?? id.split(":")[1] }));
  const vacio = gramos.length === 0 && objetos.length === 0 && semillas.length === 0;

  return (
    <section className={styles.panel} aria-label="Inventario rápido">
      <header className={styles.cabecera}>
        <h2 className={styles.titulo}>Inventario</h2>
        <button type="button" className={styles.cerrar} aria-label="Cerrar inventario" onClick={alCerrar}>
          ✕
        </button>
      </header>
      {vacio && <p className={styles.nota}>Todavía no tienes nada. Compra objetos en la Tienda.</p>}
      {gramos.length > 0 && (
        <div className={styles.bloque}>
          <p className={styles.subtitulo}>Gramos guardados</p>
          {gramos.map(([id, g]) => (
            <div key={id} className={styles.fila}>
              <span>
                {VARIEDAD_POR_ID[id].nombre} · <span className="numero">{g} g</span>
              </span>
              <button type="button" className={styles.boton} disabled={ocupado} onClick={() => alVender(id, null)}>
                Vender todo
              </button>
            </div>
          ))}
        </div>
      )}
      <p className={styles.nota}>
        Ánimo de la casa {perfil.animo ?? 0} · experiencia ×
        {(perfil.xp_mult ?? 1).toLocaleString("es-ES", { minimumFractionDigits: 2 })}
      </p>
      {(perfil.efectos ?? []).length > 0 && (
        <div className={styles.bloque}>
          <p className={styles.subtitulo}>Efectos activos</p>
          {(perfil.efectos ?? []).map((e, i) => {
            const t = textoEfecto(e);
            return (
              <p key={i} className={styles.fila}>
                <span style={{ color: t.bueno ? "#c9f26b" : "#f7b072" }}>{t.texto}</span>
                <span className="numero">{duracionCorta(e.resta)}</span>
              </p>
            );
          })}
        </div>
      )}
      {objetos.length > 0 && (
        <div className={styles.bloque}>
          <p className={styles.subtitulo}>Objetos</p>
          {objetos.map(({ objeto, n }) => {
            const uso = usoDe(objeto);
            const puesto = objeto.tipo === "decoracion" && perfil.equipo.decoracion.includes(objeto.id);
            const accion =
              uso === "casa"
                ? { texto: "Usar", hacer: () => alUsar(objeto.id) }
                : uso === "planta"
                  ? { texto: "Aplicar", hacer: alIrAAbonos }
                  : uso === "plaga"
                    ? { texto: "Tratar", hacer: () => alUsar(objeto.id) }
                    : objeto.tipo === "maceta"
                      ? { texto: "Poner", hacer: () => alEquipar(objeto.id) }
                      : objeto.tipo === "decoracion"
                        ? { texto: puesto ? "Quitar" : "Colocar", hacer: () => alEquipar(objeto.id) }
                        : null;
            return (
              <div key={objeto.id} className={styles.fila}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <IconoObjeto celda={objeto.celda} hoja={objeto.hoja} k={1} />
                  <span style={{ minWidth: 0 }}>
                    <strong>
                      {objeto.nombre} ×{n}
                      {puesto ? " · colocado" : ""}
                    </strong>
                    <br />
                    <small>{objeto.efecto}</small>
                  </span>
                </span>
                {accion && (
                  <button type="button" className={styles.boton} disabled={ocupado} onClick={accion.hacer}>
                    {accion.texto}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {semillas.length > 0 && (
        <div className={styles.bloque}>
          <p className={styles.subtitulo}>Semillas regaladas</p>
          {semillas.map((x) => (
            <p key={x.id} className={styles.fila}>
              <span>{x.nombre}</span>
              <span className="numero">×{x.n}</span>
            </p>
          ))}
        </div>
      )}
      <button type="button" className={styles.boton} onClick={alAbrirCompleto}>
        Abrir inventario completo
      </button>
    </section>
  );
}
