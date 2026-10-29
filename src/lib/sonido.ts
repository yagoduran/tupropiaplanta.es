export type Efecto =
  | "regar"
  | "abonar"
  | "podar"
  | "ajustar-luz"
  | "cosechar"
  | "clic"
  | "pestana"
  | "error"
  | "moneda"
  | "notificacion"
  | "abrir-modal"
  | "cerrar-modal";

let volumen = 0.8;

/** Volumen de los efectos, de 0 a 100. */
export function fijarVolumenEfectos(v: number) {
  volumen = Math.max(0, Math.min(100, v)) / 100;
}

export function sonar(efecto: Efecto) {
  if (volumen <= 0 || typeof Audio === "undefined") return;
  const audio = new Audio(`/assets/sonidos/sfx-${efecto}.mp3`);
  audio.volume = volumen;
  audio.play().catch(() => {});
}
