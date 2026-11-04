-- 8i (parte A) · Reputación (por cliente 0–1.000 y global 0–6.000) y clientes con historia (cadenas de capítulos).
-- Rangos de cliente: Desconocido 0 · Conocido 100 · Habitual 300 (+5 % en pagos) · De confianza 600 · VIP 1.000 (pagos ×1,2).
-- Rangos globales: Vecino 0 · Cultivador del barrio 500 · Conocido en la calle 1.500 · Referente 3.000 · Leyenda 6.000.
-- La reputación global sube el doble de lo que se gana con el cliente. +50 % si se entrega antes de la mitad del plazo. −30 al caducar o rechazar.
-- Las claves de la reputación por cliente son: «0»…«11» (clientes de los encargos normales, empiezan en 500) y «raiz», «pilar», «ruben», «condesa» (empiezan en 0).

alter table tpp.perfiles add column if not exists historias jsonb not null default '{}'::jsonb;

-- Los clientes de los encargos pasan de la escala 0–100 a 0–1.000 (×10).
update tpp.perfiles set reputacion = coalesce((select jsonb_object_agg(k, (v::int * 10)) from jsonb_each_text(reputacion) t(k, v)), '{}'::jsonb)
  where reputacion <> '{}'::jsonb;

create or replace function tpp.rango_cli(p integer) returns integer language sql immutable set search_path = '' as
$f$ select case when p >= 1000 then 4 when p >= 600 then 3 when p >= 300 then 2 when p >= 100 then 1 else 0 end $f$;

create or replace function tpp.rango_glob(p integer) returns integer language sql immutable set search_path = '' as
$f$ select case when p >= 6000 then 4 when p >= 3000 then 3 when p >= 1500 then 2 when p >= 500 then 1 else 0 end $f$;

-- Reputación actual con un cliente.
create or replace function tpp.rep_cliente(p_uid uuid, p_key text) returns integer language sql stable security definer set search_path = '' as
$f$ select coalesce((select (reputacion ->> p_key)::int from tpp.perfiles where id = p_uid), case when p_key ~ '^[0-9]+$' then 500 else 0 end) $f$;

-- Suma (o resta) reputación con un cliente. Si es positiva, la global sube el doble. Avisa de los cambios de rango.
create or replace function tpp.sumar_rep(p_uid uuid, p_key text, p_delta integer) returns void
language plpgsql security definer set search_path = '' as
$f$
declare
  v_ant integer := tpp.rep_cliente(p_uid, p_key);
  v_nue integer := greatest(0, least(1000, v_ant + p_delta));
  v_g integer;
  v_g2 integer;
  v_nombres text[] := array['Desconocido', 'Conocido', 'Habitual', 'De confianza', 'VIP'];
  v_gnombres text[] := array['Vecino', 'Cultivador del barrio', 'Conocido en la calle', 'Referente', 'Leyenda'];
  v_cli text;
begin
  update tpp.perfiles set reputacion = reputacion || jsonb_build_object(p_key, v_nue) where id = p_uid;
  if tpp.rango_cli(v_nue) > tpp.rango_cli(v_ant) then
    v_cli := coalesce(case p_key when 'raiz' then 'MC Raíz' when 'pilar' then 'Abuela Pilar' when 'ruben' then 'Rubén' when 'condesa' then 'La Condesa'
      else (array['Doña Rosa', 'Javi', 'Lola', 'Don Ernesto', 'Nuria', 'Kike', 'Carmen', 'El Coleccionista', 'Aitana', 'Paco', 'Valeria', 'Toni'])[(case when p_key ~ '^[0-9]+$' then p_key::int else 0 end) + 1] end, 'Un cliente');
    perform tpp.notificar(p_uid, 'reputacion', 'Nueva reputación con ' || v_cli, 'Ahora sois: ' || v_nombres[tpp.rango_cli(v_nue) + 1] || '.');
  end if;
  if p_delta > 0 then
    select reputacion_global into v_g from tpp.perfiles where id = p_uid;
    v_g2 := least(6000, v_g + 2 * (v_nue - v_ant));
    update tpp.perfiles set reputacion_global = v_g2 where id = p_uid;
    if tpp.rango_glob(v_g2) > tpp.rango_glob(v_g) then
      perform tpp.notificar(p_uid, 'reputacion', 'Nuevo rango: ' || v_gnombres[tpp.rango_glob(v_g2) + 1],
        case tpp.rango_glob(v_g2) when 1 then 'Ya puedes tener dos historias de clientes a la vez.'
          when 2 then 'Alguien ha dejado una nota debajo de la puerta: pregunta por El Topo en el trastero del sótano. Mercado negro desbloqueado.'
          when 3 then 'Tienes un 10 % de descuento en la tienda.' else 'Llega La Condesa, clienta VIP, y la semilla «Corona».' end);
    end if;
  end if;
end;
$f$;

-- Cadenas de historia. Campos de cada capítulo: t (título), g (gramos), vars (variedades), efectos, q (estrellas),
-- org (orgánico), limpia (sin plagas), curado, top (Top Shelf), distintas (variedades distintas), pago, rep, plazo (segundos),
-- viernes (multiplicador hasta el viernes 20:00), rapido ({plazo, mult}), vip, rosa.
create or replace function tpp.historias() returns jsonb language sql immutable set search_path = '' as
$f$ select '{
 "raiz": [
  {"t":"La maqueta","g":15,"vars":["noche"],"pago":450,"rep":60},
  {"t":"Videoclip en la azotea","g":30,"vars":["dorada"],"q":3,"pago":1100,"rep":90},
  {"t":"El gran concierto","g":100,"efectos":["relajante","sonador"],"curado":true,"pago":1000,"viernes":3,"rep":150},
  {"t":"La gira","g":60,"vars":["sol-medianoche"],"q":4,"pago":2400,"rapido":{"plazo":259200,"mult":1.5},"rep":150},
  {"t":"Disco de oro","g":10,"top":true,"pago":5000,"rep":250,"vip":true}],
 "pilar": [
  {"t":"Para las rodillas","g":10,"vars":["clasica"],"pago":200,"rep":40},
  {"t":"Medicinal de verdad","g":15,"org":true,"q":3,"pago":700,"rep":120},
  {"t":"Las amigas del centro de día","g":40,"distintas":3,"org":true,"q":3,"plazo":432000,"pago":1400,"rep":150,"rosa":true},
  {"t":"La receta de la abuela","g":20,"vars":["hoja-azul"],"org":true,"pago":600,"rep":200}],
 "ruben": [
  {"t":"Primer tatuaje","g":10,"vars":["menta-nocturna"],"plazo":172800,"pago":380,"rep":50},
  {"t":"Sesión de seis horas","g":25,"vars":["menta-nocturna","verde-azulado"],"limpia":true,"plazo":259200,"pago":900,"rep":90},
  {"t":"Estudio propio","g":50,"q":4,"plazo":432000,"pago":2000,"rep":200}],
 "condesa": []
}'::jsonb $f$;

-- Qué gramos del almacén cumplen un capítulo y cuáles se entregarían: {ok, tengo, tomar:{variedad: gramos}}.
create or replace function tpp.hist_plan(p_uid uuid, p_ch jsonb) returns jsonb language plpgsql stable security definer set search_path = '' as
$f$
declare
  v_alm jsonb;
  v_cal jsonb;
  v_mar jsonb;
  v_fb jsonb := tpp.ficha_base();
  v_need integer := (p_ch ->> 'g')::int;
  v_dist integer := coalesce((p_ch ->> 'distintas')::int, 1);
  v_q integer := coalesce((p_ch ->> 'q')::int, 0);
  r record;
  v_u integer;
  v_k text;
  v_el jsonb := '[]'::jsonb;
  v_tot integer := 0;
  v_tomar jsonb := '{}'::jsonb;
  v_resto integer;
  v_i integer := 0;
  v_t integer;
  x jsonb;
begin
  select almacen, almacen_calidad, almacen_marcas into v_alm, v_cal, v_mar from tpp.perfiles where id = p_uid;
  for r in select e.key as v, e.value::int as g from jsonb_each_text(v_alm) e where e.value::int > 0 loop
    if p_ch ? 'vars' and not ((p_ch -> 'vars') ? r.v) then continue; end if;
    if p_ch ? 'efectos' and not ((p_ch -> 'efectos') ? coalesce(v_fb -> r.v ->> 'efecto', '')) then continue; end if;
    if v_q > 0 and round(coalesce((v_cal ->> r.v)::numeric, 3)) < v_q then continue; end if;
    v_u := r.g;
    foreach v_k in array array['org', 'limpia', 'curado', 'top'] loop
      if coalesce((p_ch ->> v_k)::boolean, false) then v_u := least(v_u, coalesce((v_mar -> r.v ->> v_k)::int, 0)); end if;
    end loop;
    if v_u > 0 then
      v_el := v_el || jsonb_build_array(jsonb_build_object('v', r.v, 'u', v_u));
      v_tot := v_tot + v_u;
    end if;
  end loop;
  select coalesce(jsonb_agg(e order by (e ->> 'u')::int desc), '[]'::jsonb) into v_el from jsonb_array_elements(v_el) e;
  v_resto := v_need;
  if v_dist > 1 and jsonb_array_length(v_el) >= v_dist then
    for x in select e from jsonb_array_elements(v_el) e limit v_dist loop
      v_tomar := v_tomar || jsonb_build_object(x ->> 'v', 1);
      v_resto := v_resto - 1;
    end loop;
  end if;
  for x in select e from jsonb_array_elements(v_el) e loop
    exit when v_resto <= 0;
    v_t := least((x ->> 'u')::int - coalesce((v_tomar ->> (x ->> 'v'))::int, 0), v_resto);
    if v_t > 0 then
      v_tomar := v_tomar || jsonb_build_object(x ->> 'v', coalesce((v_tomar ->> (x ->> 'v'))::int, 0) + v_t);
      v_resto := v_resto - v_t;
    end if;
  end loop;
  return jsonb_build_object('ok', v_resto <= 0 and jsonb_array_length(v_el) >= v_dist, 'tengo', v_tot, 'tomar', v_tomar);
end;
$f$;

-- Viernes a las 20:00 (Madrid) siguiente a un instante (en segundos).
create or replace function tpp.hist_viernes(p_desde bigint) returns timestamptz language sql immutable set search_path = '' as
$f$
  select (case when t0 + interval '4 days 20 hours' > d then t0 + interval '4 days 20 hours' else t0 + interval '11 days 20 hours' end) at time zone 'Europe/Madrid'
  from (select date_trunc('week', to_timestamp(p_desde) at time zone 'Europe/Madrid') as t0, (to_timestamp(p_desde) at time zone 'Europe/Madrid') as d) s
$f$;

-- Pago de un capítulo ahora mismo (con multiplicadores de plazo y de rango).
create or replace function tpp.hist_pago(p_uid uuid, p_key text, p_ch jsonb, p_desde bigint) returns integer
language plpgsql stable security definer set search_path = '' as
$f$
declare
  v_f numeric := 1;
  v_r integer := tpp.rango_cli(tpp.rep_cliente(p_uid, p_key));
begin
  if coalesce((p_ch ->> 'viernes')::numeric, 0) > 0 and now() <= tpp.hist_viernes(p_desde) then v_f := v_f * (p_ch ->> 'viernes')::numeric; end if;
  if p_ch ? 'rapido' and extract(epoch from now()) <= p_desde + (p_ch -> 'rapido' ->> 'plazo')::bigint then v_f := v_f * (p_ch -> 'rapido' ->> 'mult')::numeric; end if;
  v_f := v_f * case when v_r = 4 then 1.2 when v_r >= 2 then 1.05 else 1 end;
  return round((p_ch ->> 'pago')::numeric * v_f)::int;
end;
$f$;

-- Empieza una historia. Con «Vecino» solo una a la vez; con «Cultivador del barrio» o más, dos.
create or replace function tpp.empezar_historia(p_uid uuid, p_key text) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare
  v_h jsonb := tpp.historias();
  v_hist jsonb;
  v_glob integer;
  v_act integer;
  v_lim integer;
begin
  perform tpp.asegurar_perfil(p_uid);
  if not (v_h ? p_key) or jsonb_array_length(v_h -> p_key) = 0 then
    return jsonb_build_object('ok', false, 'error', 'historia_desconocida') || tpp.clientes_estado(p_uid);
  end if;
  select historias, reputacion_global into v_hist, v_glob from tpp.perfiles where id = p_uid for update;
  if v_hist ? p_key then return jsonb_build_object('ok', true) || tpp.clientes_estado(p_uid); end if;
  select count(*) into v_act from jsonb_each(v_hist) e where (e.value ->> 'cap')::int < jsonb_array_length(v_h -> e.key);
  v_lim := case when tpp.rango_glob(v_glob) >= 1 then 2 else 1 end;
  if v_act >= v_lim then
    return jsonb_build_object('ok', false, 'error', 'limite_historias') || tpp.clientes_estado(p_uid);
  end if;
  update tpp.perfiles set historias = historias || jsonb_build_object(p_key, jsonb_build_object('cap', 0, 'desde', extract(epoch from now())::bigint)) where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.clientes_estado(p_uid);
end;
$f$;

-- Estado de las historias y de la reputación. También aplica los plazos vencidos (−30 y vuelve a empezar el plazo).
create or replace function tpp.clientes_estado(p_uid uuid) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare
  v_h jsonb := tpp.historias();
  v_hist jsonb;
  v_rep jsonb;
  v_glob integer;
  v_key text;
  v_cap integer;
  v_n integer;
  v_st jsonb;
  v_ch jsonb;
  v_desde bigint;
  v_ahora bigint := extract(epoch from now())::bigint;
  v_out jsonb := '[]'::jsonb;
  v_plan jsonb;
  v_vier timestamptz;
  v_act integer := 0;
begin
  perform tpp.asegurar_perfil(p_uid);
  select historias into v_hist from tpp.perfiles where id = p_uid for update;
  for v_key in select jsonb_object_keys(v_h) loop
    v_n := jsonb_array_length(v_h -> v_key);
    v_st := v_hist -> v_key;
    if v_st is not null then
      v_cap := (v_st ->> 'cap')::int;
      v_desde := (v_st ->> 'desde')::bigint;
      if v_cap < v_n then
        v_ch := v_h -> v_key -> v_cap;
        if v_ch ? 'plazo' and v_ahora > v_desde + (v_ch ->> 'plazo')::bigint then
          perform tpp.sumar_rep(p_uid, v_key, -30);
          v_desde := v_ahora;
          update tpp.perfiles set historias = historias || jsonb_build_object(v_key, v_st || jsonb_build_object('desde', v_desde)) where id = p_uid;
          perform tpp.notificar(p_uid, 'encargo', 'Se te acabó el plazo', 'Un capítulo caducó: −30 de reputación. El plazo empieza de nuevo.');
        end if;
        v_act := v_act + 1;
      end if;
    end if;
  end loop;
  select historias, reputacion, reputacion_global into v_hist, v_rep, v_glob from tpp.perfiles where id = p_uid;
  for v_key in select jsonb_object_keys(v_h) loop
    v_n := jsonb_array_length(v_h -> v_key);
    v_st := v_hist -> v_key;
    v_cap := coalesce((v_st ->> 'cap')::int, 0);
    v_desde := coalesce((v_st ->> 'desde')::bigint, v_ahora);
    v_ch := case when v_cap < v_n then v_h -> v_key -> v_cap else null end;
    v_plan := case when v_ch is not null then tpp.hist_plan(p_uid, v_ch) else null end;
    v_vier := case when v_ch is not null and v_ch ? 'viernes' then tpp.hist_viernes(v_desde) else null end;
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'id', v_key,
      'rep', coalesce((v_rep ->> v_key)::int, 0),
      'activa', v_st is not null,
      'cap', v_cap,
      'n', v_n,
      'capitulo', v_ch,
      'plan', v_plan,
      'pago', case when v_ch is not null then tpp.hist_pago(p_uid, v_key, v_ch, v_desde) else null end,
      'restan', case when v_st is not null and v_ch ? 'plazo' then greatest(0, v_desde + (v_ch ->> 'plazo')::bigint - v_ahora) else null end,
      'restan_viernes', case when v_st is not null and v_vier is not null and now() <= v_vier then greatest(0, floor(extract(epoch from (v_vier - now())))::int) else null end,
      'restan_rapido', case when v_st is not null and v_ch ? 'rapido' and v_ahora <= v_desde + (v_ch -> 'rapido' ->> 'plazo')::bigint
                            then v_desde + (v_ch -> 'rapido' ->> 'plazo')::bigint - v_ahora else null end));
  end loop;
  return jsonb_build_object(
    'global', v_glob,
    'limite', case when tpp.rango_glob(v_glob) >= 1 then 2 else 1 end,
    'activas', v_act,
    'historias', v_out,
    'reputacion', v_rep);
end;
$f$;

-- Entrega el capítulo en curso de una historia.
create or replace function tpp.entregar_historia(p_uid uuid, p_key text) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare
  v_h jsonb := tpp.historias();
  v_st jsonb;
  v_cap integer;
  v_n integer;
  v_ch jsonb;
  v_desde bigint;
  v_plan jsonb;
  v_pago integer;
  v_ganancia integer;
  e record;
  v_k text;
  v_mar jsonb;
  v_alm jsonb;
begin
  perform tpp.asegurar_perfil(p_uid);
  perform tpp.clientes_estado(p_uid);
  select historias -> p_key into v_st from tpp.perfiles where id = p_uid for update;
  if v_st is null or not (v_h ? p_key) then
    return jsonb_build_object('ok', false, 'error', 'historia_sin_empezar') || tpp.clientes_estado(p_uid);
  end if;
  v_cap := (v_st ->> 'cap')::int;
  v_n := jsonb_array_length(v_h -> p_key);
  if v_cap >= v_n then return jsonb_build_object('ok', false, 'error', 'historia_terminada') || tpp.clientes_estado(p_uid); end if;
  v_ch := v_h -> p_key -> v_cap;
  v_desde := (v_st ->> 'desde')::bigint;
  v_plan := tpp.hist_plan(p_uid, v_ch);
  if not (v_plan ->> 'ok')::boolean then
    return jsonb_build_object('ok', false, 'error', 'faltan_requisitos') || tpp.clientes_estado(p_uid);
  end if;
  v_pago := tpp.hist_pago(p_uid, p_key, v_ch, v_desde);
  v_ganancia := round((v_ch ->> 'rep')::int * case when v_ch ? 'plazo' and extract(epoch from now()) < v_desde + (v_ch ->> 'plazo')::bigint / 2 then 1.5 else 1 end)::int;
  select almacen, almacen_marcas into v_alm, v_mar from tpp.perfiles where id = p_uid;
  for e in select k.key as v, k.value::int as g from jsonb_each_text(v_plan -> 'tomar') k loop
    v_alm := v_alm || jsonb_build_object(e.v, coalesce((v_alm ->> e.v)::int, 0) - e.g);
    foreach v_k in array array['org', 'limpia', 'curado', 'top'] loop
      if coalesce((v_ch ->> v_k)::boolean, false) then
        v_mar := jsonb_set(v_mar, array[e.v, v_k], to_jsonb(greatest(0, coalesce((v_mar -> e.v ->> v_k)::int, 0) - e.g)), true);
      end if;
    end loop;
  end loop;
  update tpp.perfiles set
    almacen = v_alm,
    almacen_marcas = v_mar,
    almacen_calidad = (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from jsonb_each(almacen_calidad) t(k, v) where coalesce((v_alm ->> k)::int, 0) > 0),
    monedas = monedas + v_pago,
    historias = historias || jsonb_build_object(p_key, jsonb_build_object('cap', v_cap + 1, 'desde', extract(epoch from now())::bigint))
    where id = p_uid;
  perform tpp.sumar_rep(p_uid, p_key, v_ganancia);
  if coalesce((v_ch ->> 'vip')::boolean, false) then
    update tpp.perfiles set reputacion = reputacion || jsonb_build_object(p_key, greatest(1000, coalesce((reputacion ->> p_key)::int, 0))) where id = p_uid;
  end if;
  if coalesce((v_ch ->> 'rosa')::boolean, false) then
    update tpp.perfiles set reputacion = reputacion || jsonb_build_object('0', greatest(600, coalesce((reputacion ->> '0')::int, 500))) where id = p_uid;
  end if;
  perform tpp.pase_puntos(p_uid, 40);
  perform tpp.notificar(p_uid, 'encargo', 'Capítulo entregado: ' || (v_ch ->> 't'), '+' || v_pago || ' monedas y +' || v_ganancia || ' de reputación.');
  return jsonb_build_object('ok', true, 'recompensa', v_pago) || tpp.clientes_estado(p_uid) || tpp.estado_json(p_uid);
end;
$f$;

create or replace function public.tpp_clientes() returns jsonb language plpgsql security definer set search_path = '' as
$f$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.clientes_estado(auth.uid());
end;
$f$;

create or replace function public.tpp_empezar_historia(p_clave text) returns jsonb language plpgsql security definer set search_path = '' as
$f$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.empezar_historia(auth.uid(), p_clave);
end;
$f$;

create or replace function public.tpp_entregar_historia(p_clave text) returns jsonb language plpgsql security definer set search_path = '' as
$f$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.entregar_historia(auth.uid(), p_clave);
end;
$f$;

-- Encargos normales: nueva escala de reputación.
do $mig$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('tpp.entregar_encargo(uuid,text)'::regprocedure); o := d;
  d := replace(d, E'  r_cli := coalesce((rep ->> cli)::int, 50);\n  if r_cli >= 75 then extra := extra + 0.1; end if;',
    E'  r_cli := coalesce((rep ->> cli)::int, 500);\n  if r_cli >= 1000 then extra := extra + 0.2; elsif r_cli >= 300 then extra := extra + 0.05; end if;');
  if d = o then raise exception 'entregar_encargo: rango'; end if;
  o := d;
  d := replace(d, E'    reputacion = case when cli is null then reputacion\n                      else reputacion || jsonb_build_object(cli, least(100, r_cli + 5)) end,\n', '');
  if d = o then raise exception 'entregar_encargo: reputacion'; end if;
  o := d;
  d := replace(d, E'  perform tpp.pase_puntos(p_uid, 30);',
    E'  if cli is not null then\n    perform tpp.sumar_rep(p_uid, cli, (50 * case when restan > plazo / 2 then 1.5 else 1 end)::int);\n  end if;\n  perform tpp.pase_puntos(p_uid, 30);');
  if d = o then raise exception 'entregar_encargo: pase'; end if;
  execute d;

  d := pg_get_functiondef('tpp.encargos_al_dia(uuid)'::regprocedure); o := d;
  d := replace(d, 'coalesce((rep_j ->> c::text)::int, 50) >= 25', 'coalesce((rep_j ->> c::text)::int, 500) >= 250');
  if d = o then raise exception 'encargos_al_dia: filtro'; end if;
  o := d;
  d := replace(d, 'greatest(0, coalesce((pf.reputacion ->> c)::int, 50) - 10 * n)', 'greatest(0, coalesce((pf.reputacion ->> c)::int, 500) - 30 * n)');
  if d = o then raise exception 'encargos_al_dia: caducados'; end if;
  execute d;

  d := pg_get_functiondef('tpp.rechazar_encargo(uuid,text)'::regprocedure); o := d;
  d := replace(d, E'  if coalesce(x ->> ''estado'', ''aceptado'') = ''aceptado'' then\n    if x ->> ''cliente'' is not null then\n      update tpp.perfiles set reputacion = reputacion || jsonb_build_object(x ->> ''cliente'', greatest(0, coalesce((reputacion ->> (x ->> ''cliente''))::int, 50) - 10)) where id = p_uid;\n    end if;\n',
    E'  if x ->> ''cliente'' is not null then\n    perform tpp.sumar_rep(p_uid, x ->> ''cliente'', -30);\n  end if;\n  if coalesce(x ->> ''estado'', ''aceptado'') = ''aceptado'' then\n');
  if d = o then raise exception 'rechazar_encargo: sin cambio'; end if;
  execute d;
end $mig$;

revoke all on function tpp.rango_cli(integer), tpp.rango_glob(integer), tpp.rep_cliente(uuid, text), tpp.sumar_rep(uuid, text, integer),
  tpp.historias(), tpp.hist_plan(uuid, jsonb), tpp.hist_viernes(bigint), tpp.hist_pago(uuid, text, jsonb, bigint),
  tpp.empezar_historia(uuid, text), tpp.clientes_estado(uuid), tpp.entregar_historia(uuid, text) from public, anon, authenticated;
revoke all on function public.tpp_clientes(), public.tpp_empezar_historia(text), public.tpp_entregar_historia(text) from public, anon;
grant execute on function public.tpp_clientes(), public.tpp_empezar_historia(text), public.tpp_entregar_historia(text) to authenticated;
