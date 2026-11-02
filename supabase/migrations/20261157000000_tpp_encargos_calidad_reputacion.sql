-- Encargos (bloque 8): calidad mínima, cliente coleccionista y reputación con cada cliente.
--   · Los gramos guardados llevan una calidad media por variedad (media ponderada por gramos, en estrellas).
--   · Nuevos tipos: «calidad» (pide estrellas mínimas, paga ×1,5; clientes Lola, Valeria y Toni) y
--     «coleccion» (variedad rara, épica o legendaria, paga ×2; cliente El Coleccionista).
--   · Reputación por cliente (0 a 100, empieza en 50): entregar +5; caducar o cancelar un encargo aceptado −10.
--     Con 75 o más, ese cliente paga +10 %. Por debajo de 25 te escribe menos. Kike y Valeria dan +20 % si llegas
--     con más de la mitad del plazo por delante.
--
-- Para deshacer: quitar las columnas almacen_calidad y reputacion de tpp.perfiles y volver a las funciones de 20261150
-- (encargos_al_dia, mis_encargos, entregar_encargo, rechazar_encargo) y 20261144/20261155 (vender_gramos, resolver_cosecha).

alter table tpp.perfiles
  add column if not exists almacen_calidad jsonb not null default '{}'::jsonb,
  add column if not exists reputacion jsonb not null default '{}'::jsonb;

-- Guardar la cosecha: mezcla su calidad con la que ya había guardada.
create or replace function tpp.resolver_cosecha(p_uid uuid, p_vender boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c jsonb;
  v text;
  g integer;
  cal integer;
  tengo integer;
  cal_ant numeric;
begin
  select cosecha_pendiente into c from tpp.perfiles where id = p_uid for update;
  if c is null then
    return jsonb_build_object('ok', false, 'error', 'sin_cosecha') || tpp.estado_json(p_uid);
  end if;
  if p_vender then
    update tpp.perfiles set monedas = monedas + (c ->> 'monedas')::int, cosecha_pendiente = null where id = p_uid;
  else
    v := c ->> 'variedad';
    g := (c ->> 'gramos')::int;
    cal := coalesce((c ->> 'calidad')::int, 3);
    select coalesce((almacen ->> v)::int, 0), coalesce((almacen_calidad ->> v)::numeric, 3)
      into tengo, cal_ant from tpp.perfiles where id = p_uid;
    update tpp.perfiles set
      almacen = almacen || jsonb_build_object(v, tengo + g),
      almacen_calidad = almacen_calidad || jsonb_build_object(v, round((cal_ant * tengo + cal * g) / greatest(1, tengo + g), 2)),
      cosecha_pendiente = null
    where id = p_uid;
  end if;
  perform tpp.mision_sumar(p_uid, case when p_vender then 'vender' else 'guardar' end);
  return jsonb_build_object('ok', true, 'recompensa', case when p_vender then (c ->> 'monedas')::int else 0 end) || tpp.estado_json(p_uid);
end;
$$;

-- Vender gramos: si no queda nada de esa variedad, se olvida su calidad.
do $mig$
declare
  d text := pg_get_functiondef('tpp.vender_gramos(uuid,text,integer)'::regprocedure);
  o text := d;
begin
  d := replace(d, E'    almacen = almacen || jsonb_build_object(p_variedad, tengo - n)\n',
    E'    almacen = almacen || jsonb_build_object(p_variedad, tengo - n),\n    almacen_calidad = case when tengo - n <= 0 then almacen_calidad - p_variedad else almacen_calidad end\n');
  if d = o then raise exception 'vender_gramos no cambia'; end if;
  execute d;
end
$mig$;

-- Llegada de encargos: tipos nuevos y reputación.
do $mig$
declare
  d text := pg_get_functiondef('tpp.encargos_al_dia(uuid)'::regprocedure);
  o text := d;
begin
  d := replace(d, E'  r double precision := random();\n',
    E'  r double precision := random();\n  q integer := 0;\n  rep_j jsonb;\n  cand text[];\n  clientes_ok integer[];\n'
    || E'  m_calidad text[] := array[\'Necesito {g} g de {v} de buena calidad: {q} estrellas o más. ¡Pago extra!\', \'Solo me sirve {v} con {q} estrellas o más. Son {g} g, ¿puedes?\', \'Para un cliente exigente: {g} g de {v}, mínimo {q} estrellas. Lo pago mejor.\', \'Calidad ante todo. {g} g de {v} con {q} estrellas o más, ¿trato?\'];\n'
    || E'  m_coleccion text[] := array[\'Busco {v} para mi colección. Con {g} g me basta y lo pago muy bien.\', \'Me falta una pieza rara: {g} g de {v}. El dinero no es problema.\', \'Si tienes {v}, quiero {g} g. Pago lo que haga falta.\'];\n');
  if d = o then raise exception 'declare no cambia'; end if;
  o := d;
  -- Caducar un encargo aceptado resta reputación con ese cliente.
  d := replace(d, E'  prox := (e ->> \'proximo\')::timestamptz;\n',
    E'  if exists (select 1 from jsonb_array_elements(caducados) x where x ->> \'por\' = \'sin entregar\' and x ->> \'cliente\' is not null) then\n'
    || E'    update tpp.perfiles pf set reputacion = pf.reputacion || (\n'
    || E'      select jsonb_object_agg(c, greatest(0, coalesce((pf.reputacion ->> c)::int, 50) - 10 * n))\n'
    || E'      from (select x ->> \'cliente\' as c, count(*)::int as n from jsonb_array_elements(caducados) x\n'
    || E'            where x ->> \'por\' = \'sin entregar\' and x ->> \'cliente\' is not null group by 1) s)\n'
    || E'    where pf.id = p_uid;\n  end if;\n  prox := (e ->> \'proximo\')::timestamptz;\n');
  if d = o then raise exception 'caducados no cambia'; end if;
  o := d;
  d := replace(d, E'    v := vars[1 + floor(random() * array_length(vars, 1))::int];\n',
    E'    v := vars[1 + floor(random() * array_length(vars, 1))::int];\n'
    || E'    select reputacion into rep_j from tpp.perfiles where id = p_uid;\n'
    || E'    select array_agg(k) into cand from unnest(vars) k where tpp.variedades() -> k ->> \'rareza\' in (\'rara\', \'epica\', \'legendaria\');\n');
  if d = o then raise exception 'v no cambia'; end if;
  o := d;
  d := replace(d, E'    if r < 0.65 then\n',
    E'    if random() < 0.15 then\n'
    || E'      tipo := \'calidad\'; fac := 1.5; plazo := 259200; g := (5 * round((10 + random() * 30) / 5))::int;\n'
    || E'      msj := m_calidad[1 + floor(random() * array_length(m_calidad, 1))::int]; clientes := array[2, 10, 11];\n'
    || E'    elsif cand is not null and random() < 0.07 then\n'
    || E'      tipo := \'coleccion\'; fac := 2; plazo := 259200; g := (5 * round((5 + random() * 10) / 5))::int;\n'
    || E'      v := cand[1 + floor(random() * array_length(cand, 1))::int];\n'
    || E'      mult := (tpp.variedades() -> v ->> \'recompensa\')::double precision;\n'
    || E'      msj := m_coleccion[1 + floor(random() * array_length(m_coleccion, 1))::int]; clientes := array[7];\n'
    || E'    elsif r < 0.65 then\n');
  if d = o then raise exception 'tipos no cambia'; end if;
  o := d;
  d := replace(d, E'    cli := clientes[1 + floor(random() * array_length(clientes, 1))::int];\n',
    E'    select array_agg(c) into clientes_ok from unnest(clientes) c where coalesce((rep_j ->> c::text)::int, 50) >= 25;\n'
    || E'    if clientes_ok is not null then clientes := clientes_ok; end if;\n'
    || E'    cli := clientes[1 + floor(random() * array_length(clientes, 1))::int];\n'
    || E'    if tipo = \'calidad\' then q := case cli when 10 then 3 else 4 end; end if;\n');
  if d = o then raise exception 'cli no cambia'; end if;
  o := d;
  d := replace(d, E'      \'tipo\', tipo,\n      \'mensaje\', msj,\n',
    E'      \'tipo\', tipo,\n      \'q\', q,\n      \'mensaje\', replace(msj, \'{q}\', q::text),\n');
  if d = o then raise exception 'mensaje no cambia'; end if;
  execute d;
end
$mig$;

-- Mis encargos: añade la calidad guardada y la reputación.
create or replace function tpp.mis_encargos(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e jsonb;
  alm jsonb;
  alc jsonb;
  rep jsonb;
begin
  e := tpp.encargos_al_dia(p_uid);
  select almacen, almacen_calidad, reputacion into alm, alc, rep from tpp.perfiles where id = p_uid;
  return jsonb_build_object(
    'almacen', alm,
    'calidad', alc,
    'reputacion', rep,
    'historial', coalesce(e -> 'hist', '[]'::jsonb),
    'siguiente_en', case when jsonb_array_length(e -> 'lista') >= 3 then null
                         else greatest(0, floor(extract(epoch from ((e ->> 'proximo')::timestamptz - now()))))::int end,
    'lista', coalesce((select jsonb_agg(
        (x - 'hasta') || jsonb_build_object(
          'estado', coalesce(x ->> 'estado', 'aceptado'),
          'tengo', coalesce((alm ->> (x ->> 'variedad'))::int, 0),
          'restan', greatest(0, floor(extract(epoch from ((x ->> 'hasta')::timestamptz - now()))))::int)
        order by (x ->> 'hasta')::timestamptz) from jsonb_array_elements(e -> 'lista') x), '[]'::jsonb));
end;
$$;

-- Entregar: comprueba la calidad mínima, aplica reputación y propinas.
create or replace function tpp.entregar_encargo(p_uid uuid, p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
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
  r_cli := coalesce((rep ->> cli)::int, 50);
  if r_cli >= 75 then extra := extra + 0.1; end if;
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
    reputacion = case when cli is null then reputacion
                      else reputacion || jsonb_build_object(cli, least(100, r_cli + 5)) end,
    encargos = e,
    monedas = monedas + monedas_final,
    xp = xp + (x ->> 'xp')::int
    where id = p_uid;
  perform tpp.pase_puntos(p_uid, 30);
  perform tpp.mision_sumar(p_uid, 'encargo');
  return jsonb_build_object('ok', true, 'recompensa', monedas_final) || tpp.estado_json(p_uid);
end;
$$;

-- Cancelar un encargo aceptado también resta reputación.
do $mig$
declare
  d text := pg_get_functiondef('tpp.rechazar_encargo(uuid,text)'::regprocedure);
  o text := d;
begin
  d := replace(d, E'  if coalesce(x ->> \'estado\', \'aceptado\') = \'aceptado\' then\n',
    E'  if coalesce(x ->> \'estado\', \'aceptado\') = \'aceptado\' then\n'
    || E'    if x ->> \'cliente\' is not null then\n'
    || E'      update tpp.perfiles set reputacion = reputacion || jsonb_build_object(x ->> \'cliente\', greatest(0, coalesce((reputacion ->> (x ->> \'cliente\'))::int, 50) - 10)) where id = p_uid;\n'
    || E'    end if;\n');
  if d = o then raise exception 'rechazar no cambia'; end if;
  execute d;
end
$mig$;
