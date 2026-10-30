-- Cosecha lista: al cosechar, las monedas y los gramos quedan pendientes y el jugador elige Vender (monedas) o Guardar
-- (gramos en el almacén para los encargos). La experiencia y la maestría se dan al cosechar.
-- Si cosecha otra planta sin elegir, la anterior se vende sola.
--
-- Para deshacer: volver a poner en tpp.accion la línea que suma monedas y almacén al cosechar, y después:
--   drop function public.tpp_resolver_cosecha(boolean); drop function public.tpp_cosecha_pendiente();
--   drop function tpp.resolver_cosecha(uuid, boolean); alter table tpp.perfiles drop column cosecha_pendiente;

alter table tpp.perfiles add column if not exists cosecha_pendiente jsonb;

create or replace function tpp.resolver_cosecha(p_uid uuid, p_vender boolean)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  c jsonb;
begin
  select cosecha_pendiente into c from tpp.perfiles where id = p_uid for update;
  if c is null then
    return jsonb_build_object('ok', false, 'error', 'sin_cosecha') || tpp.estado_json(p_uid);
  end if;
  if p_vender then
    update tpp.perfiles set monedas = monedas + (c ->> 'monedas')::int, cosecha_pendiente = null where id = p_uid;
  else
    update tpp.perfiles set
      almacen = almacen || jsonb_build_object(c ->> 'variedad', coalesce((almacen ->> (c ->> 'variedad'))::int, 0) + (c ->> 'gramos')::int),
      cosecha_pendiente = null
    where id = p_uid;
  end if;
  return jsonb_build_object('ok', true, 'recompensa', case when p_vender then (c ->> 'monedas')::int else 0 end) || tpp.estado_json(p_uid);
end;
$function$;

create or replace function public.tpp_resolver_cosecha(p_vender boolean)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.resolver_cosecha(auth.uid(), p_vender);
end;
$function$;

create or replace function public.tpp_cosecha_pendiente()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return (select cosecha_pendiente from tpp.perfiles where id = auth.uid());
end;
$function$;

revoke all on function tpp.resolver_cosecha(uuid, boolean) from public, anon, authenticated;
revoke all on function public.tpp_resolver_cosecha(boolean) from public, anon;
revoke all on function public.tpp_cosecha_pendiente() from public, anon;
grant execute on function public.tpp_resolver_cosecha(boolean) to authenticated;
grant execute on function public.tpp_cosecha_pendiente() to authenticated;

do $mig$
declare
  d text := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure);
  o text;
begin
  o := d;
  d := replace(d, E'xp_cosecha integer;\nbegin', E'xp_cosecha integer;\n  gramos_c integer;\nbegin');
  if d = o then raise exception 'declare no cambia'; end if;

  o := d;
  d := replace(d, 'lv_ma := tpp.maestria_nivel(p_uid, p.variedad);', E'perform tpp.resolver_cosecha(p_uid, true);\n    lv_ma := tpp.maestria_nivel(p_uid, p.variedad);');
  if d = o then raise exception 'previa no cambia'; end if;

  o := d;
  d := replace(d,
    $a$update tpp.perfiles set monedas = monedas + recompensa, xp = xp + xp_cosecha,
      almacen = almacen || jsonb_build_object(p.variedad, coalesce((almacen ->> p.variedad)::int, 0)
        + greatest(1, round(20 * coalesce((tpp.datos_variedad(p_uid, p.variedad) ->> 'recompensa')::double precision, 1) * p.salud / 100 * (case when p.sexo = 'macho' then 0.2 else 1 end))::int)),
      maestria =$a$,
    $b$gramos_c := greatest(1, round(20 * coalesce((tpp.datos_variedad(p_uid, p.variedad) ->> 'recompensa')::double precision, 1) * p.salud / 100 * (case when p.sexo = 'macho' then 0.2 else 1 end))::int);
    update tpp.perfiles set xp = xp + xp_cosecha,
      cosecha_pendiente = jsonb_build_object('variedad', p.variedad, 'gramos', gramos_c, 'monedas', recompensa, 'xp', xp_cosecha,
        'calidad', greatest(1, least(5, ceil(p.salud / 20)::int)), 'dias', greatest(0, floor(extract(epoch from (now() - p.plantada_en)) / 86400))::int),
      maestria =$b$);
  if d = o then raise exception 'cosecha no cambia'; end if;

  o := d;
  d := replace(d,
    E'return jsonb_build_object(''ok'', true, ''recompensa'', recompensa) || tpp.estado_json(p_uid);\n  end if;\n\n  if p_accion = ''podar''',
    E'return jsonb_build_object(''ok'', true, ''recompensa'', recompensa,\n      ''cosecha'', (select cosecha_pendiente from tpp.perfiles where id = p_uid)) || tpp.estado_json(p_uid);\n  end if;\n\n  if p_accion = ''podar''');
  if d = o then raise exception 'retorno no cambia'; end if;
  execute d;
end
$mig$;
