import { haceCuanto, DESTINO_AVISO, type Notificacion } from "@/lib/misiones";
import type { PantallaJuego } from "@/lib/juego";
import { Icono } from "./Icono";
import { IconoSocial } from "./IconoSocial";
import styles from "./juego.module.css";

function IconoAviso({ tipo }: { tipo: Notificacion["tipo"] }) {
  if (tipo === "mision" || tipo === "encargo" || tipo === "disponible") return <IconoSocial id="mision" k={1.5} />;
  if (tipo === "amigo" || tipo === "visita") return <IconoSocial id="amigo" k={1.5} />;
  if (tipo === "evento") return <IconoSocial id="estrella_temporada" k={1.5} />;
  if (tipo === "pase") return <IconoSocial id="pase" k={1.5} />;
  if (tipo === "regalo") return <IconoSocial id="regalo" k={1.5} />;
  if (tipo === "mercado") return <IconoSocial id="mercado" k={1.5} />;
  if (tipo === "saludo") return <IconoSocial id="saludo" k={1.5} />;
  return (
    <Icono
      id={
        tipo === "sed" ? "agua" : tipo === "plaga" || tipo === "robo" ? "aviso" : tipo === "nivel" ? "nivel" : "logros"
      }
      k={2}
    />
  );
}

interface Props {
  lista: Notificacion[];
  /** Marca el aviso como leído y lleva a su pantalla. */
  alPulsar: (n: Notificacion, destino: PantallaJuego) => void;
}

/** Avisos del jugador: cada uno lleva a la pantalla donde se resuelve. */
export function ListaAvisos({ lista, alPulsar }: Props) {
  return lista.map((n) => (
    <button
      key={n.id}
      type="button"
      className={styles.aviso}
      style={{ background: n.leida ? "#f6eed6" : "#fff" }}
      onClick={() => alPulsar(n, DESTINO_AVISO[n.tipo])}
    >
      <IconoAviso tipo={n.tipo} />
      <span className={styles.avisoTexto}>
        <strong>{n.titulo}</strong>
        <span>{n.texto}</span>
        <span className={styles.avisoCuando}>{haceCuanto(n.hace)}</span>
      </span>
    </button>
  ));
}
