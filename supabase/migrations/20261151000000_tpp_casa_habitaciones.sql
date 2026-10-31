-- La casa: ahora se cultiva en todas las habitaciones a la vez. Cada habitación tiene sus propios sitios (macetas) y cada planta
-- recibe el bono de la habitación donde está. El número de hueco de una planta ya no es 1..8 sino "base de la habitación + sitio":
--   armario 1-6 (3 de serie + hasta 3 de la mejora de capacidad), salón 11-13, cocina 21-22, dormitorio 31-32, baño 41,
--   terraza 51-52, invernadero 61-63, sótano 71-74, azotea 81-85. El hueco 9 sigue siendo el del desafío.
-- Habitaciones nuevas: salón, cocina y dormitorio (gratis, nivel 1), baño (1.500, nivel 8) y terraza (gratis, nivel 15).
-- Bonos nuevos: cocina +2 °C; dormitorio −5 % de daño a la salud; baño el agua dura un 20 % más y salen más hongos; terraza +15 % de
-- luz y más plagas. Armario, sótano, invernadero y azotea siguen como estaban, pero ahora cuentan por planta.
-- Las plantas que ya existen (hueco 1 o 2) se quedan en el armario, sin cambios.
-- Para deshacer: volver a aplicar tpp.habitaciones, tpp.huecos_total, tpp.huecos_json, tpp.elegir_hueco, tpp.sincronizar,
-- tpp.accion, tpp.estado_json y tpp.prestigio_datos de las migraciones anteriores, y quitar tpp.habitacion_de y tpp.mover_planta.

alter table tpp.plantas drop constraint if exists plantas_hueco_check;
do $$
declare
  c text;
begin
  for c in select conname from pg_constraint
    where conrelid = 'tpp.plantas'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%hueco >= 1%' loop
    execute format('alter table tpp.plantas drop constraint %I', c);
  end loop;
end
$$;
alter table tpp.plantas add constraint plantas_hueco_rango check (hueco >= 1 and hueco <= 99);

create or replace function tpp.habitaciones() returns jsonb
language sql immutable set search_path = '' as $$
  select '{
    "armario": {"slots":3,"base":0,"precio":0,"nivel":1,"bloqueada":false},
    "salon": {"slots":3,"base":10,"precio":0,"nivel":1,"bloqueada":false},
    "cocina": {"slots":2,"base":20,"precio":0,"nivel":1,"bloqueada":false},
    "dormitorio": {"slots":2,"base":30,"precio":0,"nivel":1,"bloqueada":false},
    "bano": {"slots":1,"base":40,"precio":1500,"nivel":8,"bloqueada":false},
    "terraza": {"slots":2,"base":50,"precio":0,"nivel":15,"bloqueada":false},
    "invernadero": {"slots":3,"base":60,"precio":15000,"nivel":25,"bloqueada":false},
    "sotano": {"slots":4,"base":70,"precio":5000,"nivel":15,"bloqueada":false},
    "azotea": {"slots":5,"base":80,"precio":40000,"nivel":35,"bloqueada":true}
  }'::jsonb;
$$;

-- Habitaciones con las que se empieza.
create or replace function tpp.habitaciones_base() returns jsonb
language sql immutable set search_path = '' as $$
  select '["armario","salon","cocina","dormitorio"]'::jsonb;
$$;

alter table tpp.perfiles alter column habitaciones set default '["armario","salon","cocina","dormitorio"]'::jsonb;
update tpp.perfiles set habitaciones = (
  select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from jsonb_array_elements_text(habitaciones || tpp.habitaciones_base()) x
);

-- Sitios de una habitación del jugador (el armario suma los de la mejora de capacidad).
create or replace function tpp.sitios_habitacion(perfil tpp.perfiles, p_id text) returns integer
language sql stable set search_path = '' as $$
  select coalesce((tpp.habitaciones() -> p_id ->> 'slots')::int, 0)
    + case when p_id = 'armario' then coalesce((perfil.mejoras ->> 'cap')::int, 0) else 0 end;
$$;

-- En qué habitación está un hueco (null para el desafío).
create or replace function tpp.habitacion_de(p_hueco integer) returns text
language sql immutable set search_path = '' as $$
  select e.key from jsonb_each(tpp.habitaciones()) e
  where p_hueco > (e.value ->> 'base')::int
    and p_hueco <= (e.value ->> 'base')::int + (e.value ->> 'slots')::int + case when e.key = 'armario' then 3 else 0 end
  limit 1;
$$;

create or replace function tpp.huecos_total(perfil tpp.perfiles) returns integer
language plpgsql stable set search_path = '' as $$
declare
  h text;
  n integer := 0;
begin
  for h in select jsonb_array_elements_text(perfil.habitaciones) loop
    n := n + tpp.sitios_habitacion(perfil, h);
  end loop;
  return n;
end;
$$;

create or replace function tpp.hueco_valido(perfil tpp.perfiles, p_hueco integer) returns boolean
language plpgsql stable set search_path = '' as $$
declare
  h text;
begin
  h := tpp.habitacion_de(p_hueco);
  if h is null or not (perfil.habitaciones ? h) then return false; end if;
  return p_hueco - (tpp.habitaciones() -> h ->> 'base')::int <= tpp.sitios_habitacion(perfil, h);
end;
$$;

create or replace function tpp.huecos_json(perfil tpp.perfiles) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  lista jsonb := '[]'::jsonb;
  h text;
  i integer;
  hueco integer;
  pid uuid;
  p tpp.plantas;
  vida text;
begin
  foreach h in array array['armario', 'salon', 'cocina', 'dormitorio', 'bano', 'terraza', 'invernadero', 'sotano', 'azotea'] loop
    continue when not (perfil.habitaciones ? h);
    for i in 1..tpp.sitios_habitacion(perfil, h) loop
      hueco := (tpp.habitaciones() -> h ->> 'base')::int + i;
      pid := null;
      select id into pid from tpp.plantas where usuario_id = perfil.id and plantas.hueco = huecos_json.hueco
        order by (estado = 'viva') desc, plantada_en desc limit 1;
      if pid is null then
        vida := 'vacio';
        p := null;
      else
        p := tpp.sincronizar(pid);
        vida := p.estado;
      end if;
      lista := lista || jsonb_build_object('hueco', hueco, 'habitacion', h, 'sitio', i, 'vida', vida,
        'plaga', p.plaga is not null, 'variedad', p.variedad,
        'fase', case when p.id is null then null else tpp.fase_planta(p) end);
    end loop;
  end loop;
  return jsonb_build_object(
    'activo', perfil.hueco_activo,
    'desafio', (select desafio from tpp.plantas where usuario_id = perfil.id and hueco = 9 and estado = 'viva' limit 1),
    'desbloqueados', tpp.huecos_total(perfil),
    'maximo', 25 + 3,
    'siguiente', null,
    'lista', lista
  );
end;
$$;

create or replace function tpp.elegir_hueco(p_uid uuid, p_hueco integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  if p_hueco = 9 and exists (select 1 from tpp.plantas where usuario_id = p_uid and hueco = 9 and estado = 'viva') then
    update tpp.perfiles set hueco_activo = 9 where id = p_uid;
    return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
  end if;
  if p_hueco is null or not tpp.hueco_valido(perfil, p_hueco) then
    return jsonb_build_object('ok', false, 'error', 'hueco_bloqueado') || tpp.estado_json(p_uid);
  end if;
  update tpp.perfiles set hueco_activo = p_hueco, habitacion = tpp.habitacion_de(p_hueco) where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

-- Mueve una planta a otro sitio de la casa; si el sitio está ocupado, las dos plantas se intercambian.
create or replace function tpp.mover_planta(p_uid uuid, p_desde integer, p_hacia integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  select * into perfil from tpp.perfiles where id = p_uid for update;
  if p_desde is null or p_hacia is null or p_desde = p_hacia
    or not tpp.hueco_valido(perfil, p_desde) or not tpp.hueco_valido(perfil, p_hacia) then
    return jsonb_build_object('ok', false, 'error', 'hueco_bloqueado') || tpp.estado_json(p_uid);
  end if;
  update tpp.plantas set hueco = 99 where usuario_id = p_uid and hueco = p_desde and estado = 'viva';
  update tpp.plantas set hueco = p_desde where usuario_id = p_uid and hueco = p_hacia and estado = 'viva';
  update tpp.plantas set hueco = p_hacia where usuario_id = p_uid and hueco = 99;
  -- las muertas y las cosechadas se quedan donde estaban: solo cuenta la que vive
  if perfil.hueco_activo = p_desde then
    update tpp.perfiles set hueco_activo = p_hacia, habitacion = tpp.habitacion_de(p_hacia) where id = p_uid;
  elsif perfil.hueco_activo = p_hacia then
    update tpp.perfiles set hueco_activo = p_desde, habitacion = tpp.habitacion_de(p_desde) where id = p_uid;
  end if;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

create or replace function tpp.elegir_habitacion(p_uid uuid, p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  primero integer;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  if not (perfil.habitaciones ? p_id) then
    return jsonb_build_object('ok', false, 'error', 'habitacion_bloqueada') || tpp.estado_json(p_uid);
  end if;
  select coalesce(
    (select hueco from tpp.plantas where usuario_id = p_uid and estado = 'viva' and tpp.habitacion_de(hueco) = p_id order by hueco limit 1),
    (tpp.habitaciones() -> p_id ->> 'base')::int + 1) into primero;
  update tpp.perfiles set habitacion = p_id, hueco_activo = primero where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

-- Comprar una habitación ya no te lleva a ella; con precio 0 se desbloquea al llegar al nivel.
do $mig$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('tpp.comprar_habitacion(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, E'habitaciones = habitaciones || to_jsonb(p_id), habitacion = p_id where id = p_uid;',
    E'habitaciones = habitaciones || to_jsonb(p_id) where id = p_uid;');
  if d = o then raise exception 'comprar_habitacion no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.sincronizar(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'  agua_ini := p.agua;\n  plaga_ini := p.plaga;',
    E'  hab := coalesce(tpp.habitacion_de(p.hueco), hab);\n  agua_ini := p.agua;\n  plaga_ini := p.plaga;');
  if d = o then raise exception 'sincronizar habitacion no cambia'; end if;
  o := d;
  d := replace(d, E'    if hab = ''armario'' then f_nutr := f_nutr * (1 - 0.05 * coalesce((mj ->> ''h_armario'')::int, 0)); end if;',
    E'    if hab = ''armario'' then f_nutr := f_nutr * (1 - 0.05 * coalesce((mj ->> ''h_armario'')::int, 0)); end if;\n'
    || E'    if hab = ''cocina'' then calor_luz := calor_luz + 2; end if;\n'
    || E'    if hab = ''dormitorio'' then f_salud := f_salud * 0.95; end if;\n'
    || E'    if hab = ''bano'' then f_agua := f_agua * 0.8; f_moho := f_moho * 1.3; end if;\n'
    || E'    if hab = ''terraza'' then f_luz := f_luz * 0.85; f_plaga := f_plaga * 1.25; end if;');
  if d = o then raise exception 'sincronizar bonos no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, E'when habitacion = ''azotea'' then', E'when tpp.habitacion_de(tpp.hueco_activo(p_uid)) = ''azotea'' then');
  if d = o then raise exception 'accion no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.estado_json(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'jsonb_build_object(''habitacion'', perfil.habitacion,',
    E'jsonb_build_object(''habitacion'', coalesce(tpp.habitacion_de(perfil.hueco_activo), perfil.habitacion),');
  if d = o then raise exception 'estado_json no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.prestigio_datos(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'jsonb_array_length(perfil.habitaciones) - 1,', E'greatest(jsonb_array_length(perfil.habitaciones) - 4, 0),');
  if d = o then raise exception 'prestigio_datos no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.renacer(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, E'habitaciones = case when prestigio_bonos ? ''sot'' then ''["armario","sotano"]''::jsonb else ''["armario"]''::jsonb end,',
    E'habitaciones = case when prestigio_bonos ? ''sot'' then ''["armario","salon","cocina","dormitorio","sotano"]''::jsonb else ''["armario","salon","cocina","dormitorio"]''::jsonb end,');
  if d = o then raise exception 'renacer habitaciones no cambia'; end if;
  o := d;
  d := replace(d, E'habitacion = case when prestigio_bonos ? ''sot'' then ''sotano'' else ''armario'' end,\n    huecos = 1,\n    hueco_activo = 1,',
    E'habitacion = ''armario'',\n    huecos = 1,\n    hueco_activo = 1,');
  if d = o then raise exception 'renacer habitacion no cambia'; end if;
  execute d;
end
$mig$;

create function public.tpp_mover_planta(p_desde integer, p_hacia integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mover_planta(auth.uid(), p_desde, p_hacia);
end;
$$;

revoke all on function tpp.habitaciones_base() from public, anon, authenticated;
revoke all on function tpp.sitios_habitacion(tpp.perfiles, text) from public, anon, authenticated;
revoke all on function tpp.habitacion_de(integer) from public, anon, authenticated;
revoke all on function tpp.hueco_valido(tpp.perfiles, integer) from public, anon, authenticated;
revoke all on function tpp.mover_planta(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.tpp_mover_planta(integer, integer) from public, anon;
grant execute on function public.tpp_mover_planta(integer, integer) to authenticated;
