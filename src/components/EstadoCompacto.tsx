import { marco } from "@/lib/diseno";
import { TONOS, type Medidor } from "@/lib/estado";
import { Icono } from "./Icono";
import styles from "./juego.module.css";

/** Estado de la planta en tarjetas pequeñas, para tablet y móvil. */
export function EstadoCompacto({ medidores }: { medidores: Medidor[] }) {
  const tarjeta = marco("tarjeta", "var(--u)");
  return (
    <div className={styles.compacto}>
      {medidores.map((m) => {
        const t = TONOS[m.tono];
        return (
          <div key={m.id} className={styles.tarjeta} style={tarjeta}>
            <Icono id={m.id} />
            <span className={styles.tarjetaNombre}>{m.nombreCorto ?? m.nombre}</span>
            <span className={`${styles.tarjetaValor} numero`} style={{ color: t.texto }}>
              {m.valorCorto ?? m.valor}
            </span>
            <span className={styles.miniBarra}>
              <span style={{ width: `${m.porcentaje}%`, background: t.relleno }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
