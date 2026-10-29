-- Amigos, perfil público y visitas.
-- Amistad solo con solicitud aceptada (máx. 50 amigos y 20 solicitudes enviadas pendientes). Se busca por nombre (exacto o que empiece
-- por 3 letras o más, máx. 10 resultados); no salen quienes ocultan su perfil (ajuste perfil_oculto) ni quienes bloquean o están bloqueados.
-- Una solicitud rechazada no avisa al que la envió y no se puede repetir hasta pasados 7 días.
-- Perfil público: nombre, avatar, título, marco, nivel, prestigio, cosechas, variedades y logros (sin monedas ni fechas).
-- Visita (solo amigos): planta en solo lectura; regar (+20 agua, 1 vez al día por amigo, máx. 5 al día, el visitante gana 10 monedas) y
-- saludo con uno de 8 emojis (1 al día por amigo). El dueño recibe un aviso. La última conexión solo la ven los amigos.
-- Misión diaria nueva «Visita a un amigo» (+60 monedas). Los nombres nuevos pasan por un filtro de palabras.
-- Para deshacer: borrar las funciones public.tpp_amigos, tpp_buscar_jugadores, tpp_enviar_solicitud, tpp_responder_solicitud,
-- tpp_quitar_amigo, tpp_bloquear, tpp_desbloquear, tpp_perfil_publico, tpp_visitar, tpp_regar_visita y tpp_saludar, las tpp.* del mismo
-- nombre sin prefijo tpp_, tpp.relacion, tpp.bloqueado, tpp.nombre_prohibido, las tablas tpp.amistades, tpp.bloqueos y tpp.visitas, la
-- columna ultima_vez de tpp.perfiles, y volver a aplicar las versiones anteriores de asegurar_perfil, ajustes, estado_json y misiones_def.

alter table tpp.perfiles add column if not exists ultima_vez timestamptz;

create table tpp.amistades (
  solicitante uuid not null references auth.users (id) on delete cascade,
  receptor uuid not null references auth.users (id) on delete cascade,
  estado text not null check (estado in ('pendiente', 'amigos', 'rechazada')),
  creada_en timestamptz not null default now(),
  primary key (solicitante, receptor),
  check (solicitante <> receptor)
);
create unique index amistades_par on tpp.amistades (least(solicitante, receptor), greatest(solicitante, receptor));
create index amistades_receptor on tpp.amistades (receptor);
alter table tpp.amistades enable row level security;

create table tpp.bloqueos (
  bloqueador uuid not null references auth.users (id) on delete cascade,
  bloqueado uuid not null references auth.users (id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (bloqueador, bloqueado),
  check (bloqueador <> bloqueado)
);
create index bloqueos_bloqueado on tpp.bloqueos (bloqueado);
alter table tpp.bloqueos enable row level security;

create table tpp.visitas (
  visitante uuid not null references auth.users (id) on delete cascade,
  dueno uuid not null references auth.users (id) on delete cascade,
  dia date not null,
  regado boolean not null default false,
  saludo text,
  primary key (visitante, dueno, dia)
);
create index visitas_dueno on tpp.visitas (dueno);
alter table tpp.visitas enable row level security;

create function tpp.nombre_prohibido(p_nombre text) returns boolean
language sql immutable set search_path = '' as $$
  select lower(p_nombre) ~ '(puta|puto|mierda|polla|verga|pene|vagina|sexo|porno|nazi|hitler|violador|pedofil|cabron|gilipollas|follar|culo|zorra|maricon|negrata|fuck|shit|bitch|cunt|dick|nigg|rape|porn|fag)';
$$;

create function tpp.bloqueado(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from tpp.bloqueos where (bloqueador = a and bloqueado = b) or (bloqueador = b and bloqueado = a));
$$;

-- Relación de a con b: amigos, enviada (a envió solicitud), recibida o ninguna.
create function tpp.relacion(a uuid, b uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case
      when estado = 'amigos' then 'amigos'
      when estado = 'pendiente' and solicitante = a then 'enviada'
      when estado = 'pendiente' then 'recibida'
      when estado = 'rechazada' and solicitante = a then 'enviada'
      else 'ninguna' end
    from tpp.amistades where (solicitante = a and receptor = b) or (solicitante = b and receptor = a)
  ), 'ninguna');
$$;

create function tpp.id_de_usuario(p_nombre text) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from tpp.perfiles where lower(usuario) = lower(trim(p_nombre));
$$;

create function tpp.ficha_jugador(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('usuario', usuario, 'nivel', tpp.nivel_de(xp), 'avatar', coalesce(ajustes ->> 'avatar', 'avatar_gorra'),
    'titulo', ajustes ->> 'titulo', 'marco', ajustes ->> 'marco', 'prestigio', prestigio)
  from tpp.perfiles where id = p_id;
$$;

create function tpp.buscar_jugadores(p_uid uuid, p_texto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t text := lower(trim(coalesce(p_texto, '')));
  patron text;
begin
  perform tpp.asegurar_perfil(p_uid);
  if length(t) < 3 then return '[]'::jsonb; end if;
  patron := replace(replace(replace(t, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return coalesce((
    select jsonb_agg(f.j order by f.ex desc, f.u)
    from (
      select p.usuario u, (lower(p.usuario) = t) ex, tpp.ficha_jugador(p.id) || jsonb_build_object('relacion', tpp.relacion(p_uid, p.id)) j
      from tpp.perfiles p
      where p.id <> p_uid and lower(p.usuario) like patron
        and not tpp.bloqueado(p_uid, p.id)
        and (not coalesce((p.ajustes ->> 'perfil_oculto')::boolean, false) or tpp.relacion(p_uid, p.id) = 'amigos')
      order by (lower(p.usuario) = t) desc, p.usuario
      limit 10
    ) f), '[]'::jsonb);
end;
$$;

create function tpp.mis_amigos(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  hoy date := (now() at time zone 'Europe/Madrid')::date;
begin
  perform tpp.asegurar_perfil(p_uid);
  return jsonb_build_object(
    'max', 50,
    'amigos', coalesce((
      select jsonb_agg(tpp.ficha_jugador(p.id) || jsonb_build_object(
        'hace', case when p.ultima_vez is null then null else floor(extract(epoch from (now() - p.ultima_vez)))::int end,
        'regado', coalesce(v.regado, false), 'saludado', v.saludo is not null) order by p.usuario)
      from tpp.amistades a
      join tpp.perfiles p on p.id = case when a.solicitante = p_uid then a.receptor else a.solicitante end
      left join tpp.visitas v on v.visitante = p_uid and v.dueno = p.id and v.dia = hoy
      where a.estado = 'amigos' and p_uid in (a.solicitante, a.receptor)), '[]'::jsonb),
    'recibidas', coalesce((
      select jsonb_agg(tpp.ficha_jugador(a.solicitante) order by a.creada_en)
      from tpp.amistades a where a.receptor = p_uid and a.estado = 'pendiente'), '[]'::jsonb),
    'enviadas', coalesce((
      select jsonb_agg(tpp.ficha_jugador(a.receptor) order by a.creada_en)
      from tpp.amistades a where a.solicitante = p_uid and a.estado in ('pendiente', 'rechazada')), '[]'::jsonb),
    'bloqueados', coalesce((
      select jsonb_agg(tpp.ficha_jugador(b.bloqueado) order by b.creado_en)
      from tpp.bloqueos b where b.bloqueador = p_uid), '[]'::jsonb)
  );
end;
$$;

create function tpp.enviar_solicitud(p_uid uuid, p_usuario text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  otro uuid := tpp.id_de_usuario(p_usuario);
  rel text;
  nombre text;
begin
  perform tpp.asegurar_perfil(p_uid);
  if otro is null or tpp.bloqueado(p_uid, otro) then
    return jsonb_build_object('ok', false, 'error', 'usuario_desconocido') || tpp.mis_amigos(p_uid);
  end if;
  if otro = p_uid then
    return jsonb_build_object('ok', false, 'error', 'a_ti_mismo') || tpp.mis_amigos(p_uid);
  end if;
  if exists (select 1 from tpp.perfiles where id = otro and coalesce((ajustes ->> 'perfil_oculto')::boolean, false))
     and tpp.relacion(p_uid, otro) = 'ninguna' then
    return jsonb_build_object('ok', false, 'error', 'usuario_desconocido') || tpp.mis_amigos(p_uid);
  end if;
  delete from tpp.amistades where estado = 'rechazada' and creada_en < now() - interval '7 days'
    and ((solicitante = p_uid and receptor = otro) or (solicitante = otro and receptor = p_uid));
  rel := tpp.relacion(p_uid, otro);
  if rel = 'amigos' then
    return jsonb_build_object('ok', false, 'error', 'ya_amigos') || tpp.mis_amigos(p_uid);
  elsif rel = 'enviada' then
    return jsonb_build_object('ok', true) || tpp.mis_amigos(p_uid);
  elsif rel = 'recibida' then
    return tpp.responder_solicitud(p_uid, p_usuario, true);
  end if;
  if (select count(*) from tpp.amistades where estado = 'amigos' and p_uid in (solicitante, receptor)) >= 50 then
    return jsonb_build_object('ok', false, 'error', 'limite_amigos') || tpp.mis_amigos(p_uid);
  end if;
  if (select count(*) from tpp.amistades where solicitante = p_uid and estado in ('pendiente', 'rechazada')) >= 20 then
    return jsonb_build_object('ok', false, 'error', 'limite_solicitudes') || tpp.mis_amigos(p_uid);
  end if;
  insert into tpp.amistades (solicitante, receptor, estado) values (p_uid, otro, 'pendiente');
  select usuario into nombre from tpp.perfiles where id = p_uid;
  perform tpp.notificar(otro, 'amigo', 'Solicitud de amistad', nombre || ' quiere ser tu amigo.');
  return jsonb_build_object('ok', true) || tpp.mis_amigos(p_uid);
end;
$$;

create function tpp.responder_solicitud(p_uid uuid, p_usuario text, p_aceptar boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  otro uuid := tpp.id_de_usuario(p_usuario);
  nombre text;
begin
  perform tpp.asegurar_perfil(p_uid);
  if otro is null or not exists (select 1 from tpp.amistades where solicitante = otro and receptor = p_uid and estado = 'pendiente') then
    return jsonb_build_object('ok', false, 'error', 'sin_solicitud') || tpp.mis_amigos(p_uid);
  end if;
  if p_aceptar then
    if (select count(*) from tpp.amistades where estado = 'amigos' and p_uid in (solicitante, receptor)) >= 50
       or (select count(*) from tpp.amistades where estado = 'amigos' and otro in (solicitante, receptor)) >= 50 then
      return jsonb_build_object('ok', false, 'error', 'limite_amigos') || tpp.mis_amigos(p_uid);
    end if;
    update tpp.amistades set estado = 'amigos', creada_en = now() where solicitante = otro and receptor = p_uid;
    select usuario into nombre from tpp.perfiles where id = p_uid;
    perform tpp.notificar(otro, 'amigo', 'Nuevo amigo', nombre || ' ha aceptado tu solicitud.');
  else
    update tpp.amistades set estado = 'rechazada', creada_en = now() where solicitante = otro and receptor = p_uid;
  end if;
  return jsonb_build_object('ok', true) || tpp.mis_amigos(p_uid);
end;
$$;

-- Elimina un amigo, cancela una solicitud enviada o descarta una recibida.
create function tpp.quitar_amigo(p_uid uuid, p_usuario text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  otro uuid := tpp.id_de_usuario(p_usuario);
begin
  perform tpp.asegurar_perfil(p_uid);
  if otro is not null then
    delete from tpp.amistades where (solicitante = p_uid and receptor = otro) or (solicitante = otro and receptor = p_uid and estado = 'amigos');
  end if;
  return jsonb_build_object('ok', true) || tpp.mis_amigos(p_uid);
end;
$$;

create function tpp.bloquear(p_uid uuid, p_usuario text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  otro uuid := tpp.id_de_usuario(p_usuario);
begin
  perform tpp.asegurar_perfil(p_uid);
  if otro is null or otro = p_uid then
    return jsonb_build_object('ok', false, 'error', 'usuario_desconocido') || tpp.mis_amigos(p_uid);
  end if;
  insert into tpp.bloqueos (bloqueador, bloqueado) values (p_uid, otro) on conflict do nothing;
  delete from tpp.amistades where (solicitante = p_uid and receptor = otro) or (solicitante = otro and receptor = p_uid);
  return jsonb_build_object('ok', true) || tpp.mis_amigos(p_uid);
end;
$$;

create function tpp.desbloquear(p_uid uuid, p_usuario text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  otro uuid := tpp.id_de_usuario(p_usuario);
begin
  perform tpp.asegurar_perfil(p_uid);
  if otro is not null then
    delete from tpp.bloqueos where bloqueador = p_uid and bloqueado = otro;
  end if;
  return jsonb_build_object('ok', true) || tpp.mis_amigos(p_uid);
end;
$$;

create function tpp.perfil_publico(p_uid uuid, p_usuario text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  otro uuid := tpp.id_de_usuario(p_usuario);
  perfil tpp.perfiles;
  rel text;
begin
  perform tpp.asegurar_perfil(p_uid);
  if otro is null or (otro <> p_uid and tpp.bloqueado(p_uid, otro)) then
    return jsonb_build_object('ok', false, 'error', 'usuario_desconocido');
  end if;
  select * into perfil from tpp.perfiles where id = otro;
  rel := case when otro = p_uid then 'yo' else tpp.relacion(p_uid, otro) end;
  if otro <> p_uid and rel <> 'amigos' and coalesce((perfil.ajustes ->> 'perfil_oculto')::boolean, false) then
    return jsonb_build_object('ok', false, 'error', 'usuario_desconocido');
  end if;
  return jsonb_build_object('ok', true, 'relacion', rel,
    'jugador', tpp.ficha_jugador(otro) || jsonb_build_object(
      'cosechas', coalesce((perfil.estadisticas ->> 'cosechas')::int, 0),
      'variedades', (select count(*)::int from jsonb_object_keys(coalesce(perfil.estadisticas -> 'variedades', '{}'::jsonb))),
      'variedades_total', 12,
      'logros', (select count(*)::int from jsonb_object_keys(perfil.logros)),
      'logros_total', jsonb_array_length(tpp.logros())));
end;
$$;

-- Planta de un amigo en solo lectura y lo que se ha hecho hoy en la visita.
create function tpp.visitar(p_uid uuid, p_usuario text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  otro uuid := tpp.id_de_usuario(p_usuario);
  pid uuid;
  p tpp.plantas;
  planta jsonb := null;
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  v tpp.visitas;
  perfil tpp.perfiles;
begin
  perform tpp.asegurar_perfil(p_uid);
  if otro is null or otro = p_uid or tpp.relacion(p_uid, otro) <> 'amigos' or tpp.bloqueado(p_uid, otro) then
    return jsonb_build_object('ok', false, 'error', 'no_es_amigo');
  end if;
  select * into perfil from tpp.perfiles where id = otro;
  select id into pid from tpp.plantas where usuario_id = otro and estado = 'viva' and desafio is null order by hueco limit 1;
  if pid is not null then
    p := tpp.sincronizar(pid);
    planta := jsonb_build_object('variedad', p.variedad, 'fase', tpp.fase_planta(p), 'estado', tpp.estado_visual(p),
      'agua', round(p.agua::numeric, 1), 'nutrientes', round(p.nutrientes::numeric, 1), 'luz', round(p.luz::numeric, 1),
      'temperatura', round(p.temperatura::numeric, 0), 'ph', round(p.ph::numeric, 1), 'salud', round(p.salud::numeric, 1),
      'maceta', coalesce(perfil.equipo ->> 'maceta', 'maceta_plastico'));
  end if;
  select * into v from tpp.visitas where visitante = p_uid and dueno = otro and dia = hoy;
  if v.visitante is null then
    insert into tpp.visitas (visitante, dueno, dia) values (p_uid, otro, hoy);
    perform tpp.mision_sumar(p_uid, 'visita');
  end if;
  return jsonb_build_object('ok', true,
    'jugador', tpp.ficha_jugador(otro) || jsonb_build_object(
      'hace', case when perfil.ultima_vez is null then null else floor(extract(epoch from (now() - perfil.ultima_vez)))::int end),
    'planta', planta, 'regado', coalesce(v.regado, false), 'saludo', v.saludo,
    'riegos_hoy', (select count(*)::int from tpp.visitas where visitante = p_uid and dia = hoy and regado));
end;
$$;

create function tpp.regar_visita(p_uid uuid, p_usuario text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  otro uuid := tpp.id_de_usuario(p_usuario);
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  pid uuid;
  nombre text;
begin
  perform tpp.asegurar_perfil(p_uid);
  if otro is null or otro = p_uid or tpp.relacion(p_uid, otro) <> 'amigos' or tpp.bloqueado(p_uid, otro) then
    return jsonb_build_object('ok', false, 'error', 'no_es_amigo') || tpp.estado_json(p_uid);
  end if;
  if exists (select 1 from tpp.visitas where visitante = p_uid and dueno = otro and dia = hoy and regado) then
    return jsonb_build_object('ok', false, 'error', 'visita_ya_regada') || tpp.estado_json(p_uid);
  end if;
  if (select count(*) from tpp.visitas where visitante = p_uid and dia = hoy and regado) >= 5 then
    return jsonb_build_object('ok', false, 'error', 'visita_limite') || tpp.estado_json(p_uid);
  end if;
  select id into pid from tpp.plantas where usuario_id = otro and estado = 'viva' and desafio is null order by hueco limit 1;
  if pid is null then
    return jsonb_build_object('ok', false, 'error', 'visita_sin_planta') || tpp.estado_json(p_uid);
  end if;
  perform tpp.sincronizar(pid);
  update tpp.plantas set agua = least(100, agua + 20) where id = pid;
  insert into tpp.visitas (visitante, dueno, dia, regado) values (p_uid, otro, hoy, true)
    on conflict (visitante, dueno, dia) do update set regado = true;
  update tpp.perfiles set monedas = monedas + 10 where id = p_uid;
  select usuario into nombre from tpp.perfiles where id = p_uid;
  perform tpp.notificar(otro, 'visita', 'Te han visitado', nombre || ' ha regado tu planta.');
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

create function tpp.saludar(p_uid uuid, p_usuario text, p_emoji text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  otro uuid := tpp.id_de_usuario(p_usuario);
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  nombre text;
begin
  perform tpp.asegurar_perfil(p_uid);
  if p_emoji not in ('sonrisa', 'corazon', 'gracias', 'animo', 'sorpresa', 'risa', 'pulgar', 'planta') then
    return jsonb_build_object('ok', false, 'error', 'saludo_desconocido');
  end if;
  if otro is null or otro = p_uid or tpp.relacion(p_uid, otro) <> 'amigos' or tpp.bloqueado(p_uid, otro) then
    return jsonb_build_object('ok', false, 'error', 'no_es_amigo');
  end if;
  if exists (select 1 from tpp.visitas where visitante = p_uid and dueno = otro and dia = hoy and saludo is not null) then
    return jsonb_build_object('ok', false, 'error', 'saludo_ya_enviado');
  end if;
  insert into tpp.visitas (visitante, dueno, dia, saludo) values (p_uid, otro, hoy, p_emoji)
    on conflict (visitante, dueno, dia) do update set saludo = p_emoji;
  select usuario into nombre from tpp.perfiles where id = p_uid;
  perform tpp.notificar(otro, 'saludo', 'Nuevo saludo', nombre || ' te ha dejado un saludo.');
  return jsonb_build_object('ok', true, 'saludo', p_emoji);
end;
$$;

create function public.tpp_amigos() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mis_amigos(auth.uid());
end;
$$;

create function public.tpp_buscar_jugadores(p_texto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.buscar_jugadores(auth.uid(), p_texto);
end;
$$;

create function public.tpp_enviar_solicitud(p_usuario text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.enviar_solicitud(auth.uid(), p_usuario);
end;
$$;

create function public.tpp_responder_solicitud(p_usuario text, p_aceptar boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.responder_solicitud(auth.uid(), p_usuario, p_aceptar);
end;
$$;

create function public.tpp_quitar_amigo(p_usuario text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.quitar_amigo(auth.uid(), p_usuario);
end;
$$;

create function public.tpp_bloquear(p_usuario text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.bloquear(auth.uid(), p_usuario);
end;
$$;

create function public.tpp_desbloquear(p_usuario text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.desbloquear(auth.uid(), p_usuario);
end;
$$;

create function public.tpp_perfil_publico(p_usuario text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.perfil_publico(auth.uid(), p_usuario);
end;
$$;

create function public.tpp_visitar(p_usuario text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.visitar(auth.uid(), p_usuario);
end;
$$;

create function public.tpp_regar_visita(p_usuario text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.regar_visita(auth.uid(), p_usuario);
end;
$$;

create function public.tpp_saludar(p_usuario text, p_emoji text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.saludar(auth.uid(), p_usuario, p_emoji);
end;
$$;

revoke all on function tpp.nombre_prohibido(text) from public, anon, authenticated;
revoke all on function tpp.bloqueado(uuid, uuid) from public, anon, authenticated;
revoke all on function tpp.relacion(uuid, uuid) from public, anon, authenticated;
revoke all on function tpp.id_de_usuario(text) from public, anon, authenticated;
revoke all on function tpp.ficha_jugador(uuid) from public, anon, authenticated;
revoke all on function tpp.buscar_jugadores(uuid, text) from public, anon, authenticated;
revoke all on function tpp.mis_amigos(uuid) from public, anon, authenticated;
revoke all on function tpp.enviar_solicitud(uuid, text) from public, anon, authenticated;
revoke all on function tpp.responder_solicitud(uuid, text, boolean) from public, anon, authenticated;
revoke all on function tpp.quitar_amigo(uuid, text) from public, anon, authenticated;
revoke all on function tpp.bloquear(uuid, text) from public, anon, authenticated;
revoke all on function tpp.desbloquear(uuid, text) from public, anon, authenticated;
revoke all on function tpp.perfil_publico(uuid, text) from public, anon, authenticated;
revoke all on function tpp.visitar(uuid, text) from public, anon, authenticated;
revoke all on function tpp.regar_visita(uuid, text) from public, anon, authenticated;
revoke all on function tpp.saludar(uuid, text, text) from public, anon, authenticated;
revoke all on function public.tpp_amigos() from public, anon;
revoke all on function public.tpp_buscar_jugadores(text) from public, anon;
revoke all on function public.tpp_enviar_solicitud(text) from public, anon;
revoke all on function public.tpp_responder_solicitud(text, boolean) from public, anon;
revoke all on function public.tpp_quitar_amigo(text) from public, anon;
revoke all on function public.tpp_bloquear(text) from public, anon;
revoke all on function public.tpp_desbloquear(text) from public, anon;
revoke all on function public.tpp_perfil_publico(text) from public, anon;
revoke all on function public.tpp_visitar(text) from public, anon;
revoke all on function public.tpp_regar_visita(text) from public, anon;
revoke all on function public.tpp_saludar(text, text) from public, anon;
grant execute on function public.tpp_amigos() to authenticated;
grant execute on function public.tpp_buscar_jugadores(text) to authenticated;
grant execute on function public.tpp_enviar_solicitud(text) to authenticated;
grant execute on function public.tpp_responder_solicitud(text, boolean) to authenticated;
grant execute on function public.tpp_quitar_amigo(text) to authenticated;
grant execute on function public.tpp_bloquear(text) to authenticated;
grant execute on function public.tpp_desbloquear(text) to authenticated;
grant execute on function public.tpp_perfil_publico(text) to authenticated;
grant execute on function public.tpp_visitar(text) to authenticated;
grant execute on function public.tpp_regar_visita(text) to authenticated;
grant execute on function public.tpp_saludar(text, text) to authenticated;

-- Cambios en funciones que ya existían.
create or replace function tpp.misiones_def() returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_array(
    jsonb_build_object('id', 'd_regar', 'grupo', 'd', 'clave', 'regar', 'meta', 5, 'nombre', 'Riega 5 veces', 'desc', 'Riega tu planta 5 veces hoy.', 'premio', jsonb_build_object('tipo', 'monedas', 'n', 100)),
    jsonb_build_object('id', 'd_abonar', 'grupo', 'd', 'clave', 'abonar', 'meta', 2, 'nombre', 'Abona tu planta', 'desc', 'Usa abono 2 veces hoy.', 'premio', jsonb_build_object('tipo', 'xp', 'n', 40)),
    jsonb_build_object('id', 'd_luz', 'grupo', 'd', 'clave', 'luz', 'meta', 1, 'nombre', 'Ajusta la luz', 'desc', 'Ajusta la luz de tu planta una vez hoy.', 'premio', jsonb_build_object('tipo', 'monedas', 'n', 60)),
    jsonb_build_object('id', 'd_visita', 'grupo', 'd', 'clave', 'visita', 'meta', 1, 'nombre', 'Visita a un amigo', 'desc', 'Entra en la planta de un amigo.', 'premio', jsonb_build_object('tipo', 'monedas', 'n', 60)),
    jsonb_build_object('id', 's_cosechar', 'grupo', 's', 'clave', 'cosechar', 'meta', 1, 'nombre', 'Cosecha una planta', 'desc', 'Completa una cosecha esta semana.', 'premio', jsonb_build_object('tipo', 'monedas', 'n', 250)),
    jsonb_build_object('id', 's_sana', 'grupo', 's', 'clave', 'sana', 'meta', 1, 'nombre', 'Planta sana', 'desc', 'Cosecha con la salud por encima del 80 %.', 'premio', jsonb_build_object('tipo', 'xp', 'n', 150))
  );
$$;

do $$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('tpp.asegurar_perfil(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'  if base = '''' then base := ''cultivador''; end if;', E'  if base = '''' or tpp.nombre_prohibido(base) then base := ''cultivador''; end if;');
  if d = o then raise exception 'asegurar_perfil no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.ajustes(uuid,jsonb)'::regprocedure);
  o := d;
  d := replace(d, '''avisos'', ''ranking_oculto'')', '''avisos'', ''ranking_oculto'', ''perfil_oculto'')');
  if d = o then raise exception 'ajustes no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.estado_json(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'  perfil := tpp.asegurar_perfil(p_uid);\n', E'  perfil := tpp.asegurar_perfil(p_uid);\n  if perfil.ultima_vez is null or perfil.ultima_vez < now() - interval ''1 minute'' then\n    update tpp.perfiles set ultima_vez = now() where id = p_uid;\n  end if;\n');
  if d = o or position('ultima_vez' in d) = 0 then raise exception 'estado_json no cambia'; end if;
  execute d;
end $$;
