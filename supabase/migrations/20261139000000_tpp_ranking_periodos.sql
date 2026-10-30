-- Ranking con periodo (hoy, semana, siempre) y criterio (cosecha total, planta más vieja, racha de días).
-- Hoy y semana se cuentan desde esta migración: cada cosecha queda anotada en tpp.cosechas_historial.
-- Las funciones antiguas tpp.ranking(uuid, text) y public.tpp_ranking(text) siguen igual.
--
-- Para deshacer: drop function public.tpp_ranking(text, text, text); drop function tpp.ranking(uuid, text, text, text);
--   y volver a poner en tpp.accion la línea de gramos_c sin el insert en tpp.cosechas_historial; drop table tpp.cosechas_historial;

create table if not exists tpp.cosechas_historial (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references tpp.perfiles (id) on delete cascade,
  gramos integer not null,
  en timestamptz not null default now()
);
create index if not exists cosechas_historial_en_idx on tpp.cosechas_historial (en);
alter table tpp.cosechas_historial enable row level security;
revoke all on tpp.cosechas_historial from public, anon, authenticated;

create or replace function tpp.ranking(p_uid uuid, p_ambito text, p_periodo text, p_metrica text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  mi_pais text;
  res jsonb;
  desde timestamptz;
begin
  if p_ambito not in ('mundial', 'nacional', 'amigos') then p_ambito := 'mundial'; end if;
  if p_periodo not in ('hoy', 'semana', 'siempre') then p_periodo := 'siempre'; end if;
  if p_metrica not in ('cosecha', 'vieja', 'racha') then p_metrica := 'cosecha'; end if;
  if p_metrica <> 'cosecha' then p_periodo := 'siempre'; end if;
  desde := case p_periodo
    when 'hoy' then date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid'
    when 'semana' then date_trunc('week', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid'
    else null end;
  perform tpp.asegurar_perfil(p_uid);
  select ajustes ->> 'pais' into mi_pais from tpp.perfiles where id = p_uid;

  with base as (
    select p.id, p.usuario, p.creador, p.xp, p.creado_en,
           coalesce((p.ajustes ->> 'ranking_oculto')::boolean, false) as oculto,
           case p_metrica
             when 'racha' then p.racha
             when 'vieja' then coalesce((select floor(max(extract(epoch from (now() - pl.plantada_en)) / 86400))::int
               from tpp.plantas pl where pl.usuario_id = p.id and pl.muerta_en is null and pl.desafio is null), 0)
             else case when desde is null then coalesce((p.estadisticas ->> 'cosechas')::int, 0)
               else (select count(*)::int from tpp.cosechas_historial h where h.usuario_id = p.id and h.en >= desde) end
           end as valor
    from tpp.perfiles p
    where case p_ambito
      when 'amigos' then p.id = p_uid or exists (
        select 1 from tpp.amistades a
        where a.estado = 'amigos' and p_uid in (a.solicitante, a.receptor) and p.id in (a.solicitante, a.receptor))
      when 'nacional' then mi_pais is not null and p.ajustes ->> 'pais' = mi_pais
      else true end
  ), visibles as (
    select *, row_number() over (order by valor desc, xp desc, creado_en asc) as pos
    from base
    where (p_ambito = 'amigos' or not oculto) and (valor > 0 or (p_metrica = 'cosecha' and p_periodo = 'siempre'))
  )
  select jsonb_build_object(
    'ambito', p_ambito, 'periodo', p_periodo, 'metrica', p_metrica,
    'pais', mi_pais,
    'total', (select count(*) from visibles),
    'top', coalesce((select jsonb_agg(jsonb_build_object('pos', pos, 'usuario', usuario, 'nivel', tpp.nivel_de(xp),
              'valor', valor, 'yo', id = p_uid, 'creador', creador) order by pos) from visibles where pos <= 50), '[]'::jsonb),
    'mia', (select jsonb_build_object('pos', pos, 'nivel', tpp.nivel_de(xp), 'valor', valor) from visibles where id = p_uid))
  into res;
  return res;
end;
$function$;

create or replace function public.tpp_ranking(p_ambito text, p_periodo text, p_metrica text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.ranking(auth.uid(), p_ambito, p_periodo, p_metrica);
end;
$function$;

revoke all on function tpp.ranking(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.tpp_ranking(text, text, text) from public, anon;
grant execute on function public.tpp_ranking(text, text, text) to authenticated;

do $mig$
declare
  d text := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure);
  o text := d;
begin
  d := replace(d,
    E'\n    update tpp.perfiles set xp = xp + xp_cosecha,\n      cosecha_pendiente',
    E'\n    insert into tpp.cosechas_historial (usuario_id, gramos) values (p_uid, gramos_c);\n    update tpp.perfiles set xp = xp + xp_cosecha,\n      cosecha_pendiente');
  if d = o then raise exception 'cosecha no cambia'; end if;
  execute d;
end
$mig$;
