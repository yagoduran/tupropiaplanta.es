-- Fase 5c: plagas y hongos.
-- Para deshacer: alter table tpp.plantas drop column plaga, drop column plaga_desde, drop column inmune_hasta;
-- borrar tpp.tratar y volver a aplicar las versiones anteriores de sincronizar, estado_json, usar y catalogo.

alter table tpp.plantas
  add column plaga text check (plaga in ('pulgon', 'arana', 'mosca', 'caracol', 'oruga', 'moho')),
  add column plaga_desde timestamptz,
  add column inmune_hasta timestamptz;

-- Trata la plaga: el pulverizador sirve para bichos y el fungicida para el moho. Da 12 horas sin plagas.
create function tpp.tratar(p_uid uuid, p_objeto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p tpp.plantas;
  pid uuid;
begin
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
  if p.plaga is null then
    return jsonb_build_object('ok', false, 'error', 'sin_plaga') || tpp.estado_json(p_uid);
  end if;
  if (p_objeto = 'fungicida') <> (p.plaga = 'moho') then
    return jsonb_build_object('ok', false, 'error', 'tratamiento_incorrecto') || tpp.estado_json(p_uid);
  end if;
  update tpp.inventario set cantidad = cantidad - 1 where usuario_id = p_uid and objeto = p_objeto;
  update tpp.plantas set plaga = null, plaga_desde = null, inmune_hasta = now() + interval '12 hours' where id = p.id;
  update tpp.perfiles set xp = xp + 10 where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

revoke all on function tpp.tratar(uuid, text) from public, anon, authenticated;

create or replace function tpp.catalogo() returns jsonb
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
    {"id":"pulverizador","tipo":"consumible","precio":120,"nivel":1},
    {"id":"fungicida","tipo":"consumible","precio":150,"nivel":1},
    {"id":"tijeras","tipo":"herramienta","precio":350,"nivel":1},
    {"id":"poster","tipo":"decoracion","precio":150,"nivel":1},
    {"id":"planta_adorno","tipo":"decoracion","precio":260,"nivel":1}
  ]'::jsonb;
$$;

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
  f_var double precision;
  t timestamptz;
  fase integer;
  buena boolean;
  pestes text[] := array['pulgon', 'arana', 'mosca', 'caracol', 'oruga'];
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

  f_var := coalesce((tpp.variedades() -> p.variedad ->> 'desgaste')::double precision, 1);
  f_agua := f_agua * f_var;
  f_nutr := f_nutr * f_var;
  f_luz := f_luz * f_var;

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
    elsif p.agua >= 40 and p.nutrientes >= 30 and p.luz >= 30 and p.plaga is null then
      p.salud := least(100, p.salud + 0.5 * dt);
    end if;

    p.horas_vividas := p.horas_vividas + dt;
    restante := restante - dt;
    t := ahora - make_interval(secs => restante * 3600);

    -- Plagas y hongos: aparecen desde la fase 3, más a menudo si se cuida mal. Sin tratar, quitan salud (el doble si pasan 6 horas).
    if p.plaga is not null then
      p.salud := p.salud - case when t - p.plaga_desde > interval '6 hours' then 2.5 else 1 end * dt;
    else
      fase := tpp.fase_planta(p);
      if fase >= 3 and (p.inmune_hasta is null or t >= p.inmune_hasta) then
        buena := p.agua >= 40 and p.nutrientes >= 30 and p.luz >= 30;
        if p.agua > 85 and random() < 0.05 * dt / 0.5 then
          p.plaga := 'moho';
          p.plaga_desde := t;
        elsif random() < (case when buena then 0.0015 else 0.015 end) * dt / 0.5 then
          p.plaga := pestes[1 + floor(random() * 5)::int];
          p.plaga_desde := t;
        end if;
      end if;
    end if;

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
    sincronizada_en = p.sincronizada_en, plaga = p.plaga, plaga_desde = p.plaga_desde
  where id = p.id;
  return p;
end;
$$;

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
  nuevos jsonb;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  nuevos := tpp.revisar_logros(p_uid);
  select * into perfil from tpp.perfiles where id = p_uid;

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
      'fase', tpp.fase_planta(p),
      'estado', tpp.estado_visual(p),
      'agua', round(p.agua::numeric, 1),
      'nutrientes', round(p.nutrientes::numeric, 1),
      'luz', round(p.luz::numeric, 1),
      'temperatura', p.temperatura,
      'ph', p.ph,
      'salud', round(p.salud::numeric, 1),
      'segundos_vida', floor(p.horas_vividas * 3600),
      'esperas', esperas,
      'plaga', case when p.plaga is null then null
        else jsonb_build_object('tipo', p.plaga, 'grave', now() - p.plaga_desde > interval '6 hours') end
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
      'logros', tpp.logros_json(perfil),
      'logros_nuevos', nuevos,
      'diaria', tpp.diaria_json(perfil),
      'nivel', nivel,
      'xp_pct', round(100 * (perfil.xp - 25 * (nivel - 1) ^ 2) / (25 * nivel ^ 2 - 25 * (nivel - 1) ^ 2))
    ),
    'planta', planta
  );
end;
$$;

create or replace function tpp.usar(p_uid uuid, p_objeto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p tpp.plantas;
  pid uuid;
  fase integer;
begin
  perform tpp.asegurar_perfil(p_uid);
  if p_objeto in ('pulverizador', 'fungicida') then
    return tpp.tratar(p_uid, p_objeto);
  end if;
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
  fase := tpp.fase_planta(p);

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
