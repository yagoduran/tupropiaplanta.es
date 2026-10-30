# Tu Propia Planta — resumen del juego (para consultar a otra IA)

Estado a 30-10-2026. Todo lo de abajo es lo que existe ahora mismo, con las cifras reales del código y de la base de datos.
Al final hay una lista de lo que falta y de las dudas, para pedir ideas.

## 1. Qué es

Juego web de cultivo de plantas en pixel art, solo para mayores de 18 años (tupropiaplanta.es). Se juega en el navegador, en el móvil y en el PC. Cada jugador tiene una habitación con una planta (o varias, según huecos) que crece en tiempo real aunque no esté conectado. Se cuida, se cosecha, se vende o se guarda para encargos, y se sube de nivel.

- Tecnología: Next.js 16 + React 19, Supabase (base de datos y acceso), Vercel (alojamiento).
- Todo el cálculo importante ocurre en el servidor (funciones de base de datos). El navegador solo pinta y pide acciones.
- Ingresos: anuncios (Adsterra, banner lateral y móvil, más «ver anuncio de ayuda») y donaciones.

## 2. El ciclo de una planta

1. **Plantar**: se elige variedad (según nivel) y tipo de semilla.
2. **Crecer**: la planta vive por «horas vividas». Pasa por 8 fases.
3. **Cuidar**: regar, abonar, podar; vigilar plagas y estado.
4. **Cosechar** en la fase 8. Se obtiene una cosecha pendiente que hay que **vender** (monedas) o **guardar** (gramos para encargos).
5. Se puede plantar otra. Si la planta muere hay una recuperación gratis al día (ver 6).

### Fases (horas vividas necesarias)

| Fase | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 (cosecha) |
|---|---|---|---|---|---|---|---|---|
| Desde | 0 h | 2,4 h | 8,4 h | 20,4 h | 32,4 h | 48 h | 60 h | 72 h |

- Esas horas se dividen por el **ciclo** de la variedad (1,0 a 1,55) y por 0,65 en semillas automáticas. Es decir: variedad clásica fotoperiodo = 72 h; automática = 47 h; Aurora (ciclo 1,55) = 112 h; Aurora automática ≈ 73 h.
- Las horas vividas avanzan más lento si hay calor/pH malos (×0,85 cada uno) y más rápido con mejoras de luz (+5/10/20 %) o invernadero (+15–30 %).
- El servidor recalcula hasta **72 h** de ausencia de golpe al volver. En pasos de 15 min.

### Tipos de semilla

| Tipo | Coste | Efecto |
|---|---|---|
| Fotoperiodo (foto) | 0 | 50 % macho (el macho se cosecha en fase 6 y paga ×0,2) |
| Automática (auto) | 60 | ciclo ×0,65, recompensa ×0,8, 50 % macho |
| Feminizada (fem) | 150 | siempre hembra |
| Auto feminizada (autofem) | 250 | siempre hembra, ciclo ×0,65, recompensa ×0,8 |

(Las cifras 60/150/250, ×0,65 y ×0,8 las decidí yo al montarlo: pendientes de confirmar.)

## 3. Estado de la planta y cuidados

Cada planta tiene: agua, nutrientes, luz, pH, temperatura, salud (0–100), plaga.

Consumo por hora (se multiplica por el desgaste de la variedad y por los objetos): agua −1,5/h, nutrientes −0,8/h, luz −0,5/h. En fases 1–2 solo gasta el 40 %; en fases 6–7 el 130 %.

- **Luz**: ahora **fija** (ciclo de luz eliminado). Una luz encendida aporta +2,5/h.
- **Temperatura**: 23 ± 4 °C según la hora (más calor con bombilla +4 o fluorescente +2; LED pro −1). Fuera de 18–30 °C el crecimiento va ×0,85.
- **pH**: tiende solo a 6,5. Regar lo sube +0,15 y abonar lo baja −0,25. Fuera de 5,8–7,4 crecimiento ×0,85.
- **Salud**: baja −2/h si agua <15, nutrientes <10 o luz <10; −1/h si agua >95 (ahogo) o nutrientes >90 (quemada). Sube +0,5/h si agua ≥40, nutrientes ≥30, luz ≥30 y sin plaga. A 0 la planta muere.
- **Protección al volver**: si has estado fuera más de 10 minutos, la salud no baja de 25 por una ausencia.

### Acciones (con espera entre usos)

| Acción | Espera | Efecto | Recompensa |
|---|---|---|---|
| Regar | 5 min | agua +50, pH +0,15 | 5 XP, +2 monedas si agua <90 |
| Abonar | 30 min | nutrientes +20, pH −0,25 | 5 XP, +5 monedas si nutrientes <80 |
| Podar | 1 h (desde fase 3) | salud +10 (+15 con tijeras) | 5 XP, +8 monedas |
| Cosechar | — | solo fase 8 (macho fase 6) | ver cosecha |

Ver un anuncio de ayuda (hasta 3 al día) da +25 monedas y **reinicia todas las esperas**.

### Plagas (reducidas un 70 % recientemente)

- Tipos: pulgón, araña, mosca, caracol, oruga (más moho si el agua >85).
- Aparecen desde la fase 3. Probabilidad aproximada por hora: 0,3 % si la planta está bien cuidada y 2,7 % si no (ya con el recorte del 70 % aplicado).
- Una plaga hace −1 salud/h; pasadas **6 h** hace −2,5/h.
- Se tratan con pulverizador (bichos) o fungicida (moho). Gato decorativo −30 % de aparición; sótano y maestría también reducen.
- Las orugas se ven pequeñas y se mueven por la planta (cambio reciente).

## 4. Cosecha: monedas, gramos y XP

- Monedas de la cosecha: `(60 + salud) × (1 + bonus) × recompensa de la variedad × tipo × maestría × mejoras × prestigio`. Una clásica con salud 100 da unas **160 monedas**.
- Gramos: `20 × recompensa × salud/100` (clásica sana = 20 g; Aurora ≈ 68 g).
- XP de cosecha: ≈ 25 × (1 + sabor/1000), con bonos de radio, maestría y prestigio.
- La cosecha queda **pendiente** y se elige:
  - **Vender**: cobras las monedas ya.
  - **Guardar**: los gramos van al **almacén** (Inventario → «Gramos guardados»).
- En el Inventario, los gramos se pueden **vender a 6 monedas/g × el valor de la variedad** (clásica 6, hoja azul 8, dorada 10, noche 13, cristal 18, aurora 20; botones «Vender 10 g» y «Vender todo») o guardar para encargos.
- **Comparación**: 20 g de clásica vendidos a 6 monedas = 120; la misma cosecha vendida en el momento = 160; usada en un encargo = 10 monedas/g (normal), 15 (urgente) o 12 (grande), es decir ~200, ~300 o ~240 por cada 20 g de clásica. Guardar para encargos es lo que más paga, pero tarda y caduca.
- Un hito de maestría sube con cada cosecha (+100 + salud).

## 5. Variedades (16, por rareza)

| Variedad | Rareza | Nivel | Ciclo | Recomp. | Desgaste | Sabor |
|---|---|---|---|---|---|---|
| Clásica | común | 1 | 1,0 | 1,0 | 1,0 | 50 |
| Hoja azul | poco común | 3 | 1,0 | 1,3 | 1,0 | 66 |
| Dorada | rara | 6 | 1,15 | 1,7 | 1,0 | 80 |
| Noche | épica | 10 | 1,3 | 2,2 | 1,2 | 92 |
| Cristal | legendaria | 15 | 1,5 | 3,0 | 1,3 | 95 |

Las demás son **híbridas** (se consiguen cruzando o por premios, no se compran) y **ediciones de temporada** (ver 9): Aurora (legendaria, 3,4), Ámbar antiguo (2,0), Escarcha azul (2,6), Sol de medianoche (2,4), Menta nocturna (1,6), Brisa dorada (1,5), Verde azulado (1,15) y las 4 ediciones `ed-*`.

- Más recompensa = más exigente: «desgaste» alto gasta más agua, nutrientes y luz.
- **Maestría** por variedad: 10 niveles, XP `60 × (nivel−1)² × factor de rareza`, con bonos por nivel (menos agua, menos plagas, +2 % y +5 % monedas, +5 % XP, sabor...).
- **Cruces**: se cruzan dos variedades (iniciar, acelerar, abrir) para obtener una híbrida.

## 6. Progresión

- **Nivel** = `1 + floor(√(XP / 25))`. Nivel 5 = 400 XP, 10 = 2.025 XP, 20 = 9.025 XP, 30 = 21.025 XP.
- **Huecos de cultivo**: 1 gratis; 2.º nivel 8 (2.500); 3.º nivel 15 (10.000). Se desbloquean solos (el botón de comprar hueco ya no existe, es automático por nivel). Los logros hablan de hasta 8 huecos.
- **Habitaciones**:

| Habitación | Nivel | Huecos | Precio |
|---|---|---|---|
| Armario | 1 | 2 | 0 |
| Sótano | 15 | 4 | 5.000 |
| Invernadero | 25 | 6 | 15.000 |
| Azotea | 35 | 8 | 40.000 |

  Bonos: sótano reduce plagas, armario ahorra nutrientes, invernadero acelera el crecimiento, azotea sube las monedas (+20 % a +40 %).
- **Mejoras** (3 niveles cada una, con nivel y precio): capacidad, luz, seguridad, sensores, ventilación, riego automático y mejoras propias de cada habitación. Precios entre 500 y 80.000.
  - Ejemplos: Riego automático 600/2.000/5.000 (niveles 6/15/25); Ventilación 500/1.500/4.000 (reduce moho); Seguridad 900/3.000/7.500 (reduce robos).
- **Recuperar planta muerta**: 1 vez al día, vuelve con salud 50.
- **Prestigio (renacer)**: desde nivel 20, se reinicia (pierdes monedas, mejoras, habitaciones y plantas) y se ganan puntos: `0,36×nivel + 0,57×variedades + 0,67×legendarias`. Con los puntos se compran bonos permanentes: +5 % monedas (2), +10 % XP (2), cruce rápido (4), sótano (6), riego infinito (10) y una «llave» (12, sin efecto confirmado). Se conservan variedades, maestrías y bonos.

## 7. Economía

- **Tienda** (con nivel mínimo en algunos): macetas (plástico 0, terracota 300, tela 1.600, cerámica 2.400 nivel 12), luces (bombilla 0, fluorescente 450, LED 1.800, LED pro 4.500 nivel 15), abonos (básico 80, crecimiento 220, floración 1.400, mejorador 900 nivel 10), pulverizador 120, fungicida 150, herramientas (tijeras 350, medidor pH 400, termómetro 350), decoración (póster 150, planta de adorno 260, radio 600, gato 1.500 nivel 10).
  - Macetas reducen el gasto de agua/nutrientes (hasta −15 %); luces reducen el desgaste de luz (hasta −45 %).
- **Mercado entre jugadores**: se publica un objeto de la tienda entre 50 % y 500 % de su precio base, 3 días en venta, máximo 10 ofertas activas, máximo 10 compras al día, comisión del 5 % para el vendedor. El Mercado muestra el precio medio de los objetos similares.
- **Regalo diario**: 7 días de racha: 20, 30, 40, 50, 60, 80, 100 monedas. Si falta un día, vuelve al día 1.
- **Anuncios de ayuda**: 3 al día, +25 monedas y reinicia esperas.
- **Robos**: al volver, 25 % de probabilidad (si tienes ≥100 monedas y has hecho el tutorial) de que te roben entre 10 y 500 monedas (5–10 % del saldo). La mejora de seguridad lo baja a 12,5 %, 6 % o 0.

## 8. Encargos (móvil)

- Hasta 3 a la vez. Llega uno nuevo cada **2 h** como máximo, si hay hueco.
- Variedades pedidas: la clásica y las que ya has plantado.
- 36 remitentes y 20 mensajes distintos, tres tipos:

| Tipo | Probabilidad | Gramos | Caduca | Paga |
|---|---|---|---|---|
| Normal | 65 % | 20–60 | 24 h | `g × 10 × recompensa` |
| Urgente | 20 % | 20–40 | 8 h | ×1,5 |
| Grande | 15 % | 60–120 | 48 h | ×1,2 |

- Se entrega con gramos del almacén. Da monedas, XP, 30 puntos de pase y cuenta para misiones.
- Hoy el encargo se aparece solo: no se puede **aceptar ni rechazar** (pendiente de rediseño).

## 9. Misiones, eventos y pase

- **Misiones**: 50 definidas (30 diarias y 20 semanales). Cada día aparecen **4 diarias** al azar (una por tipo de acción) y cada semana **3 semanales**. Se reinician a las 00:00 Madrid (semanales: lunes).
  - Premios diarios: 25–160 monedas o 25–120 XP. Semanales: 150–800 monedas o 150–500 XP.
- **Eventos de temporada** (4 al año): primavera (20 mar–20 abr), verano (21 jun–21 jul), otoño (22 sep–20 nov), invierno (21 dic–20 ene). Cada uno tiene 3 misiones propias, una variedad de edición limitada, una maceta y una decoración exclusivas, y un **pase** de 30 niveles con pista gratuita y pista de evento.
  - Pista gratis: monedas (50 + 10×nivel), cofre de 500 cada 10 niveles, XP, abonos.
  - Pista de evento: XP/monedas, maceta (nivel 20), marco (15), semilla de edición (25), título (30), decoración (10).
  - Se suman puntos de pase al cosechar (50) y entregar encargos (30).
- **Desafíos** (4): Noche (7 días, ×3), Reloj (5 días, ×2), Plagas (7 días, ×4), Sequía (7 días, ×3). En un hueco especial, la planta crece ×3 más rápida con una dificultad extra; si se pasa el límite muere. Pagan `170 × multiplicador` monedas.
- **Logros**: 17 con medallas (bronce/plata/oro) que dan monedas.

## 10. Social

- Amigos (límite configurable), solicitudes, bloqueos.
- Visitar la planta de un amigo, regarla, dejarle un saludo con emoji (8 emojis).
- Regalos: 3 al día (50 monedas, agua extra, un abono).
- Ranking (por ámbito, período y métrica) y perfil público (medallas destacadas, variedad favorita, racha semanal, mejor cosecha, días jugados, amigos, fecha de inicio).
- Notificaciones (sed, plaga, encargo, robo, mercado...).

## 11. Interfaz y otros

- Un único juego que sirve para escritorio y móvil. Menú lateral con las secciones, avisos arriba, pantalla de carga, tutorial con pasos, ajustes, cookies, música y sonido.
- Cookies con aviso y enlaces legales en el pie.
- Gato mascota que se acaricia (logro) y baja las plagas.
- Estética pixel art con marcos, botones con efecto de pulsado.

## 12. Lo que falta o está flojo (para pedir opinión)

1. **Entretenimiento**: el bucle es largo (72 h de planta) y solo se hace regar/abonar/podar. Hay poca decisión y poca variedad entre sesiones.
2. **Retención**: no hay motivos claros para volver cada día más allá del regalo diario y las misiones.
3. **Sensación de mundo**: falta un hogar visible con sitios desbloqueables, decoración útil, personal y personaje guía (Semillita).
4. **Calidad de planta**: hoy solo se usa la salud; falta calidad (A–S) según luz, sitio y cuidados, con premios distintos.
5. **Objetos**: pocas macetas, luces, abonos, herramientas y decoración.
6. **Encargos**: aceptar/rechazar con caducidad y bandeja de mensajes en el móvil.
7. **Personal**: contratar ayudantes que cuiden plantas (más caro = más plantas).
8. **Navegación**: menú lateral demasiado largo; avisos que no llevan a ningún sitio.
9. **Tutorial** desactualizado.
10. **Economía sin ajustar**: no se ha probado con jugadores reales; las cifras (6 monedas/g × variedad, precios de semillas, comisión del 5 %, robos) son estimaciones mías.

## 13. Preguntas para otra IA

- ¿Qué cambiarías para que el bucle de 72 h sea entretenido sin forzar a estar pegado?
- ¿Cómo equilibrarías monedas, gramos y encargos para que guardar compense pero vender no sea tonto?
- ¿Qué sistema de retención (rachas, eventos, metas semanales) encajaría con un juego de cuidar plantas?
- ¿Cómo diseñarías la calidad de planta y qué premios daría?
- ¿Cómo plantearías el personal contratado sin que quite emoción?
