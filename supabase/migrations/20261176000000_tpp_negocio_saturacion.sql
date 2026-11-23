-- Perfil de negocio (a nivel 20 se elige uno) y saturación del mercado por variedad.
-- perfiles.negocio   = {"perfil": "lujo" | "distribuidor" | "procesador"}
-- perfiles.saturacion = {"<variedad>": {"g": gramos vendidos, "ts": epoch}}; baja 10 g por hora.

alter table tpp.perfiles add column if not exists negocio jsonb not null default '{}'::jsonb;
alter table tpp.perfiles add column if not exists saturacion jsonb not null default '{}'::jsonb;

create or replace function tpp.negocio_def() returns jsonb language sql immutable set search_path = '' as $$
  select '[
    {"id":"lujo","nombre":"Cultivador de lujo","bono":"+15 % de XP.","pega":"−5 % al vender gramos sueltos."},
    {"id":"distribuidor","nombre":"Distribuidor","bono":"+12 % de monedas al vender gramos.","pega":"−10 % de XP."},
    {"id":"procesador","nombre":"Procesador","bono":"+20 % de monedas al vender procesados.","pega":"−5 % al vender gramos sueltos."}
  ]'::jsonb;
$$;

-- Multiplicador de XP del perfil.
create or replace function tpp.negocio_mult_xp(p_uid uuid) returns double precision language sql stable security definer set search_path = '' as $$
  select coalesce((select case negocio ->> 'perfil' when 'lujo' then 1.15 when 'distribuidor' then 0.90 else 1 end
                     from tpp.perfiles where id = p_uid), 1)::double precision;
$$;

-- Multiplicador del perfil al vender gramos sueltos.
create or replace function tpp.negocio_mult_gramos(p_uid uuid) returns double precision language sql stable security definer set search_path = '' as $$
  select coalesce((select case negocio ->> 'perfil' when 'distribuidor' then 1.12 when 'lujo' then 0.95 when 'procesador' then 0.95 else 1 end
                     from tpp.perfiles where id = p_uid), 1)::double precision;
$$;

-- Multiplicador del perfil al vender procesados.
create or replace function tpp.negocio_mult_procesados(p_uid uuid) returns double precision language sql stable security definer set search_path = '' as $$
  select coalesce((select case negocio ->> 'perfil' when 'procesador' then 1.20 else 1 end
                     from tpp.perfiles where id = p_uid), 1)::double precision;
$$;

-- Gramos de saturación que tiene ahora una variedad (ya descontada la recuperación).
create or replace function tpp.satur_g(p_uid uuid, p_var text) returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce((
    select greatest(0, (s ->> 'g')::numeric - 10 * (extract(epoch from now()) - (s ->> 'ts')::numeric) / 3600)
      from (select saturacion -> p_var as s from tpp.perfiles where id = p_uid) x
     where s is not null), 0);
$$;

-- Factor de precio: 100 g libres, −5 % por cada 50 g extra, tope −30 %. Se mide a mitad de la venta (p_extra / 2).
create or replace function tpp.satur_factor(p_uid uuid, p_var text, p_extra numeric default 0) returns double precision language sql stable security definer set search_path = '' as $$
  select greatest(0.7, 1 - 0.05 * floor(greatest(0, tpp.satur_g(p_uid, p_var) + coalesce(p_extra, 0) / 2 - 100) / 50))::double precision;
$$;

create or replace function tpp.satur_sumar(p_uid uuid, p_var text, p_g numeric) returns void language plpgsql security definer set search_path = '' as $$
begin
  update tpp.perfiles set saturacion = coalesce(saturacion, '{}'::jsonb) || jsonb_build_object(
    p_var, jsonb_build_object('g', round(tpp.satur_g(p_uid, p_var) + p_g, 2), 'ts', extract(epoch from now())::bigint))
  where id = p_uid;
end;
$$;

create or replace function tpp.negocio_estado(p_uid uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  pf tpp.perfiles;
  sat jsonb := '[]'::jsonb;
  k text;
  g numeric;
begin
  perform tpp.asegurar_perfil(p_uid);
  select * into pf from tpp.perfiles where id = p_uid;
  for k in select jsonb_object_keys(coalesce(pf.saturacion, '{}'::jsonb)) loop
    g := tpp.satur_g(p_uid, k);
    if g >= 1 then
      sat := sat || jsonb_build_array(jsonb_build_object(
        'variedad', k, 'g', round(g), 'descuento', round((1 - tpp.satur_factor(p_uid, k)) * 100)));
    end if;
  end loop;
  return jsonb_build_object(
    'perfil', pf.negocio ->> 'perfil',
    'perfiles', tpp.negocio_def(),
    'nivel_req', 20,
    'nivel_ok', tpp.nivel_de(pf.xp) >= 20,
    'coste_cambio', 5000,
    'saturacion', sat);
end;
$$;

create or replace function tpp.elegir_negocio(p_uid uuid, p_perfil text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  pf tpp.perfiles;
  coste integer := 0;
begin
  perform tpp.asegurar_perfil(p_uid);
  select * into pf from tpp.perfiles where id = p_uid for update;
  if not exists (select 1 from jsonb_array_elements(tpp.negocio_def()) x where x ->> 'id' = p_perfil) then
    return jsonb_build_object('ok', false, 'error', 'perfil_invalido') || tpp.negocio_estado(p_uid);
  end if;
  if tpp.nivel_de(pf.xp) < 20 then return jsonb_build_object('ok', false, 'error', 'nivel_insuficiente') || tpp.negocio_estado(p_uid); end if;
  if pf.negocio ->> 'perfil' = p_perfil then return jsonb_build_object('ok', false, 'error', 'perfil_ya_elegido') || tpp.negocio_estado(p_uid); end if;
  if pf.negocio ->> 'perfil' is not null then coste := 5000; end if;
  if pf.monedas < coste then return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.negocio_estado(p_uid); end if;
  update tpp.perfiles set monedas = monedas - coste, negocio = jsonb_build_object('perfil', p_perfil) where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.negocio_estado(p_uid) || tpp.estado_json(p_uid);
end;
$$;

create or replace function public.tpp_negocio() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.negocio_estado(auth.uid());
end;
$$;

create or replace function public.tpp_elegir_negocio(p_perfil text) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.elegir_negocio(auth.uid(), p_perfil);
end;
$$;

revoke all on function tpp.negocio_def() from public, anon, authenticated;
revoke all on function tpp.negocio_mult_xp(uuid) from public, anon, authenticated;
revoke all on function tpp.negocio_mult_gramos(uuid) from public, anon, authenticated;
revoke all on function tpp.negocio_mult_procesados(uuid) from public, anon, authenticated;
revoke all on function tpp.satur_g(uuid, text) from public, anon, authenticated;
revoke all on function tpp.satur_factor(uuid, text, numeric) from public, anon, authenticated;
revoke all on function tpp.satur_sumar(uuid, text, numeric) from public, anon, authenticated;
revoke all on function tpp.negocio_estado(uuid) from public, anon, authenticated;
revoke all on function tpp.elegir_negocio(uuid, text) from public, anon, authenticated;
revoke all on function public.tpp_negocio() from public, anon;
revoke all on function public.tpp_elegir_negocio(text) from public, anon;
grant execute on function public.tpp_negocio() to authenticated;
grant execute on function public.tpp_elegir_negocio(text) to authenticated;

-- ===== Efectos =====

-- XP: perfil de negocio.
create or replace function tpp.mult_xp(p_uid uuid)
 returns double precision
 language sql
 stable security definer
 set search_path to ''
as $function$
  select (1 + tpp.animo_de(p_uid) / 100.0)
    * case when coalesce(pf.equipo -> 'decoracion', '[]'::jsonb) ? 'neon_tpp' then 1.10 else 1 end
    * case when tpp.obra_hecha(pf.obras, 'salon') then 1.05 else 1 end
    * tpp.negocio_mult_xp(p_uid)
  from tpp.perfiles pf where pf.id = p_uid;
$function$;

-- Procesados: perfil Procesador.
create or replace function tpp.procesado_vender(p_uid uuid, p_prod text, p_cant integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_p jsonb;
  v_n integer;
  v_q integer;
  v_c integer;
  v_pago integer;
  v_obras jsonb;
begin
  perform tpp.asegurar_perfil(p_uid);
  select procesado, obras into v_p, v_obras from tpp.perfiles where id = p_uid for update;
  v_n := coalesce((v_p -> 'prod' -> p_prod ->> 'n')::int, 0);
  v_q := coalesce((v_p -> 'prod' -> p_prod ->> 'q')::int, 3);
  v_c := least(v_n, coalesce(p_cant, v_n));
  if v_c <= 0 then return jsonb_build_object('ok', false, 'error', 'sin_gramos') || tpp.procesado_estado(p_uid); end if;
  v_pago := round(v_c * tpp.proc_precio(p_prod, v_q) * tpp.mult_ventas(p_uid)
    * case when tpp.obra_hecha(v_obras, 'cocina') then 1.10 else 1 end
    * tpp.negocio_mult_procesados(p_uid))::int;
  v_p := jsonb_set(v_p, array['prod', p_prod, 'n'], to_jsonb(v_n - v_c), true);
  update tpp.perfiles set procesado = v_p, monedas = monedas + v_pago where id = p_uid;
  return jsonb_build_object('ok', true, 'recompensa', v_pago) || tpp.procesado_estado(p_uid) || tpp.estado_json(p_uid);
end;
$function$;

-- Vender gramos del almacén: perfil + saturación.
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
  f double precision;
  pago integer;
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
  f := tpp.satur_factor(p_uid, p_variedad, n);
  pago := round(n * pg * tpp.mult_ventas(p_uid) * tpp.negocio_mult_gramos(p_uid) * f)::int;
  update tpp.perfiles set
    monedas = monedas + pago,
    almacen = almacen || jsonb_build_object(p_variedad, tengo - n),
    almacen_calidad = case when tengo - n <= 0 then almacen_calidad - p_variedad else almacen_calidad end
  where id = p_uid;
  perform tpp.satur_sumar(p_uid, p_variedad, n);
  perform tpp.contar(p_uid, 'vendido_g', n);
  perform tpp.mision_sumar(p_uid, 'mercado');
  return jsonb_build_object('ok', true, 'recompensa', pago, 'gramos', n, 'descuento', round((1 - f) * 100)) || tpp.estado_json(p_uid);
end;
$function$;

-- Vender al sacar del secado: perfil + saturación.
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
  f double precision := 1;
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
  if p_modo = 'vender' then
    f := tpp.satur_factor(p_uid, r ->> 'variedad', coalesce((r ->> 'gramos')::numeric, 0));
    precio := round((r ->> 'precio')::int * tpp.mult_ventas(p_uid) * tpp.negocio_mult_gramos(p_uid) * f)::int;
    update tpp.perfiles set monedas = monedas + precio where id = p_uid;
    perform tpp.satur_sumar(p_uid, r ->> 'variedad', coalesce((r ->> 'gramos')::numeric, 0));
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
  return jsonb_build_object('ok', true, 'recompensa', case when p_modo = 'vender' then precio else 0 end,
    'descuento', round((1 - f) * 100), 'secado', tpp.mi_secado(p_uid))
    || tpp.estado_json(p_uid);
end;
$function$;
