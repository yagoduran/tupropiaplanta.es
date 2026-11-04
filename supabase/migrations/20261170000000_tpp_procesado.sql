-- 8j · Mesa de procesado: prensa, extractor y horno.
-- Materias primas: restos de poda (el 30 % de lo cosechado, con su calidad), cogollos de 1–2★ del almacén y masas de la tienda.
-- Cada puesto tiene una cola de 3 recetas; la siguiente empieza al recoger la anterior. Si te pasas de la ventana: mitad y −1★, o se pierde (comestibles).
-- Estado en perfiles.procesado = {materias:{restos:{n,q}, "masa-galletas":n, "masa-brownie":n}, puestos:{prensa:[trabajos], extractor:[], horno:[]},
--   prod:{hachis:{n,q},…}, enc:{lunes, hechos:[claves]}}. Trabajo = {rec, q, dur, win, ini (null = en espera), gasto}.

alter table tpp.perfiles add column if not exists procesado jsonb not null default '{}'::jsonb;

-- Recetas. t, win en segundos. ins: [ingrediente, cantidad]. mult = veces los 12 por gramo; unit = precio por unidad.
create or replace function tpp.proc_recetas() returns jsonb language sql immutable set search_path = '' as
$f$ select '{
 "hachis":    {"st":"prensa","ins":[["restos",20]],"t":7200,"out":6,"mult":3,"win":86400,"ruin":"half","plus":0},
 "rosin":     {"st":"prensa","ins":[["cogollos",10]],"t":3600,"out":3,"mult":5,"win":43200,"ruin":"half","plus":1},
 "extracto":  {"st":"extractor","ins":[["restos",30],["cogollos",10]],"t":21600,"out":5,"mult":7,"win":172800,"ruin":"half","plus":0},
 "diamantes": {"st":"extractor","ins":[["extracto",4]],"t":43200,"out":2,"mult":14,"win":172800,"ruin":"half","plus":1},
 "galletas":  {"st":"horno","ins":[["hachis",2],["masa-galletas",1]],"t":2400,"out":8,"unit":90,"win":10800,"ruin":"all","plus":0},
 "brownies":  {"st":"horno","ins":[["rosin",1],["masa-brownie",1]],"t":3600,"out":6,"unit":160,"win":14400,"ruin":"all","plus":0}
}'::jsonb $f$;

-- Encargos especiales (se renuevan cada lunes). cli = retrato; sh = hoja (cli = clientes, eco = economía).
create or replace function tpp.proc_encargos() returns jsonb language sql immutable set search_path = '' as
$f$ select '[
 {"k":"cafe","n":"Carmen · Cafetería La Hoja","sh":"cli","i":6,"p":"galletas","need":12,"q":3,"pay":1400},
 {"k":"asoc","n":"Abuela Pilar · Asociación de jubilados","sh":"eco","i":1,"p":"brownies","need":6,"q":3,"pay":1300},
 {"k":"raiz","n":"MC Raíz · fiesta del disco","sh":"eco","i":0,"p":"rosin","need":5,"q":2,"pay":1200}
]'::jsonb $f$;

-- Factor de calidad en el precio.
create or replace function tpp.proc_fq(p_q integer) returns numeric language sql immutable set search_path = '' as
$f$ select case p_q when 1 then 0.8 when 2 then 0.9 when 3 then 1 when 4 then 1.2 else 1.5 end $f$;

-- Suma restos de poda a las materias primas (los da la cosecha).
create or replace function tpp.procesado_restos(p_uid uuid, p_g integer, p_q integer) returns void
language plpgsql security definer set search_path = '' as
$f$
declare
  v_p jsonb;
  v_n integer;
  v_q numeric;
begin
  if p_g <= 0 then return; end if;
  select procesado into v_p from tpp.perfiles where id = p_uid;
  v_n := coalesce((v_p -> 'materias' -> 'restos' ->> 'n')::int, 0);
  v_q := coalesce((v_p -> 'materias' -> 'restos' ->> 'q')::numeric, p_q);
  v_p := jsonb_set(coalesce(v_p, '{}'::jsonb), '{materias,restos}',
    jsonb_build_object('n', v_n + p_g, 'q', round((v_q * v_n + p_q * p_g) / (v_n + p_g), 2)), true);
  update tpp.perfiles set procesado = v_p where id = p_uid;
end;
$f$;

-- Estado de la mesa: materias, puestos con sus trabajos, productos y encargos.
create or replace function tpp.procesado_estado(p_uid uuid) returns jsonb language plpgsql stable security definer set search_path = '' as
$f$
declare
  v_p jsonb;
  v_alm jsonb;
  v_cal jsonb;
  v_rec jsonb := tpp.proc_recetas();
  v_ahora bigint := extract(epoch from now())::bigint;
  v_lunes date := tpp.mercado_lunes(now());
  v_puestos jsonb := '{}'::jsonb;
  v_pu text;
  v_jobs jsonb;
  v_out jsonb;
  j jsonb;
  v_ini bigint;
  v_fin bigint;
  v_st text;
  v_cog integer := 0;
  v_cogq integer := 3;
  r record;
  v_hechos jsonb;
  v_enc jsonb := '[]'::jsonb;
  e jsonb;
  v_prod jsonb;
begin
  select procesado, almacen, almacen_calidad into v_p, v_alm, v_cal from tpp.perfiles where id = p_uid;
  v_p := coalesce(v_p, '{}'::jsonb);
  foreach v_pu in array array['prensa', 'extractor', 'horno'] loop
    v_jobs := coalesce(v_p -> 'puestos' -> v_pu, '[]'::jsonb);
    v_out := '[]'::jsonb;
    for j in select x from jsonb_array_elements(v_jobs) x loop
      if j ->> 'ini' is null or j ->> 'ini' = 'null' then
        v_st := 'espera'; v_fin := null;
      else
        v_ini := (j ->> 'ini')::bigint;
        v_fin := v_ini + (j ->> 'dur')::bigint;
        v_st := case when v_ahora < v_fin then 'procesando' when v_ahora <= v_fin + (j ->> 'win')::bigint then 'listo' else 'estropeado' end;
      end if;
      v_out := v_out || jsonb_build_array(jsonb_build_object('rec', j ->> 'rec', 'q', (j ->> 'q')::int, 'estado', v_st,
        'restan', case when v_st = 'procesando' then v_fin - v_ahora else null end,
        'caduca', case when v_st = 'listo' then v_fin + (j ->> 'win')::bigint - v_ahora else null end));
    end loop;
    v_puestos := v_puestos || jsonb_build_object(v_pu, v_out);
  end loop;
  for r in select e.key as v, e.value::int as g, coalesce((v_cal ->> e.key)::numeric, 3) as c
           from jsonb_each_text(v_alm) e where e.value::int > 0 and round(coalesce((v_cal ->> e.key)::numeric, 3)) <= 2 loop
    v_cog := v_cog + r.g;
    v_cogq := least(v_cogq, round(r.c)::int);
  end loop;
  v_hechos := case when (v_p -> 'enc' ->> 'lunes') = v_lunes::text then coalesce(v_p -> 'enc' -> 'hechos', '[]'::jsonb) else '[]'::jsonb end;
  v_prod := coalesce(v_p -> 'prod', '{}'::jsonb);
  for e in select x from jsonb_array_elements(tpp.proc_encargos()) x loop
    v_enc := v_enc || jsonb_build_array(e || jsonb_build_object('hecho', v_hechos ? (e ->> 'k'),
      'tengo', case when coalesce((v_prod -> (e ->> 'p') ->> 'q')::int, 0) >= (e ->> 'q')::int then coalesce((v_prod -> (e ->> 'p') ->> 'n')::int, 0) else 0 end));
  end loop;
  return jsonb_build_object(
    'recetas', v_rec,
    'restos', coalesce(v_p -> 'materias' -> 'restos', jsonb_build_object('n', 0, 'q', 3)),
    'cogollos', jsonb_build_object('n', v_cog, 'q', v_cogq),
    'masas', jsonb_build_object('masa-galletas', coalesce((v_p -> 'materias' ->> 'masa-galletas')::int, 0), 'masa-brownie', coalesce((v_p -> 'materias' ->> 'masa-brownie')::int, 0)),
    'puestos', v_puestos,
    'prod', v_prod,
    'encargos', v_enc,
    'mult_ventas', tpp.mult_ventas(p_uid),
    'queda', greatest(0, extract(epoch from (((v_lunes + 7)::timestamp at time zone 'Europe/Madrid') - now()))::int));
end;
$f$;

-- Añade una receta a la cola de su puesto. Gasta los ingredientes al momento.
create or replace function tpp.procesado_anadir(p_uid uuid, p_rec text) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare
  v_p jsonb;
  v_alm jsonb;
  v_cal jsonb;
  v_rec jsonb := tpp.proc_recetas() -> p_rec;
  v_pu text;
  v_cola jsonb;
  v_ins jsonb;
  v_k text;
  v_n integer;
  v_have integer;
  v_q integer := 6;
  v_gasto jsonb := '{}'::jsonb;
  v_cogs jsonb := '{}'::jsonb;
  v_falta integer;
  v_t integer;
  v_trab jsonb;
  r record;
begin
  perform tpp.asegurar_perfil(p_uid);
  if v_rec is null then return jsonb_build_object('ok', false, 'error', 'receta_desconocida') || tpp.procesado_estado(p_uid); end if;
  select procesado, almacen, almacen_calidad into v_p, v_alm, v_cal from tpp.perfiles where id = p_uid for update;
  v_p := coalesce(v_p, '{}'::jsonb);
  v_pu := v_rec ->> 'st';
  v_cola := coalesce(v_p -> 'puestos' -> v_pu, '[]'::jsonb);
  if jsonb_array_length(v_cola) >= 3 then return jsonb_build_object('ok', false, 'error', 'cola_llena') || tpp.procesado_estado(p_uid); end if;
  for v_ins in select x from jsonb_array_elements(v_rec -> 'ins') x loop
    v_k := v_ins ->> 0;
    v_n := (v_ins ->> 1)::int;
    if v_k = 'restos' then
      v_have := coalesce((v_p -> 'materias' -> 'restos' ->> 'n')::int, 0);
      if v_have < v_n then return jsonb_build_object('ok', false, 'error', 'faltan_ingredientes') || tpp.procesado_estado(p_uid); end if;
      v_q := least(v_q, round(coalesce((v_p -> 'materias' -> 'restos' ->> 'q')::numeric, 3))::int);
      v_gasto := v_gasto || jsonb_build_object('restos', jsonb_build_object('n', v_n, 'q', coalesce((v_p -> 'materias' -> 'restos' ->> 'q')::numeric, 3)));
      v_p := jsonb_set(v_p, '{materias,restos,n}', to_jsonb(v_have - v_n), true);
    elsif v_k = 'cogollos' then
      v_falta := v_n;
      for r in select e.key as v, e.value::int as g, coalesce((v_cal ->> e.key)::numeric, 3) as c
               from jsonb_each_text(v_alm) e where e.value::int > 0 and round(coalesce((v_cal ->> e.key)::numeric, 3)) <= 2 order by 3 loop
        exit when v_falta <= 0;
        v_t := least(r.g, v_falta);
        v_cogs := v_cogs || jsonb_build_object(r.v, jsonb_build_object('n', v_t, 'q', r.c));
        v_alm := v_alm || jsonb_build_object(r.v, r.g - v_t);
        v_q := least(v_q, round(r.c)::int);
        v_falta := v_falta - v_t;
      end loop;
      if v_falta > 0 then return jsonb_build_object('ok', false, 'error', 'faltan_ingredientes') || tpp.procesado_estado(p_uid); end if;
      v_gasto := v_gasto || jsonb_build_object('cogollos', v_cogs);
    elsif v_k like 'masa-%' then
      v_have := coalesce((v_p -> 'materias' ->> v_k)::int, 0);
      if v_have < v_n then return jsonb_build_object('ok', false, 'error', 'faltan_ingredientes') || tpp.procesado_estado(p_uid); end if;
      v_gasto := v_gasto || jsonb_build_object(v_k, v_n);
      v_p := jsonb_set(v_p, array['materias', v_k], to_jsonb(v_have - v_n), true);
    else
      v_have := coalesce((v_p -> 'prod' -> v_k ->> 'n')::int, 0);
      if v_have < v_n then return jsonb_build_object('ok', false, 'error', 'faltan_ingredientes') || tpp.procesado_estado(p_uid); end if;
      v_q := least(v_q, coalesce((v_p -> 'prod' -> v_k ->> 'q')::int, 3));
      v_gasto := v_gasto || jsonb_build_object(v_k, jsonb_build_object('n', v_n, 'q', coalesce((v_p -> 'prod' -> v_k ->> 'q')::int, 3)));
      v_p := jsonb_set(v_p, array['prod', v_k, 'n'], to_jsonb(v_have - v_n), true);
    end if;
  end loop;
  if v_q > 5 then v_q := 3; end if;
  v_q := greatest(1, least(5, v_q + (v_rec ->> 'plus')::int));
  v_trab := jsonb_build_object('rec', p_rec, 'q', v_q, 'dur', (v_rec ->> 't')::int, 'win', (v_rec ->> 'win')::int,
    'ini', case when jsonb_array_length(v_cola) = 0 then extract(epoch from now())::bigint else null end, 'gasto', v_gasto);
  v_p := jsonb_set(v_p, array['puestos', v_pu], v_cola || jsonb_build_array(v_trab), true);
  update tpp.perfiles set
    procesado = v_p,
    almacen = v_alm,
    almacen_calidad = (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from jsonb_each(almacen_calidad) t(k, v) where coalesce((v_alm ->> k)::int, 0) > 0)
    where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.procesado_estado(p_uid);
end;
$f$;

-- Devuelve los ingredientes de un trabajo quitado de la cola.
create or replace function tpp.proc_devolver(p_uid uuid, p_gasto jsonb) returns void language plpgsql security definer set search_path = '' as
$f$
declare
  v_p jsonb;
  v_alm jsonb;
  v_cal jsonb;
  g record;
  c record;
  v_n integer;
  v_qa numeric;
begin
  select procesado, almacen, almacen_calidad into v_p, v_alm, v_cal from tpp.perfiles where id = p_uid;
  for g in select key as k, value as v from jsonb_each(p_gasto) loop
    if g.k = 'restos' then
      v_n := coalesce((v_p -> 'materias' -> 'restos' ->> 'n')::int, 0);
      v_p := jsonb_set(coalesce(v_p, '{}'::jsonb), '{materias,restos}', jsonb_build_object('n', v_n + (g.v ->> 'n')::int, 'q', (g.v ->> 'q')::numeric), true);
    elsif g.k = 'cogollos' then
      for c in select key as v, value as d from jsonb_each(g.v) loop
        v_n := coalesce((v_alm ->> c.v)::int, 0);
        v_qa := coalesce((v_cal ->> c.v)::numeric, 3);
        v_cal := v_cal || jsonb_build_object(c.v, round((v_qa * v_n + (c.d ->> 'q')::numeric * (c.d ->> 'n')::int) / greatest(1, v_n + (c.d ->> 'n')::int), 2));
        v_alm := v_alm || jsonb_build_object(c.v, v_n + (c.d ->> 'n')::int);
      end loop;
    elsif g.k like 'masa-%' then
      v_p := jsonb_set(coalesce(v_p, '{}'::jsonb), array['materias', g.k], to_jsonb(coalesce((v_p -> 'materias' ->> g.k)::int, 0) + g.v::text::int), true);
    else
      v_p := jsonb_set(coalesce(v_p, '{}'::jsonb), array['prod', g.k], jsonb_build_object(
        'n', coalesce((v_p -> 'prod' -> g.k ->> 'n')::int, 0) + (g.v ->> 'n')::int,
        'q', coalesce((v_p -> 'prod' -> g.k ->> 'q')::int, (g.v ->> 'q')::int)), true);
    end if;
  end loop;
  update tpp.perfiles set procesado = v_p, almacen = v_alm, almacen_calidad = v_cal where id = p_uid;
end;
$f$;

-- Quita una receta en espera (no la que está en marcha) y devuelve los ingredientes.
create or replace function tpp.procesado_quitar(p_uid uuid, p_puesto text, p_idx integer) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare
  v_p jsonb;
  v_cola jsonb;
  v_nueva jsonb;
begin
  perform tpp.asegurar_perfil(p_uid);
  select procesado into v_p from tpp.perfiles where id = p_uid for update;
  v_cola := coalesce(v_p -> 'puestos' -> p_puesto, '[]'::jsonb);
  if p_idx < 1 or p_idx >= jsonb_array_length(v_cola) then return jsonb_build_object('ok', false, 'error', 'no_se_puede_quitar') || tpp.procesado_estado(p_uid); end if;
  perform tpp.proc_devolver(p_uid, v_cola -> p_idx -> 'gasto');
  select procesado into v_p from tpp.perfiles where id = p_uid;
  select coalesce(jsonb_agg(x order by o), '[]'::jsonb) into v_nueva from jsonb_array_elements(v_cola) with ordinality t(x, o) where o - 1 <> p_idx;
  v_p := jsonb_set(v_p, array['puestos', p_puesto], v_nueva, true);
  update tpp.perfiles set procesado = v_p where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.procesado_estado(p_uid);
end;
$f$;

-- Recoge el trabajo de la cabeza del puesto (listo o estropeado) y arranca el siguiente.
create or replace function tpp.procesado_recoger(p_uid uuid, p_puesto text) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare
  v_p jsonb;
  v_cola jsonb;
  v_j jsonb;
  v_rec jsonb;
  v_ahora bigint := extract(epoch from now())::bigint;
  v_ini bigint;
  v_fin bigint;
  v_n integer;
  v_q integer;
  v_estropeado boolean;
  v_prev integer;
  v_pq numeric;
  v_resto jsonb;
  v_txt text;
begin
  perform tpp.asegurar_perfil(p_uid);
  select procesado into v_p from tpp.perfiles where id = p_uid for update;
  v_p := coalesce(v_p, '{}'::jsonb);
  v_cola := coalesce(v_p -> 'puestos' -> p_puesto, '[]'::jsonb);
  if jsonb_array_length(v_cola) = 0 then return jsonb_build_object('ok', false, 'error', 'puesto_vacio') || tpp.procesado_estado(p_uid); end if;
  v_j := v_cola -> 0;
  v_ini := (v_j ->> 'ini')::bigint;
  v_fin := v_ini + (v_j ->> 'dur')::bigint;
  if v_ahora < v_fin then return jsonb_build_object('ok', false, 'error', 'aun_procesando') || tpp.procesado_estado(p_uid); end if;
  v_rec := tpp.proc_recetas() -> (v_j ->> 'rec');
  v_estropeado := v_ahora > v_fin + (v_j ->> 'win')::bigint;
  v_n := (v_rec ->> 'out')::int;
  v_q := (v_j ->> 'q')::int;
  if v_estropeado then
    if v_rec ->> 'ruin' = 'all' then v_n := 0; else v_n := v_n / 2; v_q := greatest(1, v_q - 1); end if;
  end if;
  if v_n > 0 then
    v_prev := coalesce((v_p -> 'prod' -> (v_j ->> 'rec') ->> 'n')::int, 0);
    v_pq := coalesce((v_p -> 'prod' -> (v_j ->> 'rec') ->> 'q')::numeric, v_q);
    v_p := jsonb_set(v_p, array['prod', v_j ->> 'rec'], jsonb_build_object('n', v_prev + v_n, 'q', round((v_pq * v_prev + v_q * v_n) / (v_prev + v_n))::int), true);
  end if;
  select coalesce(jsonb_agg(x order by o), '[]'::jsonb) into v_resto from jsonb_array_elements(v_cola) with ordinality t(x, o) where o > 1;
  if jsonb_array_length(v_resto) > 0 then
    v_resto := jsonb_set(v_resto, '{0,ini}', to_jsonb(v_ahora), true);
  end if;
  v_p := jsonb_set(v_p, array['puestos', p_puesto], v_resto, true);
  update tpp.perfiles set procesado = v_p where id = p_uid;
  return jsonb_build_object('ok', true, 'cantidad', v_n, 'estropeado', v_estropeado) || tpp.procesado_estado(p_uid);
end;
$f$;

-- Precio de una unidad (o gramo) de un producto, con su calidad.
create or replace function tpp.proc_precio(p_prod text, p_q integer) returns numeric language sql immutable set search_path = '' as
$f$
  select coalesce((r ->> 'unit')::numeric, 12 * (r ->> 'mult')::numeric) * tpp.proc_fq(p_q) from (select tpp.proc_recetas() -> p_prod as r) s
$f$;

-- Vende productos procesados (todos si no se indica cantidad).
create or replace function tpp.procesado_vender(p_uid uuid, p_prod text, p_cant integer) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare
  v_p jsonb;
  v_n integer;
  v_q integer;
  v_c integer;
  v_pago integer;
begin
  perform tpp.asegurar_perfil(p_uid);
  select procesado into v_p from tpp.perfiles where id = p_uid for update;
  v_n := coalesce((v_p -> 'prod' -> p_prod ->> 'n')::int, 0);
  v_q := coalesce((v_p -> 'prod' -> p_prod ->> 'q')::int, 3);
  v_c := least(v_n, coalesce(p_cant, v_n));
  if v_c <= 0 then return jsonb_build_object('ok', false, 'error', 'sin_gramos') || tpp.procesado_estado(p_uid); end if;
  v_pago := round(v_c * tpp.proc_precio(p_prod, v_q) * tpp.mult_ventas(p_uid))::int;
  v_p := jsonb_set(v_p, array['prod', p_prod, 'n'], to_jsonb(v_n - v_c), true);
  update tpp.perfiles set procesado = v_p, monedas = monedas + v_pago where id = p_uid;
  return jsonb_build_object('ok', true, 'recompensa', v_pago) || tpp.procesado_estado(p_uid) || tpp.estado_json(p_uid);
end;
$f$;

-- Compra masa de galletas (120) o de brownie (150) en la tienda.
create or replace function tpp.procesado_comprar_masa(p_uid uuid, p_masa text, p_cant integer) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare
  v_p jsonb;
  v_precio integer := case p_masa when 'masa-galletas' then 120 when 'masa-brownie' then 150 else null end;
  v_mon integer;
  v_total integer;
begin
  perform tpp.asegurar_perfil(p_uid);
  if v_precio is null or p_cant is null or p_cant < 1 or p_cant > 20 then return jsonb_build_object('ok', false, 'error', 'cantidad_invalida') || tpp.procesado_estado(p_uid); end if;
  select procesado, monedas into v_p, v_mon from tpp.perfiles where id = p_uid for update;
  v_total := v_precio * p_cant;
  if v_mon < v_total then return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.procesado_estado(p_uid); end if;
  v_p := jsonb_set(coalesce(v_p, '{}'::jsonb), array['materias', p_masa], to_jsonb(coalesce((v_p -> 'materias' ->> p_masa)::int, 0) + p_cant), true);
  update tpp.perfiles set procesado = v_p, monedas = monedas - v_total where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.procesado_estado(p_uid) || tpp.estado_json(p_uid);
end;
$f$;

-- Entrega un encargo especial de la semana.
create or replace function tpp.procesado_entregar(p_uid uuid, p_clave text) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare
  v_p jsonb;
  v_e jsonb;
  v_lunes date := tpp.mercado_lunes(now());
  v_hechos jsonb;
  v_n integer;
  v_q integer;
begin
  perform tpp.asegurar_perfil(p_uid);
  select x into v_e from jsonb_array_elements(tpp.proc_encargos()) x where x ->> 'k' = p_clave;
  if v_e is null then return jsonb_build_object('ok', false, 'error', 'encargo_desconocido') || tpp.procesado_estado(p_uid); end if;
  select procesado into v_p from tpp.perfiles where id = p_uid for update;
  v_p := coalesce(v_p, '{}'::jsonb);
  v_hechos := case when (v_p -> 'enc' ->> 'lunes') = v_lunes::text then coalesce(v_p -> 'enc' -> 'hechos', '[]'::jsonb) else '[]'::jsonb end;
  if v_hechos ? p_clave then return jsonb_build_object('ok', false, 'error', 'encargo_hecho') || tpp.procesado_estado(p_uid); end if;
  v_n := coalesce((v_p -> 'prod' -> (v_e ->> 'p') ->> 'n')::int, 0);
  v_q := coalesce((v_p -> 'prod' -> (v_e ->> 'p') ->> 'q')::int, 0);
  if v_n < (v_e ->> 'need')::int or v_q < (v_e ->> 'q')::int then return jsonb_build_object('ok', false, 'error', 'faltan_requisitos') || tpp.procesado_estado(p_uid); end if;
  v_p := jsonb_set(v_p, array['prod', v_e ->> 'p', 'n'], to_jsonb(v_n - (v_e ->> 'need')::int), true);
  v_p := jsonb_set(v_p, '{enc}', jsonb_build_object('lunes', v_lunes::text, 'hechos', v_hechos || to_jsonb(p_clave)), true);
  update tpp.perfiles set procesado = v_p, monedas = monedas + (v_e ->> 'pay')::int where id = p_uid;
  perform tpp.pase_puntos(p_uid, 30);
  return jsonb_build_object('ok', true, 'recompensa', (v_e ->> 'pay')::int) || tpp.procesado_estado(p_uid) || tpp.estado_json(p_uid);
end;
$f$;

-- La cosecha da restos de poda (30 % de los gramos, con su calidad).
do $mig$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('tpp.resolver_cosecha(uuid,boolean)'::regprocedure); o := d;
  d := replace(d, '  perform tpp.mision_sumar(p_uid, case when p_vender',
    E'  perform tpp.procesado_restos(p_uid, ceil((c ->> ''gramos'')::numeric * 0.3)::int, coalesce((c ->> ''calidad'')::int, 3));\n  perform tpp.mision_sumar(p_uid, case when p_vender');
  if d = o then raise exception 'resolver_cosecha: no se pudo parchear'; end if;
  execute d;
end $mig$;

create or replace function public.tpp_procesado() returns jsonb language plpgsql security definer set search_path = '' as
$f$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.procesado_estado(auth.uid());
end;
$f$;
create or replace function public.tpp_procesado_anadir(p_receta text) returns jsonb language plpgsql security definer set search_path = '' as
$f$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.procesado_anadir(auth.uid(), p_receta);
end;
$f$;
create or replace function public.tpp_procesado_quitar(p_puesto text, p_idx integer) returns jsonb language plpgsql security definer set search_path = '' as
$f$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.procesado_quitar(auth.uid(), p_puesto, p_idx);
end;
$f$;
create or replace function public.tpp_procesado_recoger(p_puesto text) returns jsonb language plpgsql security definer set search_path = '' as
$f$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.procesado_recoger(auth.uid(), p_puesto);
end;
$f$;
create or replace function public.tpp_procesado_vender(p_producto text, p_cantidad integer) returns jsonb language plpgsql security definer set search_path = '' as
$f$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.procesado_vender(auth.uid(), p_producto, p_cantidad);
end;
$f$;
create or replace function public.tpp_procesado_comprar_masa(p_masa text, p_cantidad integer) returns jsonb language plpgsql security definer set search_path = '' as
$f$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.procesado_comprar_masa(auth.uid(), p_masa, p_cantidad);
end;
$f$;
create or replace function public.tpp_procesado_entregar(p_clave text) returns jsonb language plpgsql security definer set search_path = '' as
$f$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.procesado_entregar(auth.uid(), p_clave);
end;
$f$;

revoke all on function tpp.proc_recetas(), tpp.proc_encargos(), tpp.proc_fq(integer), tpp.procesado_restos(uuid, integer, integer), tpp.procesado_estado(uuid),
  tpp.procesado_anadir(uuid, text), tpp.proc_devolver(uuid, jsonb), tpp.procesado_quitar(uuid, text, integer), tpp.procesado_recoger(uuid, text),
  tpp.proc_precio(text, integer), tpp.procesado_vender(uuid, text, integer), tpp.procesado_comprar_masa(uuid, text, integer),
  tpp.procesado_entregar(uuid, text) from public, anon, authenticated;
revoke all on function public.tpp_procesado(), public.tpp_procesado_anadir(text), public.tpp_procesado_quitar(text, integer),
  public.tpp_procesado_recoger(text), public.tpp_procesado_vender(text, integer), public.tpp_procesado_comprar_masa(text, integer),
  public.tpp_procesado_entregar(text) from public, anon;
grant execute on function public.tpp_procesado(), public.tpp_procesado_anadir(text), public.tpp_procesado_quitar(text, integer),
  public.tpp_procesado_recoger(text), public.tpp_procesado_vender(text, integer), public.tpp_procesado_comprar_masa(text, integer),
  public.tpp_procesado_entregar(text) to authenticated;
