-- Tu Propia Planta: esquema propio dentro del proyecto de Supabase.
-- Para deshacerlo por completo: drop schema tpp cascade; y borrar las funciones public.tpp_*.
-- Las tablas viven en el esquema `tpp`, que no se expone en la API: solo se accede
-- mediante las funciones public.tpp_* (security definer), que usan auth.uid().

create schema if not exists tpp;

create table tpp.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  usuario text not null unique,
  monedas integer not null default 100 check (monedas >= 0),
  xp integer not null default 0 check (xp >= 0),
  creado_en timestamptz not null default now()
);

create table tpp.plantas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  variedad text not null default 'clasica',
  plantada_en timestamptz not null default now(),
  sincronizada_en timestamptz not null default now(),
  horas_vividas double precision not null default 0,
  agua double precision not null default 70,
  nutrientes double precision not null default 60,
  luz double precision not null default 80,
  temperatura double precision not null default 24,
  ph double precision not null default 6.3,
  salud double precision not null default 100,
  estado text not null default 'viva' check (estado in ('viva', 'muerta', 'cosechada')),
  esperas jsonb not null default '{}'::jsonb,
  muerta_en timestamptz
);

-- Solo puede haber una planta viva por jugador.
create unique index plantas_una_viva_por_usuario on tpp.plantas (usuario_id) where estado = 'viva';

-- RLS activado y sin políticas: nadie accede directamente a las tablas.
alter table tpp.perfiles enable row level security;
alter table tpp.plantas enable row level security;

-- Fase (1 a 8) según las horas vividas. Duraciones: 6, 24, 48, 48, 72, 48 y 72 horas.
create function tpp.fase_de(horas double precision) returns integer
language sql immutable set search_path = '' as $$
  select 1
    + (horas >= 6)::int + (horas >= 30)::int + (horas >= 78)::int + (horas >= 126)::int
    + (horas >= 198)::int + (horas >= 246)::int + (horas >= 318)::int;
$$;

-- Estado visual que se enseña en el sprite.
create function tpp.estado_visual(p tpp.plantas) returns text
language sql immutable set search_path = '' as $$
  select case
    when p.estado = 'muerta' then 'muerta'
    when p.salud < 25 then 'muriendo'
    when p.agua < 35 then 'sedienta'
    when p.nutrientes < 25 then 'falta_nutrientes'
    when p.agua > 95 then 'exceso_agua'
    else 'sana'
  end;
$$;

-- Pone al día una planta con el tiempo real transcurrido (también si el jugador no estaba).
create function tpp.sincronizar(p_id uuid) returns tpp.plantas
language plpgsql security definer set search_path = '' as $$
declare
  p tpp.plantas;
  ahora timestamptz := now();
  restante double precision;
  dt double precision;
begin
  select * into p from tpp.plantas where id = p_id for update;
  if p.id is null or p.estado <> 'viva' then
    return p;
  end if;

  restante := least(extract(epoch from (ahora - p.sincronizada_en)) / 3600.0, 720);
  while restante > 0 loop
    dt := least(0.5, restante);
    p.agua := greatest(0, p.agua - 1.5 * dt);
    p.nutrientes := greatest(0, p.nutrientes - 0.8 * dt);
    p.luz := greatest(0, p.luz - 0.5 * dt);

    if p.agua < 15 or p.nutrientes < 10 or p.luz < 10 then
      p.salud := p.salud - 2 * dt;
    elsif p.agua > 95 then
      p.salud := p.salud - 1 * dt;
    elsif p.agua >= 40 and p.nutrientes >= 30 and p.luz >= 30 then
      p.salud := least(100, p.salud + 0.5 * dt);
    end if;

    p.horas_vividas := p.horas_vividas + dt;
    restante := restante - dt;

    if p.salud <= 0 then
      p.salud := 0;
      p.estado := 'muerta';
      p.muerta_en := ahora - make_interval(secs => restante * 3600);
      exit;
    end if;
  end loop;

  p.sincronizada_en := ahora;
  update tpp.plantas set
    agua = p.agua, nutrientes = p.nutrientes, luz = p.luz, salud = p.salud,
    horas_vividas = p.horas_vividas, estado = p.estado, muerta_en = p.muerta_en,
    sincronizada_en = p.sincronizada_en
  where id = p.id;
  return p;
end;
$$;

-- Crea el perfil del jugador la primera vez que entra, con su primera semilla.
create function tpp.asegurar_perfil(p_uid uuid) returns tpp.perfiles
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  base text;
  nombre text;
begin
  select * into perfil from tpp.perfiles where id = p_uid;
  if perfil.id is not null then
    return perfil;
  end if;

  select coalesce(nullif(trim(raw_user_meta_data ->> 'usuario'), ''), 'cultivador')
    into base from auth.users where id = p_uid;
  base := left(regexp_replace(base, '[^A-Za-z0-9_]', '', 'g'), 20);
  if base = '' then base := 'cultivador'; end if;

  nombre := base;
  while exists (select 1 from tpp.perfiles where usuario = nombre) loop
    nombre := base || '_' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into tpp.perfiles (id, usuario) values (p_uid, nombre) returning * into perfil;
  insert into tpp.plantas (usuario_id) values (p_uid);
  return perfil;
end;
$$;

-- Estado completo del jugador y de su planta, en JSON.
create function tpp.estado_json(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  p tpp.plantas;
  pid uuid;
  nivel integer;
  esperas jsonb := '{}'::jsonb;
  k text;
  v text;
  resta integer;
  planta jsonb := null;
begin
  perfil := tpp.asegurar_perfil(p_uid);

  select id into pid from tpp.plantas where usuario_id = p_uid and estado = 'viva';
  if pid is null then
    select id into pid from tpp.plantas where usuario_id = p_uid order by plantada_en desc limit 1;
  end if;
  if pid is not null then
    p := tpp.sincronizar(pid);
  end if;

  if p.id is not null then
    for k, v in select * from jsonb_each_text(p.esperas) loop
      resta := ceil(extract(epoch from (v::timestamptz - now())))::int;
      if resta > 0 then esperas := esperas || jsonb_build_object(k, resta); end if;
    end loop;
    planta := jsonb_build_object(
      'id', p.id,
      'variedad', p.variedad,
      'vida', p.estado,
      'fase', tpp.fase_de(p.horas_vividas),
      'estado', tpp.estado_visual(p),
      'agua', round(p.agua::numeric, 1),
      'nutrientes', round(p.nutrientes::numeric, 1),
      'luz', round(p.luz::numeric, 1),
      'temperatura', p.temperatura,
      'ph', p.ph,
      'salud', round(p.salud::numeric, 1),
      'segundos_vida', floor(p.horas_vividas * 3600),
      'esperas', esperas
    );
  end if;

  nivel := 1 + floor(sqrt(perfil.xp / 25.0))::int;
  return jsonb_build_object(
    'perfil', jsonb_build_object(
      'usuario', perfil.usuario,
      'monedas', perfil.monedas,
      'xp', perfil.xp,
      'nivel', nivel,
      'xp_pct', round(100 * (perfil.xp - 25 * (nivel - 1) ^ 2) / (25 * nivel ^ 2 - 25 * (nivel - 1) ^ 2))
    ),
    'planta', planta
  );
end;
$$;

-- Acciones del jugador. Devuelve el estado más 'ok' y, si falla, 'error'.
create function tpp.accion(p_uid uuid, p_accion text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p tpp.plantas;
  pid uuid;
  espera integer;
  lista timestamptz;
  recompensa integer;
begin
  perform tpp.asegurar_perfil(p_uid);

  if p_accion not in ('regar', 'abonar', 'podar', 'ajustar_luz', 'cosechar') then
    return jsonb_build_object('ok', false, 'error', 'accion_desconocida') || tpp.estado_json(p_uid);
  end if;

  select id into pid from tpp.plantas where usuario_id = p_uid and estado = 'viva';
  if pid is null then
    return jsonb_build_object('ok', false, 'error', 'sin_planta') || tpp.estado_json(p_uid);
  end if;

  p := tpp.sincronizar(pid);
  if p.estado <> 'viva' then
    return jsonb_build_object('ok', false, 'error', 'planta_muerta') || tpp.estado_json(p_uid);
  end if;

  espera := case p_accion when 'regar' then 300 when 'abonar' then 1800 else 3600 end;
  lista := (p.esperas ->> p_accion)::timestamptz;
  if lista is not null and lista > now() then
    return jsonb_build_object('ok', false, 'error', 'espera') || tpp.estado_json(p_uid);
  end if;

  if p_accion = 'cosechar' then
    if tpp.fase_de(p.horas_vividas) < 8 then
      return jsonb_build_object('ok', false, 'error', 'fase_insuficiente') || tpp.estado_json(p_uid);
    end if;
    recompensa := 200 + round(p.salud * 3)::int;
    update tpp.plantas set estado = 'cosechada' where id = p.id;
    update tpp.perfiles set monedas = monedas + recompensa, xp = xp + 100 where id = p_uid;
    return jsonb_build_object('ok', true, 'recompensa', recompensa) || tpp.estado_json(p_uid);
  end if;

  if p_accion = 'podar' and tpp.fase_de(p.horas_vividas) < 3 then
    return jsonb_build_object('ok', false, 'error', 'fase_insuficiente') || tpp.estado_json(p_uid);
  end if;

  update tpp.plantas set
    agua = case when p_accion = 'regar' then least(100, agua + 50) else agua end,
    nutrientes = case when p_accion = 'abonar' then least(100, nutrientes + 30) else nutrientes end,
    luz = case when p_accion = 'ajustar_luz' then least(100, luz + 40) else luz end,
    salud = case when p_accion = 'podar' then least(100, salud + 10) else salud end,
    esperas = esperas || jsonb_build_object(p_accion, now() + make_interval(secs => espera))
  where id = p.id;
  update tpp.perfiles set xp = xp + 5 where id = p_uid;

  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

-- Planta una semilla nueva cuando no hay ninguna viva.
create function tpp.plantar(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform tpp.asegurar_perfil(p_uid);
  if exists (select 1 from tpp.plantas where usuario_id = p_uid and estado = 'viva') then
    return jsonb_build_object('ok', false, 'error', 'ya_hay_planta') || tpp.estado_json(p_uid);
  end if;
  insert into tpp.plantas (usuario_id) values (p_uid);
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

-- Puertas de entrada de la API: solo para jugadores con sesión iniciada.
create function public.tpp_estado() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.estado_json(auth.uid());
end;
$$;

create function public.tpp_accion(p_accion text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.accion(auth.uid(), p_accion);
end;
$$;

create function public.tpp_plantar() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.plantar(auth.uid());
end;
$$;

-- Las funciones internas no son accesibles desde la API.
revoke all on function tpp.fase_de(double precision) from public, anon, authenticated;
revoke all on function tpp.estado_visual(tpp.plantas) from public, anon, authenticated;
revoke all on function tpp.sincronizar(uuid) from public, anon, authenticated;
revoke all on function tpp.asegurar_perfil(uuid) from public, anon, authenticated;
revoke all on function tpp.estado_json(uuid) from public, anon, authenticated;
revoke all on function tpp.accion(uuid, text) from public, anon, authenticated;
revoke all on function tpp.plantar(uuid) from public, anon, authenticated;

revoke all on function public.tpp_estado() from public, anon;
revoke all on function public.tpp_accion(text) from public, anon;
revoke all on function public.tpp_plantar() from public, anon;
grant execute on function public.tpp_estado() to authenticated;
grant execute on function public.tpp_accion(text) to authenticated;
grant execute on function public.tpp_plantar() to authenticated;
