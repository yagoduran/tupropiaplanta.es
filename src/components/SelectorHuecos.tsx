import { marco } from "@/lib/diseno";
import { HUECO_DESAFIO, type HuecosJuego } from "@/lib/juego";
import styles from "./juego.module.css";

interface Props {
  huecos: HuecosJuego;
  ocupado: boolean;
  alElegir: (hueco: number) => void;
  alAmpliar: () => void;
}

/** Botones 1 / 2 / 3 sobre la escena para cambiar de planta. El siguiente hueco por comprar sale como "+" y el desafío en curso como "★". */
export function SelectorHuecos({ huecos, ocupado, alElegir, alAmpliar }: Props) {
  const activo = marco("boton", "var(--u)");
  const normal = marco("boton_secundario", "var(--u)");
  return (
    <nav className={styles.huecos} aria-label="Huecos de cultivo">
      {huecos.lista.map((h) => {
        const esActivo = h.hueco === huecos.activo;
        const aviso = !esActivo && (h.plaga || h.vida === "muerta");
        return (
          <button
            key={h.hueco}
            type="button"
            className={styles.hueco}
            style={esActivo ? activo : normal}
            disabled={ocupado}
            aria-current={esActivo ? "true" : undefined}
            aria-label={`Hueco ${h.hueco}${aviso ? ", necesita atención" : ""}`}
            onClick={() => alElegir(h.hueco)}
          >
            {h.hueco}
            {aviso && <span className={styles.huecoAviso} aria-hidden />}
          </button>
        );
      })}
      {(huecos.desafio || huecos.activo === HUECO_DESAFIO) && (
        <button
          type="button"
          className={styles.hueco}
          style={huecos.activo === HUECO_DESAFIO ? activo : normal}
          disabled={ocupado}
          aria-current={huecos.activo === HUECO_DESAFIO ? "true" : undefined}
          aria-label="Desafío en curso"
          onClick={() => alElegir(HUECO_DESAFIO)}
        >
          ★
        </button>
      )}
      {huecos.desbloqueados < huecos.maximo && (
        <button
          type="button"
          className={styles.hueco}
          style={normal}
          disabled={ocupado}
          aria-label="Conseguir más huecos"
          onClick={alAmpliar}
        >
          +
        </button>
      )}
    </nav>
  );
}
