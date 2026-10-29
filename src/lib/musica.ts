import type { Hora } from "./diseno";

/** Canciones del juego (nombres de archivo dentro de /assets/musica/). Mientras la lista esté vacía suena el ambiente. */
export const CANCIONES: string[] = [];

const AMBIENTE: Record<Hora, string> = {
  amanecer: "amb-pajaros-manana-loop",
  dia: "amb-pajaros-manana-loop",
  atardecer: "amb-habitacion-loop",
  noche: "amb-grillos-noche-loop",
};

let audio: HTMLAudioElement | null = null;
let volumen = 0.4;
let hora: Hora = "dia";
let cancion = 0;

function destino(): string {
  return CANCIONES.length
    ? `/assets/musica/${CANCIONES[cancion % CANCIONES.length]}`
    : `/assets/sonidos/${AMBIENTE[hora]}.mp3`;
}

function sonar() {
  if (!audio) return;
  const ruta = destino();
  if (!audio.src.endsWith(ruta)) audio.src = ruta;
  audio.loop = CANCIONES.length === 0;
  audio.volume = volumen;
  if (volumen > 0 && audio.paused) audio.play().catch(() => {});
}

/** Volumen de la música, de 0 a 100. Con 0 se para. */
export function fijarVolumenMusica(v: number) {
  volumen = Math.max(0, Math.min(100, v)) / 100;
  if (!audio) return;
  audio.volume = volumen;
  if (volumen <= 0) audio.pause();
  else sonar();
}

/** Empieza a sonar. Debe llamarse tras un gesto del jugador (los navegadores bloquean el sonido automático). */
export function iniciarMusica() {
  if (typeof Audio === "undefined") return;
  if (!audio) {
    audio = new Audio();
    audio.addEventListener("ended", () => {
      cancion += 1;
      sonar();
    });
  }
  sonar();
}

/** Cambia el ambiente cuando cambia el momento del día. */
export function cambiarMomento(nueva: Hora) {
  if (nueva === hora) return;
  hora = nueva;
  if (audio) sonar();
}

export function pausarMusica() {
  audio?.pause();
}

export function reanudarMusica() {
  sonar();
}
