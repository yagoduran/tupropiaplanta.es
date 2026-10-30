import { marco } from "@/lib/diseno";
import { HUECO_DESAFIO, type HuecosJuego } from "@/lib/juego";
import { hojaDe } from "@/lib/variedades";
import styles from "./juego.module.css";

interface Props {
  huecos: HuecosJuego;
  ocupado: boolean;
  alElegir: (hueco: number) => void;
  alAmpliar: () => void;
  maceta: string;
}

const MINI = 24;

/** Mini planta de un hueco: su variedad y fase sobre una maceta; vacío es solo la maceta. */
function MiniPlanta({
  variedad,
  fase,
  vida,
  maceta,
}: {
  variedad: string | null;
  fase: number | null;
  vida: string;
  maceta: string;
}) {
  const hoja = variedad ? hojaDe(variedad) : null;
  const columna = vida === "muerta" && (fase ?? 1) >= 3 ? 5 : 0;
  const columnaMaceta = ["maceta_plastico", "maceta_terracota", "maceta_tela", "maceta_ceramica"].indexOf(maceta);
  return (
    <span className={styles.miniPlanta} aria-hidden>
      {hoja && fase && (
        <span
          className="pixel"
          style={{
            backgroundImage: `url(/assets/sprites/tpp-variedad-${hoja}-1x.png)`,
            backgroundSize: `${6 * MINI}px ${8 * MINI}px`,
            backgroundPosition: `${-columna * MINI}px ${-(fase - 1) * MINI}px`,
            transform: "translateY(-6px)",
          }}
        />
      )}
      <span
        className="pixel"
        style={{
          backgroundImage: "url(/assets/sprites/tpp-macetas-1x.png?v=2)",
          backgroundSize: `${8 * MINI}px ${MINI}px`,
          backgroundPosition: `${-Math.max(0, columnaMaceta) * MINI}px 0`,
        }}
      />
    </span>
  );
}

/** Botones 1 / 2 / 3 sobre la escena para cambiar de planta. El siguiente hueco por comprar sale como "+" y el desafío en curso como "★". */
export function SelectorHuecos({ huecos, ocupado, alElegir, alAmpliar, maceta }: Props) {
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
            <MiniPlanta variedad={h.variedad} fase={h.fase} vida={h.vida} maceta={maceta} />
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
