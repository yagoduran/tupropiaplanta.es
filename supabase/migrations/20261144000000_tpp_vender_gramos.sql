-- Gramos guardados en el almacén: se muestran en el inventario y se pueden vender a 6 monedas por gramo
-- (un encargo paga unas 10 por gramo, así que guardarlos para encargos compensa más).
--
-- Para deshacer: drop function public.tpp_vender_gramos(text, integer); drop function tpp.vender_gramos(uuid, text, integer);
-- y quitar 'almacen' de tpp.estado_json.

create or replace function tpp.vender_gramos(p_uid uuid, p_variedad text, p_gramos integer)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  tengo integer;
  n integer;
begin
  select coalesce((almacen ->> p_variedad)::int, 0) into tengo from tpp.perfiles where id = p_uid for update;
  if coalesce(tengo, 0) <= 0 then
    return jsonb_build_object('ok', false, 'error', 'sin_gramos') || tpp.estado_json(p_uid);
  end if;
  n := least(tengo, coalesce(p_gramos, tengo));
  if n <= 0 then
    return jsonb_build_object('ok', false, 'error', 'sin_gramos') || tpp.estado_json(p_uid);
  end if;
  update tpp.perfiles set
    monedas = monedas + n * 6,
    almacen = almacen || jsonb_build_object(p_variedad, tengo - n)
  where id = p_uid;
  return jsonb_build_object('ok', true, 'recompensa', n * 6, 'gramos', n) || tpp.estado_json(p_uid);
end;
$function$;

create or replace function public.tpp_vender_gramos(p_variedad text, p_gramos integer default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.vender_gramos(auth.uid(), p_variedad, p_gramos);
end;
$function$;

revoke all on function tpp.vender_gramos(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.tpp_vender_gramos(text, integer) from public, anon;
grant execute on function public.tpp_vender_gramos(text, integer) to authenticated;

do $mig$
declare
  d text := pg_get_functiondef('tpp.estado_json(uuid)'::regprocedure);
  o text := d;
begin
  d := replace(d, E'''ajustes'', perfil.ajustes,', E'''ajustes'', perfil.ajustes,\n      ''almacen'', perfil.almacen,');
  if d = o then raise exception 'almacen no cambia'; end if;
  execute d;
end
$mig$;
