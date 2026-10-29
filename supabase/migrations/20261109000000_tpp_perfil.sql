-- Mi perfil y Mis plantas: avatar elegible (se guarda en ajustes), estadísticas y lista de plantas del jugador.
-- Para deshacer: drop function public.tpp_mi_perfil(); drop function tpp.mi_perfil(uuid);
-- (tpp.ajustes queda aceptando la clave avatar: volver a aplicar 20261103000000_tpp_ranking.sql si se quiere quitar).

create or replace function tpp.ajustes(p_uid uuid, p_ajustes jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  nuevo jsonb;
  k text;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  nuevo := perfil.ajustes;
  for k in select * from jsonb_object_keys(coalesce(p_ajustes, '{}'::jsonb)) loop
    if k in ('efectos', 'musica', 'avisos', 'ranking_oculto') and jsonb_typeof(p_ajustes -> k) = 'boolean' then
      nuevo := nuevo || jsonb_build_object(k, p_ajustes -> k);
    elsif k in ('volumen_efectos', 'volumen_musica') and jsonb_typeof(p_ajustes -> k) = 'number' then
      nuevo := nuevo || jsonb_build_object(k, greatest(0, least(100, round((p_ajustes ->> k)::numeric))));
    elsif k = 'avatar' and (p_ajustes ->> k) in ('avatar_gorra', 'avatar_sombrero', 'avatar_gorro', 'avatar_bandana',
        'avatar_rizos', 'avatar_gafas', 'avatar_cascos', 'avatar_brote') then
      nuevo := nuevo || jsonb_build_object(k, p_ajustes ->> k);
    end if;
  end loop;
  update tpp.perfiles set ajustes = nuevo where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

-- Datos del perfil y lista de plantas (las más recientes primero).
create function tpp.mi_perfil(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  return jsonb_build_object(
    'desde', perfil.creado_en,
    'estadisticas', jsonb_build_object(
      'racha', (tpp.diaria_json(perfil) ->> 'racha')::int,
      'cosechas', coalesce((perfil.estadisticas ->> 'cosechas')::int, 0),
      'gastado', coalesce((perfil.estadisticas ->> 'gastado')::int, 0),
      'riegos', coalesce((perfil.estadisticas ->> 'riegos')::int, 0),
      'abonos', coalesce((perfil.estadisticas ->> 'abonos')::int, 0),
      'muertas', (select count(*)::int from tpp.plantas where usuario_id = p_uid and estado = 'muerta'),
      'logros', (select count(*)::int from jsonb_object_keys(perfil.logros)),
      'logros_total', jsonb_array_length(tpp.logros())
    ),
    'plantas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'variedad', variedad, 'vida', estado, 'hueco', hueco,
        'fase', tpp.fase_planta(pl), 'plantada', plantada_en, 'horas', round(horas_vividas::numeric, 1)
      ) order by plantada_en desc), '[]'::jsonb)
      from (select * from tpp.plantas where usuario_id = p_uid order by plantada_en desc limit 60) pl
    )
  );
end;
$$;

create function public.tpp_mi_perfil() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mi_perfil(auth.uid());
end;
$$;

revoke all on function tpp.mi_perfil(uuid) from public, anon, authenticated;
revoke all on function public.tpp_mi_perfil() from public, anon;
grant execute on function public.tpp_mi_perfil() to authenticated;
