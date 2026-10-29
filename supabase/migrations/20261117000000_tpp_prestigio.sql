-- Prestigio (Renacer): desde el nivel 20 se puede reiniciar a cambio de puntos permanentes que se gastan en 6 bonificaciones.
-- Puntos = nivel × 0,36 + variedades descubiertas × 0,57 + cosechas legendarias × 0,67 (cada parte redondeada).
-- Se conserva: colección, títulos y marcos, maestría, bonos de prestigio, logros, estadísticas, racha y perfil.
-- Se pierde: monedas, nivel y XP, mejoras del armario, habitaciones, plantas vivas, objetos, semillas híbridas y cruces en marcha
-- (las cosechas viejas ya no valen para cruzar). Los desafíos jugados se mantienen.
-- Bonos: mon (+5 % monedas), xp (+10 % XP al cosechar), cru (cruces 20 % más rápidos), sot (empiezas con el Sótano),
-- inf (riego automático permanente) y key (llave de la azotea).
-- Para deshacer: borrar las funciones public.tpp_prestigio, tpp_comprar_bono_prestigio y tpp_renacer, tpp.prestigio_datos,
-- tpp.comprar_bono_prestigio, tpp.renacer y tpp.bonos_prestigio, las columnas prestigio, puntos_prestigio y prestigio_bonos de
-- tpp.perfiles, y volver a aplicar las versiones anteriores de sincronizar, accion, iniciar_cruce, comprar_habitacion, estado_json y progresion.

alter table tpp.perfiles
  add column prestigio integer not null default 0,
  add column puntos_prestigio integer not null default 0,
  add column prestigio_bonos jsonb not null default '{}'::jsonb;

create function tpp.bonos_prestigio() returns jsonb
language sql immutable set search_path = '' as $$
  select '{
    "mon": {"coste":2,  "requiere":null},
    "xp":  {"coste":2,  "requiere":null},
    "cru": {"coste":4,  "requiere":"mon"},
    "sot": {"coste":6,  "requiere":"xp"},
    "inf": {"coste":10, "requiere":"cru"},
    "key": {"coste":12, "requiere":"sot"}
  }'::jsonb;
$$;

do $mig$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('tpp.sincronizar(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'  dv jsonb;\nbegin', E'  dv jsonb;\n  pbo jsonb;\nbegin');
  d := replace(d, 'select e.equipo, e.mejoras, e.habitacion into equipo, mj, hab', 'select e.equipo, e.mejoras, e.habitacion, e.prestigio_bonos into equipo, mj, hab, pbo');
  d := replace(d, E'    lv_riego := coalesce((mj ->> ''riego'')::int, 0);', E'    lv_riego := coalesce((mj ->> ''riego'')::int, 0);\n    if pbo ? ''inf'' then lv_riego := 3; end if;');
  if d = o or position('pbo ? ''inf''' in d) = 0 or position('e.prestigio_bonos' in d) = 0 or position('pbo jsonb' in d) = 0 then raise exception 'sincronizar no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, E'* (case when habitacion = ''azotea'' then 1.2 else 1 end) from tpp.perfiles',
    E'* (case when habitacion = ''azotea'' then 1.2 else 1 end)\n               * (case when prestigio_bonos ? ''mon'' then 1.05 else 1 end) from tpp.perfiles');
  d := replace(d, E'xp_cosecha := round((100 + 10 * bono_xp) * case when lv_ma >= 2 then 1.05 else 1 end',
    E'xp_cosecha := round((100 + 10 * bono_xp) * case when lv_ma >= 2 then 1.05 else 1 end\n      * (case when exists (select 1 from tpp.perfiles where id = p_uid and prestigio_bonos ? ''xp'') then 1.1 else 1 end)');
  if d = o or position('prestigio_bonos ? ''mon''' in d) = 0 or position('prestigio_bonos ? ''xp''' in d) = 0 then raise exception 'accion no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.iniciar_cruce(uuid,uuid,uuid)'::regprocedure);
  o := d;
  d := replace(d, E'then factor := 0.9; end if;', E'then factor := 0.9; end if;\n  if exists (select 1 from tpp.perfiles where id = p_uid and prestigio_bonos ? ''cru'') then factor := factor * 0.8; end if;');
  if d = o then raise exception 'iniciar_cruce no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.comprar_habitacion(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, E'if (h ->> ''bloqueada'')::boolean then', E'if (h ->> ''bloqueada'')::boolean and not (perfil.prestigio_bonos ? ''key'') then');
  if d = o then raise exception 'comprar_habitacion no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.estado_json(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'      ''hibridas'', tpp.hibridas_json(perfil),', E'      ''hibridas'', tpp.hibridas_json(perfil),\n      ''prestigio'', jsonb_build_object(''n'', perfil.prestigio, ''bonos'', perfil.prestigio_bonos),');
  if d = o then raise exception 'estado_json no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.progresion(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'''dorado'', false, ''otono'', false, ''escarcha'', false, ''prestigio'', false', E'''dorado'', false, ''otono'', false, ''escarcha'', false, ''prestigio'', perfil.prestigio >= 3');
  if d = o then raise exception 'progresion no cambia'; end if;
  execute d;
end
$mig$;

-- Datos de la pantalla: puntos que se ganarían al renacer, puntos disponibles y bonos comprados.
create function tpp.prestigio_datos(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  niv integer;
  var_n integer;
  leg_n integer;
  p_niv integer;
  p_var integer;
  p_leg integer;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  niv := tpp.nivel_de(perfil.xp);
  var_n := (select count(*)::int from jsonb_object_keys(coalesce(perfil.estadisticas -> 'variedades', '{}'::jsonb)));
  leg_n := (select count(*)::int from tpp.plantas where usuario_id = p_uid and estado = 'cosechada' and desafio is null
              and tpp.datos_variedad(p_uid, variedad) ->> 'rareza' = 'legendaria');
  p_niv := round(niv * 0.36)::int;
  p_var := round(var_n * 0.57)::int;
  p_leg := round(leg_n * 0.67)::int;
  return jsonb_build_object(
    'prestigio', perfil.prestigio,
    'puntos', perfil.puntos_prestigio,
    'bonos', perfil.prestigio_bonos,
    'nivel', niv,
    'nivel_minimo', 20,
    'ganar', jsonb_build_object('nivel', p_niv, 'variedades', p_var, 'legendarias', p_leg, 'total', p_niv + p_var + p_leg,
                                'n_variedades', var_n, 'n_legendarias', leg_n),
    'pierde', jsonb_build_object(
      'monedas', perfil.monedas,
      'mejoras', (select count(*)::int from jsonb_each(perfil.mejoras) m, generate_series(1, (m.value #>> '{}')::int)),
      'habitaciones', jsonb_array_length(perfil.habitaciones) - 1,
      'plantas', (select count(*)::int from tpp.plantas where usuario_id = p_uid and estado = 'viva')
                 + (select coalesce(sum(cantidad), 0)::int from tpp.inventario where usuario_id = p_uid)
                 + jsonb_array_length(perfil.semillas_hibridas)
    ),
    'conserva', jsonb_build_object(
      'variedades', var_n,
      'maestrias', (select count(*)::int from jsonb_object_keys(perfil.maestria)),
      'bonos', (select count(*)::int from jsonb_object_keys(perfil.prestigio_bonos))
    )
  );
end;
$$;

create function tpp.comprar_bono_prestigio(p_uid uuid, p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  b jsonb;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  select * into perfil from tpp.perfiles where id = p_uid for update;
  b := tpp.bonos_prestigio() -> p_id;
  if b is null then
    return jsonb_build_object('ok', false, 'error', 'bono_desconocido') || tpp.prestigio_datos(p_uid);
  end if;
  if perfil.prestigio_bonos ? p_id then
    return jsonb_build_object('ok', false, 'error', 'bono_comprado') || tpp.prestigio_datos(p_uid);
  end if;
  if (b ->> 'requiere') is not null and not (perfil.prestigio_bonos ? (b ->> 'requiere')) then
    return jsonb_build_object('ok', false, 'error', 'bono_bloqueado') || tpp.prestigio_datos(p_uid);
  end if;
  if perfil.puntos_prestigio < (b ->> 'coste')::int then
    return jsonb_build_object('ok', false, 'error', 'puntos_insuficientes') || tpp.prestigio_datos(p_uid);
  end if;
  update tpp.perfiles set puntos_prestigio = puntos_prestigio - (b ->> 'coste')::int,
    prestigio_bonos = prestigio_bonos || jsonb_build_object(p_id, true) where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.prestigio_datos(p_uid);
end;
$$;

-- Renacer: hay que escribir RENACER y tener el nivel 20. Reinicia el progreso y da los puntos.
create function tpp.renacer(p_uid uuid, p_confirmar text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  datos jsonb;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  select * into perfil from tpp.perfiles where id = p_uid for update;
  if upper(btrim(coalesce(p_confirmar, ''))) <> 'RENACER' then
    return jsonb_build_object('ok', false, 'error', 'confirmacion') || tpp.prestigio_datos(p_uid);
  end if;
  datos := tpp.prestigio_datos(p_uid);
  if (datos ->> 'nivel')::int < 20 then
    return jsonb_build_object('ok', false, 'error', 'nivel_insuficiente') || datos;
  end if;

  delete from tpp.plantas where usuario_id = p_uid and estado = 'viva';
  update tpp.plantas set cruzada = true where usuario_id = p_uid and estado = 'cosechada';
  update tpp.cruces set estado = 'guardado' where usuario_id = p_uid and estado in ('en_curso', 'abierto');
  delete from tpp.inventario where usuario_id = p_uid;

  update tpp.perfiles set
    monedas = 100,
    xp = 0,
    equipo = '{"maceta":"maceta_plastico","luz":"bombilla","decoracion":[]}'::jsonb,
    mejoras = '{}'::jsonb,
    habitaciones = case when prestigio_bonos ? 'sot' then '["armario","sotano"]'::jsonb else '["armario"]'::jsonb end,
    habitacion = case when prestigio_bonos ? 'sot' then 'sotano' else 'armario' end,
    huecos = 1,
    hueco_activo = 1,
    semillas_hibridas = '[]'::jsonb,
    prestigio = prestigio + 1,
    puntos_prestigio = puntos_prestigio + (datos -> 'ganar' ->> 'total')::int
    where id = p_uid;
  insert into tpp.plantas (usuario_id) values (p_uid);
  return jsonb_build_object('ok', true) || tpp.prestigio_datos(p_uid);
end;
$$;

create function public.tpp_prestigio() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.prestigio_datos(auth.uid());
end;
$$;

create function public.tpp_comprar_bono_prestigio(p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.comprar_bono_prestigio(auth.uid(), p_id);
end;
$$;

create function public.tpp_renacer(p_confirmar text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.renacer(auth.uid(), p_confirmar);
end;
$$;

revoke all on function tpp.bonos_prestigio() from public, anon, authenticated;
revoke all on function tpp.prestigio_datos(uuid) from public, anon, authenticated;
revoke all on function tpp.comprar_bono_prestigio(uuid, text) from public, anon, authenticated;
revoke all on function tpp.renacer(uuid, text) from public, anon, authenticated;
revoke all on function public.tpp_prestigio() from public, anon;
revoke all on function public.tpp_comprar_bono_prestigio(text) from public, anon;
revoke all on function public.tpp_renacer(text) from public, anon;
grant execute on function public.tpp_prestigio() to authenticated;
grant execute on function public.tpp_comprar_bono_prestigio(text) to authenticated;
grant execute on function public.tpp_renacer(text) to authenticated;
