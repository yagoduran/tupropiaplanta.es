-- 5b Armario de cultivo: equipo (luces, extractor, ventilador, puertas), clima y mejoras nuevas.
-- Deshacer: restaurar las funciones tpp.sincronizar, tpp.mejoras, tpp.comprar_mejora, tpp.accion, tpp.catalogo y tpp.renacer
-- desde las migraciones anteriores, quitar tpp.armario_* / public.tpp_armario* y la columna perfiles.armario.

alter table tpp.perfiles add column armario jsonb not null
  default '{"tengo":["barra_led"],"puertas":"abiertas","luz":true,"ext":true,"vent":false}'::jsonb;

-- Luz equipada: antiguas -> las 4 nuevas (barra_led, panel_led, quantum, hps). Mejoras: vent -> ext, luz -> aisl.
update tpp.perfiles set
  equipo = jsonb_set(equipo, '{luz}', to_jsonb(case coalesce(equipo ->> 'luz', '')
    when 'led' then 'panel_led' when 'barra_led' then 'panel_led' when 'panel_cuadrado' then 'panel_led' when 'led_pro' then 'panel_led'
    when 'espectro_completo' then 'quantum' when 'led_cuantico' then 'quantum'
    when 'sodio' then 'hps'
    else 'barra_led' end::text)),
  mejoras = (mejoras - 'vent' - 'luz')
    || case when coalesce((mejoras ->> 'luz')::int, 0) > 0 then jsonb_build_object('aisl', (mejoras ->> 'luz')::int) else '{}'::jsonb end
    || case when coalesce((mejoras ->> 'vent')::int, 0) > 0 then jsonb_build_object('ext', least(2, (mejoras ->> 'vent')::int)) else '{}'::jsonb end;

update tpp.perfiles set armario = jsonb_set(armario, '{tengo}',
  (select jsonb_agg(distinct x) from unnest(array['barra_led', equipo ->> 'luz']) x));

alter table tpp.perfiles alter column equipo set default '{"luz": "barra_led", "maceta": "maceta_plastico", "decoracion": []}'::jsonb;

do $mig$
declare
  o text; d text;
begin
  -- Catálogo: las luces ya no se venden en la tienda (se compran en el Armario).
  o := pg_get_functiondef('tpp.catalogo()'::regprocedure);
  d := regexp_replace(o, '(\$function\$\s*)select (.*?)(;\s*\$function\$\s*)$',
    E'\\1select coalesce(jsonb_agg(c), ''[]''::jsonb) from jsonb_array_elements(\\2) c where c ->> ''tipo'' <> ''luz''\\3', 's');
  if d = o then raise exception 'catalogo sin cambios'; end if;
  execute d;

  -- Mejoras: vent -> ext (2 niveles), luz -> aisl, cap con precios nuevos.
  o := pg_get_functiondef('tpp.mejoras()'::regprocedure);
  d := replace(o, '"vent": [{"precio":500,"nivel":5},{"precio":1500,"nivel":12},{"precio":4000,"nivel":20}]',
    '"ext": [{"precio":3000,"nivel":10},{"precio":8000,"nivel":22}]');
  d := replace(d, '"luz": [{"precio":700,"nivel":7},{"precio":2200,"nivel":14},{"precio":7000,"nivel":28}]',
    '"aisl": [{"precio":1500,"nivel":6},{"precio":4000,"nivel":16},{"precio":9000,"nivel":26}]');
  d := replace(d, '"cap": [{"precio":1000,"nivel":10},{"precio":3500,"nivel":18},{"precio":8000,"nivel":32}]',
    '"cap": [{"precio":2000,"nivel":10},{"precio":5000,"nivel":18},{"precio":12000,"nivel":32}]');
  if d = o or d !~ '"ext"' or d !~ '"aisl"' or d !~ '"precio":12000' then raise exception 'mejoras sin cambios'; end if;
  execute d;

  -- Comprar mejora: nivel máximo según la rama (el extractor tiene 2).
  o := pg_get_functiondef('tpp.comprar_mejora(uuid,text)'::regprocedure);
  d := replace(o, 'if actual >= 3 then', 'if actual >= jsonb_array_length(m) then');
  if d = o then raise exception 'comprar_mejora sin cambios'; end if;
  execute d;

  -- Acción: el bono de cosecha del nivel 3 de luz pasa al aislamiento nivel 3.
  o := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure);
  d := replace(o, '(mejoras ->> ''luz'')', '(mejoras ->> ''aisl'')');
  if d = o then raise exception 'accion sin cambios'; end if;
  execute d;

  -- Renacer (prestigio): luz inicial y armario por defecto.
  o := pg_get_functiondef('tpp.renacer(uuid,text)'::regprocedure);
  d := replace(o, '"luz":"bombilla"', '"luz":"barra_led"');
  d := replace(d, E'    mejoras = ''{}''::jsonb,\n',
    E'    mejoras = ''{}''::jsonb,\n    armario = ''{"tengo":["barra_led"],"puertas":"abiertas","luz":true,"ext":true,"vent":false}''::jsonb,\n');
  if d = o or d !~ 'armario = ' then raise exception 'renacer sin cambios'; end if;
  execute d;

  -- Simulación.
  o := pg_get_functiondef('tpp.sincronizar(uuid)'::regprocedure);
  d := o;
  d := replace(d, E'  efe jsonb;\nbegin\n',
    E'  efe jsonb;\n  v_arm jsonb;\n  v_luz_on boolean := true;\n  v_ext_on boolean := true;\n  v_vent_on boolean := false;\n  v_cerr boolean := false;\n'
    '  v_ext integer := 0;\n  v_aisl integer := 0;\n  v_hum double precision;\n  v_np integer;\n  amp double precision := 4;\nbegin\n');
  d := replace(d, 'e.luz_horas, e.luz_inicio into equipo, mj, hab, pbo, lh, li from',
    'e.luz_horas, e.luz_inicio, e.armario into equipo, mj, hab, pbo, lh, li, v_arm from');
  d := replace(d, E'  hab := coalesce(tpp.habitacion_de(p.hueco), hab);\n',
    E'  hab := coalesce(tpp.habitacion_de(p.hueco), hab);\n'
    '  v_ext := coalesce((mj ->> ''ext'')::int, 0);\n  v_aisl := coalesce((mj ->> ''aisl'')::int, 0);\n'
    '  if hab = ''armario'' then\n'
    '    v_luz_on := coalesce((v_arm ->> ''luz'')::boolean, true);\n'
    '    v_ext_on := coalesce((v_arm ->> ''ext'')::boolean, true);\n'
    '    v_vent_on := coalesce((v_arm ->> ''vent'')::boolean, false);\n'
    '    v_cerr := coalesce(v_arm ->> ''puertas'', ''abiertas'') = ''cerradas'';\n'
    '    amp := case v_aisl when 0 then 3 when 1 then 2 when 2 then 1 else 0 end;\n'
    '  end if;\n');
  -- Luces: consumo de luz y calor por tipo.
  d := regexp_replace(d,
    E'  case coalesce\\(equipo ->> ''luz'', ''''\\)\n.*?  end case;\n  calor_luz := case coalesce\\(equipo ->> ''luz'', ''''\\)\n.*?else 0 end;\n',
    E'  case coalesce(equipo ->> ''luz'', '''')\n    when ''panel_led'' then f_luz := 0.8;\n    when ''quantum'' then f_luz := 0.7;\n    when ''hps'' then f_luz := 0.8;\n    else null;\n  end case;\n'
    '  calor_luz := case coalesce(equipo ->> ''luz'', '''') when ''panel_led'' then 2 when ''quantum'' then 4 when ''hps'' then 11 else 0 end;\n', 's');
  -- Mejoras: extractor (moho) y aislamiento (crecimiento) + bono de la luz.
  d := replace(d,
    E'    f_moho := case coalesce((mj ->> ''vent'')::int, 0) when 1 then 0.95 when 2 then 0.9 when 3 then 0.8 else 1 end;\n'
    '    if coalesce((mj ->> ''vent'')::int, 0) = 3 then regen := 1.05; end if;\n'
    '    vel := 1 + case coalesce((mj ->> ''luz'')::int, 0) when 1 then 0.05 when 2 then 0.1 when 3 then 0.2 else 0 end;\n'
    '    if coalesce((mj ->> ''luz'')::int, 0) >= 2 then calor_luz := calor_luz - 1; end if;\n'
    '    vel := vel * case coalesce(equipo ->> ''luz'', '''') when ''espectro_completo'' then 1.2 when ''led_cuantico'' then 1.35 else 1 end;\n',
    E'    f_moho := case v_ext when 1 then 0.9 when 2 then 0.8 else 1 end;\n'
    '    if v_ext >= 2 then regen := 1.05; end if;\n'
    '    vel := 1 + case when hab = ''armario'' then 0.03 * v_aisl else case v_aisl when 1 then 0.05 when 2 then 0.1 when 3 then 0.2 else 0 end end;\n'
    '    if v_aisl >= 2 and hab <> ''armario'' then calor_luz := calor_luz - 1; end if;\n'
    '    vel := vel * case coalesce(equipo ->> ''luz'', '''') when ''panel_led'' then 1.08 when ''quantum'' then 1.18 when ''hps'' then 1.22 else 1 end;\n');
  -- Clima del Armario.
  d := replace(d,
    E'    if hab = ''armario'' then f_nutr := f_nutr * (1 - 0.05 * coalesce((mj ->> ''h_armario'')::int, 0)); end if;\n',
    E'    if hab = ''armario'' then f_nutr := f_nutr * (1 - 0.05 * coalesce((mj ->> ''h_armario'')::int, 0)); end if;\n'
    '    if hab = ''armario'' then\n'
    '      select count(*) into v_np from tpp.plantas q where q.usuario_id = p.usuario_id and q.estado = ''viva'' and tpp.habitacion_de(q.hueco) = ''armario'';\n'
    '      v_hum := 44 + 4 * v_np - case when v_ext_on then (case when v_ext >= 2 then 18 else 10 end) else 0 end'
    ' - case when v_vent_on then 4 else 0 end + case when v_luz_on then 0 else 6 end + case when v_cerr then 4 else 0 end;\n'
    '      calor_luz := calor_luz - 1 - case when v_ext_on then (case when v_ext >= 2 then 4 else 2 end) else 0 end'
    ' - case when v_vent_on then 1 else 0 end + case when v_cerr then 1 else 0 end;\n'
    '      if v_hum >= 70 then f_moho := f_moho * 1.5; f_salud := f_salud * 1.1; end if;\n'
    '      if v_vent_on then f_salud := f_salud * 0.95; end if;\n'
    '      if coalesce(equipo ->> ''luz'', '''') = ''hps'' and lh <= 13 then vel := vel * 1.06; end if;\n'
    '    end if;\n');
  d := replace(d, '4 * sin(2 * pi()', 'amp * sin(2 * pi()');
  d := replace(d, '::numeric) < lh;', '::numeric) < lh and v_luz_on;');
  if d = o or d !~ 'v_hum >= 70' or d !~ 'when ''quantum'' then f_luz' or d !~ 'v_ext >= 2 then regen'
     or d !~ 'amp \* sin' or d !~ 'lh and v_luz_on' or d !~ 'e.armario into' or d ~ '''espectro_completo''' then
    raise exception 'sincronizar sin cambios o incompleto';
  end if;
  execute d;
end $mig$;

-- Estado del armario (equipo y clima coherentes con la simulación).
create or replace function tpp.armario_estado(p_uid uuid) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare
  pf tpp.perfiles;
  a jsonb;
  v_luz text;
  v_ext int; v_aisl int; v_cap int;
  v_cerr boolean; v_luz_on boolean; v_ext_on boolean; v_vent_on boolean;
  v_np int; v_flor int; v_raw int; v_lamps int; v_w int; v_heat int; v_bonus int;
  v_temp int; v_hum int; v_olor int; v_ext_t int; v_crec int; v_salud int;
  v_calor boolean; v_humedo boolean; v_hps boolean;
  luces jsonb;
begin
  pf := tpp.asegurar_perfil(p_uid);
  select * into pf from tpp.perfiles where id = p_uid;
  a := pf.armario;
  v_luz := coalesce(pf.equipo ->> 'luz', 'barra_led');
  v_ext := coalesce((pf.mejoras ->> 'ext')::int, 0);
  v_aisl := coalesce((pf.mejoras ->> 'aisl')::int, 0);
  v_cap := 3 + coalesce((pf.mejoras ->> 'cap')::int, 0);
  v_cerr := coalesce(a ->> 'puertas', 'abiertas') = 'cerradas';
  v_luz_on := coalesce((a ->> 'luz')::boolean, true);
  v_ext_on := coalesce((a ->> 'ext')::boolean, true);
  v_vent_on := coalesce((a ->> 'vent')::boolean, false);
  v_lamps := case when v_cap <= 3 then 1 else 2 end;
  select count(*), count(*) filter (where tpp.fase_planta(q) >= 6) into v_np, v_flor
    from tpp.plantas q where q.usuario_id = p_uid and q.estado = 'viva' and tpp.habitacion_de(q.hueco) = 'armario';
  v_w := (case v_luz when 'panel_led' then 100 when 'quantum' then 240 when 'hps' then 400 else 30 end) * v_lamps;
  v_heat := case v_luz when 'panel_led' then 3 when 'quantum' then 5 when 'hps' then 12 else 1 end;
  v_bonus := case v_luz when 'panel_led' then 8 when 'quantum' then 18 when 'hps' then 22 else 0 end;
  v_hps := v_luz = 'hps';
  v_ext_t := case when v_ext_on then (case when v_ext >= 2 then 4 else 2 end) else 0 end;
  v_temp := 21 + v_heat - v_ext_t - case when v_vent_on then 1 else 0 end + case when v_cerr then 1 else 0 end;
  v_hum := 44 + 4 * v_np - case when v_ext_on then (case when v_ext >= 2 then 18 else 10 end) else 0 end
    - case when v_vent_on then 4 else 0 end + case when v_luz_on then 0 else 6 end + case when v_cerr then 4 else 0 end;
  v_raw := v_flor + case when pf.luz_horas <= 13 then 2 else 0 end;
  v_olor := case when v_raw = 0 then 0 when v_raw <= 2 then 1 when v_raw <= 4 then 2 else 3 end
    - case when v_ext_on and v_ext >= 1 then 2 else 0 end - case when v_aisl >= 2 then 1 else 0 end - case when v_cerr then 1 else 0 end;
  v_olor := greatest(0, least(3, v_olor));
  v_calor := v_temp >= 30;
  v_humedo := v_hum >= 70;
  v_crec := v_bonus + v_aisl * 3 + case when v_hps and v_flor > 0 then 6 else 0 end - case when v_calor then 15 else 0 end;
  v_salud := case when v_vent_on then 5 else 0 end - case when v_humedo then 10 else 0 end;
  select jsonb_agg(jsonb_build_object('id', l.id, 'precio', l.precio, 'w', l.w, 'bonus', l.bonus, 'calor', l.calor,
      'tengo', coalesce(a -> 'tengo', '[]'::jsonb) ? l.id, 'puesta', l.id = v_luz) order by l.ord)
    into luces
    from (values ('barra_led', 0, 30, 0, 1, 1), ('panel_led', 1200, 100, 8, 3, 2), ('quantum', 4800, 240, 18, 5, 3), ('hps', 6500, 400, 22, 12, 4))
      as l(id, precio, w, bonus, calor, ord);
  return jsonb_build_object(
    'luz', v_luz, 'luces', luces, 'lamparas', v_lamps, 'cap', v_cap,
    'puertas', case when v_cerr then 'cerradas' else 'abiertas' end,
    'luz_on', v_luz_on, 'ext_on', v_ext_on, 'vent_on', v_vent_on,
    'ciclo', case when pf.luz_horas <= 13 then '12/12' else '18/6' end,
    'mejoras', jsonb_build_object('cap', coalesce((pf.mejoras ->> 'cap')::int, 0), 'aisl', v_aisl, 'ext', v_ext),
    'plantas', v_np, 'flor', v_flor,
    'clima', jsonb_build_object('temp', v_temp, 'hum', v_hum, 'olor', v_olor, 'w', v_w + case when v_ext_on then (case when v_ext >= 2 then 60 else 25 end) else 0 end + case when v_vent_on then 15 else 0 end,
      'crec', v_crec, 'salud', v_salud, 'calor', v_calor, 'frio', v_temp < 18, 'humedo', v_humedo),
    'monedas', pf.monedas);
end;
$f$;

-- Acciones del armario.
create or replace function tpp.armario_accion(p_uid uuid, p_accion text, p_valor text) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare
  pf tpp.perfiles;
  a jsonb;
  v_on boolean := p_valor in ('1', 'true', 'on', 'si');
  v_precio int;
begin
  pf := tpp.asegurar_perfil(p_uid);
  select * into pf from tpp.perfiles where id = p_uid for update;
  a := pf.armario;
  case p_accion
    when 'puertas' then
      if p_valor not in ('abiertas', 'cerradas') then
        return jsonb_build_object('ok', false, 'error', 'accion_desconocida') || tpp.estado_json(p_uid);
      end if;
      update tpp.perfiles set armario = jsonb_set(armario, '{puertas}', to_jsonb(p_valor)) where id = p_uid;
    when 'luz' then
      update tpp.perfiles set armario = jsonb_set(armario, '{luz}', to_jsonb(v_on)) where id = p_uid;
    when 'extractor' then
      update tpp.perfiles set armario = jsonb_set(armario, '{ext}', to_jsonb(v_on)) where id = p_uid;
    when 'ventilador' then
      update tpp.perfiles set armario = jsonb_set(armario, '{vent}', to_jsonb(v_on)) where id = p_uid;
    when 'ciclo' then
      if p_valor not in ('18/6', '12/12') then
        return jsonb_build_object('ok', false, 'error', 'accion_desconocida') || tpp.estado_json(p_uid);
      end if;
      update tpp.perfiles set luz_horas = case p_valor when '12/12' then 12 else 18 end where id = p_uid;
    when 'luz_equipar' then
      if not (coalesce(a -> 'tengo', '[]'::jsonb) ? p_valor) then
        return jsonb_build_object('ok', false, 'error', 'luz_no_tienes') || tpp.estado_json(p_uid);
      end if;
      update tpp.perfiles set equipo = jsonb_set(equipo, '{luz}', to_jsonb(p_valor)) where id = p_uid;
    when 'luz_comprar' then
      v_precio := case p_valor when 'panel_led' then 1200 when 'quantum' then 4800 when 'hps' then 6500 else null end;
      if v_precio is null then
        return jsonb_build_object('ok', false, 'error', 'accion_desconocida') || tpp.estado_json(p_uid);
      end if;
      if coalesce(a -> 'tengo', '[]'::jsonb) ? p_valor then
        return jsonb_build_object('ok', false, 'error', 'ya_la_tienes') || tpp.estado_json(p_uid);
      end if;
      if pf.monedas < v_precio then
        return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.estado_json(p_uid);
      end if;
      update tpp.perfiles set monedas = monedas - v_precio,
        armario = jsonb_set(armario, '{tengo}', coalesce(armario -> 'tengo', '[]'::jsonb) || to_jsonb(p_valor)),
        equipo = jsonb_set(equipo, '{luz}', to_jsonb(p_valor)) where id = p_uid;
      perform tpp.contar(p_uid, 'gastado', v_precio);
    else
      return jsonb_build_object('ok', false, 'error', 'accion_desconocida') || tpp.estado_json(p_uid);
  end case;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$f$;

create or replace function public.tpp_armario() returns jsonb language plpgsql security definer set search_path = '' as
$f$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.armario_estado(auth.uid());
end;
$f$;
create or replace function public.tpp_armario_accion(p_accion text, p_valor text) returns jsonb language plpgsql security definer set search_path = '' as
$f$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.armario_accion(auth.uid(), p_accion, p_valor);
end;
$f$;

revoke all on function tpp.armario_estado(uuid), tpp.armario_accion(uuid, text, text) from public, anon, authenticated;
revoke all on function public.tpp_armario(), public.tpp_armario_accion(text, text) from public, anon;
grant execute on function public.tpp_armario(), public.tpp_armario_accion(text, text) to authenticated;
