# Pendientes

## Diseños que faltan pedir a Claude Design
- **Plantas sin maceta (o con las 4 macetas).** Los sprites de la planta traen la maceta de terracota dibujada. Al ponerle encima otra maceta se ve una línea blanca fina (el contorno de la planta) en la tierra. La solución limpia es una hoja de planta sin maceta, o una hoja por cada maceta.
- **Lámpara de la escena apagada de noche** (opcional): la hoja de luces trae el sprite apagado, pero ahora la lámpara se dibuja siempre encendida.

## Funciones por hacer
- Huecos de cultivo múltiples (varias plantas a la vez): pendiente de decidir.
- Fase 5: ✅ logros y recompensa diaria (5a). ✅ ranking (5b). ✅ plagas (5c).
- Fase 6: ✅ anuncios de prueba + cookies (6a). ✅ música de fondo (6b). ✅ pulido final (6c): rendimiento, accesibilidad, errores de conexión. Pendiente de 6c: textos legales.
- Objetos de la tienda sin efecto todavía (no se venden): medidor de pH, termómetro, radio, gato.

## Infraestructura
- Dominios `.com`, `.store` e `.info`: configurar DNS en Cloudflare (el `.es` ya está).
- Dar de alta `https://tupropiaplanta.es/**` en Supabase → Redirect URLs.
- Cuando exista `main`, cambiarlo como rama de producción en Vercel.
- Registrar todo en Notion cuando el conector funcione.

## Anuncios reales (cuando haya cuenta de anuncios)
- Cambiar `AnuncioPrueba` por el anuncio con recompensa de la red elegida y rellenar los huecos de `Publicidad` y `BannerMovil`.
- Usar `leerEleccionCookies()` (`src/lib/cookies.ts`) para pedir anuncios personalizados solo si el jugador aceptó.
- Revisar el texto de `/cookies` con los nombres reales de las cookies de la red.
- El control de 3 ayudas al día se reinicia si el jugador usa "Borrar datos" (se borra su perfil).

## Textos legales (pendiente de decidir)
- Páginas de Aviso legal, Privacidad y Condiciones, enlazadas desde login y juego. Hacen falta los datos del titular (nombre o razón social, NIF/CIF, dirección, email de contacto), que serían públicos.

## Música
- Ahora suena solo el ambiente (pájaros de día, habitación al atardecer, grillos de noche). Para añadir canciones: copiar los mp3 a `public/assets/musica/` y poner sus nombres en `CANCIONES` (`src/lib/musica.ts`); pasan a sonar una detrás de otra en lugar del ambiente.

## Ideas pendientes de plagas
- Dibujos propios de plaga/hongo por variedad (ahora se dibuja encima de cualquier planta).
- Notificación del navegador cuando aparezca una plaga.
- Logro de plagas eliminadas.
