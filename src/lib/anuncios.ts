/** Espacios de anuncio de Adsterra. Estas claves son públicas: van dentro de la web. */
export const ANUNCIO_LATERAL = { clave: "83e7ad0396aec65bb0ca813735a9dfa8", ancho: 160, alto: 600 };
export const ANUNCIO_MOVIL = { clave: "9b4264fb839a6c7c3061b12204bdcb3e", ancho: 320, alto: 50 };

export interface EspacioAnuncio {
  clave: string;
  ancho: number;
  alto: number;
}

/** Página mínima que carga un banner de Adsterra dentro de su propio marco. */
export function paginaAnuncio({ clave, ancho, alto }: EspacioAnuncio): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent}</style></head><body>
<script>atOptions={'key':'${clave}','format':'iframe','height':${alto},'width':${ancho},'params':{}};</script>
<script src="https://bauval.org/22/${clave}"></script>
</body></html>`;
}
