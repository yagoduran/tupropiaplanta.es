-- Laboratorio de cruces. Se cruzan dos plantas cosechadas (cada cosecha vale para un solo cruce) y tras 4 h 30 min sale una semilla:
-- 5 recetas fijas dan variedades de la colección y cualquier otra mezcla da un híbrido propio que el jugador nombra.
-- Las variedades tienen 4 rasgos (rendimiento, resistencia, velocidad y sabor) que salen de sus datos; el sabor da algo de XP
-- al cosechar y la resistencia baja un poco la probabilidad de plagas. La maestría de nivel 8 acorta el cruce un 10 % y la de nivel 9
-- da +10 % de sabor. Ámbar Antiguo llega con el nivel 10 de maestría de Dorada del Sur y Aurora con el hito del 75 % de la colección.
-- Para deshacer: borrar las funciones public.tpp_cruces, tpp_iniciar_cruce, tpp_acelerar_cruce, tpp_abrir_cruce y tpp_guardar_cruce,
-- tpp.cruce_datos, iniciar_cruce, acelerar_cruce, abrir_cruce, guardar_cruce, hibridas_json y datos_variedad, las tablas
-- tpp.cruces y tpp.hibridos, la secuencia tpp.hibrido_n, las columnas semillas_hibridas (perfiles) y cruzada (plantas), y volver a
-- aplicar las versiones anteriores de variedades, fase_planta, maestria_nivel, sincronizar, accion, plantar, estado_json y reclamar_hito.

alter table tpp.perfiles add column semillas_hibridas jsonb not null default '[]'::jsonb;
alter table tpp.plantas add column cruzada boolean not null default false;

create sequence tpp.hibrido_n start 1;

create table tpp.hibridos (
  id text primary key,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  nombre text not null,
  padre_a text not null,
  padre_b text not null,
  rareza text not null,
  hoja text not null,
  recompensa double precision not null,
  ciclo double precision not null,
  desgaste double precision not null,
  sabor double precision not null,
  creado_en timestamptz not null default now()
);
alter table tpp.hibridos enable row level security;

create table tpp.cruces (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  planta_a uuid not null,
  planta_b uuid not null,
  variedad_a text not null,
  variedad_b text not null,
  creado_en timestamptz not null default now(),
  termina_en timestamptz not null,
  estado text not null default 'en_curso' check (estado in ('en_curso', 'abierto', 'guardado')),
  resultado jsonb
);
alter table tpp.cruces enable row level security;
create unique index cruces_uno_activo on tpp.cruces (usuario_id) where estado in ('en_curso', 'abierto');

-- Variedades fijas: las 5 de siempre y las 7 de la colección que salen de cruces o de premios.
create or replace function tpp.variedades() returns jsonb
language sql immutable set search_path = '' as $$
  select '{
    "clasica":   {"nivel":1,  "recompensa":1.0, "ciclo":1.0,  "desgaste":1.0, "sabor":50, "rareza":"comun",      "hoja":"clasica"},
    "hoja-azul": {"nivel":3,  "recompensa":1.3, "ciclo":1.0,  "desgaste":1.0, "sabor":66, "rareza":"poco_comun", "hoja":"hoja-azul"},
    "dorada":    {"nivel":6,  "recompensa":1.7, "ciclo":1.15, "desgaste":1.0, "sabor":80, "rareza":"rara",       "hoja":"dorada"},
    "noche":     {"nivel":10, "recompensa":2.2, "ciclo":1.3,  "desgaste":1.2, "sabor":92, "rareza":"epica",      "hoja":"noche"},
    "cristal":   {"nivel":15, "recompensa":3.0, "ciclo":1.5,  "desgaste":1.3, "sabor":95, "rareza":"legendaria", "hoja":"cristal"},
    "verde-azulado":  {"nivel":1, "hibrida":true, "recompensa":1.15, "ciclo":0.95, "desgaste":0.95, "sabor":62, "rareza":"poco_comun", "hoja":"hoja-azul"},
    "brisa-dorada":   {"nivel":1, "hibrida":true, "recompensa":1.5,  "ciclo":1.05, "desgaste":1.0,  "sabor":76, "rareza":"rara",       "hoja":"dorada"},
    "menta-nocturna": {"nivel":1, "hibrida":true, "recompensa":1.6,  "ciclo":1.15, "desgaste":1.1,  "sabor":84, "rareza":"epica",      "hoja":"noche"},
    "sol-medianoche": {"nivel":1, "hibrida":true, "recompensa":2.4,  "ciclo":1.3,  "desgaste":1.15, "sabor":90, "rareza":"epica",      "hoja":"noche"},
    "escarcha-azul":  {"nivel":1, "hibrida":true, "recompensa":2.6,  "ciclo":1.35, "desgaste":1.15, "sabor":92, "rareza":"legendaria", "hoja":"cristal"},
    "ambar-antiguo":  {"nivel":1, "hibrida":true, "recompensa":2.0,  "ciclo":1.2,  "desgaste":1.0,  "sabor":88, "rareza":"rara",       "hoja":"dorada"},
    "aurora":         {"nivel":1, "hibrida":true, "recompensa":3.4,  "ciclo":1.55, "desgaste":1.2,  "sabor":98, "rareza":"legendaria", "hoja":"cristal"}
  }'::jsonb;
$$;

-- Datos de una variedad para un jugador: las fijas o sus híbridos propios.
create function tpp.datos_variedad(p_uid uuid, p_id text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(tpp.variedades() -> p_id,
    (select jsonb_build_object('nivel', 1, 'hibrida', true, 'recompensa', recompensa, 'ciclo', ciclo, 'desgaste', desgaste,
                               'sabor', sabor, 'rareza', rareza, 'hoja', hoja)
       from tpp.hibridos where id = p_id and usuario_id = p_uid));
$$;

create or replace function tpp.fase_planta(p tpp.plantas) returns integer
language sql stable set search_path = '' as $$
  select tpp.fase_de(p.horas_vividas / coalesce((tpp.datos_variedad(p.usuario_id, p.variedad) ->> 'ciclo')::double precision, 1));
$$;

create or replace function tpp.maestria_nivel(p_uid uuid, p_variedad text) returns integer
language sql stable security definer set search_path = '' as $$
  select least(10, 1 + floor(sqrt(
    coalesce((select (maestria ->> p_variedad)::int from tpp.perfiles where id = p_uid), 0)
    / (60.0 * case coalesce(tpp.datos_variedad(p_uid, p_variedad) ->> 'rareza', 'comun')
        when 'poco_comun' then 1.2 when 'rara' then 1.5 when 'epica' then 2 when 'legendaria' then 2.5 else 1 end)
  )))::int;
$$;

-- Híbridos propios y semillas híbridas que tiene el jugador.
create function tpp.hibridas_json(perfil tpp.perfiles) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'semillas', perfil.semillas_hibridas,
    'propias', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'nombre', nombre, 'rareza', rareza, 'hoja', hoja,
                  'recompensa', recompensa, 'ciclo', ciclo, 'desgaste', desgaste, 'sabor', sabor) order by creado_en), '[]'::jsonb)
                from tpp.hibridos where usuario_id = perfil.id)
  );
$$;

-- Plantar una híbrida exige tener su semilla; el estado del jugador manda también sus híbridas; Aurora llega con el hito del 75 %.
do $mig$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('tpp.sincronizar(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'  lv_ma integer := 0;\nbegin', E'  lv_ma integer := 0;\n  dv jsonb;\nbegin');
  d := replace(d, E'  f_var := coalesce((tpp.variedades() -> p.variedad ->> ''desgaste'')::double precision, 1);',
    E'  dv := tpp.datos_variedad(p.usuario_id, p.variedad);\n  f_var := coalesce((dv ->> ''desgaste'')::double precision, 1);\n  if p.desafio is null then f_plaga := f_plaga * (1 - ((90 - (f_var - 1) * 100) - 80) / 400.0); end if;');
  if d = o or position('dv jsonb' in d) = 0 or position('f_plaga * (1 - ((90' in d) = 0 then raise exception 'sincronizar no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, E'      * coalesce((tpp.variedades() -> p.variedad ->> ''recompensa'')::double precision, 1)',
    E'      * coalesce((tpp.datos_variedad(p_uid, p.variedad) ->> ''recompensa'')::double precision, 1)');
  d := replace(d, E'    xp_cosecha := round((100 + 10 * bono_xp) * case when lv_ma >= 2 then 1.05 else 1 end)::int;',
    E'    xp_cosecha := round((100 + 10 * bono_xp) * case when lv_ma >= 2 then 1.05 else 1 end\n      * (1 + coalesce((tpp.datos_variedad(p_uid, p.variedad) ->> ''sabor'')::double precision, 50) * case when lv_ma >= 9 then 1.1 else 1 end / 1000))::int;');
  d := replace(d, E'    perform tpp.contar(p_uid, ''cosechas'', 1);\n    return jsonb_build_object(''ok'', true, ''recompensa'', recompensa) || tpp.estado_json(p_uid);\n  end if;\n\n  if p_accion = ''podar''',
    E'    perform tpp.contar(p_uid, ''cosechas'', 1);\n    if p.variedad = ''dorada'' and tpp.maestria_nivel(p_uid, ''dorada'') >= 10 then\n      update tpp.perfiles set semillas_hibridas = semillas_hibridas || ''"ambar-antiguo"''::jsonb\n        where id = p_uid and not (semillas_hibridas ? ''ambar-antiguo'');\n    end if;\n    return jsonb_build_object(''ok'', true, ''recompensa'', recompensa) || tpp.estado_json(p_uid);\n  end if;\n\n  if p_accion = ''podar''');
  if d = o or position('datos_variedad(p_uid, p.variedad) ->> ''sabor''' in d) = 0 or position('ambar-antiguo' in d) = 0 or position('->> ''recompensa'')::double precision, 1)' in d) = 0 then raise exception 'accion no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.plantar(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, E'  v := tpp.variedades() -> p_variedad;', E'  v := tpp.datos_variedad(p_uid, p_variedad);');
  d := replace(d, E'  if tpp.hueco_activo(p_uid) = 9 then',
    E'  if coalesce((v ->> ''hibrida'')::boolean, false) and not (perfil.semillas_hibridas ? p_variedad) then\n    return jsonb_build_object(''ok'', false, ''error'', ''sin_semilla'') || tpp.estado_json(p_uid);\n  end if;\n  if tpp.hueco_activo(p_uid) = 9 then');
  if d = o or position('sin_semilla' in d) = 0 or position('datos_variedad(p_uid, p_variedad)' in d) = 0 then raise exception 'plantar no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.estado_json(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'      ''nivel'', nivel,', E'      ''hibridas'', tpp.hibridas_json(perfil),\n      ''nivel'', nivel,');
  if d = o then raise exception 'estado_json no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.reclamar_hito(uuid,integer)'::regprocedure);
  o := d;
  d := replace(d, E'  return jsonb_build_object(''ok'', true) || tpp.estado_json(p_uid);\nend;',
    E'  if p_pct = 75 then\n    update tpp.perfiles set semillas_hibridas = semillas_hibridas || ''"aurora"''::jsonb\n      where id = p_uid and not (semillas_hibridas ? ''aurora'');\n  end if;\n  return jsonb_build_object(''ok'', true) || tpp.estado_json(p_uid);\nend;');
  if d = o then raise exception 'reclamar_hito no cambia'; end if;
  execute d;
end
$mig$;

-- Cosechas disponibles para cruzar y cruce en marcha.
create function tpp.cruce_datos(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform tpp.asegurar_perfil(p_uid);
  return jsonb_build_object(
    'cosechas', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'variedad', variedad, 'salud', round(salud::numeric),
                  'plantada', plantada_en) order by plantada_en desc), '[]'::jsonb)
                 from (select * from tpp.plantas where usuario_id = p_uid and estado = 'cosechada' and desafio is null
                         and not cruzada order by plantada_en desc limit 30) c),
    'cruce', (select jsonb_build_object('estado', estado, 'variedad_a', variedad_a, 'variedad_b', variedad_b,
                'restan', greatest(0, ceil(extract(epoch from (termina_en - now()))))::int, 'resultado', resultado)
              from tpp.cruces where usuario_id = p_uid and estado in ('en_curso', 'abierto'))
  );
end;
$$;

create function tpp.iniciar_cruce(p_uid uuid, p_a uuid, p_b uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  pa tpp.plantas;
  pb tpp.plantas;
  factor double precision := 1;
begin
  perform tpp.asegurar_perfil(p_uid);
  if exists (select 1 from tpp.cruces where usuario_id = p_uid and estado in ('en_curso', 'abierto')) then
    return jsonb_build_object('ok', false, 'error', 'cruce_en_curso') || tpp.cruce_datos(p_uid);
  end if;
  select * into pa from tpp.plantas where id = p_a and usuario_id = p_uid and estado = 'cosechada' and desafio is null and not cruzada;
  select * into pb from tpp.plantas where id = p_b and usuario_id = p_uid and estado = 'cosechada' and desafio is null and not cruzada;
  if p_a = p_b or pa.id is null or pb.id is null then
    return jsonb_build_object('ok', false, 'error', 'cosecha_invalida') || tpp.cruce_datos(p_uid);
  end if;
  if tpp.maestria_nivel(p_uid, pa.variedad) >= 8 or tpp.maestria_nivel(p_uid, pb.variedad) >= 8 then factor := 0.9; end if;
  update tpp.plantas set cruzada = true where id in (pa.id, pb.id);
  insert into tpp.cruces (usuario_id, planta_a, planta_b, variedad_a, variedad_b, termina_en)
    values (p_uid, pa.id, pb.id, pa.variedad, pb.variedad, now() + make_interval(mins => round(270 * factor)::int));
  return jsonb_build_object('ok', true) || tpp.cruce_datos(p_uid);
end;
$$;

create function tpp.acelerar_cruce(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  select * into perfil from tpp.perfiles where id = p_uid for update;
  if not exists (select 1 from tpp.cruces where usuario_id = p_uid and estado = 'en_curso' and termina_en > now()) then
    return jsonb_build_object('ok', false, 'error', 'sin_cruce') || tpp.cruce_datos(p_uid);
  end if;
  if perfil.monedas < 150 then
    return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.cruce_datos(p_uid);
  end if;
  update tpp.perfiles set monedas = monedas - 150 where id = p_uid;
  perform tpp.contar(p_uid, 'gastado', 150);
  update tpp.cruces set termina_en = now() where usuario_id = p_uid and estado = 'en_curso';
  return jsonb_build_object('ok', true) || tpp.cruce_datos(p_uid);
end;
$$;

-- Abre el capullo: decide el resultado (receta fija o híbrido propio).
create function tpp.abrir_cruce(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c tpp.cruces;
  va text;
  vb text;
  da jsonb;
  db jsonb;
  receta text;
  res jsonb;
  rarezas text[] := array['comun', 'poco_comun', 'rara', 'epica', 'legendaria'];
  hojas text[] := array['clasica', 'hoja-azul', 'dorada', 'noche', 'cristal'];
  base integer;
  tirada double precision;
  r integer;
  rec double precision;
  cic double precision;
  des double precision;
  sab double precision;
  nuevo_id text;
begin
  perform tpp.asegurar_perfil(p_uid);
  select * into c from tpp.cruces where usuario_id = p_uid and estado = 'en_curso' for update;
  if c.id is null then
    return jsonb_build_object('ok', false, 'error', 'sin_cruce') || tpp.cruce_datos(p_uid);
  end if;
  if c.termina_en > now() then
    return jsonb_build_object('ok', false, 'error', 'cruce_no_listo') || tpp.cruce_datos(p_uid);
  end if;
  va := c.variedad_a;
  vb := c.variedad_b;
  da := tpp.datos_variedad(p_uid, va);
  db := tpp.datos_variedad(p_uid, vb);

  receta := case
    when va in ('clasica', 'hoja-azul') and vb in ('clasica', 'hoja-azul') and va <> vb then 'verde-azulado'
    when va in ('hoja-azul', 'dorada') and vb in ('hoja-azul', 'dorada') and va <> vb then 'brisa-dorada'
    when va in ('clasica', 'noche') and vb in ('clasica', 'noche') and va <> vb then 'menta-nocturna'
    when va in ('dorada', 'noche') and vb in ('dorada', 'noche') and va <> vb then 'sol-medianoche'
    when va in ('cristal', 'hoja-azul') and vb in ('cristal', 'hoja-azul') and va <> vb then 'escarcha-azul'
  end;

  if receta is not null then
    res := jsonb_build_object('id', receta, 'fija', true, 'nombre', null, 'rareza', tpp.variedades() -> receta ->> 'rareza',
      'hoja', tpp.variedades() -> receta ->> 'hoja',
      'nuevo', not exists (select 1 from tpp.perfiles where id = p_uid and semillas_hibridas ? receta));
  else
    -- Rareza: la mejor de las dos, y a veces una o dos más (62 %, 30 % y 8 %).
    base := greatest(array_position(rarezas, da ->> 'rareza'), array_position(rarezas, db ->> 'rareza'));
    tirada := random();
    r := least(5, base + case when tirada < 0.62 then 0 when tirada < 0.92 then 1 else 2 end);
    rec := ((da ->> 'recompensa')::double precision + (db ->> 'recompensa')::double precision) / 2 * (0.97 + random() * 0.16);
    cic := ((da ->> 'ciclo')::double precision + (db ->> 'ciclo')::double precision) / 2 * (0.97 + random() * 0.08);
    des := ((da ->> 'desgaste')::double precision + (db ->> 'desgaste')::double precision) / 2;
    sab := least(100, ((da ->> 'sabor')::double precision + (db ->> 'sabor')::double precision) / 2 + (random() * 13 - 5));
    -- Mutación nueva (12 %): más rendimiento.
    if random() < 0.12 then rec := rec * 1.15; end if;
    nuevo_id := 'h' || nextval('tpp.hibrido_n');
    insert into tpp.hibridos (id, usuario_id, nombre, padre_a, padre_b, rareza, hoja, recompensa, ciclo, desgaste, sabor)
      values (nuevo_id, p_uid, 'Híbrido ' || substr(nuevo_id, 2), va, vb, rarezas[r], hojas[r],
              round(rec::numeric, 2), round(cic::numeric, 2), round(des::numeric, 2), round(sab::numeric, 0));
    res := jsonb_build_object('id', nuevo_id, 'fija', false, 'nombre', 'Híbrido ' || substr(nuevo_id, 2), 'rareza', rarezas[r],
      'hoja', hojas[r], 'nuevo', true, 'recompensa', round(rec::numeric, 2), 'ciclo', round(cic::numeric, 2),
      'desgaste', round(des::numeric, 2), 'sabor', round(sab::numeric, 0));
  end if;
  update tpp.cruces set estado = 'abierto', resultado = res where id = c.id;
  return jsonb_build_object('ok', true) || tpp.cruce_datos(p_uid);
end;
$$;

-- Guarda la semilla del cruce abierto. Si es un híbrido propio, se puede ponerle nombre (solo letras y espacios, hasta 20).
create function tpp.guardar_cruce(p_uid uuid, p_nombre text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c tpp.cruces;
  id_res text;
  v_nombre text := btrim(coalesce(p_nombre, ''));
begin
  perform tpp.asegurar_perfil(p_uid);
  select * into c from tpp.cruces where usuario_id = p_uid and estado = 'abierto' for update;
  if c.id is null then
    return jsonb_build_object('ok', false, 'error', 'sin_cruce') || tpp.cruce_datos(p_uid);
  end if;
  id_res := c.resultado ->> 'id';
  if not (c.resultado ->> 'fija')::boolean and v_nombre <> '' then
    if v_nombre !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]{1,20}$' then
      return jsonb_build_object('ok', false, 'error', 'nombre_invalido') || tpp.cruce_datos(p_uid);
    end if;
    update tpp.hibridos set nombre = v_nombre where id = id_res and usuario_id = p_uid;
  end if;
  update tpp.perfiles set
    semillas_hibridas = case when semillas_hibridas ? id_res then semillas_hibridas else semillas_hibridas || to_jsonb(id_res) end,
    estadisticas = jsonb_set(estadisticas, '{variedades}', coalesce(estadisticas -> 'variedades', '{}'::jsonb) || jsonb_build_object(id_res, true))
    where id = p_uid;
  update tpp.cruces set estado = 'guardado' where id = c.id;
  perform tpp.contar(p_uid, 'cruces', 1);
  return jsonb_build_object('ok', true) || tpp.cruce_datos(p_uid);
end;
$$;

create function public.tpp_cruces() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.cruce_datos(auth.uid());
end;
$$;

create function public.tpp_iniciar_cruce(p_a uuid, p_b uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.iniciar_cruce(auth.uid(), p_a, p_b);
end;
$$;

create function public.tpp_acelerar_cruce() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.acelerar_cruce(auth.uid());
end;
$$;

create function public.tpp_abrir_cruce() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.abrir_cruce(auth.uid());
end;
$$;

create function public.tpp_guardar_cruce(p_nombre text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.guardar_cruce(auth.uid(), p_nombre);
end;
$$;

revoke all on function tpp.datos_variedad(uuid, text) from public, anon, authenticated;
revoke all on function tpp.hibridas_json(tpp.perfiles) from public, anon, authenticated;
revoke all on function tpp.cruce_datos(uuid) from public, anon, authenticated;
revoke all on function tpp.iniciar_cruce(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function tpp.acelerar_cruce(uuid) from public, anon, authenticated;
revoke all on function tpp.abrir_cruce(uuid) from public, anon, authenticated;
revoke all on function tpp.guardar_cruce(uuid, text) from public, anon, authenticated;
revoke all on function public.tpp_cruces() from public, anon;
revoke all on function public.tpp_iniciar_cruce(uuid, uuid) from public, anon;
revoke all on function public.tpp_acelerar_cruce() from public, anon;
revoke all on function public.tpp_abrir_cruce() from public, anon;
revoke all on function public.tpp_guardar_cruce(text) from public, anon;
grant execute on function public.tpp_cruces() to authenticated;
grant execute on function public.tpp_iniciar_cruce(uuid, uuid) to authenticated;
grant execute on function public.tpp_acelerar_cruce() to authenticated;
grant execute on function public.tpp_abrir_cruce() to authenticated;
grant execute on function public.tpp_guardar_cruce(text) to authenticated;
