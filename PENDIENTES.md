# Pendientes

## Diseños que faltan pedir a Claude Design
- ✅ Plantas sin maceta, bombilla y luces nuevas: hechos (29/10/2026).
- ✅ Lámpara apagada de noche (21:00–06:00, hora del jugador): hecho.

## Funciones por hacer
- Huecos de cultivo múltiples ✅ (fase 7): hasta 3; hueco 2 = 2.500 monedas y nivel 8, hueco 3 = 10.000 y nivel 15 (tabla en `tpp.hueco_coste`). Mejoras posibles: ✅ mini planta de cada hueco en el selector (hecho), aviso del navegador por planta, logro por tener todos los huecos.
- Fase 5: ✅ logros y recompensa diaria (5a). ✅ ranking (5b). ✅ plagas (5c).
- Fase 6: ✅ anuncios de prueba + cookies (6a). ✅ música de fondo (6b). ✅ pulido final (6c): rendimiento, accesibilidad, errores de conexión. ✅ textos legales.
- Objetos de la tienda ✅ (fase 8): medidor de pH, termómetro, radio y gato ya se venden y tienen efecto. ✅ El gato huye mientras haya una plaga (con su sonido) y hay logro por acariciarlo 10 veces. Pendiente: que la radio cambie la música cuando haya canciones.

## Infraestructura
- Dominios `.com`, `.store` e `.info`: configurar DNS en Cloudflare (el `.es` ya está).
- Dar de alta `https://tupropiaplanta.es/**` en Supabase → Redirect URLs.
- Cuando exista `main`, cambiarlo como rama de producción en Vercel.
- Registrar todo en Notion cuando el conector funcione.

## Anuncios reales
- ✅ Banners de Adsterra puestos (160x600 lateral y 320x50 móvil, claves en `src/lib/anuncios.ts`). Solo se cargan si el jugador acepta las cookies; cada banner va en un marco que carga una página nuestra (`/anuncio/lateral` y `/anuncio/movil`) para que Adsterra vea la dirección del sitio. Esos marcos no están aislados de la web: opción más segura pendiente (subdominio aparte, `anuncios.tupropiaplanta.es`).
- Decidido: el botón de ayuda extra se queda con el anuncio de prueba (Adsterra no ofrece anuncios con recompensa).
- Hecho: anuncios para adultos desactivados en Adsterra. Pendiente: vigilar qué anuncios salen y que no tapen el juego en PCs de colegio.
- El control de 3 ayudas al día se reinicia si el jugador usa "Borrar datos" (se borra su perfil).

## Textos legales
- ✅ Páginas hechas: `/aviso-legal`, `/privacidad`, `/condiciones` (y `/cookies`). Enlaces visibles en el login y en Ajustes.
- Decidido: se publican solo nombre y email del titular (sin NIF ni dirección). La ley (LSSI) los pide si hay actividad económica con anuncios: si los ingresos crecen, pasar a una dirección profesional y poner `nif` y `direccion` en `src/lib/titular.ts`.
- Revisar los textos con un profesional antes de abrir al público (son una base sencilla, no asesoría legal).

## Música
- Canciones de Suno: de momento no se van a pagar. Prompts ya entregados (mañana, día, atardecer, noche). Cuando haya canciones: copiar los mp3 a `public/assets/musica/` y poner sus nombres en `CANCIONES`.
- Ahora suena solo el ambiente (pájaros de día, habitación al atardecer, grillos de noche). Para añadir canciones: copiar los mp3 a `public/assets/musica/` y poner sus nombres en `CANCIONES` (`src/lib/musica.ts`); pasan a sonar una detrás de otra en lugar del ambiente.

## Ideas pendientes de plagas
- ✅ Dibujos de plaga/hongo por variedad: hechos (5 hojas).
- ✅ Animación del cruce en el Laboratorio (probeta, capullo, destello): hecha.
- ✅ Avisos del navegador (sed, plaga, lista para cosechar): hechos; solo con el navegador abierto.
- ✅ Logros de plagas eliminadas (10 y 50) y de huecos (4 y 8): hechos.
