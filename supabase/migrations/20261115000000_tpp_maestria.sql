-- Maestría de variedad: cada cosecha da XP de maestría a su variedad (100 + salud). Niveles 1 a 10; medallas de bronce, plata y oro
-- en los niveles 3, 6 y 10. Bonos: 1 +2 % monedas · 2 +5 % XP · 4 −5 % de agua gastada · 5 −5 % de plagas · 7 +5 % monedas.
-- (Los bonos de los niveles 8, 9 y 10 llegan con los cruces.) No vale en los desafíos.
-- Para deshacer: quitar la columna maestria de tpp.perfiles, las funciones rareza_de, maestria_nivel, mi_maestria y tpp_mi_maestria,
-- y volver a aplicar las versiones anteriores de sincronizar y accion (migración 20261114).

alter table tpp.perfiles add column maestria jsonb not null default '{}'::jsonb;

create function tpp.rareza_de(p_variedad text) returns text
language sql immutable set search_path = '' as $$
  select case p_variedad
    when 'clasica' then 'comun' when 'hoja-azul' then 'poco_comun' when 'dorada' then 'rara'
    when 'noche' then 'epica' when 'cristal' then 'legendaria' else 'comun' end;
$$;

-- Nivel de maestría de un jugador en una variedad (XP necesaria = 60 × (nivel − 1)² × factor de rareza).
create function tpp.maestria_nivel(p_uid uuid, p_variedad text) returns integer
language sql stable security definer set search_path = '' as $$
  select least(10, 1 + floor(sqrt(
    coalesce((select (maestria ->> p_variedad)::int from tpp.perfiles where id = p_uid), 0)
    / (60.0 * case tpp.rareza_de(p_variedad)
        when 'poco_comun' then 1.2 when 'rara' then 1.5 when 'epica' then 2 when 'legendaria' then 2.5 else 1 end)
  )))::int;
$$;

create function tpp.mi_maestria(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  return jsonb_build_object(
    'xp', perfil.maestria,
    'descubiertas', (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(coalesce(perfil.estadisticas -> 'variedades', '{}'::jsonb)) k)
  );
end;
$$;

create function public.tpp_mi_maestria() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mi_maestria(auth.uid());
end;
$$;

revoke all on function tpp.rareza_de(text) from public, anon, authenticated;
revoke all on function tpp.maestria_nivel(uuid, text) from public, anon, authenticated;
revoke all on function tpp.mi_maestria(uuid) from public, anon, authenticated;
revoke all on function public.tpp_mi_maestria() from public, anon;
grant execute on function public.tpp_mi_maestria() to authenticated;

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
  lv_ma integer := 0;
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
    lv_ma := tpp.maestria_nivel(p.usuario_id, p.variedad);
    if lv_ma >= 4 then f_agua := f_agua * 0.95; end if;
    if lv_ma >= 5 then f_plaga := f_plaga * 0.95; end if;
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
  lv_ma integer := 0;
  xp_cosecha integer;
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
    lv_ma := tpp.maestria_nivel(p_uid, p.variedad);
    recompensa := round((400 + p.salud * 6) * (1 + p.bonus_cosecha)
      * coalesce((tpp.variedades() -> p.variedad ->> 'recompensa')::double precision, 1)
      * (1 + case when lv_ma >= 1 then 0.02 else 0 end + case when lv_ma >= 7 then 0.05 else 0 end)
      * (select (case when coalesce((mejoras ->> 'luz')::int, 0) = 3 then 1.05 else 1 end)
               * (case when habitacion = 'azotea' then 1.2 else 1 end) from tpp.perfiles where id = p_uid))::int;
    update tpp.plantas set estado = 'cosechada' where id = p.id;
    xp_cosecha := round((100 + 10 * bono_xp) * case when lv_ma >= 2 then 1.05 else 1 end)::int;
    update tpp.perfiles set monedas = monedas + recompensa, xp = xp + xp_cosecha,
      maestria = maestria || jsonb_build_object(p.variedad, coalesce((maestria ->> p.variedad)::int, 0) + 100 + round(p.salud)::int)
      where id = p_uid;
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
