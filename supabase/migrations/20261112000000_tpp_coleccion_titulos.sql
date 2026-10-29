-- Colección (12 variedades, 5 reales), títulos y marcos de perfil.
-- Se guarda en perfiles.ajustes: titulo, marco, hitos (porcentajes de colección ya reclamados).
-- Para deshacer: drop function public.tpp_progresion(); drop function public.tpp_reclamar_hito(integer);
-- drop function tpp.progresion(uuid); drop function tpp.reclamar_hito(uuid, integer); drop function tpp.progresion_datos(uuid);
-- y volver a aplicar 20261109000000_tpp_perfil.sql para que tpp.ajustes deje de aceptar titulo y marco.

-- Datos para decidir qué está desbloqueado.
create function tpp.progresion_datos(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  desc_n integer;
  pct integer;
  hitos jsonb;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  desc_n := (select count(*)::int from jsonb_object_keys(coalesce(perfil.estadisticas -> 'variedades', '{}'::jsonb)));
  pct := round(desc_n * 100.0 / 12)::int;
  hitos := coalesce(perfil.ajustes -> 'hitos', '[]'::jsonb);
  return jsonb_build_object(
    'descubiertas', (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(coalesce(perfil.estadisticas -> 'variedades', '{}'::jsonb)) k),
    'total', 12,
    'pct', pct,
    'hitos', hitos,
    'nivel', tpp.nivel_de(perfil.xp),
    'riegos', coalesce((perfil.estadisticas ->> 'riegos')::int, 0)
  );
end;
$$;

-- ¿Qué títulos y marcos tiene el jugador? Los de cruces, maestría, eventos y prestigio aún no se pueden conseguir.
create function tpp.progresion(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  d jsonb;
  pct integer;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  d := tpp.progresion_datos(p_uid);
  pct := (d ->> 'pct')::int;
  return d || jsonb_build_object(
    'titulos', jsonb_build_object(
      'aprendiz_riego', (d ->> 'riegos')::int >= 100,
      'experto_riego', (d ->> 'riegos')::int >= 1000,
      'maestro_riego', (d ->> 'riegos')::int >= 5000,
      'curioso', false, 'genetista', false, 'creador', false,
      'coleccionista', pct >= 25,
      'botanico', pct >= 75,
      'enciclopedia', pct >= 100
    ),
    'marcos', jsonb_build_object(
      'madera', true,
      'hojas', (d ->> 'nivel')::int >= 10,
      'botanico', (d -> 'hitos') @> '75'::jsonb,
      'dorado', false, 'otono', false, 'escarcha', false, 'prestigio', false
    ),
    'titulo', perfil.ajustes ->> 'titulo',
    'marco', coalesce(perfil.ajustes ->> 'marco', 'madera')
  );
end;
$$;

-- Reclama el premio de un hito de la colección (25, 50, 75 o 100 %).
create function tpp.reclamar_hito(p_uid uuid, p_pct integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  d jsonb;
begin
  if p_pct not in (25, 50, 75, 100) then
    return jsonb_build_object('ok', false, 'error', 'hito_desconocido') || tpp.estado_json(p_uid);
  end if;
  perfil := tpp.asegurar_perfil(p_uid);
  select * into perfil from tpp.perfiles where id = p_uid for update;
  d := tpp.progresion_datos(p_uid);
  if (d ->> 'pct')::int < p_pct then
    return jsonb_build_object('ok', false, 'error', 'hito_bloqueado') || tpp.estado_json(p_uid);
  end if;
  if (d -> 'hitos') @> to_jsonb(p_pct) then
    return jsonb_build_object('ok', false, 'error', 'hito_reclamado') || tpp.estado_json(p_uid);
  end if;

  update tpp.perfiles set ajustes = ajustes || jsonb_build_object('hitos', (d -> 'hitos') || to_jsonb(p_pct)) where id = p_uid;
  if p_pct = 25 then
    update tpp.perfiles set monedas = monedas + 500 where id = p_uid;
  elsif p_pct = 50 then
    insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, 'maceta_ceramica', 1)
      on conflict (usuario_id, objeto) do update set cantidad = greatest(tpp.inventario.cantidad, 1);
  end if;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

-- Ajustes: ahora también el título y el marco equipados (solo si están desbloqueados).
create or replace function tpp.ajustes(p_uid uuid, p_ajustes jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  nuevo jsonb;
  k text;
  prog jsonb;
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
    elsif k in ('titulo', 'marco') and jsonb_typeof(p_ajustes -> k) = 'string' then
      prog := tpp.progresion(p_uid);
      if coalesce((prog -> (case k when 'titulo' then 'titulos' else 'marcos' end) ->> (p_ajustes ->> k))::boolean, false) then
        nuevo := nuevo || jsonb_build_object(k, p_ajustes ->> k);
      end if;
    end if;
  end loop;
  update tpp.perfiles set ajustes = nuevo where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

create function public.tpp_progresion() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.progresion(auth.uid());
end;
$$;

create function public.tpp_reclamar_hito(p_pct integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.reclamar_hito(auth.uid(), p_pct);
end;
$$;

revoke all on function tpp.progresion_datos(uuid) from public, anon, authenticated;
revoke all on function tpp.progresion(uuid) from public, anon, authenticated;
revoke all on function tpp.reclamar_hito(uuid, integer) from public, anon, authenticated;
revoke all on function public.tpp_progresion() from public, anon;
revoke all on function public.tpp_reclamar_hito(integer) from public, anon;
grant execute on function public.tpp_progresion() to authenticated;
grant execute on function public.tpp_reclamar_hito(integer) to authenticated;
