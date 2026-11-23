import { HABITACIONES } from "./casa";
import type { PantallaJuego, PerfilJuego } from "./juego";
import { VARIEDADES } from "./variedades";

export interface Sugerencia {
  texto: string;
  boton: string;
  /** Pantalla a la que lleva el botón; "diaria" abre la entrada diaria. */
  destino: PantallaJuego | "diaria";
}

/** La siguiente cosa útil que puede hacer el jugador, sin contar lo que ya avisa la planta. Null si no hay nada. */
export function queHacer(perfil: PerfilJuego): Sugerencia | null {
  if (perfil.diaria.disponible) {
    return { texto: "Tienes tu entrada diaria sin recoger.", boton: "Recoger", destino: "diaria" };
  }
  if (perfil.misiones_listas > 0) {
    const n = perfil.misiones_listas;
    return {
      texto: n === 1 ? "Tienes una misión completada por reclamar." : `Tienes ${n} misiones completadas por reclamar.`,
      boton: "Reclamar",
      destino: "misiones",
    };
  }
  if (perfil.avisos > 0) {
    return {
      texto: perfil.avisos === 1 ? "Tienes un aviso sin leer." : `Tienes ${perfil.avisos} avisos sin leer.`,
      boton: "Ver avisos",
      destino: "avisos",
    };
  }
  const hab = HABITACIONES.filter((h) => !perfil.casa.habitaciones.includes(h.id) && h.nivel > perfil.nivel).sort(
    (a, b) => a.nivel - b.nivel,
  )[0];
  const variedad = VARIEDADES.filter((v) => v.nivel > perfil.nivel).sort((a, b) => a.nivel - b.nivel)[0];
  const proximo = [
    hab && { nivel: hab.nivel, texto: `la habitación «${hab.nombre}»` },
    variedad && { nivel: variedad.nivel, texto: `la variedad «${variedad.nombre}»` },
  ]
    .filter((x): x is { nivel: number; texto: string } => !!x)
    .sort((a, b) => a.nivel - b.nivel)[0];
  if (proximo) {
    return {
      texto: `En el nivel ${proximo.nivel} se abre ${proximo.texto}. Ahora estás en el ${perfil.nivel}.`,
      boton: "Ver tareas",
      destino: "misiones",
    };
  }
  return null;
}
