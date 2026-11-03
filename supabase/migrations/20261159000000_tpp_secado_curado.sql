-- Secado y curado (bloque 8e). Tras cosechar se elige: vender en húmedo (×0,5), secar 12 h en una percha (×1) o secar y curar
-- 24, 48 o 72 h en un tarro (×1,5 / ×1,75 / ×2). Al sacarlo se vende o se guarda para los encargos. Una vez listo hay 24 h
-- para sacarlo: si no, la percha se reseca (×0,8) y el tarro se enmohece (×0,5), con una estrella menos.
-- Cada día de curado se puede abrir el tarro una vez (hasta 3) y la humedad al soltar da un bonus (máx. +15 %).
-- Capacidad de perchas y tarros: 2 al empezar y hasta 6 con la mejora «Capacidad» del armario (0 → 2, I → 4, II → 5, III → 6).
-- Los tiempos son reales (fecha del servidor), sin tareas en segundo plano.
--
-- Para deshacer: drop function public.tpp_mi_secado(); drop function public.tpp_secar_cosecha(text, integer);
--   drop function public.tpp_sacar_secado(integer, text); drop function public.tpp_abrir_tarro(integer, numeric);
--   drop function tpp.mi_secado(uuid); drop function tpp.secar_cosecha(uuid, text, integer);
--   drop function tpp.sacar_secado(uuid, integer, text); drop function tpp.abrir_tarro(uuid, integer, numeric);
--   drop function tpp.secado_item(jsonb, bigint); drop function tpp.secado_capacidad(uuid);
--   alter table tpp.perfiles drop column secado;  (antes, devolver a mano lo que hubiera secando)

alter table tpp.perfiles add column if not exists secado jsonb not null default '[]'::jsonb;

create or replace function tpp.secado_capacidad(p_uid uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select least(6, 2 + ceil(coalesce((mejoras ->> 'cap')::int, 0) * 4 / 3.0)::int) from tpp.perfiles where id = p_uid;
$$;

-- Estado de una cosecha en el armario de secado según la hora (segundos desde 1970).
create or replace function tpp.secado_item(it jsonb, ahora bigint) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  curar integer := coalesce((it ->> 'curar')::int, 0);
  t0 bigint := (it ->> 't0')::bigint;
  tpercha bigint := t0 + 12 * 3600;
  tr bigint := tpercha + curar * 3600;
  expira bigint := tr + 24 * 3600;
  est text;
  mult numeric;
  bonus integer := 0;
  ap jsonb := coalesce(it -> 'aperturas', '[]'::jsonb);
  b jsonb;
  cal integer := coalesce((it ->> 'calidad')::int, 3);
  permitidas integer := 0;
begin
  if ahora < tpercha then est := 'secando';
  elsif ahora < tr then est := 'curando';
  elsif ahora < expira then est := 'listo';
  else est := case when curar > 0 then 'moho' else 'reseca' end;
  end if;
  mult := case curar when 24 then 1.5 when 48 then 1.75 when 72 then 2 else 1 end;
  for b in select e from jsonb_array_elements(ap) as e loop
    bonus := bonus + (b #>> '{}')::int;
  end loop;
  bonus := least(15, bonus);
  if curar > 0 and ahora >= tpercha and ahora < expira then
    permitidas := least(3, curar / 24, floor((ahora - tpercha) / 86400.0)::int);
  end if;
  if est in ('reseca', 'moho') then cal := greatest(1, cal - 1); end if;
  return it || jsonb_build_object(
    'estado', est,
    'mult', mult,
    'bonus', bonus,
    'cal', cal,
    'faltan', greatest(0, tr - ahora),
    'faltan_percha', greatest(0, tpercha - ahora),
    'expira_en', greatest(0, expira - ahora),
    'dias_curado', curar / 24,
    'aperturas_hechas', jsonb_array_length(ap),
    'puede_abrir', jsonb_array_length(ap) < permitidas,
    'precio', floor((it ->> 'monedas')::numeric * mult * (1 + bonus / 100.0) * (case est when 'reseca' then 0.8 when 'moho' then 0.5 else 1 end))::int
  );
end;
$$;

create or replace function tpp.mi_secado(p_uid uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'capacidad', tpp.secado_capacidad(p_uid),
    'items', coalesce((select jsonb_agg(tpp.secado_item(e, extract(epoch from now())::bigint) order by (e ->> 'id')::int)
                       from tpp.perfiles p, jsonb_array_elements(p.secado) e where p.id = p_uid), '[]'::jsonb)
  );
$$;

-- Empieza a secar o curar la cosecha pendiente. p_modo: 'humedo' (vende ya), 'seco' o 'curado' (p_dias 1, 2 o 3).
create or replace function tpp.secar_cosecha(p_uid uuid, p_modo text, p_dias integer default 0) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c jsonb;
  cap integer := tpp.secado_capacidad(p_uid);
  ahora bigint := extract(epoch from now())::bigint;
  ocup_percha integer;
  ocup_tarro integer;
  nuevo jsonb;
  sig integer;
  curar integer := case when p_modo = 'curado' then p_dias * 24 else 0 end;
begin
  if p_modo not in ('humedo', 'seco', 'curado') or (p_modo = 'curado' and p_dias not in (1, 2, 3)) then
    return jsonb_build_object('ok', false, 'error', 'modo_no_valido') || tpp.estado_json(p_uid);
  end if;
  select cosecha_pendiente into c from tpp.perfiles where id = p_uid for update;
  if c is null then
    return jsonb_build_object('ok', false, 'error', 'sin_cosecha') || tpp.estado_json(p_uid);
  end if;
  if p_modo = 'humedo' then
    update tpp.perfiles set monedas = monedas + floor((c ->> 'monedas')::int * 0.5)::int, cosecha_pendiente = null where id = p_uid;
    perform tpp.mision_sumar(p_uid, 'vender');
    return jsonb_build_object('ok', true, 'recompensa', floor((c ->> 'monedas')::int * 0.5)::int) || tpp.estado_json(p_uid);
  end if;
  select count(*) filter (where coalesce((e ->> 'curar')::int, 0) = 0 or ahora < (e ->> 't0')::bigint + 12 * 3600),
         count(*) filter (where coalesce((e ->> 'curar')::int, 0) > 0)
    into ocup_percha, ocup_tarro
    from tpp.perfiles p, jsonb_array_elements(p.secado) e where p.id = p_uid;
  if ocup_percha >= cap then
    return jsonb_build_object('ok', false, 'error', 'sin_percha') || tpp.estado_json(p_uid);
  end if;
  if curar > 0 and ocup_tarro >= cap then
    return jsonb_build_object('ok', false, 'error', 'sin_tarro') || tpp.estado_json(p_uid);
  end if;
  select coalesce(max((e ->> 'id')::int), 0) + 1 into sig from tpp.perfiles p, jsonb_array_elements(p.secado) e where p.id = p_uid;
  nuevo := jsonb_build_object('id', sig, 'variedad', c ->> 'variedad', 'gramos', (c ->> 'gramos')::int,
    'calidad', coalesce((c ->> 'calidad')::int, 3), 'monedas', (c ->> 'monedas')::int, 't0', ahora, 'curar', curar, 'aperturas', '[]'::jsonb);
  update tpp.perfiles set secado = secado || jsonb_build_array(nuevo), cosecha_pendiente = null where id = p_uid;
  return jsonb_build_object('ok', true, 'recompensa', 0, 'secado', tpp.mi_secado(p_uid)) || tpp.estado_json(p_uid);
end;
$$;

-- Saca una cosecha ya lista (o pasada de tiempo). p_modo: 'vender', 'guardar' (almacén para encargos) o 'tirar'.
create or replace function tpp.sacar_secado(p_uid uuid, p_id integer, p_modo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
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
  precio := (r ->> 'precio')::int;
  if p_modo = 'vender' then
    update tpp.perfiles set monedas = monedas + precio where id = p_uid;
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
    perform tpp.mision_sumar(p_uid, 'guardar');
    precio := 0;
  else
    precio := 0;
  end if;
  update tpp.perfiles set secado = coalesce((select jsonb_agg(e) from jsonb_array_elements(secado) e where (e ->> 'id')::int <> p_id), '[]'::jsonb)
    where id = p_uid;
  return jsonb_build_object('ok', true, 'recompensa', case when p_modo = 'vender' then precio else 0 end, 'secado', tpp.mi_secado(p_uid))
    || tpp.estado_json(p_uid);
end;
$$;

-- Abre el tarro (una vez por cada día de curado, hasta tres). p_humedad: la humedad (%) al soltar. 58-62 → +5 %, 55-65 → +3 %.
create or replace function tpp.abrir_tarro(p_uid uuid, p_id integer, p_humedad numeric) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  it jsonb;
  r jsonb;
  b integer;
begin
  select e into it from tpp.perfiles p, jsonb_array_elements(p.secado) e where p.id = p_uid and (e ->> 'id')::int = p_id for update of p;
  if it is null then
    return jsonb_build_object('ok', false, 'error', 'no_existe') || tpp.estado_json(p_uid);
  end if;
  r := tpp.secado_item(it, extract(epoch from now())::bigint);
  if not (r ->> 'puede_abrir')::boolean then
    return jsonb_build_object('ok', false, 'error', 'no_puede_abrir') || tpp.estado_json(p_uid);
  end if;
  b := case when p_humedad between 58 and 62 then 5 when p_humedad between 55 and 65 then 3 else 0 end;
  update tpp.perfiles set secado = (
    select jsonb_agg(case when (e ->> 'id')::int = p_id
      then jsonb_set(e, '{aperturas}', coalesce(e -> 'aperturas', '[]'::jsonb) || to_jsonb(b)) else e end)
    from jsonb_array_elements(secado) e) where id = p_uid;
  return jsonb_build_object('ok', true, 'bonus', b, 'recompensa', 0, 'secado', tpp.mi_secado(p_uid)) || tpp.estado_json(p_uid);
end;
$$;

create or replace function public.tpp_mi_secado() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mi_secado(auth.uid());
end;
$$;

create or replace function public.tpp_secar_cosecha(p_modo text, p_dias integer default 0) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.secar_cosecha(auth.uid(), p_modo, p_dias);
end;
$$;

create or replace function public.tpp_sacar_secado(p_id integer, p_modo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.sacar_secado(auth.uid(), p_id, p_modo);
end;
$$;

create or replace function public.tpp_abrir_tarro(p_id integer, p_humedad numeric) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.abrir_tarro(auth.uid(), p_id, p_humedad);
end;
$$;

revoke all on function tpp.secado_capacidad(uuid) from public, anon, authenticated;
revoke all on function tpp.secado_item(jsonb, bigint) from public, anon, authenticated;
revoke all on function tpp.mi_secado(uuid) from public, anon, authenticated;
revoke all on function tpp.secar_cosecha(uuid, text, integer) from public, anon, authenticated;
revoke all on function tpp.sacar_secado(uuid, integer, text) from public, anon, authenticated;
revoke all on function tpp.abrir_tarro(uuid, integer, numeric) from public, anon, authenticated;
revoke all on function public.tpp_mi_secado() from public, anon;
revoke all on function public.tpp_secar_cosecha(text, integer) from public, anon;
revoke all on function public.tpp_sacar_secado(integer, text) from public, anon;
revoke all on function public.tpp_abrir_tarro(integer, numeric) from public, anon;
grant execute on function public.tpp_mi_secado() to authenticated;
grant execute on function public.tpp_secar_cosecha(text, integer) to authenticated;
grant execute on function public.tpp_sacar_secado(integer, text) to authenticated;
grant execute on function public.tpp_abrir_tarro(integer, numeric) to authenticated;
