-- El Camino: ruta de 8 capítulos con 3 metas y un premio fijo por capítulo.
-- El avance se calcula en el servidor con lo que ya se guarda del jugador; los capítulos reclamados van en perfiles.camino.
-- Contadores nuevos en estadisticas: vendido_g, secadas, curadas, procesados, encargos.

alter table tpp.perfiles add column if not exists camino jsonb not null default '[]'::jsonb;

-- ============ Contadores nuevos en funciones que ya existen ============

create or replace function tpp.vender_gramos(p_uid uuid, p_variedad text, p_gramos integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  tengo integer;
  n integer;
  pg double precision := coalesce((tpp.datos_variedad(p_uid, p_variedad) ->> 'gramo')::double precision, 6 * coalesce((tpp.datos_variedad(p_uid, p_variedad) ->> 'recompensa')::double precision, 1));
begin
  pg := tpp.mercado_precio(pg, p_variedad);
  select coalesce((almacen ->> p_variedad)::int, 0) into tengo from tpp.perfiles where id = p_uid for update;
  if coalesce(tengo, 0) <= 0 then
    return jsonb_build_object('ok', false, 'error', 'sin_gramos') || tpp.estado_json(p_uid);
  end if;
  n := least(tengo, coalesce(p_gramos, tengo));
  if n <= 0 then
    return jsonb_build_object('ok', false, 'error', 'sin_gramos') || tpp.estado_json(p_uid);
  end if;
  update tpp.perfiles set
    monedas = monedas + round(n * pg * tpp.mult_ventas(p_uid))::int,
    almacen = almacen || jsonb_build_object(p_variedad, tengo - n),
    almacen_calidad = case when tengo - n <= 0 then almacen_calidad - p_variedad else almacen_calidad end
  where id = p_uid;
  perform tpp.contar(p_uid, 'vendido_g', n);
  perform tpp.mision_sumar(p_uid, 'mercado');
  return jsonb_build_object('ok', true, 'recompensa', round(n * pg * tpp.mult_ventas(p_uid))::int, 'gramos', n) || tpp.estado_json(p_uid);
end;
$function$;

create or replace function tpp.sacar_secado(p_uid uuid, p_id integer, p_modo text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  it jsonb;
  r jsonb;
  v text;
  g integer;
  tengo integer;
  cal_ant numeric;
  precio integer;
begin
  if p_modo not in ('vender', 'guardar', 'tirar') then
    return jsonb_build_object('ok', false, 'error', 'modo_no_valido') || tpp.estado_json(p_uid);
  end if;
  select e into it from tpp.perfiles p, jsonb_array_elements(p.secado) e where p.id = p_uid and (e ->> 'id')::int = p_id for update of p;
  if it is null then
    return jsonb_build_object('ok', false, 'error', 'no_existe') || tpp.estado_json(p_uid);
  end if;
  r := tpp.secado_item(it, extract(epoch from now())::bigint);
  if (r ->> 'estado') in ('secando', 'curando') then
    return jsonb_build_object('ok', false, 'error', 'no_listo') || tpp.estado_json(p_uid);
  end if;
  precio := round((r ->> 'precio')::int * tpp.mult_ventas(p_uid))::int;
  if p_modo = 'vender' then
    update tpp.perfiles set monedas = monedas + precio where id = p_uid;
    perform tpp.contar(p_uid, 'vendido_g', coalesce((r ->> 'gramos')::int, 0));
    perform tpp.mision_sumar(p_uid, 'vender');
  elsif p_modo = 'guardar' then
    v := r ->> 'variedad';
    g := (r ->> 'gramos')::int;
    select coalesce((almacen ->> v)::int, 0), coalesce((almacen_calidad ->> v)::numeric, 3)
      into tengo, cal_ant from tpp.perfiles where id = p_uid;
    update tpp.perfiles set
      almacen = almacen || jsonb_build_object(v, tengo + g),
      almacen_calidad = almacen_calidad || jsonb_build_object(v, round((cal_ant * tengo + (r ->> 'cal')::int * g) / greatest(1, tengo + g), 2))
    where id = p_uid;
    perform tpp.marcas_sumar(p_uid, v, g, coalesce((it ->> 'organico')::boolean, false), coalesce((it ->> 'limpia')::boolean, false),
      coalesce((it ->> 'curar')::int, 0) > 0, coalesce((it ->> 'curar')::int, 0) = 72);
    perform tpp.mision_sumar(p_uid, 'guardar');
    precio := 0;
  else
    precio := 0;
  end if;
  if p_modo in ('vender', 'guardar') then
    perform tpp.contar(p_uid, 'secadas', 1);
    if coalesce((it ->> 'curar')::int, 0) > 0 then
      perform tpp.contar(p_uid, 'curadas', 1);
    end if;
  end if;
  update tpp.perfiles set secado = coalesce((select jsonb_agg(e) from jsonb_array_elements(secado) e where (e ->> 'id')::int <> p_id), '[]'::jsonb)
    where id = p_uid;
  return jsonb_build_object('ok', true, 'recompensa', case when p_modo = 'vender' then precio else 0 end, 'secado', tpp.mi_secado(p_uid))
    || tpp.estado_json(p_uid);
end;
$function$;

create or replace function tpp.procesado_recoger(p_uid uuid, p_puesto text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
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
  v_p := tpp.proc_norm(v_p);
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
  if v_n > 0 then
    perform tpp.contar(p_uid, 'procesados', 1);
  end if;
  return jsonb_build_object('ok', true, 'cantidad', v_n, 'estropeado', v_estropeado) || tpp.procesado_estado(p_uid);
end;
$function$;

create or replace function tpp.entregar_encargo(p_uid uuid, p_id text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  e jsonb;
  x jsonb;
  alm jsonb;
  rep jsonb;
  tiene integer;
  q integer;
  cal numeric;
  cli text;
  r_cli integer;
  extra numeric := 0;
  monedas_final integer;
  restan double precision;
  plazo double precision;
begin
  e := tpp.encargos_al_dia(p_uid);
  select y into x from jsonb_array_elements(e -> 'lista') y where y ->> 'id' = p_id;
  if x is null then
    return jsonb_build_object('ok', false, 'error', 'encargo_desconocido') || tpp.estado_json(p_uid);
  end if;
  if coalesce(x ->> 'estado', 'aceptado') <> 'aceptado' then
    return jsonb_build_object('ok', false, 'error', 'sin_aceptar') || tpp.estado_json(p_uid);
  end if;
  select almacen, reputacion, coalesce((almacen_calidad ->> (x ->> 'variedad'))::numeric, 3)
    into alm, rep, cal from tpp.perfiles where id = p_uid for update;
  tiene := coalesce((alm ->> (x ->> 'variedad'))::int, 0);
  if tiene < (x ->> 'g')::int then
    return jsonb_build_object('ok', false, 'error', 'faltan_gramos') || tpp.estado_json(p_uid);
  end if;
  q := coalesce((x ->> 'q')::int, 0);
  if q > 0 and round(cal) < q then
    return jsonb_build_object('ok', false, 'error', 'calidad_baja') || tpp.estado_json(p_uid);
  end if;
  cli := x ->> 'cliente';
  r_cli := coalesce((rep ->> cli)::int, 500);
  if r_cli >= 1000 then extra := extra + 0.2; elsif r_cli >= 300 then extra := extra + 0.05; end if;
  restan := extract(epoch from ((x ->> 'hasta')::timestamptz - now()));
  plazo := coalesce((x ->> 'plazo')::double precision, 86400);
  if cli in ('5', '10') and restan > plazo / 2 then extra := extra + 0.2; end if;
  monedas_final := round((x ->> 'monedas')::int * (1 + extra))::int;
  e := jsonb_set(e, '{lista}', coalesce((select jsonb_agg(y) from jsonb_array_elements(e -> 'lista') y where y ->> 'id' <> p_id), '[]'::jsonb));
  e := jsonb_set(e, '{hist}', jsonb_build_array((x - 'hasta') || jsonb_build_object('estado', 'entregado', 'monedas', monedas_final))
                              || coalesce(e -> 'hist', '[]'::jsonb));
  update tpp.perfiles set
    almacen = almacen || jsonb_build_object(x ->> 'variedad', tiene - (x ->> 'g')::int),
    almacen_calidad = case when tiene - (x ->> 'g')::int <= 0 then almacen_calidad - (x ->> 'variedad') else almacen_calidad end,
    encargos = e,
    monedas = monedas + monedas_final,
    xp = xp + (x ->> 'xp')::int
    where id = p_uid;
  if cli is not null then
    perform tpp.sumar_rep(p_uid, cli, (50 * case when restan > plazo / 2 then 1.5 else 1 end)::int);
  end if;
  perform tpp.contar(p_uid, 'encargos', 1);
  perform tpp.pase_puntos(p_uid, 30);
  perform tpp.mision_sumar(p_uid, 'encargo');
  return jsonb_build_object('ok', true, 'recompensa', monedas_final) || tpp.estado_json(p_uid);
end;
$function$;

-- ============ El Camino ============

-- Definición fija: capítulos, metas (id, texto, objetivo) y premio. Los premios son fijos (no cambian con el nivel).
create or replace function tpp.camino_def() returns jsonb
language sql immutable set search_path = '' as $$
  select '[
    {"n":1,"nombre":"La primera semilla","premio":{"monedas":100,"xp":50},"metas":[
      {"id":"plantar","texto":"Planta una semilla","meta":1},
      {"id":"regar","texto":"Riega una planta","meta":1},
      {"id":"cosechar","texto":"Cosecha una planta","meta":1}]},
    {"n":2,"nombre":"Mi rincón","premio":{"monedas":250,"xp":100},"metas":[
      {"id":"comprar","texto":"Compra algo en la tienda","meta":1},
      {"id":"vender_g","texto":"Vende 50 g","meta":50},
      {"id":"nivel","texto":"Llega al nivel 5","meta":5}]},
    {"n":3,"nombre":"Con buena mano","premio":{"monedas":500,"xp":200},"metas":[
      {"id":"secar","texto":"Seca una cosecha","meta":1},
      {"id":"curar","texto":"Cura una cosecha","meta":1},
      {"id":"plaga","texto":"Trata una plaga","meta":1}]},
    {"n":4,"nombre":"Clientes de confianza","premio":{"monedas":1000,"xp":300,"semillas":1},"metas":[
      {"id":"reputacion","texto":"Consigue 100 de reputación","meta":100},
      {"id":"encargos","texto":"Entrega 3 encargos","meta":3},
      {"id":"cosechas10","texto":"Haz 10 cosechas","meta":10}]},
    {"n":5,"nombre":"Mezclando","premio":{"monedas":1500,"xp":400},"metas":[
      {"id":"cruce","texto":"Haz tu primer cruce","meta":1},
      {"id":"variedades","texto":"Descubre 3 variedades","meta":3},
      {"id":"cruces3","texto":"Haz 3 cruces","meta":3}]},
    {"n":6,"nombre":"Ampliando","premio":{"monedas":2500,"xp":600},"metas":[
      {"id":"habitaciones","texto":"Ten 3 habitaciones","meta":3},
      {"id":"armario","texto":"Mejora el armario de cultivo","meta":2},
      {"id":"nivel15","texto":"Llega al nivel 15","meta":15}]},
    {"n":7,"nombre":"Negocio de verdad","premio":{"monedas":4000,"xp":800},"metas":[
      {"id":"procesado","texto":"Procesa algo en la mesa","meta":1},
      {"id":"monedas5000","texto":"Ten 5.000 monedas","meta":5000},
      {"id":"encargos10","texto":"Entrega 10 encargos","meta":10}]},
    {"n":8,"nombre":"Maestro cultivador","premio":{"monedas":8000,"xp":1500,"semillas":3},"metas":[
      {"id":"maestria","texto":"Maestría 10 en una variedad","meta":10},
      {"id":"cosechas100","texto":"Haz 100 cosechas","meta":100},
      {"id":"nivel25","texto":"Llega al nivel 25","meta":25}]}
  ]'::jsonb;
$$;

-- Valor actual de cada meta del jugador.
create or replace function tpp.camino_valores(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p tpp.perfiles;
  est jsonb;
  nivel integer;
  maest integer;
begin
  select * into p from tpp.perfiles where id = p_uid;
  est := coalesce(p.estadisticas, '{}'::jsonb);
  nivel := tpp.nivel_de(p.xp);
  select coalesce(max(tpp.maestria_nivel(p_uid, k)), 1) into maest from jsonb_object_keys(coalesce(p.maestria, '{}'::jsonb)) k;
  return jsonb_build_object(
    'plantar', (select count(*) from jsonb_object_keys(coalesce(est -> 'variedades', '{}'::jsonb))),
    'regar', coalesce((est ->> 'riegos')::int, 0),
    'cosechar', coalesce((est ->> 'cosechas')::int, 0),
    'comprar', coalesce((est ->> 'compras')::int, 0),
    'vender_g', coalesce((est ->> 'vendido_g')::int, 0),
    'nivel', nivel,
    'secar', coalesce((est ->> 'secadas')::int, 0),
    'curar', coalesce((est ->> 'curadas')::int, 0),
    'plaga', coalesce((est ->> 'plagas_tratadas')::int, 0),
    'reputacion', coalesce(p.reputacion_global, 0),
    'encargos', coalesce((est ->> 'encargos')::int, 0),
    'cosechas10', coalesce((est ->> 'cosechas')::int, 0),
    'cruce', coalesce((est ->> 'cruces')::int, 0),
    'variedades', (select count(*) from jsonb_object_keys(coalesce(est -> 'variedades', '{}'::jsonb))),
    'cruces3', coalesce((est ->> 'cruces')::int, 0),
    'habitaciones', jsonb_array_length(coalesce(p.habitaciones, '[]'::jsonb)),
    'armario', jsonb_array_length(coalesce(p.armario -> 'tengo', '[]'::jsonb)),
    'nivel15', nivel,
    'procesado', coalesce((est ->> 'procesados')::int, 0),
    'monedas5000', p.monedas,
    'encargos10', coalesce((est ->> 'encargos')::int, 0),
    'maestria', maest,
    'cosechas100', coalesce((est ->> 'cosechas')::int, 0),
    'nivel25', nivel
  );
end;
$$;

-- Estado para la pantalla: capítulos con metas, valores, si está completo, si está reclamado y cuál es el actual.
create or replace function tpp.camino_estado(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb;
  vals jsonb;
  caps jsonb := '[]'::jsonb;
  cap jsonb;
  m jsonb;
  metas jsonb;
  completo boolean;
  actual integer := 0;
  hechas integer;
begin
  perform tpp.asegurar_perfil(p_uid);
  select camino into rec from tpp.perfiles where id = p_uid;
  vals := tpp.camino_valores(p_uid);
  for cap in select * from jsonb_array_elements(tpp.camino_def()) loop
    metas := '[]'::jsonb;
    hechas := 0;
    for m in select * from jsonb_array_elements(cap -> 'metas') loop
      if coalesce((vals ->> (m ->> 'id'))::int, 0) >= (m ->> 'meta')::int then hechas := hechas + 1; end if;
      metas := metas || (m || jsonb_build_object('valor', least(coalesce((vals ->> (m ->> 'id'))::int, 0), (m ->> 'meta')::int)));
    end loop;
    completo := hechas = jsonb_array_length(cap -> 'metas');
    if actual = 0 and not (rec @> to_jsonb((cap ->> 'n')::int)) then actual := (cap ->> 'n')::int; end if;
    caps := caps || jsonb_build_object(
      'n', cap -> 'n', 'nombre', cap -> 'nombre', 'premio', cap -> 'premio', 'metas', metas,
      'hechas', hechas, 'completo', completo, 'reclamado', rec @> to_jsonb((cap ->> 'n')::int));
  end loop;
  return jsonb_build_object('capitulos', caps, 'actual', actual);
end;
$$;

-- Reclama el premio de un capítulo: debe estar completo, sin reclamar y con los anteriores ya reclamados.
create or replace function tpp.reclamar_camino(p_uid uuid, p_n integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  est jsonb;
  cap jsonb;
  prem jsonb;
  i integer;
begin
  perform tpp.asegurar_perfil(p_uid);
  perform 1 from tpp.perfiles where id = p_uid for update;
  est := tpp.camino_estado(p_uid);
  select c into cap from jsonb_array_elements(est -> 'capitulos') c where (c ->> 'n')::int = p_n;
  if cap is null then
    return jsonb_build_object('ok', false, 'error', 'capitulo_desconocido') || tpp.estado_json(p_uid);
  end if;
  if (cap ->> 'reclamado')::boolean then
    return jsonb_build_object('ok', false, 'error', 'capitulo_reclamado') || tpp.estado_json(p_uid);
  end if;
  if p_n <> (est ->> 'actual')::int then
    return jsonb_build_object('ok', false, 'error', 'capitulo_bloqueado') || tpp.estado_json(p_uid);
  end if;
  if not (cap ->> 'completo')::boolean then
    return jsonb_build_object('ok', false, 'error', 'capitulo_incompleto') || tpp.estado_json(p_uid);
  end if;
  prem := cap -> 'premio';
  update tpp.perfiles set
    camino = camino || to_jsonb(p_n),
    monedas = monedas + coalesce((prem ->> 'monedas')::int, 0),
    xp = xp + coalesce((prem ->> 'xp')::int, 0)
    where id = p_uid;
  for i in 1..coalesce((prem ->> 'semillas')::int, 0) loop
    perform tpp.dar_semilla(p_uid);
  end loop;
  perform tpp.notificar(p_uid, 'camino', 'Capítulo ' || p_n || ' completado', (cap ->> 'nombre') || ': ¡premio reclamado!');
  return jsonb_build_object('ok', true, 'premio', prem, 'camino', tpp.camino_estado(p_uid)) || tpp.estado_json(p_uid);
end;
$$;

create or replace function public.tpp_camino() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.camino_estado(auth.uid());
end;
$$;

create or replace function public.tpp_reclamar_camino(p_n integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.reclamar_camino(auth.uid(), p_n);
end;
$$;

revoke all on function tpp.camino_def() from public, anon, authenticated;
revoke all on function tpp.camino_valores(uuid) from public, anon, authenticated;
revoke all on function tpp.camino_estado(uuid) from public, anon, authenticated;
revoke all on function tpp.reclamar_camino(uuid, integer) from public, anon, authenticated;
revoke all on function public.tpp_camino() from public, anon;
revoke all on function public.tpp_reclamar_camino(integer) from public, anon;
grant execute on function public.tpp_camino() to authenticated;
grant execute on function public.tpp_reclamar_camino(integer) to authenticated;
