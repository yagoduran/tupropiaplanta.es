# Pendientes

## Diseños que faltan pedir a Claude Design
- **Plantas sin maceta (o con las 4 macetas).** Los sprites de la planta traen la maceta de terracota dibujada. Al ponerle encima otra maceta se ve una línea blanca fina (el contorno de la planta) en la tierra. La solución limpia es una hoja de planta sin maceta, o una hoja por cada maceta.
- **Lámpara de la escena apagada de noche** (opcional): la hoja de luces trae el sprite apagado, pero ahora la lámpara se dibuja siempre encendida.

## Funciones por hacer
- Huecos de cultivo múltiples (varias plantas a la vez): pendiente de decidir.
- Fase 5: plagas, logros, ranking, recompensa diaria.
- Fase 6: anuncios, música, ajustes finales.
- Objetos de la tienda sin efecto todavía (no se venden): medidor de pH, termómetro, pulverizador, fungicida, radio, gato.

## Infraestructura
- Dominios `.com`, `.store` e `.info`: configurar DNS en Cloudflare (el `.es` ya está).
- Dar de alta `https://tupropiaplanta.es/**` en Supabase → Redirect URLs.
- Cuando exista `main`, cambiarlo como rama de producción en Vercel.
- Registrar todo en Notion cuando el conector funcione.
