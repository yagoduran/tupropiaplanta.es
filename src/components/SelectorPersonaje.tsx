"use client";

import { marco } from "@/lib/diseno";
import {
  AVATAR_INICIAL,
  NOMBRES_COLOR_PELO,
  NOMBRES_COLOR_ROPA,
  NOMBRES_PELO,
  NOMBRES_ROPA,
  NOMBRES_TONO,
  type AvatarCasa,
} from "@/lib/casaIso";
import styles from "./selectorPersonaje.module.css";

const RUTA = "/assets/casa-iso/";

/** Personaje de frente, con sus capas: cuerpo, ropa y pelo. */
export function RetratoPersonaje({ avatar, tam = 3 }: { avatar: AvatarCasa; tam?: number }) {
  const capas = [
    ["tpp-avatar-cuerpo-32x48", avatar.tono * 4 + 1],
    ["tpp-avatar-ropa-32x48", (avatar.ropa * 4 + avatar.color_ropa) * 4 + 1],
    ["tpp-avatar-pelo-32x48", (avatar.pelo * 4 + avatar.color_pelo) * 4 + 1],
  ] as const;
  return (
    <span className={styles.retrato} style={{ width: 32 * tam, height: 48 * tam }} aria-hidden>
      {capas.map(([hoja, fila]) => (
        <span
          key={hoja}
          className="pixel"
          style={{
            backgroundImage: `url(${RUTA}${hoja}-1x.png)`,
            backgroundSize: `${352 * tam}px auto`,
            backgroundPosition: `0 ${-fila * 48 * tam}px`,
          }}
        />
      ))}
    </span>
  );
}

const OPCIONES: { clave: keyof AvatarCasa; nombre: string; valores: string[] }[] = [
  { clave: "tono", nombre: "Piel", valores: NOMBRES_TONO },
  { clave: "pelo", nombre: "Pelo", valores: NOMBRES_PELO },
  { clave: "color_pelo", nombre: "Color del pelo", valores: NOMBRES_COLOR_PELO },
  { clave: "ropa", nombre: "Ropa", valores: NOMBRES_ROPA },
  { clave: "color_ropa", nombre: "Color de la ropa", valores: NOMBRES_COLOR_ROPA },
];

/** Elige el aspecto del personaje de la casa. */
export function SelectorPersonaje({ avatar, alCambiar }: { avatar?: AvatarCasa; alCambiar: (a: AvatarCasa) => void }) {
  const actual = { ...AVATAR_INICIAL, ...avatar };
  const normal = marco("boton_secundario", "var(--u)");
  const activo = marco("boton", "var(--u)");
  return (
    <div className={styles.caja}>
      <RetratoPersonaje avatar={actual} />
      <div className={styles.opciones}>
        {OPCIONES.map((o) => (
          <div key={o.clave} className={styles.grupo} role="group" aria-label={o.nombre}>
            <span className={styles.nombre}>{o.nombre}</span>
            <div className={styles.fila}>
              {o.valores.map((v, i) => (
                <button
                  key={v}
                  type="button"
                  className={styles.boton}
                  style={actual[o.clave] === i ? activo : normal}
                  aria-pressed={actual[o.clave] === i}
                  onClick={() => alCambiar({ ...actual, [o.clave]: i })}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
