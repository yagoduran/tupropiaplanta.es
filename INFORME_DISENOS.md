# Informe: diseños de Claude Design frente al juego (29/10/2026)

Revisados todos los archivos del zip `Tu Propia Planta diseños`. Esfuerzo: 🟢 pequeño (solo pantalla) · 🟡 medio (pantalla + base de datos) · 🔴 grande (sistema nuevo del juego).

## Ya hecho
Pantalla principal (estado, escena, acciones, modal), tienda, semillas, logros, ranking, ajustes, confirmar borrado, recompensa diaria, cosecha, planta muerta, aviso +18, login/registro, banner y configuración de cookies, textos legales (aviso, privacidad, condiciones), tutorial, tablet y móvil (barra inferior, banner, tooltip, gira el móvil), recompensa por anuncio, iconos, plagas, macetas, luces, efectos, gato, variedades, sonidos, **Mi perfil** y **Mis plantas** (hecho hoy).

## Entrada y páginas sueltas
✅ Hechas (29/10/2026): inicio (portada), 404, carga, sin conexión, mantenimiento y contacto (los mensajes se guardan en la tabla `tpp.contactos` de Supabase). La imagen para compartir y los iconos ya estaban puestos.

Interruptor de mantenimiento: en Vercel → Settings → Environment Variables, poner `MANTENIMIENTO=1` (y, si se quiere, `MANTENIMIENTO_HASTA=hoy a las 14:30`) y volver a desplegar; para quitarlo, borrar la variable y volver a desplegar.

✅ También hechas: recuperar contraseña, verificar email, bienvenida «Hola de nuevo» y sesión caducada.

Siguen pendientes:
| Pantalla | Esfuerzo | Nota |
|---|---|---|
| Temporadas (primavera, verano, otoño, invierno) | 🟢 | Dibujos ya en `public/assets/temporadas`; pensados para eventos |

## Progresión (juego nuevo, necesitan base de datos)
✅ Hechas: Inventario (huecos de cultivo y objetos) y Estadísticas (totales y gráficas; sin «horas jugadas», porque no se mide el tiempo de juego), ambas desde el menú de usuario.

✅ También hechas: Colección (12 variedades; 7 salen como «Próximamente» hasta que existan los cruces y los eventos), Títulos y marcos (los de cruces, maestría, eventos y prestigio quedan bloqueados) y Prestigio y Renacer (desde el nivel 20, 6 bonos permanentes; la llave de la azotea desbloquea la Azotea), Laboratorio de cruces (5 recetas fijas y híbridos propios con nombre), Maestría de variedad (10 niveles con medallas y bonos), Mejoras del armario (15 mejoras con efecto real) y Habitaciones (armario, sótano e invernadero; la azotea espera al prestigio; los huecos ahora salen de las habitaciones y de la mejora de Capacidad), y Desafíos semanales (4 desafíos con reglas propias: planta aparte que crece 3 veces más rápido, plazo de 5 a 7 días, una vez por semana y desafío, puntos y mejores marcas).

| Pantalla | Esfuerzo | Nota |
|---|---|---|

## Social (necesitan servidor y moderación)
Amigos, perfil público, visitas a otros cultivos, regalos, mercado, misiones, eventos, pase de temporada, notificaciones. 🔴 Todo. Antes habría que decidir privacidad y moderación (hay menores en colegios).
Los dibujos de **temporadas** (primavera, verano, otoño, invierno: ventana, luz, decoración) ya están en `public/assets/temporadas` pero no se usan: 🟢 aplicarlos según la fecha.

## Arte
✅ Plantas sin maceta, bombilla y luces nuevas, y crecimiento visible dentro de cada fase (hechos).

## Orden recomendado
1. ✅ Páginas sueltas (hechas).
2. Recuperar contraseña y verificar email.
3. Inventario, estadísticas, colección, títulos, desafíos.
4. Mejoras del armario, habitaciones, cruces, maestría, prestigio.
5. Social, al final y con decisiones de privacidad.
