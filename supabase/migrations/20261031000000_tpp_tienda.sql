-- Fase 4a: tienda, inventario, objetos equipables y economía.
-- Para deshacer: drop table tpp.inventario; alter table tpp.perfiles drop column equipo;
-- alter table tpp.plantas drop column bonus_cosecha; y borrar las funciones tpp_comprar, tpp_equipar y tpp_usar.

alter table tpp.perfiles
  add column equipo jsonb not null default '{"maceta":"maceta_plastico","luz":"bombilla","decoracion":[]}'::jsonb;
alter table tpp.plantas add column bonus_cosecha double precision not null default 0;

create table tpp.inventario (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  objeto text not null,
  cantidad integer not null check (cantidad >= 0),
  primary key (usuario_id, objeto)
);
alter table tpp.inventario enable row level security;

-- Catálogo de la tienda. Los textos y los iconos viven en la web; aquí solo lo que decide el servidor.
create function tpp.catalogo() returns jsonb
language sql immutable set search_path = '' as $$
  select '[
    {"id":"maceta_plastico","tipo":"maceta","precio":0,"nivel":1},
    {"id":"maceta_terracota","tipo":"maceta","precio":300,"nivel":1},
    {"id":"maceta_tela","tipo":"maceta","precio":1600,"nivel":1},
    {"id":"maceta_ceramica","tipo":"maceta","precio":2400,"nivel":12},
    {"id":"bombilla","tipo":"luz","precio":0,"nivel":1},
    {"id":"fluorescente","tipo":"luz","precio":450,"nivel":1},
    {"id":"led","tipo":"luz","precio":1800,"nivel":1},
    {"id":"led_pro","tipo":"luz","precio":4500,"nivel":15},
    {"id":"fert_generico","tipo":"consumible","precio":80,"nivel":1},
    {"id":"fert_crecimiento","tipo":"consumible","precio":220,"nivel":1},
    {"id":"fert_floracion","tipo":"consumible","precio":1400,"nivel":1},
    {"id":"fert_mejorador","tipo":"consumible","precio":900,"nivel":10},
    {"id":"tijeras","tipo":"herramienta","precio":350,"nivel":1},
    {"id":"poster","tipo":"decoracion","precio":150,"nivel":1},
    {"id":"planta_adorno","tipo":"decoracion","precio":260,"nivel":1}
  ]'::jsonb;
$$;

create function tpp.nivel_de(p_xp integer) returns integer
language sql immutable set search_path = '' as $$
  select 1 + floor(sqrt(p_xp / 25.0))::int;
$$;

-- ¿Tiene el jugador este objeto? Los gratuitos siempre se tienen.
create function tpp.tiene(p_uid uuid, p_objeto text) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from jsonb_array_elements(tpp.catalogo()) c where c ->> 'id' = p_objeto and (c ->> 'precio')::int = 0)
    or exists (select 1 from tpp.inventario where usuario_id = p_uid and objeto = p_objeto and cantidad > 0);
$$;

-- Pone al día una planta con el tiempo real. La maceta y la luz equipadas frenan el desgaste.
create or replace function tpp.sincronizar(p_id uuid) returns tpp.plantas
language plpgsql security definer set search_path = '' as $$
declare
  p tpp.plantas;
  equipo jsonb;
  ahora timestamptz := now();
  restante double precision;
  dt double precision;
  f_agua double precision := 1;
  f_nutr double precision := 1;
  f_luz double precision := 1;
begin
  select * into p from tpp.plantas where id = p_id for update;
  if p.id is null or p.estado <> 'viva' then
    return p;
  end if;

  select e.equipo into equipo from tpp.perfiles e where e.id = p.usuario_id;
  case coalesce(equipo ->> 'maceta', '')
    when 'maceta_terracota' then f_agua := 0.9;
    when 'maceta_tela' then f_agua := 0.95; f_nutr := 0.85;
    when 'maceta_ceramica' then f_agua := 0.9; f_nutr := 0.9;
    else null;
  end case;
  case coalesce(equipo ->> 'luz', '')
    when 'fluorescente' then f_luz := 0.85;
    when 'led' then f_luz := 0.7;
    when 'led_pro' then f_luz := 0.55;
    else null;
  end case;

  restante := least(extract(epoch from (ahora - p.sincronizada_en)) / 3600.0, 720);
  while restante > 0 loop
    dt := least(0.5, restante);
    p.agua := greatest(0, p.agua - 1.5 * f_agua * dt);
    p.nutrientes := greatest(0, p.nutrientes - 0.8 * f_nutr * dt);
    p.luz := greatest(0, p.luz - 0.5 * f_luz * dt);

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

-- Estado completo del jugador y de su planta, en JSON (ahora con inventario y equipo).
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
  inv jsonb;
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

  select coalesce(jsonb_object_agg(objeto, cantidad), '{}'::jsonb) into inv
    from tpp.inventario where usuario_id = p_uid and cantidad > 0;

  nivel := tpp.nivel_de(perfil.xp);
  return jsonb_build_object(
    'perfil', jsonb_build_object(
      'usuario', perfil.usuario,
      'monedas', perfil.monedas,
      'xp', perfil.xp,
      'tutorial_hecho', perfil.tutorial_hecho,
      'tutorial_paso', perfil.tutorial_paso,
      'ajustes', perfil.ajustes,
      'equipo', perfil.equipo,
      'inventario', inv,
      'nivel', nivel,
      'xp_pct', round(100 * (perfil.xp - 25 * (nivel - 1) ^ 2) / (25 * nivel ^ 2 - 25 * (nivel - 1) ^ 2))
    ),
    'planta', planta
  );
end;
$$;

-- Acciones del jugador. Cuidar bien da monedas (solo si la acción hacía falta).
create or replace function tpp.accion(p_uid uuid, p_accion text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p tpp.plantas;
  pid uuid;
  espera integer;
  lista timestamptz;
  recompensa integer;
  ganadas integer := 0;
  extra_salud integer := 10;
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
    recompensa := round((400 + p.salud * 6) * (1 + p.bonus_cosecha))::int;
    update tpp.plantas set estado = 'cosechada' where id = p.id;
    update tpp.perfiles set monedas = monedas + recompensa, xp = xp + 100 where id = p_uid;
    return jsonb_build_object('ok', true, 'recompensa', recompensa) || tpp.estado_json(p_uid);
  end if;

  if p_accion = 'podar' and tpp.fase_de(p.horas_vividas) < 3 then
    return jsonb_build_object('ok', false, 'error', 'fase_insuficiente') || tpp.estado_json(p_uid);
  end if;

  if p_accion = 'regar' and p.agua < 90 then ganadas := 2;
  elsif p_accion = 'abonar' and p.nutrientes < 80 then ganadas := 5;
  elsif p_accion = 'podar' then ganadas := 8;
  elsif p_accion = 'ajustar_luz' and p.luz < 80 then ganadas := 5;
  end if;

  if p_accion = 'podar' and tpp.tiene(p_uid, 'tijeras') then
    extra_salud := 15;
  end if;

  update tpp.plantas set
    agua = case when p_accion = 'regar' then least(100, agua + 50) else agua end,
    nutrientes = case when p_accion = 'abonar' then least(100, nutrientes + 30) else nutrientes end,
    luz = case when p_accion = 'ajustar_luz' then least(100, luz + 40) else luz end,
    salud = case when p_accion = 'podar' then least(100, salud + extra_salud) else salud end,
    esperas = esperas || jsonb_build_object(p_accion, now() + make_interval(secs => espera))
  where id = p.id;
  update tpp.perfiles set xp = xp + 5, monedas = monedas + ganadas where id = p_uid;

  return jsonb_build_object('ok', true, 'ganadas', ganadas) || tpp.estado_json(p_uid);
end;
$$;

-- Comprar un objeto. Los equipables se ponen al comprarlos.
create function tpp.comprar(p_uid uuid, p_objeto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  item jsonb;
  precio integer;
  tipo text;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  select c into item from jsonb_array_elements(tpp.catalogo()) c where c ->> 'id' = p_objeto;
  if item is null then
    return jsonb_build_object('ok', false, 'error', 'objeto_desconocido') || tpp.estado_json(p_uid);
  end if;
  precio := (item ->> 'precio')::int;
  tipo := item ->> 'tipo';

  if precio = 0 or (tipo <> 'consumible' and tpp.tiene(p_uid, p_objeto)) then
    return jsonb_build_object('ok', false, 'error', 'ya_lo_tienes') || tpp.estado_json(p_uid);
  end if;
  if tpp.nivel_de(perfil.xp) < (item ->> 'nivel')::int then
    return jsonb_build_object('ok', false, 'error', 'nivel_insuficiente') || tpp.estado_json(p_uid);
  end if;
  if perfil.monedas < precio then
    return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.estado_json(p_uid);
  end if;

  update tpp.perfiles set monedas = monedas - precio where id = p_uid;
  insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, p_objeto, 1)
    on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + 1;

  if tipo = 'maceta' or tipo = 'luz' then
    update tpp.perfiles set equipo = equipo || jsonb_build_object(tipo, p_objeto) where id = p_uid;
  elsif tipo = 'decoracion' then
    update tpp.perfiles set equipo = jsonb_set(equipo, '{decoracion}', (equipo -> 'decoracion') || to_jsonb(p_objeto)) where id = p_uid;
  end if;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

-- Poner o quitar un objeto que ya se tiene (maceta, luz o decoración).
create function tpp.equipar(p_uid uuid, p_objeto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  tipo text;
  puestos jsonb;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  select c ->> 'tipo' into tipo from jsonb_array_elements(tpp.catalogo()) c where c ->> 'id' = p_objeto;
  if tipo is null or tipo not in ('maceta', 'luz', 'decoracion') then
    return jsonb_build_object('ok', false, 'error', 'objeto_desconocido') || tpp.estado_json(p_uid);
  end if;
  if not tpp.tiene(p_uid, p_objeto) then
    return jsonb_build_object('ok', false, 'error', 'no_lo_tienes') || tpp.estado_json(p_uid);
  end if;

  if tipo = 'decoracion' then
    puestos := coalesce(perfil.equipo -> 'decoracion', '[]'::jsonb);
    if puestos ? p_objeto then
      puestos := (select coalesce(jsonb_agg(x), '[]'::jsonb) from jsonb_array_elements(puestos) x where x #>> '{}' <> p_objeto);
    else
      puestos := puestos || to_jsonb(p_objeto);
    end if;
    update tpp.perfiles set equipo = jsonb_set(equipo, '{decoracion}', puestos) where id = p_uid;
  else
    update tpp.perfiles set equipo = equipo || jsonb_build_object(tipo, p_objeto) where id = p_uid;
  end if;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

-- Usar un abono: gasta una unidad y sube los nutrientes.
create function tpp.usar(p_uid uuid, p_objeto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p tpp.plantas;
  pid uuid;
  fase integer;
begin
  perform tpp.asegurar_perfil(p_uid);
  if p_objeto not in ('fert_generico', 'fert_crecimiento', 'fert_floracion', 'fert_mejorador') then
    return jsonb_build_object('ok', false, 'error', 'objeto_desconocido') || tpp.estado_json(p_uid);
  end if;
  if not exists (select 1 from tpp.inventario where usuario_id = p_uid and objeto = p_objeto and cantidad > 0) then
    return jsonb_build_object('ok', false, 'error', 'sin_existencias') || tpp.estado_json(p_uid);
  end if;

  select id into pid from tpp.plantas where usuario_id = p_uid and estado = 'viva';
  if pid is null then
    return jsonb_build_object('ok', false, 'error', 'sin_planta') || tpp.estado_json(p_uid);
  end if;
  p := tpp.sincronizar(pid);
  if p.estado <> 'viva' then
    return jsonb_build_object('ok', false, 'error', 'planta_muerta') || tpp.estado_json(p_uid);
  end if;
  fase := tpp.fase_de(p.horas_vividas);

  if (p_objeto = 'fert_crecimiento' and fase not between 4 and 5)
     or (p_objeto = 'fert_floracion' and fase not between 6 and 7) then
    return jsonb_build_object('ok', false, 'error', 'fase_incorrecta') || tpp.estado_json(p_uid);
  end if;
  if p_objeto = 'fert_mejorador' and p.bonus_cosecha >= 0.1 then
    return jsonb_build_object('ok', false, 'error', 'ya_aplicado') || tpp.estado_json(p_uid);
  end if;

  update tpp.inventario set cantidad = cantidad - 1 where usuario_id = p_uid and objeto = p_objeto;
  update tpp.plantas set
    nutrientes = least(100, nutrientes + case p_objeto
      when 'fert_generico' then 20 when 'fert_crecimiento' then 35 when 'fert_floracion' then 25 else 0 end),
    bonus_cosecha = case p_objeto
      when 'fert_floracion' then bonus_cosecha + 0.1 when 'fert_mejorador' then bonus_cosecha + 0.1 else bonus_cosecha end
  where id = p.id;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

create or replace function tpp.borrar_datos(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  delete from tpp.inventario where usuario_id = p_uid;
  delete from tpp.plantas where usuario_id = p_uid;
  delete from tpp.perfiles where id = p_uid;
  return jsonb_build_object('ok', true);
end;
$$;

create function public.tpp_comprar(p_objeto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.comprar(auth.uid(), p_objeto);
end;
$$;

create function public.tpp_equipar(p_objeto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.equipar(auth.uid(), p_objeto);
end;
$$;

create function public.tpp_usar(p_objeto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.usar(auth.uid(), p_objeto);
end;
$$;

revoke all on function tpp.catalogo() from public, anon, authenticated;
revoke all on function tpp.nivel_de(integer) from public, anon, authenticated;
revoke all on function tpp.tiene(uuid, text) from public, anon, authenticated;
revoke all on function tpp.comprar(uuid, text) from public, anon, authenticated;
revoke all on function tpp.equipar(uuid, text) from public, anon, authenticated;
revoke all on function tpp.usar(uuid, text) from public, anon, authenticated;
revoke all on function public.tpp_comprar(text) from public, anon;
revoke all on function public.tpp_equipar(text) from public, anon;
revoke all on function public.tpp_usar(text) from public, anon;
grant execute on function public.tpp_comprar(text) to authenticated;
grant execute on function public.tpp_equipar(text) to authenticated;
grant execute on function public.tpp_usar(text) to authenticated;
