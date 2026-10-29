# Pendientes

## Diseños que faltan pedir a Claude Design
- **Plantas sin maceta (o con las 4 macetas).** Los sprites de la planta traen la maceta de terracota dibujada. Al ponerle encima otra maceta se ve una línea blanca fina (el contorno de la planta) en la tierra. La solución limpia es una hoja de planta sin maceta, o una hoja por cada maceta.
- **Lámpara de la escena apagada de noche** (opcional): la hoja de luces trae el sprite apagado, pero ahora la lámpara se dibuja siempre encendida.

## Funciones por hacer
- Huecos de cultivo múltiples ✅ (fase 7): hasta 3; hueco 2 = 2.500 monedas y nivel 8, hueco 3 = 10.000 y nivel 15 (tabla en `tpp.hueco_coste`). Mejoras posibles: dibujo propio de cada hueco, aviso del navegador por planta, logro por tener todos los huecos.
- Fase 5: ✅ logros y recompensa diaria (5a). ✅ ranking (5b). ✅ plagas (5c).
- Fase 6: ✅ anuncios de prueba + cookies (6a). ✅ música de fondo (6b). ✅ pulido final (6c): rendimiento, accesibilidad, errores de conexión. ✅ textos legales (falta rellenar los datos del titular).
- Objetos de la tienda ✅ (fase 8): medidor de pH, termómetro, radio y gato ya se venden y tienen efecto. Pendiente: que la radio cambie la música cuando haya canciones, el gato que huya cuando aparece una plaga (sonido y dibujo ya existen), y un logro para el gato.

## Infraestructura
- Dominios `.com`, `.store` e `.info`: configurar DNS en Cloudflare (el `.es` ya está).
- Dar de alta `https://tupropiaplanta.es/**` en Supabase → Redirect URLs.
- Cuando exista `main`, cambiarlo como rama de producción en Vercel.
- Registrar todo en Notion cuando el conector funcione.

## Anuncios reales
- ✅ Banners de Adsterra puestos (160x600 lateral y 320x50 móvil, claves en `src/lib/anuncios.ts`). Solo se cargan si el jugador acepta las cookies; van en un marco aislado.
- Pendiente: el botón de ayuda extra sigue con el anuncio de prueba (Adsterra no ofrece anuncio con recompensa). Opciones: dejarlo así o poner un banner 300x250 dentro de la ventana.
- Pendiente: vigilar qué anuncios salen (desactivar anuncios para adultos en Adsterra) y que no tapen el juego en PCs de colegio.
- El control de 3 ayudas al día se reinicia si el jugador usa "Borrar datos" (se borra su perfil).

## Textos legales
- ✅ Páginas hechas: `/aviso-legal`, `/privacidad`, `/condiciones` (y `/cookies`).
- **Pendiente (lo rellena el titular):** nombre o razón social, NIF/CIF, dirección y email en `src/lib/titular.ts`. Hasta entonces las páginas muestran "[pendiente de rellenar]", no salen en buscadores y no se enlazan desde el login ni desde Ajustes; al rellenar los cuatro datos aparecen los enlaces solos.
- Revisar los textos con un profesional antes de abrir al público (son una base sencilla, no asesoría legal).

## Música
- Ahora suena solo el ambiente (pájaros de día, habitación al atardecer, grillos de noche). Para añadir canciones: copiar los mp3 a `public/assets/musica/` y poner sus nombres en `CANCIONES` (`src/lib/musica.ts`); pasan a sonar una detrás de otra en lugar del ambiente.

## Ideas pendientes de plagas
- Dibujos propios de plaga/hongo por variedad (ahora se dibuja encima de cualquier planta).
- Notificación del navegador cuando aparezca una plaga.
- Logro de plagas eliminadas.
