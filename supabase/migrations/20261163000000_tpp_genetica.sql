-- 8g Genética: cruces con plantas vivas (madre + padre), semillas de cruce, F1 con ficha propia,
-- fenotipos raros, libro de cepas y trofeos. Las híbridas propias antiguas siguen funcionando.

alter table tpp.hibridos add column if not exists datos jsonb;
alter table tpp.plantas add column if not exists fenotipo text;

-- Datos de ficha de las 16 variedades fijas (nombre corto, calidad, tolerancia, plagas, efecto, rasgos, temperaturas).
create or replace function tpp.ficha_base() returns jsonb language sql immutable set search_path = '' as
$f$ select '{"clasica":{"corto":"Clásica","calidad":2,"tolerancia":5,"plagas":3,"efecto":"equilibrado","rasgos":["perdona","inicial"],"tMin":18,"tMax":26},"hoja-azul":{"corto":"Hoja Azul","calidad":3,"tolerancia":4,"plagas":4,"efecto":"relajante","rasgos":["pocaAgua","fresco"],"tMin":16,"tMax":24},"dorada":{"corto":"Dorada","calidad":3,"tolerancia":2,"plagas":2,"efecto":"energizante","rasgos":["calor","granRend","bebe"],"tMin":22,"tMax":30},"noche":{"corto":"Noche","calidad":4,"tolerancia":3,"plagas":4,"efecto":"sonador","rasgos":["morado","pocaLuz","sensCalor"],"tMin":16,"tMax":22},"cristal":{"corto":"Cristal","calidad":5,"tolerancia":2,"plagas":5,"efecto":"creativo","rasgos":["pocaAgua","inmune","odiaCalor"],"tMin":10,"tMax":20},"verde-azulado":{"corto":"Verde Azulado","calidad":3,"tolerancia":4,"plagas":4,"efecto":"equilibrado","rasgos":["todo","pocaAgua"],"tMin":17,"tMax":25},"brisa-dorada":{"corto":"Brisa Dorada","calidad":4,"tolerancia":3,"plagas":3,"efecto":"energizante","rasgos":["rapida","equil"],"tMin":20,"tMax":28},"ambar-antiguo":{"corto":"Ámbar Antiguo","calidad":4,"tolerancia":4,"plagas":4,"efecto":"relajante","rasgos":["ventana","lenta","gris"],"tMin":18,"tMax":26},"menta-nocturna":{"corto":"Menta Nocturna","calidad":4,"tolerancia":4,"plagas":3,"efecto":"sonador","rasgos":["pocaLuz","morado"],"tMin":16,"tMax":23},"sol-medianoche":{"corto":"Sol de Medianoche","calidad":4,"tolerancia":1,"plagas":2,"efecto":"energizante","rasgos":["granRend","exigente","hambre"],"tMin":20,"tMax":28},"escarcha-azul":{"corto":"Escarcha Azul","calidad":5,"tolerancia":3,"plagas":5,"efecto":"creativo","rasgos":["pocaAgua","odiaCalor","resPlagas"],"tMin":8,"tMax":18},"aurora":{"corto":"Aurora","calidad":5,"tolerancia":2,"plagas":4,"efecto":"creativo","rasgos":["cambia","maxCal","lenta"],"tMin":18,"tMax":24},"ed-primavera":{"corto":"Primavera","calidad":4,"tolerancia":3,"plagas":2,"efecto":"equilibrado","rasgos":["rosa","rapida","atrae","temporada"],"tMin":16,"tMax":24},"ed-verano":{"corto":"Verano","calidad":3,"tolerancia":3,"plagas":3,"efecto":"energizante","rasgos":["calor","bebe","granRend","temporada"],"tMin":24,"tMax":32},"ed-otono":{"corto":"Otoño","calidad":4,"tolerancia":4,"plagas":3,"efecto":"relajante","rasgos":["naranja","ventana","temporada"],"tMin":14,"tMax":22},"ed-invierno":{"corto":"Invierno","calidad":4,"tolerancia":3,"plagas":4,"efecto":"sonador","rasgos":["frio","pocaAgua","sensCalor","temporada"],"tMin":6,"tMax":16}}'::jsonb $f$;

-- Ficha completa de una variedad: fija, F1 (datos guardados) o híbrida propia antigua (valores por defecto).
create or replace function tpp.ficha_de(p_uid uuid, p_id text) returns jsonb language sql stable security definer set search_path = '' as
$f$
  select case
    when tpp.variedades() ? p_id then (tpp.variedades() -> p_id) || coalesce(tpp.ficha_base() -> p_id, '{}'::jsonb)
    else (select case when h.datos is not null then h.datos || jsonb_build_object('nivel', 1, 'hibrida', true, 'corto', h.nombre)
        else jsonb_build_object('nivel', 1, 'hibrida', true, 'corto', h.nombre, 'recompensa', h.recompensa, 'ciclo', h.ciclo,
          'desgaste', h.desgaste, 'sabor', h.sabor, 'rareza', h.rareza, 'hoja', h.hoja, 'calidad', 3, 'tolerancia', 3, 'plagas', 3,
          'efecto', 'equilibrado', 'rasgos', '[]'::jsonb, 'semilla', 200, 'gramo', 12, 'gramos', round(34 * h.recompensa),
          'riego', 120, 'ventana', 240, 'b_agua', 3, 'b_nutr', 3, 'b_luz', 3, 'tMin', 18, 'tMax', 26) end
      from tpp.hibridos h where h.id = p_id and h.usuario_id = p_uid)
  end;
$f$;

create or replace function tpp.datos_variedad(p_uid uuid, p_id text) returns jsonb language sql stable security definer set search_path = '' as
$f$
  select coalesce(tpp.variedades() -> p_id,
    (select case when h.datos is not null then h.datos || jsonb_build_object('nivel', 1, 'hibrida', true)
       else jsonb_build_object('nivel', 1, 'hibrida', true, 'recompensa', h.recompensa, 'ciclo', h.ciclo, 'desgaste', h.desgaste,
                               'sabor', h.sabor, 'rareza', h.rareza, 'hoja', h.hoja) end
       from tpp.hibridos h where h.id = p_id and h.usuario_id = p_uid));
$f$;

-- Padres de una variedad (para los fenotipos): recetas fijas, F1 o ella misma.
create or replace function tpp.padres_de(p_uid uuid, p_id text) returns text[] language sql stable security definer set search_path = '' as
$f$
  select coalesce(
    (select array[h.padre_a, h.padre_b] from tpp.hibridos h where h.id = p_id and h.usuario_id = p_uid),
    case p_id when 'verde-azulado' then array['clasica', 'hoja-azul'] when 'brisa-dorada' then array['hoja-azul', 'dorada']
      when 'menta-nocturna' then array['noche', 'clasica'] when 'sol-medianoche' then array['dorada', 'noche']
      when 'escarcha-azul' then array['cristal', 'hoja-azul'] end,
    array[p_id, p_id]);
$f$;

-- Fenotipo raro de una planta recién plantada (como mucho uno).
create or replace function tpp.tirar_fenotipo(p_uid uuid, p_variedad text, p_cruce boolean) returns text language plpgsql stable security definer set search_path = '' as
$f$
declare
  fichas jsonb[] := array[tpp.ficha_de(p_uid, p_variedad)];
  pd text;
  morado boolean := false; calidad5 boolean := false; calor boolean := false;
  m double precision := case when p_cruce then 1.5 else 1 end;
  p_black double precision; p_resina double precision; p_enana double precision; p_fantasma double precision; p_brasa double precision;
  r double precision := random();
  f jsonb;
begin
  foreach pd in array tpp.padres_de(p_uid, p_variedad) loop
    fichas := fichas || tpp.ficha_de(p_uid, pd);
  end loop;
  foreach f in array fichas loop
    if f is null then continue; end if;
    if coalesce(f -> 'rasgos', '[]'::jsonb) ? 'morado' then morado := true; end if;
    if coalesce(f -> 'rasgos', '[]'::jsonb) ? 'calor' then calor := true; end if;
    if coalesce((f ->> 'calidad')::int, 0) = 5 then calidad5 := true; end if;
  end loop;
  p_black := 0.04 * (case when morado then 3 else 1 end) * m;
  p_resina := 0.05 * (case when calidad5 then 2 else 1 end) * m;
  p_enana := 0.06 * m;
  p_fantasma := 0.01 * m;
  p_brasa := 0.03 * (case when calor then 2 else 1 end) * m;
  if r < p_black then return 'black'; end if;
  r := r - p_black;
  if r < p_resina then return 'resina'; end if;
  r := r - p_resina;
  if r < p_enana then return 'enana'; end if;
  r := r - p_enana;
  if r < p_fantasma then return 'fantasma'; end if;
  r := r - p_fantasma;
  if r < p_brasa then return 'brasa'; end if;
  return null;
end;
$f$;

-- Multiplicador de gramos del fenotipo (el valor extra se paga como gramos extra).
create or replace function tpp.fenotipo_gramos(p_f text) returns double precision language sql immutable set search_path = '' as
$f$ select case p_f when 'black' then 1.3 when 'resina' then 1.25 when 'enana' then 0.9 when 'fantasma' then 1.6 when 'brasa' then 1.1 else 1 end; $f$;

-- La planta enana crece un 25 % más rápido.
create or replace function tpp.fase_planta(p tpp.plantas) returns integer language sql stable set search_path = '' as
$f$
  select case when d.v ? 'fases' then
      1 + (select count(*) from (
        select sum(x::numeric) over (order by o) acum from jsonb_array_elements_text(d.v -> 'fases') with ordinality t(x, o)
      ) s where s.acum / 60.0 * case when p.tipo in ('auto', 'autofem') then 0.65 else 1 end
                * case when p.fenotipo = 'enana' then 0.75 else 1 end <= p.horas_vividas)::int
    else
      tpp.fase_de(p.horas_vividas * 7.2 / (coalesce((d.v ->> 'ciclo')::double precision, 1)
        * case when p.tipo in ('auto', 'autofem') then 0.65 else 1 end * case when p.fenotipo = 'enana' then 0.75 else 1 end))
    end
  from (select tpp.datos_variedad(p.usuario_id, p.variedad) v) d;
$f$;

-- Media de una clave numérica de dos fichas.
create or replace function tpp.media_clave(a jsonb, b jsonb, k text, def numeric) returns numeric language sql immutable set search_path = '' as
$f$ select (coalesce((a ->> k)::numeric, def) + coalesce((b ->> k)::numeric, def)) / 2; $f$;

-- Ficha de la F1: media de los padres (rendimiento +10 %), efecto de la madre, rareza del padre más raro.
create or replace function tpp.f1_datos(a jsonb, b jsonb, madre jsonb, pa text, pb text, nombre text) returns jsonb language plpgsql immutable set search_path = '' as
$f$
declare
  rarezas text[] := array['comun', 'poco_comun', 'rara', 'epica', 'legendaria', 'especial'];
  ra integer := coalesce(array_position(rarezas, a ->> 'rareza'), 1);
  rb integer := coalesce(array_position(rarezas, b ->> 'rareza'), 1);
  fa jsonb := coalesce(a -> 'fases', b -> 'fases', '[20,40,60,90,120,90,180]'::jsonb);
  fb jsonb;
  fases jsonb;
begin
  fb := coalesce(b -> 'fases', fa);
  select jsonb_agg(round((s.x::numeric + t.y::numeric) / 2) order by s.o) into fases
    from jsonb_array_elements_text(fa) with ordinality s(x, o) join jsonb_array_elements_text(fb) with ordinality t(y, o2) on s.o = t.o2;
  return jsonb_build_object(
    'nivel', 1, 'hibrida', true, 'padres', jsonb_build_array(pa, pb), 'corto', nombre,
    'rareza', rarezas[greatest(ra, rb)], 'hoja', case when ra >= rb then a ->> 'hoja' else b ->> 'hoja' end,
    'recompensa', round(tpp.media_clave(a, b, 'recompensa', 1) * 1.1, 2),
    'gramos', round(tpp.media_clave(a, b, 'gramos', 34) * 1.1),
    'gramo', round(tpp.media_clave(a, b, 'gramo', 12) * 1.1),
    'ciclo', round(tpp.media_clave(a, b, 'ciclo', 1), 2),
    'desgaste', round(tpp.media_clave(a, b, 'desgaste', 1), 2),
    'sabor', round(tpp.media_clave(a, b, 'sabor', 50)),
    'semilla', round(tpp.media_clave(a, b, 'semilla', 100) / 10) * 10,
    'riego', round(tpp.media_clave(a, b, 'riego', 120)), 'ventana', round(tpp.media_clave(a, b, 'ventana', 240)),
    'b_agua', round(tpp.media_clave(a, b, 'b_agua', 3)), 'b_nutr', round(tpp.media_clave(a, b, 'b_nutr', 3)),
    'b_luz', round(tpp.media_clave(a, b, 'b_luz', 3)),
    'tMin', round(tpp.media_clave(a, b, 'tMin', 18)), 'tMax', round(tpp.media_clave(a, b, 'tMax', 26)),
    'calidad', ceil(tpp.media_clave(a, b, 'calidad', 3)), 'tolerancia', round(tpp.media_clave(a, b, 'tolerancia', 3)),
    'plagas', round(tpp.media_clave(a, b, 'plagas', 3)),
    'efecto', coalesce(madre ->> 'efecto', 'equilibrado'),
    'fases', fases,
    'rasgos', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select distinct x from unnest(array[a -> 'rasgos' ->> 0, b -> 'rasgos' ->> 0]) x where x is not null) q)
  );
end;
$f$;

-- Plantar: semillas de cruce y fenotipo.
do $mig$
declare d text; o text;
begin
  d := pg_get_functiondef('tpp.plantar(uuid,text,text)'::regprocedure);
  o := d;
  d := replace(d, E'  sx text := ''hembra'';', E'  sx text := ''hembra'';\n  fen text;');
  if d = o then raise exception 'plantar: declare'; end if;
  o := d;
  d := replace(d, E'if p_tipo not in (''foto'', ''auto'', ''fem'', ''autofem'') then', E'if p_tipo not in (''foto'', ''auto'', ''fem'', ''autofem'', ''cruce'') then');
  if d = o then raise exception 'plantar: tipo'; end if;
  o := d;
  d := replace(d, E'  if tpp.nivel_de(perfil.xp) < (v ->> ''nivel'')::int then', E'  if p_tipo <> ''cruce'' and tpp.nivel_de(perfil.xp) < (v ->> ''nivel'')::int then');
  if d = o then raise exception 'plantar: nivel'; end if;
  o := d;
  d := replace(d, E'  if coalesce((v ->> ''hibrida'')::boolean, false) and not (perfil.semillas_hibridas ? p_variedad) then',
    E'  if p_tipo <> ''cruce'' and coalesce((v ->> ''hibrida'')::boolean, false) and not (perfil.semillas_hibridas ? p_variedad) then');
  if d = o then raise exception 'plantar: hibrida'; end if;
  o := d;
  d := replace(d, E'  coste := case p_tipo when',
    E'  if p_tipo = ''cruce'' then\n    if not exists (select 1 from tpp.inventario where usuario_id = p_uid and objeto = ''cruce:'' || p_variedad and cantidad > 0) then\n      return jsonb_build_object(''ok'', false, ''error'', ''sin_semilla'') || tpp.estado_json(p_uid);\n    end if;\n    update tpp.inventario set cantidad = cantidad - 1 where usuario_id = p_uid and objeto = ''cruce:'' || p_variedad;\n  end if;\n  coste := case p_tipo when');
  if d = o then raise exception 'plantar: coste'; end if;
  o := d;
  d := replace(d, E'if p_tipo in (''foto'', ''auto'') and random() < 0.5 then sx := ''macho''; end if;',
    E'if p_tipo in (''foto'', ''auto'', ''cruce'') and random() < 0.5 then sx := ''macho''; end if;\n  fen := tpp.tirar_fenotipo(p_uid, p_variedad, p_tipo = ''cruce'');');
  if d = o then raise exception 'plantar: sexo'; end if;
  o := d;
  d := replace(d, E'  insert into tpp.plantas (usuario_id, variedad, hueco, tipo, sexo)\n    values (p_uid, p_variedad, tpp.hueco_activo(p_uid), p_tipo, sx);',
    E'  insert into tpp.plantas (usuario_id, variedad, hueco, tipo, sexo, fenotipo)\n    values (p_uid, p_variedad, tpp.hueco_activo(p_uid), case when p_tipo = ''cruce'' then ''foto'' else p_tipo end, sx, fen);\n  if fen is not null then\n    update tpp.perfiles set estadisticas = jsonb_set(estadisticas, ''{libro_fen}'', coalesce(estadisticas -> ''libro_fen'', ''{}''::jsonb) || jsonb_build_object(fen, true)) where id = p_uid;\n  end if;');
  if d = o then raise exception 'plantar: insert'; end if;
  execute d;

  -- Cosecha: la madre cruzada rinde menos y el fenotipo cambia los gramos.
  d := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, E'* (case when p.sexo = ''macho'' then 0.2 else 1 end))::int);',
    E'* (case when p.sexo = ''macho'' then 0.2 else 1 end) * (case when p.cruzada then 0.6 else 1 end) * tpp.fenotipo_gramos(p.fenotipo))::int);');
  if d = o then raise exception 'accion no cambia'; end if;
  execute d;

  -- Estado: fenotipo y cruzada de la planta activa.
  d := pg_get_functiondef('tpp.estado_json(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'      ''causa'', p.causa,', E'      ''causa'', p.causa,\n      ''fenotipo'', p.fenotipo,\n      ''cruzada'', p.cruzada,');
  if d = o then raise exception 'estado_json no cambia'; end if;
  execute d;

  -- Progresión: título «cepas» y marco dorado del libro.
  d := pg_get_functiondef('tpp.progresion(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'      ''coleccionista'', pct >= 25,', E'      ''coleccionista'', pct >= 25,\n      ''cepas'', coalesce(perfil.ajustes -> ''trofeos'', ''[]''::jsonb) ? ''coleccionista'',');
  if d = o then raise exception 'progresion: cepas'; end if;
  o := d;
  d := replace(d, E'''dorado'', tpp.maestria_nivel(p_uid, ''dorada'') >= 10,', E'''dorado'', (tpp.maestria_nivel(p_uid, ''dorada'') >= 10 or coalesce(perfil.ajustes -> ''trofeos'', ''[]''::jsonb) ? ''libro''),');
  if d = o then raise exception 'progresion: dorado'; end if;
  execute d;

  -- Vender gramos: también las variedades F1.
  d := pg_get_functiondef('tpp.vender_gramos(uuid,text,integer)'::regprocedure);
  o := d;
  d := replace(d, E'tpp.variedades() -> p_variedad', E'tpp.datos_variedad(p_uid, p_variedad)');
  if d = o then raise exception 'vender_gramos no cambia'; end if;
  execute d;
end
$mig$;

create or replace function tpp.hibridas_json(perfil tpp.perfiles) returns jsonb language sql stable security definer set search_path = '' as
$f$
  select jsonb_build_object(
    'semillas', perfil.semillas_hibridas,
    'cruce', (select coalesce(jsonb_object_agg(substr(objeto, 7), cantidad), '{}'::jsonb)
                from tpp.inventario where usuario_id = perfil.id and objeto like 'cruce:%' and cantidad > 0),
    'propias', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'nombre', nombre, 'rareza', rareza, 'hoja', hoja,
                  'recompensa', recompensa, 'ciclo', ciclo, 'desgaste', desgaste, 'sabor', sabor, 'datos', datos) order by creado_en), '[]'::jsonb)
                from tpp.hibridos where usuario_id = perfil.id)
  );
$f$;

-- Cruce: datos para la pantalla (madres, padres y cruce actual).
create or replace function tpp.cruce_datos(p_uid uuid) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare r record;
begin
  perform tpp.asegurar_perfil(p_uid);
  for r in select id from tpp.plantas where usuario_id = p_uid and estado = 'viva' and desafio is null loop
    perform tpp.sincronizar(r.id);
  end loop;
  return jsonb_build_object(
    'madres', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'variedad', variedad, 'hueco', hueco, 'fase', fase,
                  'salud', round(salud::numeric), 'fenotipo', fenotipo, 'semilla', (tpp.ficha_de(p_uid, variedad) ->> 'semilla')::int)
                order by plantada_en), '[]'::jsonb)
               from (select p.*, tpp.fase_planta(p) fase from tpp.plantas p where p.usuario_id = p_uid and p.estado = 'viva'
                       and p.desafio is null and p.sexo = 'hembra' and not p.cruzada) m where fase >= 6),
    'padres', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'variedad', variedad, 'hueco', hueco, 'fase', fase,
                  'salud', round(salud::numeric), 'fenotipo', fenotipo, 'semilla', (tpp.ficha_de(p_uid, variedad) ->> 'semilla')::int)
                order by plantada_en), '[]'::jsonb)
               from (select p.*, tpp.fase_planta(p) fase from tpp.plantas p where p.usuario_id = p_uid and p.estado = 'viva'
                       and p.desafio is null and p.sexo = 'macho') m where fase >= 7),
    'cruce', (select jsonb_build_object('estado', estado, 'variedad_a', variedad_a, 'variedad_b', variedad_b,
                'restan', greatest(0, ceil(extract(epoch from (termina_en - now()))))::int, 'resultado', resultado)
              from tpp.cruces where usuario_id = p_uid and estado in ('en_curso', 'abierto'))
  );
end;
$f$;

create or replace function tpp.iniciar_cruce(p_uid uuid, p_a uuid, p_b uuid) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare
  pa tpp.plantas;
  pb tpp.plantas;
  factor double precision := 1;
  coste integer;
  monedas_p integer;
begin
  perform tpp.asegurar_perfil(p_uid);
  if exists (select 1 from tpp.cruces where usuario_id = p_uid and estado in ('en_curso', 'abierto')) then
    return jsonb_build_object('ok', false, 'error', 'cruce_en_curso') || tpp.cruce_datos(p_uid);
  end if;
  if p_a = p_b then
    return jsonb_build_object('ok', false, 'error', 'cosecha_invalida') || tpp.cruce_datos(p_uid);
  end if;
  perform tpp.sincronizar(p_a);
  perform tpp.sincronizar(p_b);
  select * into pa from tpp.plantas where id = p_a and usuario_id = p_uid and estado = 'viva' and desafio is null and sexo = 'hembra' and not cruzada;
  select * into pb from tpp.plantas where id = p_b and usuario_id = p_uid and estado = 'viva' and desafio is null and sexo = 'macho';
  if pa.id is null or pb.id is null or tpp.fase_planta(pa) < 6 or tpp.fase_planta(pb) < 7 then
    return jsonb_build_object('ok', false, 'error', 'cosecha_invalida') || tpp.cruce_datos(p_uid);
  end if;
  coste := (round(0.4 * (coalesce((tpp.ficha_de(p_uid, pa.variedad) ->> 'semilla')::numeric, 0)
                         + coalesce((tpp.ficha_de(p_uid, pb.variedad) ->> 'semilla')::numeric, 0)) / 10) * 10)::int;
  select monedas into monedas_p from tpp.perfiles where id = p_uid for update;
  if monedas_p < coste then
    return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.cruce_datos(p_uid);
  end if;
  if tpp.maestria_nivel(p_uid, pa.variedad) >= 8 or tpp.maestria_nivel(p_uid, pb.variedad) >= 8 then factor := 0.9; end if;
  if exists (select 1 from tpp.perfiles where id = p_uid and prestigio_bonos ? 'cru') then factor := factor * 0.8; end if;
  if coste > 0 then
    update tpp.perfiles set monedas = monedas - coste where id = p_uid;
    perform tpp.contar(p_uid, 'gastado', coste);
  end if;
  update tpp.plantas set cruzada = true where id = pa.id;
  insert into tpp.cruces (usuario_id, planta_a, planta_b, variedad_a, variedad_b, termina_en, resultado)
    values (p_uid, pa.id, pb.id, pa.variedad, pb.variedad, now() + make_interval(mins => round(1440 * factor)::int),
            jsonb_build_object('coste', coste));
  return jsonb_build_object('ok', true) || tpp.cruce_datos(p_uid);
end;
$f$;

create or replace function tpp.abrir_cruce(p_uid uuid) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare
  c tpp.cruces;
  va text;
  vb text;
  fa jsonb;
  fb jsonb;
  receta text;
  res jsonb;
  par text;
  coste integer;
  h tpp.hibridos;
  nuevo_id text;
  v_nombre text;
  v_datos jsonb;
  rarezas text[] := array['comun', 'poco_comun', 'rara', 'epica', 'legendaria', 'especial'];
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
  par := (select string_agg(x, '+' order by x) from unnest(array[va, vb]) x);
  coste := coalesce((c.resultado ->> 'coste')::int, 0);
  fa := tpp.ficha_de(p_uid, va);
  fb := tpp.ficha_de(p_uid, vb);

  if va = vb then
    res := jsonb_build_object('tipo', 'pura', 'id', va, 'fija', true, 'par', par, 'coste', coste, 'semillas', 3, 'nuevo', false,
      'rareza', fa ->> 'rareza', 'hoja', fa ->> 'hoja');
  else
    receta := case
      when va in ('clasica', 'hoja-azul') and vb in ('clasica', 'hoja-azul') then 'verde-azulado'
      when va in ('hoja-azul', 'dorada') and vb in ('hoja-azul', 'dorada') then 'brisa-dorada'
      when va in ('clasica', 'noche') and vb in ('clasica', 'noche') then 'menta-nocturna'
      when va in ('dorada', 'noche') and vb in ('dorada', 'noche') then 'sol-medianoche'
      when va in ('cristal', 'hoja-azul') and vb in ('cristal', 'hoja-azul') then 'escarcha-azul'
    end;
    if receta is not null then
      res := jsonb_build_object('tipo', 'conocido', 'id', receta, 'fija', true, 'par', par, 'coste', coste, 'semillas', 3,
        'nuevo', not exists (select 1 from tpp.perfiles where id = p_uid and semillas_hibridas ? receta),
        'rareza', tpp.variedades() -> receta ->> 'rareza', 'hoja', tpp.variedades() -> receta ->> 'hoja');
    else
      select * into h from tpp.hibridos where usuario_id = p_uid and padre_a = least(va, vb) and padre_b = greatest(va, vb) and datos is not null;
      if h.id is not null then
        res := jsonb_build_object('tipo', 'f1', 'id', h.id, 'fija', false, 'nombre', h.nombre, 'par', par, 'coste', coste, 'semillas', 3,
          'nuevo', false, 'rareza', h.rareza, 'hoja', h.hoja, 'ficha', h.datos);
      else
        nuevo_id := 'h' || nextval('tpp.hibrido_n');
        v_nombre := coalesce(fa ->> 'corto', va) || ' × ' || coalesce(fb ->> 'corto', vb);
        -- el efecto lo hereda la madre (variedad_a)
        v_datos := tpp.f1_datos(fa, fb, fa, least(va, vb), greatest(va, vb), v_nombre);
        insert into tpp.hibridos (id, usuario_id, nombre, padre_a, padre_b, rareza, hoja, recompensa, ciclo, desgaste, sabor, datos)
          values (nuevo_id, p_uid, v_nombre, least(va, vb), greatest(va, vb),
                  case when v_datos ->> 'rareza' = 'especial' then 'legendaria' else v_datos ->> 'rareza' end,
                  v_datos ->> 'hoja', (v_datos ->> 'recompensa')::double precision, (v_datos ->> 'ciclo')::double precision,
                  (v_datos ->> 'desgaste')::double precision, (v_datos ->> 'sabor')::double precision, v_datos);
        res := jsonb_build_object('tipo', 'f1', 'id', nuevo_id, 'fija', false, 'nombre', v_nombre, 'par', par, 'coste', coste,
          'semillas', 3, 'nuevo', true, 'rareza', v_datos ->> 'rareza', 'hoja', v_datos ->> 'hoja', 'ficha', v_datos);
      end if;
    end if;
  end if;
  update tpp.cruces set estado = 'abierto', resultado = res where id = c.id;
  return jsonb_build_object('ok', true) || tpp.cruce_datos(p_uid);
end;
$f$;

create or replace function tpp.guardar_cruce(p_uid uuid, p_nombre text) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare
  c tpp.cruces;
  id_res text;
  tipo text;
  par text;
  v_nombre text := btrim(coalesce(p_nombre, ''));
begin
  perform tpp.asegurar_perfil(p_uid);
  select * into c from tpp.cruces where usuario_id = p_uid and estado = 'abierto' for update;
  if c.id is null then
    return jsonb_build_object('ok', false, 'error', 'sin_cruce') || tpp.cruce_datos(p_uid);
  end if;
  id_res := c.resultado ->> 'id';
  tipo := c.resultado ->> 'tipo';
  par := c.resultado ->> 'par';
  if v_nombre <> '' and (tipo = 'f1' or (tipo is null and not (c.resultado ->> 'fija')::boolean)) then
    if v_nombre !~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]{1,20}$' then
      return jsonb_build_object('ok', false, 'error', 'nombre_invalido') || tpp.cruce_datos(p_uid);
    end if;
    update tpp.hibridos set nombre = v_nombre, datos = case when datos is null then null else datos || jsonb_build_object('corto', v_nombre) end
      where id = id_res and usuario_id = p_uid;
  end if;
  update tpp.perfiles set
    semillas_hibridas = case when (tipo is null or tipo = 'conocido') and not (semillas_hibridas ? id_res)
                             then semillas_hibridas || to_jsonb(id_res) else semillas_hibridas end,
    estadisticas = jsonb_set(jsonb_set(estadisticas, '{variedades}', coalesce(estadisticas -> 'variedades', '{}'::jsonb) || jsonb_build_object(id_res, true)),
      '{libro_f1}', coalesce(estadisticas -> 'libro_f1', '{}'::jsonb) || case when tipo = 'f1' then jsonb_build_object(par, true) else '{}'::jsonb end)
    where id = p_uid;
  if tipo in ('f1', 'conocido', 'pura') then
    insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, 'cruce:' || id_res, 3)
      on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + 3;
  end if;
  update tpp.cruces set estado = 'guardado' where id = c.id;
  perform tpp.contar(p_uid, 'cruces', 1);
  return jsonb_build_object('ok', true) || tpp.cruce_datos(p_uid);
end;
$f$;

-- Libro de cepas: 16 variedades + 10 F1 + 5 fenotipos = 31.
create or replace function tpp.libro(p_uid uuid) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare
  perfil tpp.perfiles;
  vars jsonb;
  f1 jsonb;
  fen jsonb;
  total integer;
  tr jsonb;
  ids text[] := array['primer', 'fenotipos', 'tres_cuartos', 'coleccionista', 'libro'];
  listos boolean[];
  hechos jsonb;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  select coalesce(jsonb_agg(k order by k), '[]'::jsonb) into vars
    from jsonb_object_keys(coalesce(perfil.estadisticas -> 'variedades', '{}'::jsonb)) k where tpp.ficha_base() ? k;
  select coalesce(jsonb_agg(k order by k), '[]'::jsonb) into f1 from jsonb_object_keys(coalesce(perfil.estadisticas -> 'libro_f1', '{}'::jsonb)) k;
  select coalesce(jsonb_agg(k order by k), '[]'::jsonb) into fen
    from jsonb_object_keys(coalesce(perfil.estadisticas -> 'libro_fen', '{}'::jsonb)) k where k in ('black', 'resina', 'enana', 'fantasma', 'brasa');
  total := jsonb_array_length(vars) + jsonb_array_length(f1) + jsonb_array_length(fen);
  hechos := coalesce(perfil.ajustes -> 'trofeos', '[]'::jsonb);
  listos := array[
    exists (select 1 from tpp.hibridos where usuario_id = p_uid and datos is not null),
    jsonb_array_length(fen) >= 5,
    total >= 24,
    jsonb_array_length(vars) >= 16,
    total >= 31];
  select jsonb_agg(jsonb_build_object('id', ids[i], 'listo', listos[i], 'reclamado', hechos ? ids[i]) order by i) into tr
    from generate_subscripts(ids, 1) i;
  return jsonb_build_object('variedades', vars, 'f1', f1, 'fenotipos', fen, 'total', total, 'trofeos', tr);
end;
$f$;

create or replace function tpp.reclamar_trofeo(p_uid uuid, p_id text) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare
  l jsonb;
  t jsonb;
begin
  perform tpp.asegurar_perfil(p_uid);
  perform 1 from tpp.perfiles where id = p_uid for update;
  l := tpp.libro(p_uid);
  select x into t from jsonb_array_elements(l -> 'trofeos') x where x ->> 'id' = p_id;
  if t is null then
    return jsonb_build_object('ok', false, 'error', 'trofeo_desconocido') || l;
  end if;
  if (t ->> 'reclamado')::boolean then
    return jsonb_build_object('ok', false, 'error', 'trofeo_reclamado') || l;
  end if;
  if not (t ->> 'listo')::boolean then
    return jsonb_build_object('ok', false, 'error', 'trofeo_no_listo') || l;
  end if;
  if p_id = 'primer' then
    update tpp.perfiles set monedas = monedas + 200 where id = p_uid;
  elsif p_id = 'fenotipos' then
    insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, 'maceta_morada', 1)
      on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + 1;
  elsif p_id = 'tres_cuartos' then
    update tpp.perfiles set semillas_hibridas = semillas_hibridas || '"aurora"'::jsonb where id = p_uid and not (semillas_hibridas ? 'aurora');
  elsif p_id = 'libro' then
    update tpp.perfiles set monedas = monedas + 5000 where id = p_uid;
  end if;
  update tpp.perfiles set ajustes = ajustes || jsonb_build_object('trofeos', coalesce(ajustes -> 'trofeos', '[]'::jsonb) || to_jsonb(p_id)) where id = p_uid;
  return jsonb_build_object('ok', true, 'trofeo', p_id) || tpp.libro(p_uid);
end;
$f$;

create or replace function public.tpp_libro() returns jsonb language plpgsql security definer set search_path = '' as
$f$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.libro(auth.uid());
end;
$f$;

create or replace function public.tpp_reclamar_trofeo(p_id text) returns jsonb language plpgsql security definer set search_path = '' as
$f$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.reclamar_trofeo(auth.uid(), p_id);
end;
$f$;

revoke all on function tpp.ficha_base(), tpp.ficha_de(uuid, text), tpp.padres_de(uuid, text), tpp.tirar_fenotipo(uuid, text, boolean),
  tpp.fenotipo_gramos(text), tpp.media_clave(jsonb, jsonb, text, numeric), tpp.f1_datos(jsonb, jsonb, jsonb, text, text, text),
  tpp.libro(uuid), tpp.reclamar_trofeo(uuid, text) from public, anon, authenticated;
revoke all on function public.tpp_libro(), public.tpp_reclamar_trofeo(text) from public, anon;
grant execute on function public.tpp_libro(), public.tpp_reclamar_trofeo(text) to authenticated;
