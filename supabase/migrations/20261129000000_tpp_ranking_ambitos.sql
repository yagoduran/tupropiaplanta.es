-- Ranking por cosechas con tres ámbitos: mundial, nacional (mismo país elegido en Ajustes) y amigos.
-- Top 50 y el puesto del jugador. El país se guarda en tpp.perfiles.ajustes ->> 'pais' (2 letras, opcional).
-- Quien se oculta (ranking_oculto) no sale en mundial ni nacional; entre amigos sí se ven.
-- Para deshacer: drop function public.tpp_ranking(text); drop function tpp.ranking(uuid, text);
-- y volver a aplicar 20261103000000_tpp_ranking.sql (ranking por XP) y la versión anterior de tpp.ajustes (20261119000000).

drop function public.tpp_ranking();
drop function tpp.ranking(uuid);

create function tpp.ranking(p_uid uuid, p_ambito text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  mi_pais text;
  res jsonb;
begin
  if p_ambito not in ('mundial', 'nacional', 'amigos') then p_ambito := 'mundial'; end if;
  perform tpp.asegurar_perfil(p_uid);
  select ajustes ->> 'pais' into mi_pais from tpp.perfiles where id = p_uid;

  with base as (
    select p.id, p.usuario, p.xp, p.creado_en, coalesce((p.estadisticas ->> 'cosechas')::int, 0) as cosechas,
           coalesce((p.ajustes ->> 'ranking_oculto')::boolean, false) as oculto
    from tpp.perfiles p
    where case p_ambito
      when 'amigos' then p.id = p_uid or exists (
        select 1 from tpp.amistades a
        where a.estado = 'amigos' and p_uid in (a.solicitante, a.receptor) and p.id in (a.solicitante, a.receptor))
      when 'nacional' then mi_pais is not null and p.ajustes ->> 'pais' = mi_pais
      else true end
  ), visibles as (
    select *, row_number() over (order by cosechas desc, xp desc, creado_en asc) as pos
    from base where p_ambito = 'amigos' or not oculto
  )
  select jsonb_build_object(
    'ambito', p_ambito,
    'pais', mi_pais,
    'total', (select count(*) from visibles),
    'top', coalesce((select jsonb_agg(jsonb_build_object('pos', pos, 'usuario', usuario, 'nivel', tpp.nivel_de(xp),
              'cosechas', cosechas, 'yo', id = p_uid) order by pos) from visibles where pos <= 50), '[]'::jsonb),
    'mia', (select jsonb_build_object('pos', pos, 'nivel', tpp.nivel_de(xp), 'cosechas', cosechas) from visibles where id = p_uid))
  into res;
  return res;
end;
$$;

create function public.tpp_ranking(p_ambito text default 'mundial') returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.ranking(auth.uid(), p_ambito);
end;
$$;

revoke all on function tpp.ranking(uuid, text) from public, anon, authenticated;
revoke all on function public.tpp_ranking(text) from public, anon;
grant execute on function public.tpp_ranking(text) to authenticated;

-- Ajustes: acepta el país (2 letras mayúsculas) o vacío para quitarlo.
do $mig$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('tpp.ajustes(uuid,jsonb)'::regprocedure);
  o := d;
  d := replace(d, E'    elsif k in (''titulo'', ''marco'')',
    E'    elsif k = ''pais'' and jsonb_typeof(p_ajustes -> k) = ''string'' and (p_ajustes ->> k) ~ ''^([A-Z]{2})?$'' then\n      nuevo := case when p_ajustes ->> k = '''' then nuevo - ''pais'' else nuevo || jsonb_build_object(k, p_ajustes ->> k) end;\n    elsif k in (''titulo'', ''marco'')');
  if d = o then raise exception 'ajustes no cambia'; end if;
  execute d;
end
$mig$;
