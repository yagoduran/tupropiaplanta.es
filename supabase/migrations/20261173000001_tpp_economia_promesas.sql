-- Lo que el juego promete y no hacía: descuentos por reputación, premios de las historias, La Condesa,
-- fenotipos Brasa y Fantasma, misiones imposibles sin amigos, abonos que no contaban para misiones.

create or replace function tpp._parche(d text, viejo text, nuevo text) returns text language plpgsql as $$
begin
  if position(viejo in d) = 0 then raise exception 'parche no encontrado: %', left(viejo, 80); end if;
  return replace(d, viejo, nuevo);
end;
$$;

-- Descuento en la tienda: Referente (−10 %) y la historia de Rubén terminada (−15 % en macetas).
create or replace function tpp.descuento_tienda(p_uid uuid, p_tipo text)
returns double precision language sql stable security definer set search_path = '' as $$
  select (case when tpp.rango_glob(reputacion_global) >= 3 then 0.9 else 1 end)
    * (case when p_tipo = 'maceta' and coalesce((historias -> 'ruben' ->> 'cap')::int, 0) >= 3 then 0.85 else 1 end)
  from tpp.perfiles where id = p_uid;
$$;
revoke all on function tpp.descuento_tienda(uuid, text) from public, anon, authenticated;

-- Misiones: las sociales solo salen si tienes amigos.
create or replace function tpp.misiones_activas(p_uid uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with c as (
    select x, x ->> 'id' id, x ->> 'grupo' g, x ->> 'clave' k
    from jsonb_array_elements(tpp.misiones_def()) x
    where x ->> 'clave' not in ('visita', 'regalo', 'saludo', 'riego_amigo')
       or exists (select 1 from tpp.amistades a where a.estado = 'amigos' and (a.solicitante = p_uid or a.receptor = p_uid))
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
$$;

do $m$
declare d text;
begin
  -- comprar: aplica los descuentos.
  d := pg_get_functiondef('tpp.comprar(uuid,text,integer)'::regprocedure);
  d := tpp._parche(d, $$  precio := (item ->> 'precio')::int;$$,
    $$  precio := round((item ->> 'precio')::int * tpp.descuento_tienda(p_uid, item ->> 'tipo'))::int;$$);
  execute d;

  -- estado_json: los descuentos se enseñan en la tienda.
  d := pg_get_functiondef('tpp.estado_json(uuid)'::regprocedure);
  d := tpp._parche(d, $$      'animo', tpp.animo_de(p_uid),$$,
    $$      'animo', tpp.animo_de(p_uid),
      'descuentos', jsonb_build_object('tienda', tpp.descuento_tienda(p_uid, 'otro'), 'macetas', tpp.descuento_tienda(p_uid, 'maceta')),$$);
  execute d;

  -- Leyenda: llega La Condesa y regala la semilla de Aurora.
  d := pg_get_functiondef('tpp.sumar_rep(uuid,text,integer)'::regprocedure);
  d := tpp._parche(d, $$'Llega La Condesa, clienta VIP, y la semilla «Corona».'$$, $$'Llega La Condesa, clienta VIP, y te regala la semilla de Aurora.'$$);
  d := tpp._parche(d, $$    if tpp.rango_glob(v_g2) > tpp.rango_glob(v_g) then$$,
    $$    if tpp.rango_glob(v_g2) = 4 and tpp.rango_glob(v_g) < 4 then
      update tpp.perfiles set semillas_hibridas = semillas_hibridas || '"aurora"'::jsonb where id = p_uid and not (semillas_hibridas ? 'aurora');
    end if;
    if tpp.rango_glob(v_g2) > tpp.rango_glob(v_g) then$$);
  execute d;

  -- La Condesa tiene historia.
  d := pg_get_functiondef('tpp.historias()'::regprocedure);
  d := tpp._parche(d, $$ "condesa": []$$, $$ "condesa": [
  {"t":"La cata privada","g":20,"q":5,"pago":3500,"rep":200},
  {"t":"El baile de máscaras","g":40,"curado":true,"q":4,"pago":8000,"rep":300},
  {"t":"La colección de la Condesa","g":30,"distintas":3,"top":true,"pago":12000,"rep":500,"vip":true}]$$);
  execute d;

  d := pg_get_functiondef('tpp.empezar_historia(uuid,text)'::regprocedure);
  d := tpp._parche(d, $$  if v_hist ? p_key then return jsonb_build_object('ok', true) || tpp.clientes_estado(p_uid); end if;$$,
    $$  if v_hist ? p_key then return jsonb_build_object('ok', true) || tpp.clientes_estado(p_uid); end if;
  if p_key = 'condesa' and tpp.rango_glob(v_glob) < 4 then
    return jsonb_build_object('ok', false, 'error', 'historia_bloqueada') || tpp.clientes_estado(p_uid);
  end if;$$);
  execute d;

  -- Premio al terminar cada historia.
  d := pg_get_functiondef('tpp.entregar_historia(uuid,text)'::regprocedure);
  d := tpp._parche(d, $$  perform tpp.sumar_rep(p_uid, p_key, v_ganancia);$$,
    $$  perform tpp.sumar_rep(p_uid, p_key, v_ganancia);
  if v_cap + 1 = v_n then
    if p_key = 'raiz' then
      insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, 'micro_dorado', 1)
        on conflict (usuario_id, objeto) do update set cantidad = greatest(tpp.inventario.cantidad, 1);
      perform tpp.notificar(p_uid, 'encargo', 'Regalo de MC Raíz', 'Te ha dejado su Micro dorado: colócalo desde el inventario (+3 de ánimo).');
    elsif p_key = 'pilar' then
      insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, 'humus', 10), (p_uid, 'te_compost', 3)
        on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + excluded.cantidad;
      perform tpp.notificar(p_uid, 'encargo', 'La receta de la abuela', 'Pilar te regala 10 de humus y 3 tés de compost hechos con su receta.');
    elsif p_key = 'ruben' then
      perform tpp.notificar(p_uid, 'encargo', 'Rubén abre su estudio', 'Desde ahora tienes un 15 % de descuento en todas las macetas.');
    end if;
  end if;$$);
  execute d;

  d := pg_get_functiondef('tpp.catalogo()'::regprocedure);
  d := tpp._parche(d, $${"id":"maceta_morada","tipo":"maceta","precio":-1,"nivel":1}$$,
    $${"id":"maceta_morada","tipo":"maceta","precio":-1,"nivel":1},{"id":"micro_dorado","tipo":"decoracion","precio":-1,"nivel":1}$$);
  execute d;

  d := pg_get_functiondef('tpp.animo_de(uuid)'::regprocedure);
  d := tpp._parche(d, $$when 'lampara_lava' then 3$$, $$when 'lampara_lava' then 3 when 'micro_dorado' then 3$$);
  execute d;

  -- Fenotipos: Brasa aguanta +6 °C y no nota las olas de calor; Fantasma perdona menos.
  d := pg_get_functiondef('tpp.sincronizar(uuid)'::regprocedure);
  d := tpp._parche(d, $$  v_tmax := coalesce((fi ->> 'tMax')::double precision, 30);$$,
    $$  v_tmax := coalesce((fi ->> 'tMax')::double precision, 30) + case when p.fenotipo = 'brasa' then 6 else 0 end;
  if p.fenotipo = 'fantasma' and p.desafio is null then f_salud := f_salud * 1.15; end if;$$);
  d := tpp._parche(d, $$          when 'calor' then calor_luz := calor_luz + (efe ->> 'v')::double precision;$$,
    $$          when 'calor' then
            if p.fenotipo is distinct from 'brasa' or (efe ->> 'v')::double precision < 0 then
              calor_luz := calor_luz + (efe ->> 'v')::double precision;
            end if;$$);
  execute d;

  -- Podar deja restos para la mesa de procesado.
  d := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure);
  d := tpp._parche(d, $$  if p_accion = 'regar' then perform tpp.contar(p_uid, 'riegos', 1);$$,
    $$  if p_accion = 'podar' and p.desafio is null then perform tpp.procesado_restos(p_uid, 2, 3); end if;
  if p_accion = 'regar' then perform tpp.contar(p_uid, 'riegos', 1);$$);
  execute d;

  -- Secar también deja los restos de la cosecha.
  d := pg_get_functiondef('tpp.secar_cosecha(uuid,text,integer)'::regprocedure);
  d := tpp._parche(d, $$  update tpp.perfiles set secado = secado || jsonb_build_array(nuevo), cosecha_pendiente = null where id = p_uid;$$,
    $$  update tpp.perfiles set secado = secado || jsonb_build_array(nuevo), cosecha_pendiente = null where id = p_uid;
  perform tpp.procesado_restos(p_uid, ceil((c ->> 'gramos')::numeric * 0.3)::int, coalesce((c ->> 'calidad')::int, 3));$$);
  execute d;

  -- Los abonos del inventario cuentan para misiones y logros.
  d := pg_get_functiondef('tpp.usar(uuid,text)'::regprocedure);
  d := tpp._parche(d, $$  if p_objeto = 'te_compost' then perform tpp.poner_efecto(p_uid, 'plaga', 0.9, 2 * 86400); end if;$$,
    $$  if p_objeto = 'te_compost' then perform tpp.poner_efecto(p_uid, 'plaga', 0.9, 2 * 86400); end if;
  if p_objeto <> 'relampago' and p.desafio is null then
    perform tpp.contar(p_uid, 'abonos', 1);
    perform tpp.mision_sumar(p_uid, 'abonar');
  end if;$$);
  execute d;

  -- Cambiar el ciclo de luz del armario cuenta como ajustar la luz.
  d := pg_get_functiondef('tpp.armario_accion(uuid,text,text)'::regprocedure);
  d := tpp._parche(d, $$      update tpp.perfiles set luz_horas = case p_valor when '12/12' then 12 else 18 end where id = p_uid;$$,
    $$      update tpp.perfiles set luz_horas = case p_valor when '12/12' then 12 else 18 end where id = p_uid;
      perform tpp.mision_sumar(p_uid, 'luz');$$);
  execute d;

  -- Plantar contaba dos veces para el evento.
  d := pg_get_functiondef('tpp.plantar(uuid,text,text)'::regprocedure);
  d := tpp._parche(d, $$  perform tpp.temporada_sumar(p_uid, 'plantar');
$$, '');
  execute d;

  -- Vender gramos y comprar a El Topo cuentan como «mercado».
  d := pg_get_functiondef('tpp.vender_gramos(uuid,text,integer)'::regprocedure);
  d := tpp._parche(d, $$  return jsonb_build_object('ok', true, 'recompensa', round(n * pg * tpp.mult_ventas(p_uid))::int, 'gramos', n) || tpp.estado_json(p_uid);$$,
    $$  perform tpp.mision_sumar(p_uid, 'mercado');
  return jsonb_build_object('ok', true, 'recompensa', round(n * pg * tpp.mult_ventas(p_uid))::int, 'gramos', n) || tpp.estado_json(p_uid);$$);
  execute d;

  d := pg_get_functiondef('tpp.misiones_def()'::regprocedure);
  d := tpp._parche(d, $$'Compra algo en el mercado.'$$, $$'Compra en el mercado o vende gramos de tu almacén.'$$);
  d := tpp._parche(d, $$'Comprador del mercado', 'Haz 3 compras en el mercado esta semana.'$$, $$'Gente del mercado', 'Compra en el mercado o vende gramos 3 veces esta semana.'$$);
  execute d;

  -- Misiones de evento que se pueden hacer sin amigos.
  d := pg_get_functiondef('tpp.eventos()'::regprocedure);
  d := tpp._parche(d, $${"id":"pr_regalos","clave":"regalo","meta":3,"nombre":"Envía 3 regalos"}$$, $${"id":"pr_regalos","clave":"cosechar","meta":2,"nombre":"Cosecha 2 plantas"}$$);
  d := tpp._parche(d, $${"id":"ot_visitas","clave":"visita","meta":5,"nombre":"Visita a 5 amigos"}$$, $${"id":"ot_visitas","clave":"encargo","meta":2,"nombre":"Entrega 2 encargos"}$$);
  d := tpp._parche(d, $${"id":"in_regalos","clave":"regalo","meta":3,"nombre":"Envía 3 regalos"}$$, $${"id":"in_regalos","clave":"vender","meta":2,"nombre":"Vende 2 cosechas"}$$);
  execute d;
end;
$m$;

drop function tpp._parche(text, text, text);
