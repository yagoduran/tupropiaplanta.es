import { FASES, marco } from "@/lib/diseno";
import { TONOS, type Medidor } from "@/lib/estado";
import { Icono } from "./Icono";
import styles from "./juego.module.css";

interface Props {
  medidores: Medidor[];
  tiempoDeVida: string;
  fase: number;
}

export function PanelEstado({ medidores, tiempoDeVida, fase }: Props) {
  const panel = marco("panel", "var(--u)");
  const barra = marco("barra", "var(--u)");

  return (
    <div className={styles.estado} style={panel}>
      <h2 className={styles.estadoTitulo}>Estado</h2>

      {medidores.map((m) => {
        const t = TONOS[m.tono];
        return (
          <div key={m.id} className={styles.medidor}>
            <Icono id={m.id} />
            <div className={styles.medidorCuerpo}>
              <div className={styles.medidorFila}>
                <span className={styles.medidorNombre}>
                  {m.nombreCorto ? (
                    <>
                      <span className={styles.nombreLargo}>{m.nombre}</span>
                      <span className={styles.nombreCorto}>{m.nombreCorto}</span>
                    </>
                  ) : (
                    m.nombre
                  )}
                </span>
                <span style={{ color: t.texto, fontWeight: 700 }}>{m.valor}</span>
              </div>
              <div className={styles.barra} style={barra}>
                <div
                  className={styles.barraRelleno}
                  style={{
                    width: `${m.porcentaje}%`,
                    background: t.relleno,
                    boxShadow: `inset 0 var(--u) 0 ${t.luz}, inset 0 calc(var(--u) * -1) 0 ${t.sombra}`,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}

      <div className={styles.separador} />

      <div className={styles.medidor}>
        <Icono id="tiempo" />
        <div className={styles.medidorCuerpo}>
          <span className={styles.estadoPequeno}>Tiempo de vida</span>
          <span className={styles.estadoValor}>{tiempoDeVida}</span>
        </div>
      </div>

      <div className={styles.medidor}>
        <Icono id="fase" />
        <div className={styles.medidorCuerpo}>
          <span className={styles.estadoPequeno}>Fase {fase}/8</span>
          <span className={styles.estadoValor}>{FASES[fase - 1]}</span>
          <div className={styles.pips}>
            {FASES.map((nombre, i) => (
              <span key={nombre} className={styles.pip} style={{ background: i < fase ? "#36a33b" : "#3a2418" }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
