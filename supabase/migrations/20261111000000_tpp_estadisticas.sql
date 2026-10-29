-- Estadísticas: actividad por día (cosechas y monedas ganadas) para las gráficas.
-- Solo cuenta desde que se aplicó esta migración. Para deshacer:
--   drop function public.tpp_mis_estadisticas(); drop function tpp.mis_estadisticas(uuid);
--   drop trigger perfiles_monedas_actividad on tpp.perfiles; drop trigger plantas_cosecha_actividad on tpp.plantas;
--   drop function tpp.registrar_monedas(); drop function tpp.registrar_cosecha(); drop table tpp.actividad;

create table tpp.actividad (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  dia date not null,
  cosechas integer not null default 0,
  monedas integer not null default 0,
  primary key (usuario_id, dia)
);

alter table tpp.actividad enable row level security;

-- Cada vez que suben las monedas de un jugador, se suma al día de hoy (hora de Madrid).
create function tpp.registrar_monedas() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into tpp.actividad (usuario_id, dia, monedas)
    values (new.id, (now() at time zone 'Europe/Madrid')::date, new.monedas - old.monedas)
    on conflict (usuario_id, dia) do update set monedas = tpp.actividad.monedas + excluded.monedas;
  return new;
end;
$$;

create trigger perfiles_monedas_actividad
  after update of monedas on tpp.perfiles
  for each row when (new.monedas > old.monedas)
  execute function tpp.registrar_monedas();

-- Cada vez que se cosecha una planta, se suma al día de hoy.
create function tpp.registrar_cosecha() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into tpp.actividad (usuario_id, dia, cosechas)
    values (new.usuario_id, (now() at time zone 'Europe/Madrid')::date, 1)
    on conflict (usuario_id, dia) do update set cosechas = tpp.actividad.cosechas + 1;
  return new;
end;
$$;

create trigger plantas_cosecha_actividad
  after update of estado on tpp.plantas
  for each row when (new.estado = 'cosechada' and old.estado <> 'cosechada')
  execute function tpp.registrar_cosecha();

create function tpp.mis_estadisticas(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  hoy date := (now() at time zone 'Europe/Madrid')::date;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  return jsonb_build_object(
    'dias_cuenta', hoy - (perfil.creado_en at time zone 'Europe/Madrid')::date + 1,
    'cosechas', coalesce((perfil.estadisticas ->> 'cosechas')::int, 0),
    'racha_max', coalesce((perfil.estadisticas ->> 'racha_max')::int, 0),
    'monedas_ganadas', (select coalesce(sum(monedas), 0)::int from tpp.actividad where usuario_id = p_uid),
    'desde', (select min(dia) from tpp.actividad where usuario_id = p_uid),
    -- Últimas 8 semanas (la que empieza el lunes) y últimos 14 días, también los que no tienen actividad.
    'semanas', (
      select jsonb_agg(jsonb_build_object('inicio', s, 'n', coalesce((
        select sum(cosechas) from tpp.actividad where usuario_id = p_uid and dia >= s and dia < s + 7), 0)::int) order by s)
      from generate_series(date_trunc('week', hoy)::date - 49, date_trunc('week', hoy)::date, interval '7 days') g(s0),
           lateral (select s0::date as s) x
    ),
    'dias', (
      select jsonb_agg(jsonb_build_object('dia', d, 'monedas', coalesce((
        select monedas from tpp.actividad where usuario_id = p_uid and dia = d), 0)) order by d)
      from generate_series(hoy - 13, hoy, interval '1 day') g(d0), lateral (select d0::date as d) x
    ),
    'variedades', (
      select coalesce(jsonb_agg(jsonb_build_object('variedad', variedad, 'n', n) order by n desc), '[]'::jsonb)
      from (select variedad, count(*)::int as n from tpp.plantas
            where usuario_id = p_uid and estado = 'cosechada' group by variedad order by n desc limit 5) v
    )
  );
end;
$$;

create function public.tpp_mis_estadisticas() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mis_estadisticas(auth.uid());
end;
$$;

revoke all on function tpp.registrar_monedas() from public, anon, authenticated;
revoke all on function tpp.registrar_cosecha() from public, anon, authenticated;
revoke all on function tpp.mis_estadisticas(uuid) from public, anon, authenticated;
revoke all on function public.tpp_mis_estadisticas() from public, anon;
grant execute on function public.tpp_mis_estadisticas() to authenticated;
