"use client";

import { marco, type IdIcono } from "@/lib/diseno";
import type { PerfilJuego, PlantaJuego } from "@/lib/juego";
import { CATALOGO } from "@/lib/tienda";
import { Icono } from "./Icono";
import { IconoObjeto } from "./IconoObjeto";
import styles from "./abonos.module.css";

interface Props {
  perfil: PerfilJuego;
  planta: PlantaJuego | null;
  ocupado: boolean;
  aviso?: { texto: string; icono: IdIcono } | null;
  alUsar: (id: string) => void;
  alTienda: () => void;
}

/** Fases en las que sirve cada abono; tiene que coincidir con `tpp.usar`. */
const FASES: Record<string, { texto: string; desde: number; hasta: number }> = {
  fert_generico: { texto: "Sirve en cualquier fase.", desde: 1, hasta: 8 },
  fert_crecimiento: { texto: "Ideal en crecimiento (fases 4 y 5).", desde: 4, hasta: 5 },
  fert_floracion: { texto: "Ideal en floración (fases 6 y 7).", desde: 6, hasta: 7 },
  fert_mejorador: { texto: "Una vez por planta, en cualquier fase.", desde: 1, hasta: 8 },
};

export function Abonos({ perfil, planta, ocupado, aviso, alUsar, alTienda }: Props) {
  const tarjeta = marco("tarjeta", "var(--u)");
  const boton = marco("boton", "var(--u)");
  const apagado = marco("boton_desactivado", "var(--u)");
  const viva = !!planta && planta.vida === "viva";
  const abonos = CATALOGO.filter((o) => o.categoria === "fertilizantes" && (perfil.inventario[o.id] ?? 0) > 0);

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Abonos</h1>
        {aviso && (
          <p className={styles.aviso} role="status">
            <Icono id={aviso.icono} />
            <span>{aviso.texto}</span>
          </p>
        )}
      </div>
      <p className={styles.ayuda}>
        Los abonos se aplican a tu planta, no desde la tienda. Cada uno sirve mejor en su fase. Si los nutrientes pasan
        del 90 %, la planta se quema.
      </p>
      {viva && planta.nutrientes > 80 && (
        <p className={styles.alerta} role="alert">
          Ahora mismo tiene {Math.round(planta.nutrientes)} % de nutrientes: si abonas, puede quemarse.
        </p>
      )}
      {abonos.length === 0 ? (
        <p className={styles.ayuda}>No tienes ningún abono. Los puedes comprar en la tienda.</p>
      ) : (
        <div className={styles.lista}>
          {abonos.map((o) => {
            const fases = FASES[o.id];
            const fueraDeFase = viva && !!fases && (planta.fase < fases.desde || planta.fase > fases.hasta);
            const activo = viva && !fueraDeFase && !ocupado;
            return (
              <article key={o.id} className={styles.tarjeta} style={tarjeta}>
                <IconoObjeto celda={o.celda} />
                <div className={styles.datos}>
                  <h3 className={styles.nombre}>{o.nombre}</h3>
                  <p className={styles.texto}>{o.efecto}</p>
                  <p className={styles.texto}>{fases?.texto}</p>
                  <p className={styles.cantidad}>Tienes {perfil.inventario[o.id]}</p>
                </div>
                <button
                  type="button"
                  className={styles.boton}
                  style={{ ...(activo ? boton : apagado), color: activo ? "#1c1626" : "#4b3a5e" }}
                  disabled={!activo}
                  onClick={() => alUsar(o.id)}
                >
                  {!viva ? "Sin planta" : fueraDeFase ? "Fase incorrecta" : "Aplicar"}
                </button>
              </article>
            );
          })}
        </div>
      )}
      <button type="button" className={styles.boton} style={marco("boton_secundario", "var(--u)")} onClick={alTienda}>
        Comprar más abonos
      </button>
    </div>
  );
}
