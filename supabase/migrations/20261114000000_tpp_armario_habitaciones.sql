-- Mejoras del armario (5 ramas x 3 niveles) y habitaciones.
-- Huecos de cultivo = macetas de la mejor habitación que tienes + mejora de Capacidad (máximo 8). Ya no se compran huecos sueltos;
-- quien tenía 3 los conserva. La habitación activa da su bono a todas las plantas (sótano −10 % plagas, invernadero +15 %
-- de crecimiento, azotea +20 % de rendimiento; la azotea sigue bloqueada hasta que exista el prestigio).
-- Las mejoras y la habitación no valen en los desafíos. El hueco del desafío pasa del 4 al 9.
-- Para deshacer: borrar las columnas mejoras, habitaciones y habitacion de tpp.perfiles, las funciones nuevas (mejoras,
-- habitaciones, huecos_total, comprar_mejora, comprar_habitacion, elegir_habitacion y sus tpp_*) y volver a aplicar las
-- versiones anteriores (migraciones 20261106 y 20261113). El hueco del desafío se volvería al 4 a mano.

alter table tpp.perfiles
  add column mejoras jsonb not null default '{}'::jsonb,
  add column habitaciones jsonb not null default '["armario"]'::jsonb,
  add column habitacion text not null default 'armario';
alter table tpp.plantas drop constraint plantas_hueco_check;
alter table tpp.plantas add constraint plantas_hueco_check check (hueco between 1 and 9);
alter table tpp.perfiles drop constraint perfiles_hueco_activo_check;
alter table tpp.perfiles add constraint perfiles_hueco_activo_check check (hueco_activo between 1 and 9);
update tpp.plantas set hueco = 9 where hueco = 4;
update tpp.perfiles set hueco_activo = 9 where hueco_activo = 4;

-- Precio y nivel de cada mejora (por rama y nivel). Los textos viven en la web.
create function tpp.mejoras() returns jsonb
language sql immutable set search_path = '' as $$
  select '{
    "vent": [{"precio":500,"nivel":5},{"precio":1500,"nivel":12},{"precio":4000,"nivel":20}],
    "riego": [{"precio":600,"nivel":6},{"precio":2000,"nivel":15},{"precio":5000,"nivel":25}],
    "sens": [{"precio":800,"nivel":8},{"precio":2800,"nivel":24},{"precio":6000,"nivel":30}],
    "luz": [{"precio":700,"nivel":7},{"precio":2200,"nivel":14},{"precio":7000,"nivel":28}],
    "cap": [{"precio":1000,"nivel":10},{"precio":3500,"nivel":18},{"precio":8000,"nivel":32}]
  }'::jsonb;
$$;

create function tpp.habitaciones() returns jsonb
language sql immutable set search_path = '' as $$
  select '{
    "armario": {"slots":2,"precio":0,"nivel":1,"bloqueada":false},
    "sotano": {"slots":4,"precio":5000,"nivel":15,"bloqueada":false},
    "invernadero": {"slots":6,"precio":15000,"nivel":25,"bloqueada":false},
    "azotea": {"slots":8,"precio":40000,"nivel":35,"bloqueada":true}
  }'::jsonb;
$$;

create function tpp.huecos_total(perfil tpp.perfiles) returns integer
language plpgsql stable set search_path = '' as $$
declare
  mx integer := 2;
  h text;
begin
  for h in select jsonb_array_elements_text(perfil.habitaciones) loop
    mx := greatest(mx, coalesce((tpp.habitaciones() -> h ->> 'slots')::int, 0));
  end loop;
  return least(8, greatest(perfil.huecos::int, mx + coalesce((perfil.mejoras ->> 'cap')::int, 0)));
end;
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
  mj jsonb;
  hab text;
  f_moho double precision := 1;
  regen double precision := 1;
  lv_riego integer := 0;
begin
  select * into p from tpp.plantas where id = p_id for update;
  if p.id is null or p.estado <> 'viva' then
    return p;
  end if;

  select e.equipo, e.mejoras, e.habitacion into equipo, mj, hab from tpp.perfiles e where e.id = p.usuario_id;
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

  -- Mejoras del armario y habitación (no valen en los desafíos).
  if p.desafio is null then
    lv_riego := coalesce((mj ->> 'riego')::int, 0);
    if lv_riego >= 1 then f_agua := f_agua * 0.9; end if;
    f_moho := case coalesce((mj ->> 'vent')::int, 0) when 1 then 0.95 when 2 then 0.9 when 3 then 0.8 else 1 end;
    if coalesce((mj ->> 'vent')::int, 0) = 3 then regen := 1.05; end if;
    vel := 1 + case coalesce((mj ->> 'luz')::int, 0) when 1 then 0.05 when 2 then 0.1 when 3 then 0.2 else 0 end;
    if coalesce((mj ->> 'luz')::int, 0) >= 2 then calor_luz := calor_luz - 1; end if;
    if hab = 'sotano' then f_plaga := f_plaga * 0.9; end if;
    if hab = 'invernadero' then vel := vel * 1.15; end if;
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
    if lv_riego = 2 and p.agua < 30 then p.agua := least(100, p.agua + 50);
    elsif lv_riego = 3 and p.agua < 40 then p.agua := 80;
    end if;

    if p.agua < 15 or p.nutrientes < 10 or p.luz < 10 then
      p.salud := p.salud - 2 * dt;
    elsif p.agua > 95 then
      p.salud := p.salud - 1 * dt;
    elsif p.agua >= 40 and p.nutrientes >= 30 and p.luz >= 30 and p.plaga is null then
      p.salud := least(100, p.salud + 0.5 * regen * dt);
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
        if p.agua > 85 and random() < 0.05 * f_plaga * f_moho * dt / 0.5 then
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
      * coalesce((tpp.variedades() -> p.variedad ->> 'recompensa')::double precision, 1)
      * (select (case when coalesce((mejoras ->> 'luz')::int, 0) = 3 then 1.05 else 1 end)
               * (case when habitacion = 'azotea' then 1.2 else 1 end) from tpp.perfiles where id = p_uid))::int;
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
  if tpp.hueco_activo(p_uid) = 9 then
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
  select id into pid from tpp.plantas where usuario_id = p_uid and hueco = 9 and estado = 'viva';
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
      'casa', jsonb_build_object('habitacion', perfil.habitacion, 'habitaciones', perfil.habitaciones, 'mejoras', perfil.mejoras),
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
  for i in 1..tpp.huecos_total(perfil) loop
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
    'desafio', (select desafio from tpp.plantas where usuario_id = perfil.id and hueco = 9 and estado = 'viva' limit 1),
    'desbloqueados', tpp.huecos_total(perfil),
    'maximo', 8,
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
  if p_hueco is null or p_hueco < 1 or p_hueco > tpp.huecos_total(perfil) then
    return jsonb_build_object('ok', false, 'error', 'hueco_bloqueado') || tpp.estado_json(p_uid);
  end if;
  update tpp.perfiles set hueco_activo = p_hueco where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;
create or replace function tpp.mis_desafios(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  semana date := date_trunc('week', now() at time zone 'Europe/Madrid')::date;
  lista jsonb := '{}'::jsonb;
  k text;
  pid uuid;
begin
  perform tpp.asegurar_perfil(p_uid);
  select id into pid from tpp.plantas where usuario_id = p_uid and hueco = 9 and estado = 'viva';
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
create or replace function tpp.empezar_desafio(p_uid uuid, p_id text) returns jsonb
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
  if exists (select 1 from tpp.plantas where usuario_id = p_uid and hueco = 9 and estado = 'viva') then
    return jsonb_build_object('ok', false, 'error', 'desafio_en_curso') || tpp.estado_json(p_uid);
  end if;
  if exists (select 1 from tpp.plantas where usuario_id = p_uid and desafio = p_id and desafio_semana = semana) then
    return jsonb_build_object('ok', false, 'error', 'desafio_jugado') || tpp.estado_json(p_uid);
  end if;
  insert into tpp.plantas (usuario_id, variedad, hueco, desafio, desafio_limite, desafio_semana)
    values (p_uid, 'clasica', 9, p_id, now() + make_interval(days => (d ->> 'dias')::int), semana);
  update tpp.perfiles set hueco_activo = 9 where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

-- Antes se compraban huecos sueltos; ahora salen de las habitaciones y de la mejora de Capacidad.
create or replace function tpp.comprar_hueco(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  return jsonb_build_object('ok', false, 'error', 'huecos_automaticos') || tpp.estado_json(p_uid);
end;
$$;

-- Compra la siguiente mejora de una rama ('vent', 'riego', 'sens', 'luz' o 'cap').
create function tpp.comprar_mejora(p_uid uuid, p_rama text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  m jsonb;
  actual integer;
  paso jsonb;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  select * into perfil from tpp.perfiles where id = p_uid for update;
  m := tpp.mejoras() -> p_rama;
  if m is null then
    return jsonb_build_object('ok', false, 'error', 'mejora_desconocida') || tpp.estado_json(p_uid);
  end if;
  actual := coalesce((perfil.mejoras ->> p_rama)::int, 0);
  if actual >= 3 then
    return jsonb_build_object('ok', false, 'error', 'mejora_comprada') || tpp.estado_json(p_uid);
  end if;
  paso := m -> actual;
  if tpp.nivel_de(perfil.xp) < (paso ->> 'nivel')::int then
    return jsonb_build_object('ok', false, 'error', 'nivel_insuficiente') || tpp.estado_json(p_uid);
  end if;
  if perfil.monedas < (paso ->> 'precio')::int then
    return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.estado_json(p_uid);
  end if;
  update tpp.perfiles set monedas = monedas - (paso ->> 'precio')::int,
    mejoras = mejoras || jsonb_build_object(p_rama, actual + 1) where id = p_uid;
  perform tpp.contar(p_uid, 'gastado', (paso ->> 'precio')::int);
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

create function tpp.comprar_habitacion(p_uid uuid, p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  h jsonb;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  select * into perfil from tpp.perfiles where id = p_uid for update;
  h := tpp.habitaciones() -> p_id;
  if h is null then
    return jsonb_build_object('ok', false, 'error', 'habitacion_desconocida') || tpp.estado_json(p_uid);
  end if;
  if perfil.habitaciones ? p_id then
    return jsonb_build_object('ok', false, 'error', 'habitacion_comprada') || tpp.estado_json(p_uid);
  end if;
  if (h ->> 'bloqueada')::boolean then
    return jsonb_build_object('ok', false, 'error', 'habitacion_bloqueada') || tpp.estado_json(p_uid);
  end if;
  if tpp.nivel_de(perfil.xp) < (h ->> 'nivel')::int then
    return jsonb_build_object('ok', false, 'error', 'nivel_insuficiente') || tpp.estado_json(p_uid);
  end if;
  if perfil.monedas < (h ->> 'precio')::int then
    return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.estado_json(p_uid);
  end if;
  update tpp.perfiles set monedas = monedas - (h ->> 'precio')::int,
    habitaciones = habitaciones || to_jsonb(p_id), habitacion = p_id where id = p_uid;
  perform tpp.contar(p_uid, 'gastado', (h ->> 'precio')::int);
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

create function tpp.elegir_habitacion(p_uid uuid, p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  if not (perfil.habitaciones ? p_id) then
    return jsonb_build_object('ok', false, 'error', 'habitacion_bloqueada') || tpp.estado_json(p_uid);
  end if;
  update tpp.perfiles set habitacion = p_id where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

create function public.tpp_comprar_mejora(p_rama text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.comprar_mejora(auth.uid(), p_rama);
end;
$$;

create function public.tpp_comprar_habitacion(p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.comprar_habitacion(auth.uid(), p_id);
end;
$$;

create function public.tpp_elegir_habitacion(p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.elegir_habitacion(auth.uid(), p_id);
end;
$$;

revoke all on function tpp.mejoras() from public, anon, authenticated;
revoke all on function tpp.habitaciones() from public, anon, authenticated;
revoke all on function tpp.huecos_total(tpp.perfiles) from public, anon, authenticated;
revoke all on function tpp.comprar_mejora(uuid, text) from public, anon, authenticated;
revoke all on function tpp.comprar_habitacion(uuid, text) from public, anon, authenticated;
revoke all on function tpp.elegir_habitacion(uuid, text) from public, anon, authenticated;
revoke all on function public.tpp_comprar_mejora(text) from public, anon;
revoke all on function public.tpp_comprar_habitacion(text) from public, anon;
revoke all on function public.tpp_elegir_habitacion(text) from public, anon;
grant execute on function public.tpp_comprar_mejora(text) to authenticated;
grant execute on function public.tpp_comprar_habitacion(text) to authenticated;
grant execute on function public.tpp_elegir_habitacion(text) to authenticated;
