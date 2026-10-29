import { marco, type IdIcono } from "@/lib/diseno";
import { Icono } from "./Icono";
import styles from "./juego.module.css";

const PESTANAS: { id: IdIcono; etiqueta: string }[] = [
  { id: "cultivo", etiqueta: "Cultivo" },
  { id: "tienda", etiqueta: "Tienda" },
  { id: "semillas", etiqueta: "Semillas" },
  { id: "logros", etiqueta: "Logros" },
  { id: "ranking", etiqueta: "Ranking" },
  { id: "ajustes", etiqueta: "Ajustes" },
];

interface Props {
  activa: IdIcono;
  alElegir: (id: IdIcono) => void;
  /** Pestaña con una novedad pendiente. */
  marcada?: IdIcono;
}

export function Pestanas({ activa, alElegir, marcada }: Props) {
  const normal = marco("pestana", "var(--u)");
  const seleccionada = marco("pestana_activa", "var(--u)");
  return (
    <nav className={styles.pestanas} aria-label="Secciones del juego">
      {PESTANAS.map((p) => {
        const esActiva = p.id === activa;
        return (
          <button
            key={p.id}
            type="button"
            data-tut={`pestana-${p.id}`}
            aria-current={esActiva ? "page" : undefined}
            onClick={() => alElegir(p.id)}
            className={`${styles.pestana} ${p.id === "ajustes" ? styles.soloEscritorio : ""}`}
            style={{ ...(esActiva ? seleccionada : normal), color: esActiva ? "#1c1626" : "#f6eed6" }}
          >
            <Icono id={p.id} />
            <span>{p.etiqueta}</span>
            {p.id === marcada && <span className={styles.punto} role="img" aria-label="novedad" />}
          </button>
        );
      })}
    </nav>
  );
}
