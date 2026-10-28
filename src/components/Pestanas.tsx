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

export function Pestanas({ activa }: { activa: IdIcono }) {
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
            aria-current={esActiva ? "page" : undefined}
            className={styles.pestana}
            style={{ ...(esActiva ? seleccionada : normal), color: esActiva ? "#1c1626" : "#f6eed6" }}
          >
            <Icono id={p.id} />
            <span>{p.etiqueta}</span>
          </button>
        );
      })}
    </nav>
  );
}
