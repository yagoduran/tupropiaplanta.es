-- Horas jugadas: cada vez que el juego pide el estado (una vez por minuto con la pestaña a la vista) se suman los
-- segundos desde la última petición, con un tope de 2 minutos, al día de hoy en tpp.actividad.
-- tpp.mis_estadisticas devuelve las horas totales y las de cada día de la semana en curso.
--
-- Para deshacer: volver a poner en tpp.estado_json la línea de ultima_vez sin la parte de actividad,
--   volver a aplicar la versión anterior de tpp.mis_estadisticas y: alter table tpp.actividad drop column segundos;

alter table tpp.actividad add column if not exists segundos integer not null default 0;

do $mig$
declare
  d text := pg_get_functiondef('tpp.estado_json(uuid)'::regprocedure);
  o text := d;
begin
  d := replace(d,
    E'if perfil.ultima_vez is null or perfil.ultima_vez < now() - interval ''1 minute'' then\n    update tpp.perfiles set ultima_vez = now() where id = p_uid;',
    E'if perfil.ultima_vez is null or perfil.ultima_vez < now() - interval ''1 minute'' then\n    if perfil.ultima_vez is not null then\n      insert into tpp.actividad (usuario_id, dia, segundos)\n      values (p_uid, (now() at time zone ''Europe/Madrid'')::date, least(120, extract(epoch from now() - perfil.ultima_vez))::int)\n      on conflict (usuario_id, dia) do update set segundos = tpp.actividad.segundos + excluded.segundos;\n    end if;\n    update tpp.perfiles set ultima_vez = now() where id = p_uid;');
  if d = o then raise exception 'estado_json no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.mis_estadisticas(uuid)'::regprocedure);
  o := d;
  d := replace(d,
    E'''variedades'', (',
    E'''horas'', (select round(coalesce(sum(segundos), 0) / 3600.0, 1) from tpp.actividad where usuario_id = p_uid),\n    ''horas_semana'', (\n      select jsonb_agg(jsonb_build_object(''dia'', d, ''horas'', round(coalesce((\n        select segundos from tpp.actividad where usuario_id = p_uid and dia = d), 0) / 3600.0, 1)) order by d)\n      from generate_series(date_trunc(''week'', hoy)::date, date_trunc(''week'', hoy)::date + 6, interval ''1 day'') g(d0), lateral (select d0::date as d) x\n    ),\n    ''variedades'', (');
  if d = o then raise exception 'mis_estadisticas no cambia'; end if;
  execute d;
end
$mig$;
