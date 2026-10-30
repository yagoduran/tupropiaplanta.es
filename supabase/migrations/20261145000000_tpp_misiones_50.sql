-- 50 misiones distintas. Cada jugador recibe cada día 4 diarias y cada semana 3 semanales, elegidas al azar
-- (siempre las mismas para él durante ese día o semana) y nunca dos del mismo tipo.
-- Se quita la misión de ajustar la luz, porque el ciclo de luz ya no existe.
-- También cuentan ahora: plantar, comprar, tratar plagas, saludar, regar a amigos, entregar encargos, ver anuncios,
-- comprar en el mercado, vender y guardar cosechas.
--
-- Para deshacer: volver a las 7 misiones de 20261118000000_tpp_misiones_notificaciones.sql y quitar tpp.misiones_activas.

create or replace function tpp.misiones_def() returns jsonb
language sql
immutable
set search_path to ''
as $function$
  select jsonb_agg(jsonb_build_object('id', id, 'grupo', g, 'clave', k, 'meta', m, 'nombre', n, 'desc', d,
    'premio', jsonb_build_object('tipo', t, 'n', p)))
  from (values
      ('d_regar_3', 'd', 'regar', 3, 'Riega 3 veces', 'Riega tu planta 3 veces hoy.', 'monedas', 50),
      ('d_regar', 'd', 'regar', 5, 'Riega 5 veces', 'Riega tu planta 5 veces hoy.', 'monedas', 100),
      ('d_regar_8', 'd', 'regar', 8, 'Riega 8 veces', 'Riega tu planta 8 veces hoy.', 'monedas', 160),
      ('d_regar_12', 'd', 'regar', 12, 'Día de riego', 'Riega tu planta 12 veces hoy.', 'xp', 120),
      ('d_abonar_1', 'd', 'abonar', 1, 'Un poco de abono', 'Usa abono una vez hoy.', 'xp', 25),
      ('d_abonar', 'd', 'abonar', 2, 'Abona tu planta', 'Usa abono 2 veces hoy.', 'xp', 40),
      ('d_abonar_3', 'd', 'abonar', 3, 'Planta bien alimentada', 'Usa abono 3 veces hoy.', 'monedas', 120),
      ('d_podar_1', 'd', 'podar', 1, 'Una poda', 'Poda tu planta una vez hoy.', 'xp', 30),
      ('d_podar_2', 'd', 'podar', 2, 'Manos de jardinero', 'Poda tu planta 2 veces hoy.', 'monedas', 80),
      ('d_visita', 'd', 'visita', 1, 'Visita a un amigo', 'Entra en la planta de un amigo.', 'monedas', 60),
      ('d_visita_3', 'd', 'visita', 3, 'Ronda de visitas', 'Visita a 3 amigos hoy.', 'monedas', 150),
      ('d_regalo_1', 'd', 'regalo', 1, 'Un detalle', 'Envía un regalo a un amigo.', 'monedas', 70),
      ('d_regalo_2', 'd', 'regalo', 2, 'Generosidad', 'Envía 2 regalos hoy.', 'xp', 70),
      ('d_saludo_1', 'd', 'saludo', 1, 'Di hola', 'Deja un saludo a un amigo.', 'monedas', 40),
      ('d_saludo_3', 'd', 'saludo', 3, 'Muy sociable', 'Deja 3 saludos hoy.', 'monedas', 110),
      ('d_riego_amigo_1', 'd', 'riego_amigo', 1, 'Riega a un amigo', 'Riega la planta de un amigo.', 'monedas', 60),
      ('d_riego_amigo_3', 'd', 'riego_amigo', 3, 'Buen vecino', 'Riega las plantas de 3 amigos hoy.', 'xp', 90),
      ('d_plantar_1', 'd', 'plantar', 1, 'A plantar', 'Planta una semilla hoy.', 'monedas', 50),
      ('d_comprar_1', 'd', 'comprar', 1, 'De compras', 'Compra algo en la tienda.', 'xp', 30),
      ('d_comprar_3', 'd', 'comprar', 3, 'Día de compras', 'Haz 3 compras en la tienda hoy.', 'monedas', 100),
      ('d_plaga_1', 'd', 'plaga', 1, 'Fuera bichos', 'Trata una plaga hoy.', 'monedas', 80),
      ('d_plaga_2', 'd', 'plaga', 2, 'Cazaplagas', 'Trata 2 plagas hoy.', 'xp', 90),
      ('d_encargo_1', 'd', 'encargo', 1, 'Cliente satisfecho', 'Entrega un encargo.', 'monedas', 120),
      ('d_encargo_2', 'd', 'encargo', 2, 'Doble entrega', 'Entrega 2 encargos hoy.', 'xp', 120),
      ('d_anuncio_1', 'd', 'anuncio', 1, 'Un empujón', 'Mira un anuncio de ayuda.', 'monedas', 40),
      ('d_anuncio_3', 'd', 'anuncio', 3, 'Gran apoyo', 'Mira 3 anuncios de ayuda hoy.', 'monedas', 130),
      ('d_mercado_1', 'd', 'mercado', 1, 'Cazaofertas', 'Compra algo en el mercado.', 'monedas', 70),
      ('d_vender_1', 'd', 'vender', 1, 'A la venta', 'Vende una cosecha.', 'monedas', 60),
      ('d_vender_2', 'd', 'vender', 2, 'Buen comerciante', 'Vende 2 cosechas hoy.', 'monedas', 100),
      ('d_guardar_1', 'd', 'guardar', 1, 'Pensando en el futuro', 'Guarda una cosecha para los encargos.', 'xp', 40),
      ('d_cosechar_1', 'd', 'cosechar', 1, 'Día de cosecha', 'Cosecha una planta hoy.', 'monedas', 150),
      ('d_sana_1', 'd', 'sana', 1, 'Cosecha de calidad', 'Cosecha con la salud por encima del 80 %.', 'xp', 100),
      ('s_cosechar', 's', 'cosechar', 1, 'Cosecha una planta', 'Completa una cosecha esta semana.', 'monedas', 250),
      ('s_cosechar_3', 's', 'cosechar', 3, 'Tres cosechas', 'Completa 3 cosechas esta semana.', 'monedas', 700),
      ('s_sana', 's', 'sana', 1, 'Planta sana', 'Cosecha con la salud por encima del 80 %.', 'xp', 150),
      ('s_sana_2', 's', 'sana', 2, 'Cuidados de campeón', 'Cosecha 2 plantas con la salud por encima del 80 %.', 'xp', 300),
      ('s_regalos', 's', 'regalo', 3, 'Envía 3 regalos', 'Regala algo a tus amigos.', 'monedas', 300),
      ('s_regalo_6', 's', 'regalo', 6, 'Amigo generoso', 'Envía 6 regalos esta semana.', 'monedas', 600),
      ('s_regar_30', 's', 'regar', 30, 'Riego constante', 'Riega tu planta 30 veces esta semana.', 'monedas', 400),
      ('s_regar_60', 's', 'regar', 60, 'Maestro del riego', 'Riega tu planta 60 veces esta semana.', 'monedas', 800),
      ('s_abonar_10', 's', 'abonar', 10, 'Abono a tope', 'Usa abono 10 veces esta semana.', 'xp', 250),
      ('s_podar_5', 's', 'podar', 5, 'Tijeras afiladas', 'Poda 5 veces esta semana.', 'monedas', 300),
      ('s_visita_7', 's', 'visita', 7, 'Siempre de visita', 'Visita a tus amigos 7 veces esta semana.', 'monedas', 400),
      ('s_saludo_10', 's', 'saludo', 10, 'Cartero de saludos', 'Deja 10 saludos esta semana.', 'monedas', 350),
      ('s_riego_amigo_7', 's', 'riego_amigo', 7, 'Jardinero solidario', 'Riega 7 plantas de amigos esta semana.', 'xp', 300),
      ('s_plantar_3', 's', 'plantar', 3, 'Nuevas siembras', 'Planta 3 semillas esta semana.', 'monedas', 300),
      ('s_comprar_8', 's', 'comprar', 8, 'Cliente fiel', 'Haz 8 compras en la tienda esta semana.', 'monedas', 400),
      ('s_plaga_5', 's', 'plaga', 5, 'Exterminador', 'Trata 5 plagas esta semana.', 'monedas', 450),
      ('s_encargo_5', 's', 'encargo', 5, 'Repartidor estrella', 'Entrega 5 encargos esta semana.', 'xp', 500),
      ('s_mercado_3', 's', 'mercado', 3, 'Comprador del mercado', 'Haz 3 compras en el mercado esta semana.', 'monedas', 400)
  ) v(id, g, k, m, n, d, t, p);
$function$;

create or replace function tpp.misiones_activas(p_uid uuid) returns jsonb
language sql
stable
set search_path to ''
as $function$
  with c as (
    select x, x ->> 'id' id, x ->> 'grupo' g, x ->> 'clave' k
    from jsonb_array_elements(tpp.misiones_def()) x
  ),
  d as (
    select x from (
      select distinct on (k) x, k from c
      where g = 'd' order by k, md5(p_uid::text || (now() at time zone 'Europe/Madrid')::date::text || id)
    ) t order by md5(p_uid::text || (now() at time zone 'Europe/Madrid')::date::text || k) limit 4
  ),
  s as (
    select x from (
      select distinct on (k) x, k from c
      where g = 's' order by k, md5(p_uid::text || date_trunc('week', now() at time zone 'Europe/Madrid')::date::text || id)
    ) t order by md5(p_uid::text || date_trunc('week', now() at time zone 'Europe/Madrid')::date::text || k) limit 3
  )
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (select x from d union all select x from s) u;
$function$;

revoke all on function tpp.misiones_activas(uuid) from public, anon, authenticated;

do $mig$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('tpp.mision_sumar(uuid,text,integer)'::regprocedure);
  o := d;
  d := replace(d, 'from jsonb_array_elements(tpp.misiones_def()) x where x ->> ''clave'' = p_clave', 'from jsonb_array_elements(tpp.misiones_activas(p_uid)) x where x ->> ''clave'' = p_clave');
  if d = o then raise exception 'mision_sumar no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.mis_misiones(uuid)'::regprocedure);
  o := d;
  d := replace(d, 'for def in select x from jsonb_array_elements(tpp.misiones_def()) x loop', 'for def in select x from jsonb_array_elements(tpp.misiones_activas(p_uid)) x loop');
  if d = o then raise exception 'mis_misiones no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.reclamar_mision(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, 'from jsonb_array_elements(tpp.misiones_def()) x where x ->> ''id'' = p_id', 'from jsonb_array_elements(tpp.misiones_activas(p_uid)) x where x ->> ''id'' = p_id');
  if d = o then raise exception 'reclamar_mision no cambia'; end if;
  execute d;
end
$mig$;

-- Nuevas acciones que cuentan para las misiones: se avisa justo antes del retorno correcto de cada función.
create or replace function pg_temp.enganchar(p_funcion regprocedure, p_marca text, p_clave text) returns void
language plpgsql
as $f$
declare
  d text := pg_get_functiondef(p_funcion);
  o text := d;
begin
  d := replace(d, E'\n  return jsonb_build_object(''ok'', true' || p_marca, E'\n  perform tpp.mision_sumar(p_uid, ''' || p_clave || E''');\n  return jsonb_build_object(''ok'', true' || p_marca);
  if d = o then raise exception 'no cambia %', p_funcion; end if;
  execute d;
end
$f$;

select pg_temp.enganchar('tpp.plantar(uuid,text,text)', ')', 'plantar');
select pg_temp.enganchar('tpp.comprar(uuid,text)', ')', 'comprar');
select pg_temp.enganchar('tpp.mercado_comprar(uuid,bigint)', ')', 'mercado');
select pg_temp.enganchar('tpp.tratar(uuid,text)', ')', 'plaga');
select pg_temp.enganchar('tpp.regar_visita(uuid,text)', ')', 'riego_amigo');
select pg_temp.enganchar('tpp.saludar(uuid,text,text)', ', ''saludo'', p_emoji);', 'saludo');
select pg_temp.enganchar('tpp.ver_anuncio(uuid)', ', ''recompensa'', 25)', 'anuncio');
select pg_temp.enganchar('tpp.entregar_encargo(uuid,text)', ')', 'encargo');

do $mig$
declare
  d text := pg_get_functiondef('tpp.resolver_cosecha(uuid,boolean)'::regprocedure);
  o text := d;
begin
  d := replace(d, E'\n  return jsonb_build_object(''ok'', true, ''recompensa''', E'\n  perform tpp.mision_sumar(p_uid, case when p_vender then ''vender'' else ''guardar'' end);\n  return jsonb_build_object(''ok'', true, ''recompensa''');
  if d = o then raise exception 'resolver_cosecha no cambia'; end if;
  execute d;
end
$mig$;
