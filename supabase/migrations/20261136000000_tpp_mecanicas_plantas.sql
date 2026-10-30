-- Tu Propia Planta: mecánicas de plantas.
--  · Ciclo de 3 días (antes 1 hora) y consumo a ritmo real (antes x180).
--  · Tipos de semilla (fotoperiódica, autofloreciente, feminizada, autofloreciente feminizada) y planta macho.
--  · Ciclo de luz real: horario de luz del jugador (horas encendida y hora de encendido).
--  · Causa del daño de la planta, para avisar de qué ha pasado.
-- Para deshacerlo: restaurar las funciones anteriores (migraciones previas), dividir horas_vividas entre 72,
--   y borrar las columnas añadidas (plantas.tipo, sexo, causa; perfiles.luz_horas, luz_inicio) y tpp.luz_horario / public.tpp_luz_horario.

alter table tpp.plantas
  add column tipo text not null default 'foto' check (tipo in ('foto', 'auto', 'fem', 'autofem')),
  add column sexo text not null default 'hembra' check (sexo in ('hembra', 'macho')),
  add column causa text;

alter table tpp.perfiles
  add column luz_horas smallint not null default 18 check (luz_horas between 8 and 24),
  add column luz_inicio smallint not null default 6 check (luz_inicio between 0 and 23);

-- Las plantas existentes pasan de la escala de 1 hora a la de 72 horas, para conservar su fase.
update tpp.plantas set horas_vividas = horas_vividas * 72;

-- Fase (1 a 8) según las horas vividas: empieza a las 2,4, 8,4, 20,4, 32,4, 48, 60 y 72 horas.
create or replace function tpp.fase_de(horas double precision) returns integer
language sql immutable set search_path = '' as $$
  select 1
    + (horas >= 2.4)::int + (horas >= 8.4)::int + (horas >= 20.4)::int + (horas >= 32.4)::int
    + (horas >= 48)::int + (horas >= 60)::int + (horas >= 72)::int;
$$;

-- Las autoflorecientes completan el ciclo en el 65 % del tiempo.
create or replace function tpp.fase_planta(p tpp.plantas) returns integer
language sql stable set search_path = '' as $$
  select tpp.fase_de(p.horas_vividas / (coalesce((tpp.datos_variedad(p.usuario_id, p.variedad) ->> 'ciclo')::double precision, 1)
    * case when p.tipo in ('auto', 'autofem') then 0.65 else 1 end));
$$;

create or replace function pg_temp.parche(d text, viejo text, nuevo text) returns text
language plpgsql as $$
begin
  if position(viejo in d) = 0 then raise exception 'No se encuentra: %', left(viejo, 80); end if;
  return replace(d, viejo, nuevo);
end;
$$;

-- Sincronización: consumo real, horario de luz, fotoperiodo, causa del daño y plagas más espaciadas.
do $m$
declare d text := pg_get_functiondef('tpp.sincronizar(uuid)'::regprocedure);
begin
  d := pg_temp.parche(d, 'esc double precision := 180;',
    E'esc double precision := 1;\n  lh integer := 18;\n  li integer := 6;\n  roto boolean;\n  cz text;\n  cz_fin text;\n  fm double precision;\n  encendida boolean;');
  d := pg_temp.parche(d, 'select e.equipo, e.mejoras, e.habitacion, e.prestigio_bonos into equipo, mj, hab, pbo from tpp.perfiles e where e.id = p.usuario_id;',
    'select e.equipo, e.mejoras, e.habitacion, e.prestigio_bonos, e.luz_horas, e.luz_inicio into equipo, mj, hab, pbo, lh, li from tpp.perfiles e where e.id = p.usuario_id;');
  d := pg_temp.parche(d, E'    vel := 3;\n    case p.desafio', E'    vel := 3;\n    esc := 3;\n    case p.desafio');
  d := pg_temp.parche(d, '/ 3600.0, 2);', '/ 3600.0, 72);');
  d := pg_temp.parche(d, 'dt := least(1.0 / 360, restante);', 'dt := least(0.25, restante);');
  d := pg_temp.parche(d, 'salud_antes := p.salud;',
    E'salud_antes := p.salud;\n    cz := null;\n    roto := false;\n    fase := tpp.fase_planta(p);\n    fm := case when fase <= 2 then 0.4 when fase between 6 and 7 then 1.3 else 1 end;');
  d := pg_temp.parche(d, 'if p.ph < 5.8 or p.ph > 7.4 then crec := crec * 0.85; end if;',
    E'if p.ph < 5.8 or p.ph > 7.4 then crec := crec * 0.85; end if;\n'
    '    encendida := mod((hora - li + 24)::numeric, 24::numeric) < lh;\n'
    '    if p.desafio is null and p.tipo in (''foto'', ''fem'') then\n'
    '      if fase >= 6 then\n'
    '        if lh between 11 and 13 then crec := crec * 1.1; else crec := crec * 0.5; roto := true; end if;\n'
    '      elsif fase >= 3 then\n'
    '        if lh >= 16 then crec := crec * 1.1; elsif lh < 12 then crec := crec * 0.8; end if;\n'
    '      end if;\n'
    '    end if;');
  d := pg_temp.parche(d, 'p.agua := greatest(0, p.agua - 1.5 * esc * f_agua * dt);', 'p.agua := greatest(0, p.agua - 1.5 * esc * f_agua * fm * dt);');
  d := pg_temp.parche(d, 'p.nutrientes := greatest(0, p.nutrientes - 0.8 * esc * f_nutr * dt);', 'p.nutrientes := greatest(0, p.nutrientes - 0.8 * esc * f_nutr * fm * dt);');
  d := pg_temp.parche(d, 'p.luz := greatest(0, p.luz - 0.5 * esc * f_luz * dt);',
    'p.luz := least(100, greatest(0, p.luz - 0.5 * esc * f_luz * dt) + case when encendida then 2.5 * esc * dt else 0 end);');
  d := pg_temp.parche(d, E'      p.salud := p.salud - 2 * esc * dt;\n    elsif p.agua > 95 then\n      p.salud := p.salud - 1 * esc * dt;',
    E'      p.salud := p.salud - 2 * esc * dt;\n      cz := case when p.agua < 15 then ''sed'' when p.nutrientes < 10 then ''hambre'' else ''oscuridad'' end;\n'
    '    elsif p.agua > 95 then\n      p.salud := p.salud - 1 * esc * dt;\n      cz := ''ahogo'';');
  d := pg_temp.parche(d, E'    p.horas_vividas := p.horas_vividas + dt * crec * vel;',
    E'    if p.nutrientes > 90 then p.salud := p.salud - 1 * esc * dt; cz := coalesce(cz, ''quemada''); end if;\n'
    '    if roto then p.salud := p.salud - 0.4 * esc * dt; cz := coalesce(cz, ''ciclo_luz''); end if;\n\n'
    '    p.horas_vividas := p.horas_vividas + dt * crec * vel;');
  d := pg_temp.parche(d, E'interval ''2 minutes'' then 2.5 else 1 end * esc * dt;', E'interval ''6 hours'' then 2.5 else 1 end * esc * dt;\n      cz := ''plaga'';');
  d := pg_temp.parche(d, 'random() < 0.05 * f_plaga * f_moho * dt * 293 / 0.5', 'random() < 0.02 * f_plaga * f_moho * dt * esc / 0.5');
  d := pg_temp.parche(d, 'then 0.0015 else 0.015 end) * f_plaga * dt * 293 / 0.5', 'then 0.0015 else 0.015 end) * f_plaga * dt * esc * 3 / 0.5');
  d := pg_temp.parche(d, 'if fuera and salud_antes >= 25 and p.salud < 25 then p.salud := 25; end if;',
    E'if fuera and salud_antes >= 25 and p.salud < 25 then p.salud := 25; end if;\n    cz_fin := cz;');
  d := pg_temp.parche(d, 'plaga = p.plaga, plaga_desde = p.plaga_desde', 'plaga = p.plaga, plaga_desde = p.plaga_desde, causa = cz_fin');
  execute d;
end;
$m$;

-- Acciones: abonar da +20; ajustar luz pasa a ser el horario de luz; el macho se puede arrancar desde la prefloración.
do $m$
declare d text := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure);
begin
  d := pg_temp.parche(d, E'(''regar'', ''abonar'', ''podar'', ''ajustar_luz'', ''cosechar'')', E'(''regar'', ''abonar'', ''podar'', ''cosechar'')');
  d := pg_temp.parche(d, 'if tpp.fase_planta(p) < 8 then', E'if tpp.fase_planta(p) < 8 - (p.sexo = ''macho'')::int * 2 then');
  d := pg_temp.parche(d, 'recompensa := round((60 + p.salud) * (1 + p.bonus_cosecha)',
    E'recompensa := round((60 + p.salud) * (1 + p.bonus_cosecha) * (case when p.tipo in (''auto'', ''autofem'') then 0.8 else 1 end) * (case when p.sexo = ''macho'' then 0.2 else 1 end)');
  d := pg_temp.parche(d, '* p.salud / 100)::int)', '* p.salud / 100 * (case when p.sexo = ''macho'' then 0.2 else 1 end))::int)');
  d := pg_temp.parche(d, 'least(100, nutrientes + 30)', 'least(100, nutrientes + 20)');
  execute d;
end;
$m$;

-- Estado del juego: tipo, sexo (visible desde la prefloración), causa del daño, horario de luz y plaga grave a las 6 horas.
do $m$
declare d text := pg_get_functiondef('tpp.estado_json(uuid)'::regprocedure);
begin
  d := pg_temp.parche(d, E'      ''variedad'', p.variedad,\n      ''vida'', p.estado,',
    E'      ''variedad'', p.variedad,\n      ''tipo'', p.tipo,\n      ''sexo'', case when tpp.fase_planta(p) >= 6 then p.sexo else null end,\n      ''causa'', p.causa,\n      ''vida'', p.estado,');
  d := pg_temp.parche(d, E'interval ''2 minutes''', E'interval ''6 hours''');
  d := pg_temp.parche(d, E'''ajustes'', perfil.ajustes,', E'''ajustes'', perfil.ajustes,\n      ''luz_horas'', perfil.luz_horas,\n      ''luz_inicio'', perfil.luz_inicio,');
  execute d;
end;
$m$;

-- Plantar con tipo de semilla. Las normales y autoflorecientes pueden salir macho (50 %); las feminizadas, no.
drop function public.tpp_plantar(text);
drop function tpp.plantar(uuid, text);

create function tpp.plantar(p_uid uuid, p_variedad text, p_tipo text default 'foto') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  v jsonb;
  coste integer;
  sx text := 'hembra';
begin
  perfil := tpp.asegurar_perfil(p_uid);
  v := tpp.datos_variedad(p_uid, p_variedad);
  if v is null then
    return jsonb_build_object('ok', false, 'error', 'variedad_desconocida') || tpp.estado_json(p_uid);
  end if;
  if p_tipo not in ('foto', 'auto', 'fem', 'autofem') then
    return jsonb_build_object('ok', false, 'error', 'tipo_desconocido') || tpp.estado_json(p_uid);
  end if;
  if tpp.nivel_de(perfil.xp) < (v ->> 'nivel')::int then
    return jsonb_build_object('ok', false, 'error', 'variedad_bloqueada') || tpp.estado_json(p_uid);
  end if;
  if coalesce((v ->> 'hibrida')::boolean, false) and not (perfil.semillas_hibridas ? p_variedad) then
    return jsonb_build_object('ok', false, 'error', 'sin_semilla') || tpp.estado_json(p_uid);
  end if;
  if tpp.hueco_activo(p_uid) = 9 then
    return jsonb_build_object('ok', false, 'error', 'hueco_desafio') || tpp.estado_json(p_uid);
  end if;
  if exists (select 1 from tpp.plantas where usuario_id = p_uid and estado = 'viva' and hueco = tpp.hueco_activo(p_uid)) then
    return jsonb_build_object('ok', false, 'error', 'ya_hay_planta') || tpp.estado_json(p_uid);
  end if;
  coste := case p_tipo when 'auto' then 60 when 'fem' then 150 when 'autofem' then 250 else 0 end;
  if perfil.monedas < coste then
    return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.estado_json(p_uid);
  end if;
  if p_tipo in ('foto', 'auto') and random() < 0.5 then sx := 'macho'; end if;
  insert into tpp.plantas (usuario_id, variedad, hueco, tipo, sexo)
    values (p_uid, p_variedad, tpp.hueco_activo(p_uid), p_tipo, sx);
  update tpp.perfiles set monedas = monedas - coste,
    estadisticas = jsonb_set(estadisticas, '{variedades}',
      coalesce(estadisticas -> 'variedades', '{}'::jsonb) || jsonb_build_object(p_variedad, true)) where id = p_uid;
  perform tpp.temporada_sumar(p_uid, 'plantar');
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

create function public.tpp_plantar(p_variedad text default 'clasica', p_tipo text default 'foto') returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.plantar(auth.uid(), p_variedad, p_tipo);
end;
$$;

-- Horario de luz: horas encendida al día (8 a 24) y hora de encendido (0 a 23).
create function tpp.luz_horario(p_uid uuid, p_horas integer, p_inicio integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform tpp.asegurar_perfil(p_uid);
  if p_horas is null or p_horas not between 8 and 24 or p_inicio is null or p_inicio not between 0 and 23 then
    return jsonb_build_object('ok', false, 'error', 'horario_invalido') || tpp.estado_json(p_uid);
  end if;
  update tpp.perfiles set luz_horas = p_horas, luz_inicio = p_inicio where id = p_uid;
  perform tpp.mision_sumar(p_uid, 'luz');
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

create function public.tpp_luz_horario(p_horas integer, p_inicio integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.luz_horario(auth.uid(), p_horas, p_inicio);
end;
$$;

revoke all on function tpp.plantar(uuid, text, text) from public, anon, authenticated;
revoke all on function tpp.luz_horario(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.tpp_plantar(text, text) from public, anon;
revoke all on function public.tpp_luz_horario(integer, integer) from public, anon;
grant execute on function public.tpp_plantar(text, text) to authenticated;
grant execute on function public.tpp_luz_horario(integer, integer) to authenticated;
