-- Fase 3: tutorial y ajustes del jugador.
-- Para deshacer: alter table tpp.perfiles drop column tutorial_paso, drop column tutorial_hecho, drop column ajustes;
-- y borrar las funciones public.tpp_tutorial, public.tpp_ajustes y public.tpp_borrar_datos.

alter table tpp.perfiles
  add column tutorial_hecho boolean not null default false,
  add column tutorial_paso smallint not null default 1 check (tutorial_paso between 1 and 8),
  add column ajustes jsonb not null default '{"efectos":true,"musica":true,"volumen_efectos":80,"volumen_musica":40,"avisos":false}'::jsonb;

-- Estado completo del jugador y de su planta, en JSON.
create or replace function tpp.estado_json(p_uid uuid) returns jsonb
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
      'tutorial_hecho', perfil.tutorial_hecho,
      'tutorial_paso', perfil.tutorial_paso,
      'ajustes', perfil.ajustes,
      'nivel', nivel,
      'xp_pct', round(100 * (perfil.xp - 25 * (nivel - 1) ^ 2) / (25 * nivel ^ 2 - 25 * (nivel - 1) ^ 2))
    ),
    'planta', planta
  );
end;
$$;


-- Guarda el paso del tutorial. Al terminar por primera vez da el regalo de bienvenida.
create function tpp.tutorial(p_uid uuid, p_paso integer, p_terminar boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  regalo integer := 0;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  if p_terminar then
    if not perfil.tutorial_hecho then
      regalo := 100;
      update tpp.perfiles set tutorial_hecho = true, tutorial_paso = 8, monedas = monedas + regalo where id = p_uid;
    end if;
  elsif not perfil.tutorial_hecho then
    update tpp.perfiles set tutorial_paso = greatest(1, least(8, p_paso)) where id = p_uid;
  end if;
  return jsonb_build_object('ok', true, 'recompensa', regalo) || tpp.estado_json(p_uid);
end;
$$;

-- Guarda los ajustes (solo claves conocidas y valores válidos).
create function tpp.ajustes(p_uid uuid, p_ajustes jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  nuevo jsonb;
  k text;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  nuevo := perfil.ajustes;
  for k in select * from jsonb_object_keys(coalesce(p_ajustes, '{}'::jsonb)) loop
    if k in ('efectos', 'musica', 'avisos') and jsonb_typeof(p_ajustes -> k) = 'boolean' then
      nuevo := nuevo || jsonb_build_object(k, p_ajustes -> k);
    elsif k in ('volumen_efectos', 'volumen_musica') and jsonb_typeof(p_ajustes -> k) = 'number' then
      nuevo := nuevo || jsonb_build_object(k, greatest(0, least(100, round((p_ajustes ->> k)::numeric))));
    end if;
  end loop;
  update tpp.perfiles set ajustes = nuevo where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

-- Borra solo los datos del juego. La cuenta de acceso no se toca porque la comparte nopagues.
create function tpp.borrar_datos(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  delete from tpp.plantas where usuario_id = p_uid;
  delete from tpp.perfiles where id = p_uid;
  return jsonb_build_object('ok', true);
end;
$$;

create function public.tpp_tutorial(p_paso integer, p_terminar boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.tutorial(auth.uid(), p_paso, p_terminar);
end;
$$;

create function public.tpp_ajustes(p_ajustes jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.ajustes(auth.uid(), p_ajustes);
end;
$$;

create function public.tpp_borrar_datos() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.borrar_datos(auth.uid());
end;
$$;

revoke all on function tpp.tutorial(uuid, integer, boolean) from public, anon, authenticated;
revoke all on function tpp.ajustes(uuid, jsonb) from public, anon, authenticated;
revoke all on function tpp.borrar_datos(uuid) from public, anon, authenticated;
revoke all on function public.tpp_tutorial(integer, boolean) from public, anon;
revoke all on function public.tpp_ajustes(jsonb) from public, anon;
revoke all on function public.tpp_borrar_datos() from public, anon;
grant execute on function public.tpp_tutorial(integer, boolean) to authenticated;
grant execute on function public.tpp_ajustes(jsonb) to authenticated;
grant execute on function public.tpp_borrar_datos() to authenticated;
