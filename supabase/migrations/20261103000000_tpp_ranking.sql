-- Fase 5b: ranking por experiencia. Solo muestra usuario y nivel; se puede ocultar desde Ajustes.
-- Para deshacer: drop function public.tpp_ranking(); drop function tpp.ranking(uuid);
-- (tpp.ajustes queda aceptando la clave ranking_oculto: volver a aplicar 20261030000000_tpp_tutorial_ajustes.sql si se quiere quitar).

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
    end if;
  end loop;
  update tpp.perfiles set ajustes = nuevo where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

-- Ranking por experiencia. Solo se ve el nombre de usuario y el nivel; quien se oculta en Ajustes no sale.
create function tpp.ranking(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  top jsonb;
  mia jsonb := null;
  total integer;
begin
  perform tpp.asegurar_perfil(p_uid);

  with visibles as (
    select id, usuario, xp, row_number() over (order by xp desc, creado_en asc) as pos
    from tpp.perfiles
    where coalesce((ajustes ->> 'ranking_oculto')::boolean, false) = false
  )
  select coalesce(jsonb_agg(jsonb_build_object('pos', pos, 'usuario', usuario, 'nivel', tpp.nivel_de(xp), 'yo', id = p_uid) order by pos), '[]'::jsonb)
    into top from visibles where pos <= 20;

  with visibles as (
    select id, xp, row_number() over (order by xp desc, creado_en asc) as pos
    from tpp.perfiles
    where coalesce((ajustes ->> 'ranking_oculto')::boolean, false) = false
  )
  select jsonb_build_object('pos', pos, 'nivel', tpp.nivel_de(xp)) into mia from visibles where id = p_uid;

  select count(*) into total from tpp.perfiles
    where coalesce((ajustes ->> 'ranking_oculto')::boolean, false) = false;

  return jsonb_build_object('top', top, 'mia', mia, 'total', total);
end;
$$;

create function public.tpp_ranking() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.ranking(auth.uid());
end;
$$;

revoke all on function tpp.ranking(uuid) from public, anon, authenticated;
revoke all on function public.tpp_ranking() from public, anon;
grant execute on function public.tpp_ranking() to authenticated;
