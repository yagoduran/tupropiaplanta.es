-- 8i (parte B) · Mercado negro de El Topo, sospecha e inspección.
-- Se abre con el rango global «Conocido en la calle» (1.500). Cada lunes a las 00:00 (Madrid) salen 5 de los 8 objetos.
-- Sospecha 0–100: +15 por punto de riesgo en cada compra (la mitad con la bolsa antiolor activa), −10 al día.
-- Al llegar a 100 hay inspección: pagar 1.500 (sospecha 20), esconder con la maceta de doble fondo (sospecha 30) o dejar que registren
-- (se pierden los objetos guardados, el mercado cierra 3 días y la sospecha queda en 20).
-- Los efectos de los objetos (semillas, lámpara, abono, radio, bolsa) se activan en un paso aparte: por ahora se guardan en el escondite.

alter table tpp.perfiles add column if not exists negro jsonb not null default '{}'::jsonb;

-- Objetos: id, nombre, tipo, descripción, precio, riesgo (0–3) y existencias por semana (1–3).
create or replace function tpp.negro_catalogo() returns jsonb language sql immutable set search_path = '' as
$f$ select '[
 {"id":"semilla-sombra","n":"Semilla Sombra","tipo":"Semilla única","d":"Cogollo negro azulado. Siempre germina con el fenotipo Black.","precio":4500,"riesgo":3,"stock":1},
 {"id":"semilla-eclipse","n":"Semilla Eclipse","tipo":"Semilla única","d":"Cambia de color con el día y la noche. +50 % de valor si vendes de noche.","precio":3800,"riesgo":2,"stock":1},
 {"id":"semilla-relampago","n":"Semilla Relámpago","tipo":"Semilla única","d":"Ciclo completo en 6 h, pero rinde la mitad.","precio":2200,"riesgo":2,"stock":2},
 {"id":"lampara-pirata","n":"Lámpara pirata","tipo":"Objeto","d":"+2 de luz en una maceta. Gasta el doble de electricidad.","precio":1600,"riesgo":1,"stock":2},
 {"id":"abono-volcanico","n":"Abono volcánico","tipo":"Consumible","d":"+40 % de crecimiento durante 24 h. Si abonas dos veces seguidas, quema las hojas.","precio":900,"riesgo":1,"stock":3},
 {"id":"bolsa-antiolor","n":"Bolsa antiolor","tipo":"Objeto","d":"Durante 7 días cada compra suma la mitad de sospecha.","precio":700,"riesgo":0,"stock":2},
 {"id":"radio-porteria","n":"Radio de la portería","tipo":"Objeto","d":"El portero te avisa 24 h antes de una inspección.","precio":1200,"riesgo":1,"stock":1},
 {"id":"maceta-doble","n":"Maceta de doble fondo","tipo":"Objeto","d":"En una inspección, esconde lo que compraste aquí.","precio":2500,"riesgo":1,"stock":1}
]'::jsonb $f$;

-- Los 5 objetos que se venden en la semana de un lunes (determinista).
create or replace function tpp.negro_semana(p_lunes date) returns text[] language sql stable set search_path = '' as
$f$
  select coalesce(array_agg(id order by h), '{}') from (
    select c ->> 'id' as id, tpp.mercado_hash('n' || p_lunes::text || (c ->> 'id')) as h
    from jsonb_array_elements(tpp.negro_catalogo()) c order by h limit 5) s
$f$;

-- Sospecha actual (con el descenso de 10 al día), redondeada.
create or replace function tpp.negro_sospecha(p_n jsonb) returns integer language sql stable set search_path = '' as
$f$
  select case when coalesce((p_n ->> 'insp')::boolean, false) then 100
    else greatest(0, round(coalesce((p_n ->> 'sosp')::numeric, 0) - 10 * greatest(0, extract(epoch from now()) - coalesce((p_n ->> 'ts')::numeric, extract(epoch from now()))) / 86400))::int end
$f$;

create or replace function tpp.negro_estado(p_uid uuid) returns jsonb language plpgsql stable security definer set search_path = '' as
$f$
declare
  v_n jsonb;
  v_glob integer;
  v_lunes date := tpp.mercado_lunes(now());
  v_ids text[] := tpp.negro_semana(tpp.mercado_lunes(now()));
  v_ahora bigint := extract(epoch from now())::bigint;
  v_comp jsonb;
  v_items jsonb := '[]'::jsonb;
  c jsonb;
begin
  select negro, reputacion_global into v_n, v_glob from tpp.perfiles where id = p_uid;
  v_comp := case when (v_n -> 'compras' ->> 'lunes') = v_lunes::text then coalesce(v_n -> 'compras' -> 'items', '{}'::jsonb) else '{}'::jsonb end;
  for c in select e from jsonb_array_elements(tpp.negro_catalogo()) e loop
    if (c ->> 'id') = any (v_ids) then
      v_items := v_items || jsonb_build_array(c || jsonb_build_object('quedan', (c ->> 'stock')::int - coalesce((v_comp ->> (c ->> 'id'))::int, 0)));
    end if;
  end loop;
  return jsonb_build_object(
    'abierto', tpp.rango_glob(v_glob) >= 2,
    'sospecha', tpp.negro_sospecha(v_n),
    'inspeccion', coalesce((v_n ->> 'insp')::boolean, false),
    'cerrado', greatest(0, coalesce((v_n ->> 'cerrado')::bigint, 0) - v_ahora),
    'antiolor', greatest(0, coalesce((v_n ->> 'antiolor')::bigint, 0) - v_ahora),
    'queda', greatest(0, extract(epoch from (((v_lunes + 7)::timestamp at time zone 'Europe/Madrid') - now()))::int),
    'objetos', v_items,
    'escondite', coalesce(v_n -> 'inv', '{}'::jsonb));
end;
$f$;

create or replace function tpp.negro_comprar(p_uid uuid, p_id text) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare
  v_n jsonb;
  v_glob integer;
  v_mon integer;
  v_lunes date := tpp.mercado_lunes(now());
  v_ahora bigint := extract(epoch from now())::bigint;
  v_obj jsonb;
  v_comp jsonb;
  v_ya integer;
  v_sosp integer;
  v_sube integer;
  v_inv jsonb;
begin
  perform tpp.asegurar_perfil(p_uid);
  select negro, reputacion_global, monedas into v_n, v_glob, v_mon from tpp.perfiles where id = p_uid for update;
  if tpp.rango_glob(v_glob) < 2 then return jsonb_build_object('ok', false, 'error', 'negro_bloqueado'); end if;
  if coalesce((v_n ->> 'insp')::boolean, false) then return jsonb_build_object('ok', false, 'error', 'inspeccion_pendiente') || tpp.negro_estado(p_uid); end if;
  if coalesce((v_n ->> 'cerrado')::bigint, 0) > v_ahora then return jsonb_build_object('ok', false, 'error', 'negro_cerrado') || tpp.negro_estado(p_uid); end if;
  select e into v_obj from jsonb_array_elements(tpp.negro_catalogo()) e where e ->> 'id' = p_id;
  if v_obj is null or not (p_id = any (tpp.negro_semana(v_lunes))) then
    return jsonb_build_object('ok', false, 'error', 'objeto_no_disponible') || tpp.negro_estado(p_uid);
  end if;
  v_comp := case when (v_n -> 'compras' ->> 'lunes') = v_lunes::text then coalesce(v_n -> 'compras' -> 'items', '{}'::jsonb) else '{}'::jsonb end;
  v_ya := coalesce((v_comp ->> p_id)::int, 0);
  if v_ya >= (v_obj ->> 'stock')::int then return jsonb_build_object('ok', false, 'error', 'negro_agotado') || tpp.negro_estado(p_uid); end if;
  if v_mon < (v_obj ->> 'precio')::int then return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.negro_estado(p_uid); end if;
  v_sosp := tpp.negro_sospecha(v_n);
  v_sube := 15 * (v_obj ->> 'riesgo')::int;
  if coalesce((v_n ->> 'antiolor')::bigint, 0) > v_ahora then v_sube := v_sube / 2; end if;
  v_sosp := least(100, v_sosp + v_sube);
  v_inv := coalesce(v_n -> 'inv', '{}'::jsonb);
  v_inv := v_inv || jsonb_build_object(p_id, coalesce((v_inv ->> p_id)::int, 0) + 1);
  v_n := coalesce(v_n, '{}'::jsonb) || jsonb_build_object(
    'sosp', v_sosp, 'ts', v_ahora, 'insp', v_sosp >= 100, 'inv', v_inv,
    'compras', jsonb_build_object('lunes', v_lunes::text, 'items', v_comp || jsonb_build_object(p_id, v_ya + 1)));
  update tpp.perfiles set monedas = monedas - (v_obj ->> 'precio')::int, negro = v_n where id = p_uid;
  if v_sosp >= 100 then
    perform tpp.notificar(p_uid, 'negro', '¡Inspección!', 'Han llamado a tu puerta. Decide qué haces: pagar, esconder o dejar que registren.');
  end if;
  return jsonb_build_object('ok', true) || tpp.negro_estado(p_uid) || tpp.estado_json(p_uid);
end;
$f$;

-- Resuelve una inspección: 'multa', 'esconder' o 'registrar'.
create or replace function tpp.negro_inspeccion(p_uid uuid, p_opcion text) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare
  v_n jsonb;
  v_mon integer;
  v_ahora bigint := extract(epoch from now())::bigint;
begin
  perform tpp.asegurar_perfil(p_uid);
  select negro, monedas into v_n, v_mon from tpp.perfiles where id = p_uid for update;
  if not coalesce((v_n ->> 'insp')::boolean, false) then return jsonb_build_object('ok', false, 'error', 'sin_inspeccion') || tpp.negro_estado(p_uid); end if;
  if p_opcion = 'multa' then
    if v_mon < 1500 then return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.negro_estado(p_uid); end if;
    update tpp.perfiles set monedas = monedas - 1500, negro = v_n || jsonb_build_object('insp', false, 'sosp', 20, 'ts', v_ahora) where id = p_uid;
  elsif p_opcion = 'esconder' then
    if coalesce((v_n -> 'inv' ->> 'maceta-doble')::int, 0) < 1 then return jsonb_build_object('ok', false, 'error', 'sin_maceta_doble') || tpp.negro_estado(p_uid); end if;
    update tpp.perfiles set negro = v_n || jsonb_build_object('insp', false, 'sosp', 30, 'ts', v_ahora) where id = p_uid;
  elsif p_opcion = 'registrar' then
    update tpp.perfiles set negro = v_n || jsonb_build_object('insp', false, 'sosp', 20, 'ts', v_ahora, 'inv', '{}'::jsonb, 'cerrado', v_ahora + 3 * 86400) where id = p_uid;
    perform tpp.notificar(p_uid, 'negro', 'Te han registrado', 'Se llevaron lo que tenías en el escondite. El Topo no abre en 3 días.');
  else
    return jsonb_build_object('ok', false, 'error', 'opcion_invalida') || tpp.negro_estado(p_uid);
  end if;
  return jsonb_build_object('ok', true) || tpp.negro_estado(p_uid) || tpp.estado_json(p_uid);
end;
$f$;

create or replace function public.tpp_negro() returns jsonb language plpgsql security definer set search_path = '' as
$f$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.negro_estado(auth.uid());
end;
$f$;

create or replace function public.tpp_negro_comprar(p_id text) returns jsonb language plpgsql security definer set search_path = '' as
$f$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.negro_comprar(auth.uid(), p_id);
end;
$f$;

create or replace function public.tpp_negro_inspeccion(p_opcion text) returns jsonb language plpgsql security definer set search_path = '' as
$f$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.negro_inspeccion(auth.uid(), p_opcion);
end;
$f$;

revoke all on function tpp.negro_catalogo(), tpp.negro_semana(date), tpp.negro_sospecha(jsonb), tpp.negro_estado(uuid),
  tpp.negro_comprar(uuid, text), tpp.negro_inspeccion(uuid, text) from public, anon, authenticated;
revoke all on function public.tpp_negro(), public.tpp_negro_comprar(text), public.tpp_negro_inspeccion(text) from public, anon;
grant execute on function public.tpp_negro(), public.tpp_negro_comprar(text), public.tpp_negro_inspeccion(text) to authenticated;
