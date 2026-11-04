-- 8h · Mercado semanal: cada lunes a las 00:00 (Madrid) cambia la demanda, igual para todos.
-- Una variedad "estrella" (+40 a +60 %), otra en baja (-20 a -30 %) y el resto entre -15 y +15 %, siempre de 5 en 5.
-- La venta suelta usa el precio de la semana; los encargos NUEVOS se mueven la mitad. Los ya aceptados no cambian.

-- Fracción estable en [0,1) a partir de un texto.
create or replace function tpp.mercado_hash(p text) returns double precision language sql immutable set search_path = '' as
$f$ select (('x' || substr(md5(p), 1, 8))::bit(32)::bigint)::double precision / 4294967296.0 $f$;

-- Lunes (en Madrid) de la semana a la que pertenece un instante.
create or replace function tpp.mercado_lunes(p_ts timestamptz default now()) returns date language sql stable set search_path = '' as
$f$ select date_trunc('week', p_ts at time zone 'Europe/Madrid')::date $f$;

-- Edición de temporada que está en su estación.
create or replace function tpp.mercado_edicion(p_lunes date) returns text language sql immutable set search_path = '' as
$f$ select case when extract(month from p_lunes) in (3, 4, 5) then 'ed-primavera'
                when extract(month from p_lunes) in (6, 7, 8) then 'ed-verano'
                when extract(month from p_lunes) in (9, 10, 11) then 'ed-otono'
                else 'ed-invierno' end $f$;

-- Cambios de una semana: {top, low, mods:{variedad: porcentaje}}. Determinista: sale de la fecha del lunes.
create or replace function tpp.mercado_semana(p_lunes date) returns jsonb language plpgsql stable set search_path = '' as
$f$
declare
  v_ids text[];
  v_top text;
  v_low text;
  v_otros text[];
  v_mods jsonb := '{}'::jsonb;
  v_id text;
  v_p integer;
  v_s text := p_lunes::text;
  v_ed text := tpp.mercado_edicion(p_lunes);
begin
  select array_agg(k order by k) into v_ids from jsonb_object_keys(tpp.variedades()) k
    where k not like 'ed-%' or k = v_ed;
  v_top := v_ids[1 + floor(tpp.mercado_hash('t' || v_s) * array_length(v_ids, 1))::int];
  v_otros := array(select x from unnest(v_ids) x where x <> v_top);
  v_low := v_otros[1 + floor(tpp.mercado_hash('l' || v_s) * array_length(v_otros, 1))::int];
  foreach v_id in array v_ids loop
    if v_id = v_top then
      v_p := 40 + 5 * floor(tpp.mercado_hash('tp' || v_s) * 5)::int;
    elsif v_id = v_low then
      v_p := -(20 + 5 * floor(tpp.mercado_hash('lp' || v_s) * 3)::int);
    else
      v_p := 5 * floor((tpp.mercado_hash('m' || v_s || v_id) - 0.5) * 6 + 0.5)::int;
    end if;
    v_mods := v_mods || jsonb_build_object(v_id, v_p);
  end loop;
  return jsonb_build_object('lunes', v_s, 'top', v_top, 'low', v_low, 'mods', v_mods);
end;
$f$;

-- Multiplicador de esta semana para una variedad (null si no está en la lista de la semana).
create or replace function tpp.mercado_mult(p_variedad text, p_ts timestamptz default now()) returns double precision
language sql stable set search_path = '' as
$f$ select 1 + ((tpp.mercado_semana(tpp.mercado_lunes(p_ts)) -> 'mods' ->> p_variedad)::double precision / 100) $f$;

-- Estado del mercado para la pantalla: semana actual + 7 anteriores, precios base y gramos guardados.
create or replace function tpp.mercado_semanal(p_uid uuid) returns jsonb language plpgsql stable security definer set search_path = '' as
$f$
declare
  v_lunes date := tpp.mercado_lunes(now());
  v_sem jsonb := '[]'::jsonb;
  v_i integer;
  v_base jsonb;
  v_pf record;
begin
  for v_i in reverse 7..0 loop
    v_sem := v_sem || jsonb_build_array(tpp.mercado_semana(v_lunes - 7 * v_i));
  end loop;
  select coalesce(jsonb_object_agg(k, (v ->> 'gramo')::int), '{}'::jsonb) into v_base from jsonb_each(tpp.variedades()) t(k, v);
  select almacen, almacen_calidad into v_pf from tpp.perfiles where id = p_uid;
  return jsonb_build_object(
    'lunes', v_lunes::text,
    'queda', greatest(0, extract(epoch from (((v_lunes + 7)::timestamp at time zone 'Europe/Madrid') - now()))::int),
    'edicion', tpp.mercado_edicion(v_lunes),
    'semanas', v_sem,
    'base', v_base,
    'almacen', coalesce(v_pf.almacen, '{}'::jsonb),
    'calidad', coalesce(v_pf.almacen_calidad, '{}'::jsonb),
    'mult_ventas', tpp.mult_ventas(p_uid));
end;
$f$;

create or replace function public.tpp_mercado_semanal() returns jsonb language plpgsql security definer set search_path = '' as
$f$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mercado_semanal(auth.uid());
end;
$f$;

-- Venta suelta: el precio por gramo sigue al mercado de la semana (redondeado, mínimo 1).
do $mig$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('tpp.vender_gramos(uuid,text,integer)'::regprocedure);
  o := d;
  d := replace(d, E'begin\n  select coalesce((almacen ->> p_variedad)::int, 0) into tengo',
    E'begin\n  pg := case when tpp.mercado_mult(p_variedad) is null then pg else greatest(1, round(pg * tpp.mercado_mult(p_variedad))) end;\n  select coalesce((almacen ->> p_variedad)::int, 0) into tengo');
  if d = o then raise exception 'vender_gramos: no se pudo parchear'; end if;
  execute d;
end $mig$;

-- Encargos nuevos: la recompensa se mueve la mitad que el mercado, redondeada a decenas. Se guarda el precio sin mercado y el cambio.
do $mig$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('tpp.encargos_al_dia(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'      ''monedas'', (5 * round(g * 10 * mult * fac / 5))::int,',
    E'      ''monedas_base'', (5 * round(g * 10 * mult * fac / 5))::int,\n      ''mercado'', coalesce((tpp.mercado_semana(tpp.mercado_lunes(now())) -> ''mods'' ->> v)::int, 0),\n      ''monedas'', (10 * round((5 * round(g * 10 * mult * fac / 5)) * (1 + coalesce((tpp.mercado_semana(tpp.mercado_lunes(now())) -> ''mods'' ->> v)::int, 0) / 200.0) / 10))::int,');
  if d = o then raise exception 'encargos_al_dia: no se pudo parchear'; end if;
  execute d;
end $mig$;

revoke all on function tpp.mercado_hash(text), tpp.mercado_lunes(timestamptz), tpp.mercado_edicion(date), tpp.mercado_semana(date),
  tpp.mercado_mult(text, timestamptz), tpp.mercado_semanal(uuid) from public, anon, authenticated;
revoke all on function public.tpp_mercado_semanal() from public, anon;
grant execute on function public.tpp_mercado_semanal() to authenticated;
