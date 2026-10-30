/** Dirección pública de la web, sin barra final. */
export function urlBase(): string {
  const dominio = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return dominio ? `https://${dominio}` : "https://tupropiaplanta.es";
}
