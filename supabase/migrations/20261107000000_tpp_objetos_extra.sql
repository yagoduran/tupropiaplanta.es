-- Fase 8: objetos de la tienda con efecto: medidor de pH, termómetro, radio y gato.
-- pH y temperatura ahora se mueven (pH con riegos y abonos, temperatura con la hora y la luz) y afectan al crecimiento.
-- Los medidores solo enseñan el valor en pantalla; el efecto lo sufren todas las plantas.
-- Para deshacer: volver a aplicar las versiones anteriores de catalogo, sincronizar, accion y estado_json.

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
    {"id":"medidor_ph","tipo":"herramienta","precio":400,"nivel":3},
    {"id":"termometro","tipo":"herramienta","precio":350,"nivel":3},
    {"id":"poster","tipo":"decoracion","precio":150,"nivel":1},
    {"id":"planta_adorno","tipo":"decoracion","precio":260,"nivel":1},
    {"id":"radio","tipo":"decoracion","precio":600,"nivel":1},
    {"id":"gato","tipo":"decoracion","precio":1500,"nivel":10}
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
  calor_luz double precision := 0;
  f_plaga double precision := 1;
  crec double precision;
  grados double precision;
  hora double precision;
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

  f_var := coalesce((tpp.variedades() -> p.variedad ->> 'desgaste')::double precision, 1);
  f_agua := f_agua * f_var;
  f_nutr := f_nutr * f_var;
  f_luz := f_luz * f_var;

  restante := least(extract(epoch from (ahora - p.sincronizada_en)) / 3600.0, 720);
  while restante > 0 loop
    dt := least(0.5, restante);
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

    p.horas_vividas := p.horas_vividas + dt * crec;
    restante := restante - dt;
    t := ahora - make_interval(secs => restante * 3600);

    -- Plagas y hongos: aparecen desde la fase 3, más a menudo si se cuida mal. Sin tratar, quitan salud (el doble si pasan 6 horas).
    if p.plaga is not null then
      p.salud := p.salud - case when t - p.plaga_desde > interval '6 hours' then 2.5 else 1 end * dt;
    else
      fase := tpp.fase_planta(p);
      if fase >= 3 and (p.inmune_hasta is null or t >= p.inmune_hasta) then
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

  if p_accion = 'cosechar' then
    if tpp.fase_planta(p) < 8 then
      return jsonb_build_object('ok', false, 'error', 'fase_insuficiente') || tpp.estado_json(p_uid);
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
      'anuncios', tpp.anuncios_json(perfil),
      'huecos', tpp.huecos_json(perfil),
      'nivel', nivel,
      'xp_pct', round(100 * (perfil.xp - 25 * (nivel - 1) ^ 2) / (25 * nivel ^ 2 - 25 * (nivel - 1) ^ 2))
    ),
    'planta', planta
  );
end;
$$;
