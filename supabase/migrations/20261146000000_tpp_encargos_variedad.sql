-- Más variedad en los encargos: 36 remitentes y 20 mensajes distintos, y tres tipos de pedido.
--   normal (65 %): 20 a 60 g, 24 h.
--   urgente (20 %): 20 a 40 g, 8 h, paga un 50 % más.
--   grande (15 %): 60 a 120 g, 48 h, paga un 20 % más por gramo.
-- Cada encargo guarda su tipo y el texto del mensaje con {g} y {v} para el gramaje y la variedad.
--
-- Para deshacer: volver a la versión de tpp.encargos_al_dia de 20261128000000_tpp_encargos.sql.

do $mig$
declare
  d text := pg_get_functiondef('tpp.encargos_al_dia(uuid)'::regprocedure);
  o text;
begin
  o := d;
  d := replace(d, E'  g integer;\n', E'  g integer;\n  tipo text;\n  msj text;\n  dur interval;\n  fac double precision;\n  r double precision := random();\n  m_normal text[] := array[''Hola, ¿me puedes conseguir {g} g de {v}? ¡Te lo pago bien!'', ''Buenas, necesito {g} g de {v} para una receta. ¿Te sobra algo?'', ''¡Hola! Me han hablado de tu {v}. ¿Me vendes {g} g?'', ''Oye, ando corto de {v}: ¿me traes {g} g cuando puedas?'', ''Tengo una visita mañana y quiero {g} g de {v}. ¡Te lo agradezco!'', ''¿Qué tal? Busco {g} g de {v} de la buena. ¿Puedes?'', ''Me han dicho que cultivas {v}. Necesito {g} g, ¿trato hecho?'', ''Hola, vecino. Si tienes {g} g de {v}, te los compro encantado.'', ''Un favor: {g} g de {v} para un regalo. ¡Pago bien!'', ''¡Buenas! Necesito {g} g de {v} para esta semana. ¿Me ayudas?''];\n  m_urgente text[] := array[''¡URGENTE! Necesito {g} g de {v} ya mismo, te pago extra.'', ''Se me ha acabado todo y me hace falta {g} g de {v} hoy. ¡Te doy un plus!'', ''¡Socorro! {g} g de {v} lo antes posible, pago más de lo normal.'', ''Pedido de última hora: {g} g de {v}. ¡Con prisa y buena paga!'', ''Me ha salido un compromiso: ¿{g} g de {v} para hoy? Pago extra.''];\n  m_grande text[] := array[''Hago un pedido grande: {g} g de {v}. Tienes dos días y te lo pago mejor.'', ''Vengo a por mucho: {g} g de {v}. Hay tiempo, pero merece la pena.'', ''Para una fiesta necesito {g} g de {v}. Pedido grande, buena recompensa.'', ''Encargo especial: {g} g de {v}. Pago más por gramo y tienes 48 h.'', ''Si me consigues {g} g de {v}, te hago cliente fijo. Pedido grande.''];\n');
  if d = o then raise exception 'declare no cambia'; end if;

  o := d;
  d := regexp_replace(d, 'remites text\[\] := array\[[^\]]*\];', 'remites text[] := array[''Marta, la vecina'', ''Don Ramón'', ''Lucía, del vivero'', ''Pepe, el cartero'', ''La abuela Carmen'', ''Sergio, el botánico'', ''Paco, el panadero'', ''Inés, la farmacéutica'', ''Tomás, el albañil'', ''Rosa, de la floristería'', ''Álvaro, el estudiante'', ''Dña. Pilar'', ''Nuria, la profe'', ''Gabi, el fontanero'', ''Elena, la pintora'', ''Manolo, el taxista'', ''Sofía, la cocinera'', ''Hugo, el vecino del 3.º'', ''Clara, la bibliotecaria'', ''Chema, el mecánico'', ''Irene, la peluquera'', ''Víctor, el músico'', ''Aurora, la modista'', ''Lola, la tabernera'', ''Fran, el repartidor'', ''Berta, la enfermera'', ''Quique, el carpintero'', ''Teresa, la tendera'', ''Ismael, el panadero'', ''Paula, la veterinaria'', ''Jaime, el jubilado'', ''Noelia, la fotógrafa'', ''Rafa, el camarero'', ''Mar, la ceramista'', ''El tío Julián'', ''Candela, la nieta''];');
  if d = o then raise exception 'remites no cambia'; end if;

  o := d;
  d := replace(d, E'    g := (5 * round((20 + random() * 40) / 5))::int;\n',
E'    if r < 0.65 then tipo := ''normal''; fac := 1; dur := interval ''24 hours''; g := (5 * round((20 + random() * 40) / 5))::int; msj := m_normal[1 + floor(random() * array_length(m_normal, 1))::int];\n'
|| E'    elsif r < 0.85 then tipo := ''urgente''; fac := 1.5; dur := interval ''8 hours''; g := (5 * round((20 + random() * 20) / 5))::int; msj := m_urgente[1 + floor(random() * array_length(m_urgente, 1))::int];\n'
|| E'    else tipo := ''grande''; fac := 1.2; dur := interval ''48 hours''; g := (5 * round((60 + random() * 60) / 5))::int; msj := m_grande[1 + floor(random() * array_length(m_grande, 1))::int];\n'
|| E'    end if;\n');
  if d = o then raise exception 'g no cambia'; end if;

  o := d;
  d := replace(d, '''monedas'', (5 * round(g * 10 * mult / 5))::int,', '''tipo'', tipo, ''mensaje'', msj, ''monedas'', (5 * round(g * 10 * mult * fac / 5))::int,');
  if d = o then raise exception 'monedas no cambia'; end if;
  o := d;
  d := replace(d, '''xp'', round(g * mult)::int,', '''xp'', round(g * mult * fac)::int,');
  if d = o then raise exception 'xp no cambia'; end if;
  o := d;
  d := replace(d, '''hasta'', now() + interval ''24 hours''', '''hasta'', now() + dur');
  if d = o then raise exception 'hasta no cambia'; end if;
  execute d;
end
$mig$;
