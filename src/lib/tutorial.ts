import type { PlantaJuego } from "./juego";

const BASE: PlantaJuego = {
  id: "tutorial",
  variedad: "clasica",
  tipo: "foto",
  sexo: null,
  causa: null,
  vida: "viva",
  fase: 1,
  estado: "sana",
  agua: 78,
  nutrientes: 70,
  luz: 80,
  temperatura: 24,
  ph: 6.5,
  salud: 100,
  segundos_vida: 0,
  esperas: {},
  plaga: null,
  desafio: null,
};

/**
 * Planta de ejemplo para cada paso del tutorial. Solo se dibuja: las acciones del tutorial no llaman al servidor.
 * Del paso 7 en adelante se vuelve a ver la planta real.
 */
export function plantaTutorial(paso: number, real: PlantaJuego | null): PlantaJuego | null {
  switch (paso) {
    case 1:
      return null;
    case 2:
      return { ...BASE, fase: 1, agua: 32, nutrientes: 20, segundos_vida: 3600 };
    case 3:
      return { ...BASE, fase: 3, agua: 78, nutrientes: 20, segundos_vida: 86400 };
    case 4:
      return {
        ...BASE,
        fase: 5,
        estado: "plaga",
        salud: 80,
        segundos_vida: 129600,
        plaga: { tipo: "pulgon", grave: false },
      };
    case 5:
    case 6:
      return { ...BASE, fase: 8, estado: "sana", segundos_vida: 259200 };
    default:
      return real;
  }
}
