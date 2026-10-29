-- Misiones (diarias y semanales) y notificaciones (la campana).
-- Diarias (se renuevan a las 00:00, hora de Madrid): regar 5 veces (+100 monedas), abonar 2 veces (+40 XP), ajustar la luz (+60 monedas).
-- Semanales (se renuevan el lunes): cosechar una planta (+250 monedas), cosechar con salud >= 80 % (+150 XP).
-- Solo cuentan con la planta normal (no con la del desafío). Se reclaman con un botón.
-- Notificaciones: sed (agua < 20 %), plaga, misión lista, subida de nivel y logro. Se guardan las últimas 30.
-- Las de sed y plaga se crean al sincronizar la planta (cuando el jugador entra o actúa); no hay avisos con el juego cerrado.
-- Para deshacer: borrar las funciones public.tpp_misiones, tpp_reclamar_mision, tpp_notificaciones y tpp_leer_notificaciones,
-- tpp.misiones_def, misiones_al_dia, mision_sumar, mis_misiones, reclamar_mision, notificar, mis_notificaciones y leer_notificaciones,
-- la tabla tpp.notificaciones, la columna misiones de tpp.perfiles, y volver a aplicar las versiones anteriores de sincronizar,
-- accion, revisar_logros y estado_json.

alter table tpp.perfiles add column if not exists misiones jsonb not null default '{}'::jsonb;

create table tpp.notificaciones (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null,
  titulo text not null,
  texto text not null,
  creada_en timestamptz not null default now(),
  leida boolean not null default false
);
create index on tpp.notificaciones (usuario_id, id desc);
alter table tpp.notificaciones enable row level security;

create function tpp.misiones_def() returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_array(
    jsonb_build_object('id', 'd_regar', 'grupo', 'd', 'clave', 'regar', 'meta', 5, 'nombre', 'Riega 5 veces', 'desc', 'Riega tu planta 5 veces hoy.', 'premio', jsonb_build_object('tipo', 'monedas', 'n', 100)),
    jsonb_build_object('id', 'd_abonar', 'grupo', 'd', 'clave', 'abonar', 'meta', 2, 'nombre', 'Abona tu planta', 'desc', 'Usa abono 2 veces hoy.', 'premio', jsonb_build_object('tipo', 'xp', 'n', 40)),
    jsonb_build_object('id', 'd_luz', 'grupo', 'd', 'clave', 'luz', 'meta', 1, 'nombre', 'Ajusta la luz', 'desc', 'Ajusta la luz de tu planta una vez hoy.', 'premio', jsonb_build_object('tipo', 'monedas', 'n', 60)),
    jsonb_build_object('id', 's_cosechar', 'grupo', 's', 'clave', 'cosechar', 'meta', 1, 'nombre', 'Cosecha una planta', 'desc', 'Completa una cosecha esta semana.', 'premio', jsonb_build_object('tipo', 'monedas', 'n', 250)),
    jsonb_build_object('id', 's_sana', 'grupo', 's', 'clave', 'sana', 'meta', 1, 'nombre', 'Planta sana', 'desc', 'Cosecha con la salud por encima del 80 %.', 'premio', jsonb_build_object('tipo', 'xp', 'n', 150))
  );
$$;

-- Estado de misiones del jugador con los contadores ya reiniciados si ha cambiado el día o la semana (no guarda nada).
create function tpp.misiones_al_dia(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb;
  hoy text := (now() at time zone 'Europe/Madrid')::date::text;
  lunes text := date_trunc('week', now() at time zone 'Europe/Madrid')::date::text;
  d jsonb;
  ids_d text[];
  ids_s text[];
begin
  select misiones into m from tpp.perfiles where id = p_uid;
  m := coalesce(m, '{}'::jsonb);
  select array_agg(x ->> 'id') filter (where x ->> 'grupo' = 'd'), array_agg(x ->> 'id') filter (where x ->> 'grupo' = 's')
    into ids_d, ids_s from jsonb_array_elements(tpp.misiones_def()) x;
  if (m ->> 'd') is distinct from hoy then
    m := jsonb_set(m, '{p}', coalesce(m -> 'p', '{}'::jsonb) - ids_d);
    m := jsonb_set(m, '{r}', coalesce((select jsonb_agg(x) from jsonb_array_elements_text(coalesce(m -> 'r', '[]'::jsonb)) x where x <> all (ids_d)), '[]'::jsonb));
    m := m || jsonb_build_object('d', hoy);
  end if;
  if (m ->> 's') is distinct from lunes then
    m := jsonb_set(m, '{p}', coalesce(m -> 'p', '{}'::jsonb) - ids_s);
    m := jsonb_set(m, '{r}', coalesce((select jsonb_agg(x) from jsonb_array_elements_text(coalesce(m -> 'r', '[]'::jsonb)) x where x <> all (ids_s)), '[]'::jsonb));
    m := m || jsonb_build_object('s', lunes);
  end if;
  return m;
end;
$$;

create function tpp.notificar(p_uid uuid, p_tipo text, p_titulo text, p_texto text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_tipo in ('sed', 'plaga') and exists (select 1 from tpp.notificaciones where usuario_id = p_uid and tipo = p_tipo and not leida) then
    return;
  end if;
  insert into tpp.notificaciones (usuario_id, tipo, titulo, texto) values (p_uid, p_tipo, p_titulo, p_texto);
  delete from tpp.notificaciones where usuario_id = p_uid
    and id not in (select id from tpp.notificaciones where usuario_id = p_uid order by id desc limit 30);
end;
$$;

-- Suma progreso a las misiones de una clave (regar, abonar, luz, cosechar, sana) y avisa cuando una queda lista.
create function tpp.mision_sumar(p_uid uuid, p_clave text, p_n integer default 1) returns void
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb := tpp.misiones_al_dia(p_uid);
  def jsonb;
  previo integer;
  nuevo integer;
begin
  for def in select x from jsonb_array_elements(tpp.misiones_def()) x where x ->> 'clave' = p_clave loop
    previo := coalesce((m -> 'p' ->> (def ->> 'id'))::int, 0);
    if previo >= (def ->> 'meta')::int then continue; end if;
    nuevo := least((def ->> 'meta')::int, previo + p_n);
    m := jsonb_set(m, '{p}', coalesce(m -> 'p', '{}'::jsonb) || jsonb_build_object(def ->> 'id', nuevo));
    if nuevo >= (def ->> 'meta')::int then
      perform tpp.notificar(p_uid, 'mision', 'Misión lista', '«' || (def ->> 'nombre') || '» está lista para reclamar.');
    end if;
  end loop;
  update tpp.perfiles set misiones = m where id = p_uid;
end;
$$;

create function tpp.mis_misiones(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb;
  ahora timestamp := now() at time zone 'Europe/Madrid';
  res jsonb := '[]'::jsonb;
  def jsonb;
  v integer;
  estado text;
begin
  perform tpp.asegurar_perfil(p_uid);
  m := tpp.misiones_al_dia(p_uid);
  for def in select x from jsonb_array_elements(tpp.misiones_def()) x loop
    v := coalesce((m -> 'p' ->> (def ->> 'id'))::int, 0);
    estado := case when (m -> 'r') ? (def ->> 'id') then 'reclamada' when v >= (def ->> 'meta')::int then 'lista' else 'curso' end;
    res := res || jsonb_build_array(def || jsonb_build_object('v', v, 'estado', estado));
  end loop;
  return jsonb_build_object(
    'misiones', res,
    'renueva_dia', floor(extract(epoch from (date_trunc('day', ahora) + interval '1 day' - ahora)))::int,
    'renueva_semana', floor(extract(epoch from (date_trunc('week', ahora) + interval '7 days' - ahora)))::int
  );
end;
$$;

create function tpp.reclamar_mision(p_uid uuid, p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb;
  def jsonb;
  v integer;
begin
  perform tpp.asegurar_perfil(p_uid);
  select x into def from jsonb_array_elements(tpp.misiones_def()) x where x ->> 'id' = p_id;
  if def is null then
    return jsonb_build_object('ok', false, 'error', 'mision_desconocida') || tpp.estado_json(p_uid);
  end if;
  m := tpp.misiones_al_dia(p_uid);
  if (m -> 'r') ? p_id then
    return jsonb_build_object('ok', false, 'error', 'mision_reclamada') || tpp.estado_json(p_uid);
  end if;
  v := coalesce((m -> 'p' ->> p_id)::int, 0);
  if v < (def ->> 'meta')::int then
    return jsonb_build_object('ok', false, 'error', 'mision_no_lista') || tpp.estado_json(p_uid);
  end if;
  m := jsonb_set(m, '{r}', coalesce(m -> 'r', '[]'::jsonb) || to_jsonb(p_id));
  update tpp.perfiles set misiones = m,
    monedas = monedas + case when def -> 'premio' ->> 'tipo' = 'monedas' then (def -> 'premio' ->> 'n')::int else 0 end,
    xp = xp + case when def -> 'premio' ->> 'tipo' = 'xp' then (def -> 'premio' ->> 'n')::int else 0 end
    where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

create function tpp.mis_notificaciones(p_uid uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object(
    'no_leidas', (select count(*)::int from tpp.notificaciones where usuario_id = p_uid and not leida),
    'lista', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'tipo', tipo, 'titulo', titulo, 'texto', texto,
        'hace', floor(extract(epoch from (now() - creada_en)))::int, 'leida', leida) order by id desc)
      from tpp.notificaciones where usuario_id = p_uid), '[]'::jsonb)
  );
$$;

create function tpp.leer_notificaciones(p_uid uuid, p_id bigint default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  update tpp.notificaciones set leida = true where usuario_id = p_uid and not leida and (p_id is null or id = p_id);
  return tpp.mis_notificaciones(p_uid);
end;
$$;

create function public.tpp_misiones() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mis_misiones(auth.uid());
end;
$$;

create function public.tpp_reclamar_mision(p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.reclamar_mision(auth.uid(), p_id);
end;
$$;

create function public.tpp_notificaciones() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mis_notificaciones(auth.uid());
end;
$$;

create function public.tpp_leer_notificaciones(p_id bigint default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.leer_notificaciones(auth.uid(), p_id);
end;
$$;

revoke all on function tpp.misiones_def() from public, anon, authenticated;
revoke all on function tpp.misiones_al_dia(uuid) from public, anon, authenticated;
revoke all on function tpp.notificar(uuid, text, text, text) from public, anon, authenticated;
revoke all on function tpp.mision_sumar(uuid, text, integer) from public, anon, authenticated;
revoke all on function tpp.mis_misiones(uuid) from public, anon, authenticated;
revoke all on function tpp.reclamar_mision(uuid, text) from public, anon, authenticated;
revoke all on function tpp.mis_notificaciones(uuid) from public, anon, authenticated;
revoke all on function tpp.leer_notificaciones(uuid, bigint) from public, anon, authenticated;
revoke all on function public.tpp_misiones() from public, anon;
revoke all on function public.tpp_reclamar_mision(text) from public, anon;
revoke all on function public.tpp_notificaciones() from public, anon;
revoke all on function public.tpp_leer_notificaciones(bigint) from public, anon;
grant execute on function public.tpp_misiones() to authenticated;
grant execute on function public.tpp_reclamar_mision(text) to authenticated;
grant execute on function public.tpp_notificaciones() to authenticated;
grant execute on function public.tpp_leer_notificaciones(bigint) to authenticated;

-- Ganchos en las funciones que ya existían.
do $$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('tpp.sincronizar(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'  pbo jsonb;\nbegin', E'  pbo jsonb;\n  agua_ini double precision;\n  plaga_ini text;\nbegin');
  d := replace(d, E'from tpp.perfiles e where e.id = p.usuario_id;', E'from tpp.perfiles e where e.id = p.usuario_id;\n  agua_ini := p.agua;\n  plaga_ini := p.plaga;');
  d := replace(d, E'  where id = p.id;\n  return p;\nend;',
    E'  where id = p.id;\n  if p.estado = ''viva'' and agua_ini >= 20 and p.agua < 20 then\n    perform tpp.notificar(p.usuario_id, ''sed'', ''Tu planta tiene sed'', ''El agua ha bajado al '' || round(p.agua) || '' %. Riégala pronto.'');\n  end if;\n  if p.estado = ''viva'' and plaga_ini is null and p.plaga is not null then\n    perform tpp.notificar(p.usuario_id, ''plaga'', ''Plaga detectada'', ''Ha aparecido una plaga en tu planta.'');\n  end if;\n  return p;\nend;');
  if d = o or position('agua_ini := p.agua' in d) = 0 or position('''sed''' in d) = 0 or position('plaga_ini text' in d) = 0 then raise exception 'sincronizar no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, E'    perform tpp.contar(p_uid, ''cosechas'', 1);\n    if p.variedad = ''dorada''',
    E'    perform tpp.contar(p_uid, ''cosechas'', 1);\n    perform tpp.mision_sumar(p_uid, ''cosechar'');\n    if p.salud >= 80 then perform tpp.mision_sumar(p_uid, ''sana''); end if;\n    if p.variedad = ''dorada''');
  d := replace(d, E'  if p_accion = ''regar'' then perform tpp.contar(p_uid, ''riegos'', 1);\n  elsif p_accion = ''abonar'' then perform tpp.contar(p_uid, ''abonos'', 1);\n  end if;',
    E'  if p_accion = ''regar'' then perform tpp.contar(p_uid, ''riegos'', 1);\n  elsif p_accion = ''abonar'' then perform tpp.contar(p_uid, ''abonos'', 1);\n  end if;\n  if p.desafio is null then\n    perform tpp.mision_sumar(p_uid, case p_accion when ''ajustar_luz'' then ''luz'' else p_accion end);\n  end if;');
  if d = o or position('mision_sumar(p_uid, ''cosechar'')' in d) = 0 or position('case p_accion when' in d) = 0 then raise exception 'accion no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.revisar_logros(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'  premio integer := 0;\nbegin', E'  premio integer := 0;\n  nv integer;\n  ult integer;\nbegin');
  d := replace(d, E'  return nuevos;\nend;',
    E'  perform tpp.notificar(p_uid, ''logro'', ''Logro conseguido'', ''Has desbloqueado un logro nuevo.'') from jsonb_array_elements_text(nuevos);\n  nv := tpp.nivel_de(perfil.xp);\n  ult := (perfil.misiones ->> ''nivel'')::int;\n  if ult is distinct from nv then\n    if ult is not null and nv > ult then\n      perform tpp.notificar(p_uid, ''nivel'', ''Subida de nivel'', ''Has llegado al nivel '' || nv || ''.'');\n    end if;\n    update tpp.perfiles set misiones = misiones || jsonb_build_object(''nivel'', nv) where id = p_uid;\n  end if;\n  return nuevos;\nend;');
  if d = o or position('nv integer' in d) = 0 or position('''logro''' in d) = 0 then raise exception 'revisar_logros no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.estado_json(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'      ''hibridas'', tpp.hibridas_json(perfil),',
    E'      ''hibridas'', tpp.hibridas_json(perfil),\n      ''avisos'', (select count(*)::int from tpp.notificaciones where usuario_id = p_uid and not leida),\n      ''misiones_listas'', (select count(*)::int from jsonb_array_elements(tpp.mis_misiones(p_uid) -> ''misiones'') x where x ->> ''estado'' = ''lista''),');
  if d = o then raise exception 'estado_json no cambia'; end if;
  execute d;
end $$;
