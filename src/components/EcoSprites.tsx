import { ICONO_ECO } from "@/lib/clientes";

export function IconoEco({ id, k = 2 }: { id: keyof typeof ICONO_ECO; k?: number }) {
  const f = (n: number) => `${n * k}px`;
  return (
    <span
      className="pixel"
      aria-hidden
      style={{
        display: "block",
        flex: "none",
        width: f(16),
        height: f(16),
        backgroundImage: "url(/assets/economia/tpp-eco-iconos-16-1x.png)",
        backgroundSize: `${f(256)} ${f(16)}`,
        backgroundPosition: `${f(-ICONO_ECO[id] * 16)} 0`,
      }}
    />
  );
}

export function IconoRango({ n, k = 2 }: { n: number; k?: number }) {
  const f = (v: number) => `${v * k}px`;
  return (
    <span
      className="pixel"
      aria-hidden
      style={{
        display: "block",
        flex: "none",
        width: f(16),
        height: f(16),
        backgroundImage: "url(/assets/economia/tpp-eco-rangos-16-1x.png)",
        backgroundSize: `${f(80)} ${f(16)}`,
        backgroundPosition: `${f(-n * 16)} 0`,
      }}
    />
  );
}

export function Retrato({ n, k = 2 }: { n: number; k?: number }) {
  const f = (v: number) => `${v * k}px`;
  return (
    <span
      className="pixel"
      role="img"
      aria-hidden
      style={{
        display: "block",
        flex: "none",
        width: f(32),
        height: f(32),
        backgroundImage: "url(/assets/economia/tpp-eco-retratos-1x.png)",
        backgroundSize: `${f(192)} ${f(32)}`,
        backgroundPosition: `${f(-n * 32)} 0`,
      }}
    />
  );
}

/** Objeto del mercado negro (hoja de 8 × 1, celdas de 32 px). */
export function ObjetoNegroSprite({ n, k = 2 }: { n: number; k?: number }) {
  const f = (v: number) => `${v * k}px`;
  return (
    <span
      className="pixel"
      aria-hidden
      style={{
        display: "block",
        flex: "none",
        width: f(32),
        height: f(32),
        backgroundImage: "url(/assets/economia/tpp-eco-negro-32-1x.png)",
        backgroundSize: `${f(256)} ${f(32)}`,
        backgroundPosition: `${f(-n * 32)} 0`,
      }}
    />
  );
}
