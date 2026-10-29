# Informe: diseños de Claude Design frente al juego (29/10/2026)

Revisados todos los archivos del zip `Tu Propia Planta diseños`. Esfuerzo: 🟢 pequeño (solo pantalla) · 🟡 medio (pantalla + base de datos) · 🔴 grande (sistema nuevo del juego).

## Ya hecho
Pantalla principal (estado, escena, acciones, modal), tienda, semillas, logros, ranking, ajustes, confirmar borrado, recompensa diaria, cosecha, planta muerta, aviso +18, login/registro, banner y configuración de cookies, textos legales (aviso, privacidad, condiciones), tutorial, tablet y móvil (barra inferior, banner, tooltip, gira el móvil), recompensa por anuncio, iconos, plagas, macetas, luces, efectos, gato, variedades, sonidos, **Mi perfil** y **Mis plantas** (hecho hoy).

## Entrada y páginas sueltas (sin base de datos nueva)
| Pantalla | Esfuerzo | Nota |
|---|---|---|
| Inicio (portada para quien no ha entrado) | 🟢 | Ahora `/` lleva directo al login |
| Error 404 "Esta maceta está vacía" | 🟢 | Ahora sale el 404 genérico |
| Carga (pantalla mientras entra) | 🟢 | |
| Sin conexión | 🟢 | Ahora solo hay un aviso pequeño |
| Mantenimiento "Estamos regando los servidores" | 🟢 | |
| Contacto y problemas | 🟢 | Hay que decidir el correo de contacto |
| Recuperar contraseña | 🟡 | Usa el correo de Supabase |
| Verificar email | 🟡 | Hay que activar la confirmación en Supabase |
| Bienvenida ("¡Hola de nuevo!") y Sesión caducada | 🟢 | |
| Imagen para compartir | 🟢 | Imagen de la web al pegar el enlace |

## Progresión (juego nuevo, necesitan base de datos)
| Pantalla | Esfuerzo | Nota |
|---|---|---|
| Inventario | 🟡 | Ahora los objetos se ven dentro de la Tienda |
| Estadísticas | 🟡 | Parte ya está en Mi perfil |
| Colección y enciclopedia | 🟡 | Variedades descubiertas y datos |
| Títulos y marcos | 🟡 | Cosméticos que se desbloquean |
| Desafíos | 🟡 | Retos con recompensa |
| Mejoras del armario | 🔴 | Mejoras permanentes de la cámara |
| Habitaciones y expansión | 🔴 | Cambia lo de "ampliar casa" y los huecos |
| Laboratorio de cruces + resultado | 🔴 | Cruzar variedades (hay animaciones hechas) |
| Maestría de variedad | 🔴 | |
| Prestigio y confirmar renacer | 🔴 | Reiniciar a cambio de bonos |

## Social (necesitan servidor y moderación)
Amigos, perfil público, visitas a otros cultivos, regalos, mercado, misiones, eventos, pase de temporada, notificaciones. 🔴 Todo. Antes habría que decidir privacidad y moderación (hay menores en colegios).
Los dibujos de **temporadas** (primavera, verano, otoño, invierno: ventana, luz, decoración) ya están en `public/assets/temporadas` pero no se usan: 🟢 aplicarlos según la fecha.

## Pendientes de arte
Plantas sin maceta, bombilla nueva (prompt entregado) y crecimiento visible dentro de cada fase.

## Orden recomendado
1. Páginas sueltas (404, carga, sin conexión, mantenimiento, contacto, inicio, temporadas).
2. Recuperar contraseña y verificar email.
3. Inventario, estadísticas, colección, títulos, desafíos.
4. Mejoras del armario, habitaciones, cruces, maestría, prestigio.
5. Social, al final y con decisiones de privacidad.
