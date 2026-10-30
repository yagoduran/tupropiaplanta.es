-- Recuperar la planta muerta viendo un anuncio: 1 vez al día (aparte de las ayudas extra). La planta del hueco activo vuelve a vivir
-- con 50 % de salud, sin plaga y con agua, nutrientes y luz al menos al 50 %. No vale para desafíos.
-- Para deshacer: borrar public.tpp_recuperar_planta, tpp.recuperar_planta, la columna recuperada_dia de tpp.perfiles
-- y volver a aplicar la versión anterior de tpp.anuncios_json.

alter table tpp.perfiles add column if not exists recuperada_dia date;

create or replace function tpp.anuncios_json(p tpp.perfiles) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'restantes', 3 - case when p.anuncios_dia = (now() at time zone 'Europe/Madrid')::date then p.anuncios_n else 0 end,
    'monedas', 25,
    'recuperar', p.recuperada_dia is distinct from (now() at time zone 'Europe/Madrid')::date
  );
$$;

create function tpp.recuperar_planta(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  pid uuid;
begin
  perform tpp.asegurar_perfil(p_uid);
  if exists (select 1 from tpp.perfiles where id = p_uid and recuperada_dia = hoy) then
    return jsonb_build_object('ok', false, 'error', 'recuperar_agotado') || tpp.estado_json(p_uid);
  end if;
  select id into pid from tpp.plantas
    where usuario_id = p_uid and estado = 'muerta' and desafio is null and hueco = tpp.hueco_activo(p_uid);
  if pid is null then
    return jsonb_build_object('ok', false, 'error', 'nada_que_recuperar') || tpp.estado_json(p_uid);
  end if;
  update tpp.plantas set estado = 'viva', muerta_en = null, salud = 50, plaga = null, plaga_desde = null,
    agua = greatest(agua, 50), nutrientes = greatest(nutrientes, 50), luz = greatest(luz, 50),
    esperas = '{}'::jsonb, sincronizada_en = now() where id = pid;
  update tpp.perfiles set recuperada_dia = hoy where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

create function public.tpp_recuperar_planta() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.recuperar_planta(auth.uid());
end;
$$;

revoke all on function tpp.recuperar_planta(uuid) from public, anon, authenticated;
revoke all on function public.tpp_recuperar_planta() from public, anon;
grant execute on function public.tpp_recuperar_planta() to authenticated;
