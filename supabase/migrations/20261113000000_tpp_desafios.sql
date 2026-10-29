-- Desafíos semanales: 4 desafíos con reglas especiales. Empezar uno crea una planta aparte (hueco 4, no ocupa tus huecos)
-- que crece 3 veces más rápido y tiene un plazo (7 días; Contrarreloj, 5). Se puede jugar cada desafío una vez por semana
-- (de lunes a domingo). Al cosechar: puntos = (400 + salud × 6) × dificultad, y monedas y XP según el multiplicador.
-- Para deshacer: borrar las funciones públicas tpp_desafios y tpp_empezar_desafio, tpp.mis_desafios, tpp.empezar_desafio y
-- tpp.desafios; quitar las columnas desafio, desafio_limite, desafio_semana, desafio_datos y puntos de tpp.plantas y volver
-- a aplicar las versiones anteriores de sincronizar, accion, usar, plantar, estado_json, huecos_json, elegir_hueco y mi_perfil
-- (migraciones 20261106, 20261107 y 20261109).

alter table tpp.plantas
  add column desafio text,
  add column desafio_limite timestamptz,
  add column desafio_semana date,
  add column desafio_datos jsonb not null default '{}'::jsonb,
  add column puntos integer;
alter table tpp.plantas drop constraint plantas_hueco_check;
alter table tpp.plantas add constraint plantas_hueco_check check (hueco between 1 and 4);
alter table tpp.perfiles drop constraint perfiles_hueco_activo_check;
alter table tpp.perfiles add constraint perfiles_hueco_activo_check check (hueco_activo between 1 and 4);

-- Dificultad (1 a 3), multiplicador de recompensa y días de plazo. Los textos viven en la web.
create function tpp.desafios() returns jsonb
language sql immutable set search_path = '' as $$
  select '{
    "noche": {"dif": 2, "mult": 3, "dias": 7},
    "plagas": {"dif": 3, "mult": 4, "dias": 7},
    "sequia": {"dif": 2, "mult": 3, "dias": 7},
    "reloj": {"dif": 1, "mult": 2, "dias": 5}
  }'::jsonb;
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
  calor_luz double precision := 0;
  f_plaga double precision := 1;
  crec double precision;
  grados double precision;
  hora double precision;
  vel double precision := 1;
  f_salud double precision := 1;
  fase_min integer := 3;
  salud_antes double precision;
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
  -- Cada luz da su calor a la cámara; el gato ahuyenta las plagas.
  calor_luz := case coalesce(equipo ->> 'luz', '')
    when 'bombilla' then 4 when 'fluorescente' then 2 when 'led_pro' then -1 else 0 end;
  if coalesce(equipo -> 'decoracion', '[]'::jsonb) ? 'gato' then f_plaga := 0.7; end if;

  -- Desafíos: la planta crece 3 veces más rápido y cada desafío cambia las reglas. Si se acaba el tiempo, la planta se pierde.
  if p.desafio is not null then
    if ahora > p.desafio_limite then
      update tpp.plantas set estado = 'muerta', muerta_en = p.desafio_limite where id = p.id returning * into p;
      return p;
    end if;
    vel := 3;
    case p.desafio
      when 'noche' then f_luz := f_luz * 1.5; vel := vel / 1.2;
      when 'plagas' then f_plaga := f_plaga * 2; f_salud := 1.25; fase_min := 2;
      when 'sequia' then calor_luz := calor_luz + 4;
      else null;
    end case;
  end if;

  f_var := coalesce((tpp.variedades() -> p.variedad ->> 'desgaste')::double precision, 1);
  f_agua := f_agua * f_var;
  f_nutr := f_nutr * f_var;
  f_luz := f_luz * f_var;

  restante := least(extract(epoch from (ahora - p.sincronizada_en)) / 3600.0, 720);
  while restante > 0 loop
    dt := least(0.5, restante);
    salud_antes := p.salud;
    -- Temperatura según la hora de Madrid (de 19 °C de madrugada a 27 °C por la tarde) más el calor de la luz.
    hora := extract(hour from ((ahora - make_interval(secs => restante * 3600)) at time zone 'Europe/Madrid'))
      + extract(minute from ((ahora - make_interval(secs => restante * 3600)) at time zone 'Europe/Madrid')) / 60.0;
    grados := 23 + 4 * sin(2 * pi() * (hora - 9) / 24) + calor_luz;
    p.ph := p.ph + (6.5 - p.ph) * least(1, 0.1 * dt);
    crec := 1;
    if grados < 18 or grados > 30 then crec := crec * 0.85; end if;
    if p.ph < 5.8 or p.ph > 7.4 then crec := crec * 0.85; end if;
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

    p.horas_vividas := p.horas_vividas + dt * crec * vel;
    restante := restante - dt;
    t := ahora - make_interval(secs => restante * 3600);

    -- Plagas y hongos: aparecen desde la fase 3, más a menudo si se cuida mal. Sin tratar, quitan salud (el doble si pasan 6 horas).
    if p.plaga is not null then
      p.salud := p.salud - case when t - p.plaga_desde > interval '6 hours' then 2.5 else 1 end * dt;
    else
      fase := tpp.fase_planta(p);
      if fase >= fase_min and (p.inmune_hasta is null or t >= p.inmune_hasta) then
        buena := p.agua >= 40 and p.nutrientes >= 30 and p.luz >= 30;
        if p.agua > 85 and random() < 0.05 * f_plaga * dt / 0.5 then
          p.plaga := 'moho';
          p.plaga_desde := t;
        elsif random() < (case when buena then 0.0015 else 0.015 end) * f_plaga * dt / 0.5 then
          p.plaga := pestes[1 + floor(random() * 5)::int];
          p.plaga_desde := t;
        end if;
      end if;
    end if;

    if p.salud < salud_antes then
      p.salud := salud_antes - (salud_antes - p.salud) * f_salud;
    end if;
    if p.salud <= 0 then
      p.salud := 0;
      p.estado := 'muerta';
      p.muerta_en := ahora - make_interval(secs => restante * 3600);
      exit;
    end if;
  end loop;

  p.sincronizada_en := ahora;
  hora := extract(hour from (ahora at time zone 'Europe/Madrid')) + extract(minute from (ahora at time zone 'Europe/Madrid')) / 60.0;
  p.temperatura := round(23 + 4 * sin(2 * pi() * (hora - 9) / 24) + calor_luz);
  update tpp.plantas set
    ph = p.ph, temperatura = p.temperatura,
    agua = p.agua, nutrientes = p.nutrientes, luz = p.luz, salud = p.salud,
    horas_vividas = p.horas_vividas, estado = p.estado, muerta_en = p.muerta_en,
    sincronizada_en = p.sincronizada_en, plaga = p.plaga, plaga_desde = p.plaga_desde
  where id = p.id;
  return p;
end;
$$;
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
  bono_xp integer := 0;
begin
  perform tpp.asegurar_perfil(p_uid);
  -- La radio da algo más de experiencia.
  if exists (select 1 from tpp.perfiles where id = p_uid and coalesce(equipo -> 'decoracion', '[]'::jsonb) ? 'radio') then
    bono_xp := 1;
  end if;

  if p_accion not in ('regar', 'abonar', 'podar', 'ajustar_luz', 'cosechar') then
    return jsonb_build_object('ok', false, 'error', 'accion_desconocida') || tpp.estado_json(p_uid);
  end if;

  select id into pid from tpp.plantas where usuario_id = p_uid and estado = 'viva' and hueco = tpp.hueco_activo(p_uid);
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

  -- Sequía: solo 3 riegos al día.
  if p.desafio = 'sequia' and p_accion = 'regar' then
    if (p.desafio_datos ->> 'dia') is distinct from (now() at time zone 'Europe/Madrid')::date::text then
      update tpp.plantas set desafio_datos = jsonb_build_object('dia', (now() at time zone 'Europe/Madrid')::date::text, 'riegos', 0)
        where id = p.id returning * into p;
    end if;
    if coalesce((p.desafio_datos ->> 'riegos')::int, 0) >= 3 then
      return jsonb_build_object('ok', false, 'error', 'desafio_riegos') || tpp.estado_json(p_uid);
    end if;
    update tpp.plantas set desafio_datos = desafio_datos || jsonb_build_object('riegos', coalesce((desafio_datos ->> 'riegos')::int, 0) + 1)
      where id = p.id;
  end if;

  if p_accion = 'cosechar' then
    if tpp.fase_planta(p) < 8 then
      return jsonb_build_object('ok', false, 'error', 'fase_insuficiente') || tpp.estado_json(p_uid);
    end if;
    if p.desafio is not null then
      recompensa := 1000 * (tpp.desafios() -> p.desafio ->> 'mult')::int;
      update tpp.plantas set estado = 'cosechada',
        puntos = round((400 + p.salud * 6) * (tpp.desafios() -> p.desafio ->> 'dif')::int)::int where id = p.id;
      update tpp.perfiles set monedas = monedas + recompensa,
        xp = xp + 200 * (tpp.desafios() -> p.desafio ->> 'mult')::int + 10 * bono_xp where id = p_uid;
      perform tpp.contar(p_uid, 'cosechas', 1);
      return jsonb_build_object('ok', true, 'recompensa', recompensa) || tpp.estado_json(p_uid);
    end if;
    recompensa := round((400 + p.salud * 6) * (1 + p.bonus_cosecha)
      * coalesce((tpp.variedades() -> p.variedad ->> 'recompensa')::double precision, 1))::int;
    update tpp.plantas set estado = 'cosechada' where id = p.id;
    update tpp.perfiles set monedas = monedas + recompensa, xp = xp + 100 + 10 * bono_xp where id = p_uid;
    perform tpp.contar(p_uid, 'cosechas', 1);
    return jsonb_build_object('ok', true, 'recompensa', recompensa) || tpp.estado_json(p_uid);
  end if;

  if p_accion = 'podar' and tpp.fase_planta(p) < 3 then
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
    ph = case when p_accion = 'regar' then least(8, ph + 0.15) when p_accion = 'abonar' then greatest(4.5, ph - 0.25) else ph end,
    salud = case when p_accion = 'podar' then least(100, salud + extra_salud) else salud end,
    esperas = esperas || jsonb_build_object(p_accion, now() + make_interval(secs => espera))
  where id = p.id;
  update tpp.perfiles set xp = xp + 5 + bono_xp, monedas = monedas + ganadas where id = p_uid;
  if p_accion = 'regar' then perform tpp.contar(p_uid, 'riegos', 1);
  elsif p_accion = 'abonar' then perform tpp.contar(p_uid, 'abonos', 1);
  end if;

  return jsonb_build_object('ok', true, 'ganadas', ganadas) || tpp.estado_json(p_uid);
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

  select id into pid from tpp.plantas where usuario_id = p_uid and estado = 'viva' and hueco = tpp.hueco_activo(p_uid);
  if pid is null then
    return jsonb_build_object('ok', false, 'error', 'sin_planta') || tpp.estado_json(p_uid);
  end if;
  p := tpp.sincronizar(pid);
  if p.estado <> 'viva' then
    return jsonb_build_object('ok', false, 'error', 'planta_muerta') || tpp.estado_json(p_uid);
  end if;
  if p.desafio = 'reloj' and p_objeto = 'fert_crecimiento' then
    return jsonb_build_object('ok', false, 'error', 'desafio_prohibido') || tpp.estado_json(p_uid);
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
create or replace function tpp.plantar(p_uid uuid, p_variedad text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  v jsonb;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  v := tpp.variedades() -> p_variedad;
  if v is null then
    return jsonb_build_object('ok', false, 'error', 'variedad_desconocida') || tpp.estado_json(p_uid);
  end if;
  if tpp.nivel_de(perfil.xp) < (v ->> 'nivel')::int then
    return jsonb_build_object('ok', false, 'error', 'variedad_bloqueada') || tpp.estado_json(p_uid);
  end if;
  if tpp.hueco_activo(p_uid) = 4 then
    return jsonb_build_object('ok', false, 'error', 'hueco_desafio') || tpp.estado_json(p_uid);
  end if;
  if exists (select 1 from tpp.plantas where usuario_id = p_uid and estado = 'viva' and hueco = tpp.hueco_activo(p_uid)) then
    return jsonb_build_object('ok', false, 'error', 'ya_hay_planta') || tpp.estado_json(p_uid);
  end if;
  insert into tpp.plantas (usuario_id, variedad, hueco) values (p_uid, p_variedad, tpp.hueco_activo(p_uid));
  update tpp.perfiles set estadisticas = jsonb_set(estadisticas, '{variedades}',
    coalesce(estadisticas -> 'variedades', '{}'::jsonb) || jsonb_build_object(p_variedad, true)) where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
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
  -- Un desafío vivo se pone al día primero: si se ha acabado el tiempo, se pierde.
  select id into pid from tpp.plantas where usuario_id = p_uid and hueco = 4 and estado = 'viva';
  if pid is not null then perform tpp.sincronizar(pid); end if;
  nuevos := tpp.revisar_logros(p_uid);
  select * into perfil from tpp.perfiles where id = p_uid;

  select id into pid from tpp.plantas where usuario_id = p_uid and estado = 'viva' and hueco = tpp.hueco_activo(p_uid);
  if pid is null then
    select id into pid from tpp.plantas where usuario_id = p_uid and hueco = tpp.hueco_activo(p_uid) order by plantada_en desc limit 1;
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
      'temperatura', round(p.temperatura::numeric, 0),
      'ph', round(p.ph::numeric, 1),
      'salud', round(p.salud::numeric, 1),
      'segundos_vida', floor(p.horas_vividas * 3600),
      'esperas', esperas,
      'plaga', case when p.plaga is null then null
        else jsonb_build_object('tipo', p.plaga, 'grave', now() - p.plaga_desde > interval '6 hours') end,
      'desafio', case when p.desafio is null then null else jsonb_build_object(
        'id', p.desafio,
        'restan', greatest(0, floor(extract(epoch from (p.desafio_limite - now()))))::int,
        'dias', tpp.desafios() -> p.desafio -> 'dias',
        'puntos', p.puntos) end
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
      'anuncios', tpp.anuncios_json(perfil),
      'huecos', tpp.huecos_json(perfil),
      'nivel', nivel,
      'xp_pct', round(100 * (perfil.xp - 25 * (nivel - 1) ^ 2) / (25 * nivel ^ 2 - 25 * (nivel - 1) ^ 2))
    ),
    'planta', planta
  );
end;
$$;
create or replace function tpp.huecos_json(perfil tpp.perfiles) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  lista jsonb := '[]'::jsonb;
  i integer;
  pid uuid;
  p tpp.plantas;
  vida text;
begin
  for i in 1..perfil.huecos loop
    pid := null;
    select id into pid from tpp.plantas where usuario_id = perfil.id and hueco = i
      order by (estado = 'viva') desc, plantada_en desc limit 1;
    if pid is null then
      vida := 'vacio';
      p := null;
    else
      p := tpp.sincronizar(pid);
      vida := p.estado;
    end if;
    lista := lista || jsonb_build_object('hueco', i, 'vida', vida, 'plaga', p.plaga is not null);
  end loop;
  return jsonb_build_object(
    'activo', perfil.hueco_activo,
    'desafio', (select desafio from tpp.plantas where usuario_id = perfil.id and hueco = 4 and estado = 'viva' limit 1),
    'desbloqueados', perfil.huecos,
    'siguiente', case when perfil.huecos < 3 then tpp.hueco_coste(perfil.huecos + 1) end,
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
  if p_hueco = 4 and exists (select 1 from tpp.plantas where usuario_id = p_uid and hueco = 4 and estado = 'viva') then
    update tpp.perfiles set hueco_activo = 4 where id = p_uid;
    return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
  end if;
  if p_hueco is null or p_hueco < 1 or p_hueco > perfil.huecos then
    return jsonb_build_object('ok', false, 'error', 'hueco_bloqueado') || tpp.estado_json(p_uid);
  end if;
  update tpp.perfiles set hueco_activo = p_hueco where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;
create or replace function tpp.mi_perfil(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  return jsonb_build_object(
    'desde', perfil.creado_en,
    'estadisticas', jsonb_build_object(
      'racha', (tpp.diaria_json(perfil) ->> 'racha')::int,
      'cosechas', coalesce((perfil.estadisticas ->> 'cosechas')::int, 0),
      'gastado', coalesce((perfil.estadisticas ->> 'gastado')::int, 0),
      'riegos', coalesce((perfil.estadisticas ->> 'riegos')::int, 0),
      'abonos', coalesce((perfil.estadisticas ->> 'abonos')::int, 0),
      'muertas', (select count(*)::int from tpp.plantas where usuario_id = p_uid and estado = 'muerta'),
      'logros', (select count(*)::int from jsonb_object_keys(perfil.logros)),
      'logros_total', jsonb_array_length(tpp.logros())
    ),
    'plantas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'variedad', variedad, 'vida', estado, 'hueco', hueco,
        'desafio', desafio, 'fase', tpp.fase_planta(pl), 'plantada', plantada_en, 'horas', round(horas_vividas::numeric, 1)
      ) order by plantada_en desc), '[]'::jsonb)
      from (select * from tpp.plantas where usuario_id = p_uid order by plantada_en desc limit 60) pl
    )
  );
end;
$$;

-- Pantalla de desafíos: tiempo hasta el lunes, estado de cada desafío esta semana y las 5 mejores puntuaciones.
create function tpp.mis_desafios(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  semana date := date_trunc('week', now() at time zone 'Europe/Madrid')::date;
  lista jsonb := '{}'::jsonb;
  k text;
  pid uuid;
begin
  perform tpp.asegurar_perfil(p_uid);
  select id into pid from tpp.plantas where usuario_id = p_uid and hueco = 4 and estado = 'viva';
  if pid is not null then perform tpp.sincronizar(pid); end if;
  for k in select * from jsonb_object_keys(tpp.desafios()) loop
    lista := lista || jsonb_build_object(k, jsonb_build_object(
      'jugado', exists (select 1 from tpp.plantas where usuario_id = p_uid and desafio = k and desafio_semana = semana),
      'activo', exists (select 1 from tpp.plantas where usuario_id = p_uid and desafio = k and estado = 'viva'),
      'insignia', exists (select 1 from tpp.plantas where usuario_id = p_uid and desafio = k and estado = 'cosechada'),
      'mejor', (select max(puntos) from tpp.plantas where usuario_id = p_uid and desafio = k and estado = 'cosechada'),
      'top', (select coalesce(jsonb_agg(jsonb_build_object('puntos', puntos, 'salud', round(salud::numeric), 'fecha', plantada_en) order by puntos desc), '[]'::jsonb)
              from (select puntos, salud, plantada_en from tpp.plantas
                    where usuario_id = p_uid and desafio = k and estado = 'cosechada' order by puntos desc limit 5) t)
    ));
  end loop;
  return jsonb_build_object(
    'renueva_en', floor(extract(epoch from (((semana + 7)::timestamp at time zone 'Europe/Madrid') - now())))::int,
    'desafios', lista
  );
end;
$$;

create function tpp.empezar_desafio(p_uid uuid, p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  semana date := date_trunc('week', now() at time zone 'Europe/Madrid')::date;
  d jsonb;
begin
  perform tpp.asegurar_perfil(p_uid);
  d := tpp.desafios() -> p_id;
  if d is null then
    return jsonb_build_object('ok', false, 'error', 'desafio_desconocido') || tpp.estado_json(p_uid);
  end if;
  if exists (select 1 from tpp.plantas where usuario_id = p_uid and hueco = 4 and estado = 'viva') then
    return jsonb_build_object('ok', false, 'error', 'desafio_en_curso') || tpp.estado_json(p_uid);
  end if;
  if exists (select 1 from tpp.plantas where usuario_id = p_uid and desafio = p_id and desafio_semana = semana) then
    return jsonb_build_object('ok', false, 'error', 'desafio_jugado') || tpp.estado_json(p_uid);
  end if;
  insert into tpp.plantas (usuario_id, variedad, hueco, desafio, desafio_limite, desafio_semana)
    values (p_uid, 'clasica', 4, p_id, now() + make_interval(days => (d ->> 'dias')::int), semana);
  update tpp.perfiles set hueco_activo = 4 where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

create function public.tpp_desafios() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mis_desafios(auth.uid());
end;
$$;

create function public.tpp_empezar_desafio(p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.empezar_desafio(auth.uid(), p_id);
end;
$$;

revoke all on function tpp.desafios() from public, anon, authenticated;
revoke all on function tpp.mis_desafios(uuid) from public, anon, authenticated;
revoke all on function tpp.empezar_desafio(uuid, text) from public, anon, authenticated;
revoke all on function public.tpp_desafios() from public, anon;
revoke all on function public.tpp_empezar_desafio(text) from public, anon;
grant execute on function public.tpp_desafios() to authenticated;
grant execute on function public.tpp_empezar_desafio(text) to authenticated;
