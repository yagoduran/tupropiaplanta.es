"use client";

import { marco } from "@/lib/diseno";
import { AVATARES, avatarDe, type DatosPerfil } from "@/lib/perfil";
import { Icono } from "./Icono";
import { IconoObjeto } from "./IconoObjeto";
import styles from "./perfil.module.css";

interface Props {
  usuario: string;
  nivel: number;
  xp: number;
  xpPct: number;
  avatar?: string;
  datos: DatosPerfil | null;
  alElegirAvatar: (id: string) => void;
}

const numero = (n: number) => n.toLocaleString("es-ES", { useGrouping: "always" });

/** Mi perfil: avatar, nivel y estadísticas del jugador. */
export function Perfil({ usuario, nivel, xp, xpPct, avatar, datos, alElegirAvatar }: Props) {
  const tarjeta = marco("tarjeta", "var(--u)");
  const actual = avatarDe(avatar);
  const e = datos?.estadisticas;
  const desde = datos ? new Date(datos.desde).toLocaleDateString("es-ES", { month: "long", year: "numeric" }) : "";

  const estadisticas: { icono: React.ReactNode; valor: string; nombre: string }[] = [
    { icono: <IconoObjeto celda={[8, 5]} k={1} />, valor: e ? `${e.racha} días` : "–", nombre: "Racha actual" },
    { icono: <IconoObjeto celda={[3, 5]} k={1} />, valor: e ? numero(e.cosechas) : "–", nombre: "Plantas cosechadas" },
    { icono: <IconoObjeto celda={[0, 5]} k={1} />, valor: e ? numero(e.gastado) : "–", nombre: "Monedas gastadas" },
    { icono: <Icono id="regar" k={2} />, valor: e ? numero(e.riegos) : "–", nombre: "Riegos" },
    { icono: <Icono id="abonar" k={2} />, valor: e ? numero(e.abonos) : "–", nombre: "Abonos" },
    {
      icono: <IconoObjeto celda={[7, 5]} k={1} />,
      valor: e ? `${e.logros} / ${e.logros_total}` : "–",
      nombre: "Logros",
    },
  ];

  return (
    <div className={styles.contenedor}>
      <h1 className={styles.titulo}>Mi perfil</h1>
      <div className={styles.rejilla}>
        <section className={styles.tarjeta} style={tarjeta} aria-label="Jugador">
          <div className={styles.cabeza}>
            <IconoObjeto celda={avatarDe(avatar).celda} k={3} />
            <div>
              <p className={styles.nombre}>{usuario}</p>
              {desde && <p className={styles.pequeno}>Cultivando desde {desde}</p>}
            </div>
          </div>
          <div>
            <p className={styles.pequeno}>
              Nivel <strong className="numero">{nivel}</strong> · <span className="numero">{numero(xp)}</span> XP
            </p>
            <div className={styles.xp} role="progressbar" aria-valuenow={xpPct} aria-valuemin={0} aria-valuemax={100}>
              <div className={styles.xpRelleno} style={{ width: `${xpPct}%` }} />
            </div>
          </div>
          <p className={styles.subtitulo}>Elige tu avatar</p>
          <div className={styles.avatares}>
            {AVATARES.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`${styles.avatar} ${a.id === actual.id ? styles.avatarElegido : ""}`}
                aria-label={a.nombre}
                aria-pressed={a.id === actual.id}
                onClick={() => alElegirAvatar(a.id)}
              >
                <IconoObjeto celda={a.celda} k={1.5} />
              </button>
            ))}
          </div>
        </section>
        <section className={styles.tarjeta} style={tarjeta} aria-label="Estadísticas">
          <p className={styles.subtitulo}>Estadísticas</p>
          <div className={styles.estadisticas}>
            {estadisticas.map((s) => (
              <div key={s.nombre} className={styles.dato}>
                {s.icono}
                <span className={`${styles.valor} numero`}>{s.valor}</span>
                <span className={styles.pequeno}>{s.nombre}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
