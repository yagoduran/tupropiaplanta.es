-- Cofre del día: al reclamar las misiones diarias activas se puede abrir un cofre con premio fijo (200 monedas y 50 XP).
-- Se guarda en perfiles.misiones -> 'c' (fecha del día en que se abrió), así que se reinicia solo cada día.

create or replace function tpp.mis_misiones(p_uid uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  m jsonb;
  ahora timestamp := now() at time zone 'Europe/Madrid';
  hoy text := (now() at time zone 'Europe/Madrid')::date::text;
  res jsonb := '[]'::jsonb;
  def jsonb;
  v integer;
  estado text;
  total_d integer := 0;
  hechas_d integer := 0;
begin
  perform tpp.asegurar_perfil(p_uid);
  m := tpp.misiones_al_dia(p_uid);
  for def in select x from jsonb_array_elements(tpp.misiones_activas(p_uid)) x loop
    v := coalesce((m -> 'p' ->> (def ->> 'id'))::int, 0);
    estado := case when (m -> 'r') ? (def ->> 'id') then 'reclamada' when v >= (def ->> 'meta')::int then 'lista' else 'curso' end;
    if def ->> 'grupo' = 'd' then
      total_d := total_d + 1;
      if estado = 'reclamada' then hechas_d := hechas_d + 1; end if;
    end if;
    res := res || jsonb_build_array(def || jsonb_build_object('v', v, 'estado', estado));
  end loop;
  return jsonb_build_object(
    'misiones', res,
    'renueva_dia', floor(extract(epoch from (date_trunc('day', ahora) + interval '1 day' - ahora)))::int,
    'renueva_semana', floor(extract(epoch from (date_trunc('week', ahora) + interval '7 days' - ahora)))::int,
    'cofre', jsonb_build_object(
      'hechas', hechas_d,
      'total', total_d,
      'abierto', (m ->> 'c') = hoy,
      'listo', total_d > 0 and hechas_d >= total_d and (m ->> 'c') is distinct from hoy,
      'premio', jsonb_build_object('monedas', 200, 'xp', 50)
    )
  );
end;
$function$;

create or replace function tpp.reclamar_cofre(p_uid uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  m jsonb;
  hoy text := (now() at time zone 'Europe/Madrid')::date::text;
  total_d integer;
  hechas_d integer;
begin
  perform tpp.asegurar_perfil(p_uid);
  perform 1 from tpp.perfiles where id = p_uid for update;
  m := tpp.misiones_al_dia(p_uid);
  if (m ->> 'c') = hoy then
    return jsonb_build_object('ok', false, 'error', 'cofre_abierto') || tpp.estado_json(p_uid);
  end if;
  select count(*), count(*) filter (where (m -> 'r') ? (x ->> 'id'))
    into total_d, hechas_d
    from jsonb_array_elements(tpp.misiones_activas(p_uid)) x where x ->> 'grupo' = 'd';
  if total_d = 0 or hechas_d < total_d then
    return jsonb_build_object('ok', false, 'error', 'cofre_no_listo') || tpp.estado_json(p_uid);
  end if;
  update tpp.perfiles set misiones = m || jsonb_build_object('c', hoy), monedas = monedas + 200, xp = xp + 50 where id = p_uid;
  perform tpp.pase_puntos(p_uid, 20);
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

create or replace function public.tpp_reclamar_cofre() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.reclamar_cofre(auth.uid());
end;
$$;

revoke all on function tpp.reclamar_cofre(uuid) from public, anon, authenticated;
revoke all on function public.tpp_reclamar_cofre() from public, anon;
grant execute on function public.tpp_reclamar_cofre() to authenticated;
