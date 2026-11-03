-- Bloque 8f · Eventos al volver. Tras 2 h o más fuera hay un evento por cada 6 h (redondeando hacia arriba, máximo 3, sin repetir).
-- Seis tipos: apagon, gato, calor, visita, regalo, plaga. Cada uno tiene 2-3 decisiones (siempre una gratis).
-- Todo vive en tpp.perfiles.eventos: {cola, resumen, vuelta, registro (30 últimos), efectos (con caducidad), flags}.
-- Efectos con tiempo: calor (grados), crec (multiplicador de crecimiento), agua (multiplicador de consumo), ventas (multiplicador de precio).
-- Las semillas regaladas se guardan en tpp.inventario como «semilla:<variedad>:fem» y se gastan gratis al plantar esa variedad (tipo fem).
-- El abono casero es el objeto «abono_casero» (tpp.usar_abono_casero: +15 % de crecimiento 24 h).
-- Para deshacer: borrar public.tpp_mis_eventos, tpp_decidir_evento, tpp_cerrar_eventos, tpp_usar_abono_casero y las tpp.* del mismo nombre
-- más tpp.eventos_al_volver, tpp.mult_ventas, tpp.dar_semilla; quitar la columna eventos; volver a aplicar las versiones anteriores de
-- tpp.sincronizar, tpp.estado_json, tpp.plantar, tpp.vender_gramos, tpp.sacar_secado y tpp.secar_cosecha.

alter table tpp.perfiles add column if not exists eventos jsonb not null default '{}'::jsonb;

-- Multiplicador de ventas activo (1 si no hay).
create function tpp.mult_ventas(p_uid uuid) returns double precision
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select exp(sum(ln((e ->> 'v')::double precision)))
      from tpp.perfiles pf, jsonb_array_elements(coalesce(pf.eventos -> 'efectos', '[]'::jsonb)) e
     where pf.id = p_uid and e ->> 'k' = 'ventas' and (e ->> 'hasta')::double precision > extract(epoch from now())
  ), 1);
$$;

-- Regala una semilla feminizada de una variedad normal que el jugador ya puede plantar.
create function tpp.dar_semilla(p_uid uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  niv integer;
  v text;
begin
  select tpp.nivel_de(xp) into niv from tpp.perfiles where id = p_uid;
  select e.key into v
    from jsonb_each(tpp.variedades()) e
   where coalesce((e.value ->> 'nivel')::int, 1) <= niv and not coalesce((e.value ->> 'hibrida')::boolean, false)
   order by random() limit 1;
  if v is null then v := 'clasica'; end if;
  insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, 'semilla:' || v || ':fem', 1)
    on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + 1;
  return v;
end;
$$;

-- Genera los eventos al volver.
create function tpp.eventos_al_volver(p_uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  pf tpp.perfiles;
  ev jsonb;
  horas double precision;
  n integer;
  tipos text[] := array['apagon', 'gato', 'calor', 'visita', 'regalo', 'plaga'];
  elegidos text[] := '{}';
  t text;
  pesos double precision;
  r double precision;
  acum double precision;
  w double precision;
  vivas integer;
  mes integer := extract(month from (now() at time zone 'Europe/Madrid'));
  cola jsonb := '[]'::jsonb;
  vuelta bigint := extract(epoch from now())::bigint;
  planta tpp.plantas;
  ids uuid[];
  i integer;
  datos jsonb;
  k integer;
begin
  select * into pf from tpp.perfiles where id = p_uid for update;
  if pf.ultima_vez is null or not pf.tutorial_hecho then return; end if;
  ev := coalesce(pf.eventos, '{}'::jsonb);
  if jsonb_array_length(coalesce(ev -> 'cola', '[]'::jsonb)) > 0 then return; end if;
  horas := extract(epoch from (now() - pf.ultima_vez)) / 3600.0;
  if horas < 2 then return; end if;
  n := least(3, ceil(horas / 6.0)::int);
  select count(*) into vivas from tpp.plantas where usuario_id = p_uid and estado = 'viva' and desafio is null;

  for i in 1..n loop
    pesos := 0;
    foreach t in array tipos loop
      continue when t = any (elegidos);
      continue when t = 'apagon' and coalesce((ev -> 'flags' ->> 'generador')::boolean, false);
      continue when t = 'gato' and (coalesce((ev -> 'flags' ->> 'malla')::boolean, false) or pf.habitacion in ('sotano', 'armario'));
      continue when t = 'plaga' and vivas < 2;
      continue when t in ('apagon', 'calor', 'plaga', 'gato') and vivas < 1;
      w := case t when 'apagon' then 15 when 'gato' then 20 when 'calor' then 15 when 'visita' then 20 when 'regalo' then 20 else 10 end;
      if t = 'calor' and mes between 6 and 8 then w := w * 2; end if;
      if t = 'gato' and coalesce((ev -> 'flags' ->> 'gato_x2')::double precision, 0) > extract(epoch from now()) then w := w * 2; end if;
      pesos := pesos + w;
    end loop;
    exit when pesos = 0;
    r := random() * pesos;
    acum := 0;
    t := null;
    foreach t in array tipos loop
      continue when t = any (elegidos);
      continue when t = 'apagon' and coalesce((ev -> 'flags' ->> 'generador')::boolean, false);
      continue when t = 'gato' and (coalesce((ev -> 'flags' ->> 'malla')::boolean, false) or pf.habitacion in ('sotano', 'armario'));
      continue when t = 'plaga' and vivas < 2;
      continue when t in ('apagon', 'calor', 'plaga', 'gato') and vivas < 1;
      w := case t when 'apagon' then 15 when 'gato' then 20 when 'calor' then 15 when 'visita' then 20 when 'regalo' then 20 else 10 end;
      if t = 'calor' and mes between 6 and 8 then w := w * 2; end if;
      if t = 'gato' and coalesce((ev -> 'flags' ->> 'gato_x2')::double precision, 0) > extract(epoch from now()) then w := w * 2; end if;
      acum := acum + w;
      exit when r < acum;
    end loop;
    elegidos := elegidos || t;
    datos := '{}'::jsonb;

    -- Lo que ya ha pasado.
    if t = 'apagon' then
      update tpp.plantas set horas_vividas = greatest(0, horas_vividas - 3) where usuario_id = p_uid and estado = 'viva' and desafio is null;
    elsif t = 'gato' then
      update tpp.plantas set salud = greatest(1, salud - 5) where usuario_id = p_uid and estado = 'viva' and desafio is null;
      datos := jsonb_build_object('semilla', tpp.dar_semilla(p_uid));
    elsif t = 'calor' then
      ev := jsonb_set(ev, '{efectos}', coalesce(ev -> 'efectos', '[]'::jsonb)
        || jsonb_build_object('k', 'calor', 'v', 6, 'hasta', extract(epoch from now()) + 12 * 3600));
    elsif t = 'regalo' then
      k := case when coalesce((ev -> 'flags' ->> 'regalos')::boolean, false) then 2 else 1 end;
      insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, 'abono_casero', k)
        on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + k;
      datos := jsonb_build_object('abonos', k);
    elsif t = 'plaga' then
      ids := array(select id from tpp.plantas where usuario_id = p_uid and estado = 'viva' and desafio is null and plaga is null
                    order by random() limit 2);
      update tpp.plantas set plaga = 'pulgon', plaga_desde = now() where id = any (ids);
      datos := jsonb_build_object('plantas', to_jsonb(ids));
    end if;
    cola := cola || jsonb_build_object('id', vuelta * 10 + i, 'tipo', t, 'datos', datos);
  end loop;

  select * into planta from tpp.plantas where usuario_id = p_uid and estado = 'viva' order by hueco limit 1;
  ev := ev || jsonb_build_object(
    'cola', cola,
    'vuelta', vuelta,
    'decididos', '[]'::jsonb,
    'resumen', jsonb_build_object('horas', round(horas::numeric, 1), 'vida0', planta.horas_vividas, 'agua0', planta.agua, 'planta', planta.id));
  update tpp.perfiles set eventos = ev where id = p_uid;
end;
$$;

-- Estado de los eventos: pendientes, resumen de la vuelta, decisiones de esta vuelta y registro.
create function tpp.mis_eventos(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  pf tpp.perfiles;
  ev jsonb;
  res jsonb;
  pl tpp.plantas;
  listos integer;
begin
  pf := tpp.asegurar_perfil(p_uid);
  ev := coalesce(pf.eventos, '{}'::jsonb);
  res := ev -> 'resumen';
  if res is not null and res ->> 'planta' is not null then
    select * into pl from tpp.plantas where id = (res ->> 'planta')::uuid;
    if pl.id is not null then
      res := res || jsonb_build_object('crecimiento', round(greatest(0, pl.horas_vividas - (res ->> 'vida0')::double precision)::numeric, 1),
                                       'agua', round((pl.agua - (res ->> 'agua0')::double precision)::numeric, 0));
    end if;
  end if;
  select count(*) into listos from jsonb_array_elements(coalesce(pf.secado, '[]'::jsonb)) x
   where extract(epoch from now()) - (x ->> 't0')::double precision >= 12 * 3600;
  if res is not null then res := res || jsonb_build_object('secado_listos', listos); end if;
  return jsonb_build_object(
    'pendientes', coalesce(ev -> 'cola', '[]'::jsonb),
    'resumen', res,
    'vuelta', coalesce(ev -> 'decididos', '[]'::jsonb),
    'registro', coalesce(ev -> 'registro', '[]'::jsonb),
    'monedas', pf.monedas);
end;
$$;

-- Costes de cada decisión, por tipo (índice 0, 1, 2).
create function tpp.evento_coste(p_tipo text, p_op integer) returns integer
language sql immutable set search_path = '' as $$
  select case p_tipo
    when 'apagon' then (array[1200, 0])[p_op + 1]
    when 'gato' then (array[0, 300, 0])[p_op + 1]
    when 'calor' then (array[450, 120, 0])[p_op + 1]
    when 'visita' then (array[0, 0, 0])[p_op + 1]
    when 'regalo' then (array[0, 0, 150])[p_op + 1]
    when 'plaga' then (array[200, 350, 0])[p_op + 1]
  end;
$$;

create function tpp.decidir_evento(p_uid uuid, p_id bigint, p_op integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  pf tpp.perfiles;
  ev jsonb;
  it jsonb;
  t text;
  coste integer;
  resultado text := 'resuelto';
  ahora double precision := extract(epoch from now());
  ef jsonb;
  ids uuid[];
  maxop integer;
begin
  select * into pf from tpp.perfiles where id = p_uid for update;
  ev := coalesce(pf.eventos, '{}'::jsonb);
  select x into it from jsonb_array_elements(coalesce(ev -> 'cola', '[]'::jsonb)) x where (x ->> 'id')::bigint = p_id;
  if it is null then return jsonb_build_object('ok', false, 'error', 'evento_inexistente'); end if;
  t := it ->> 'tipo';
  maxop := case t when 'apagon' then 1 else 2 end;
  if p_op < 0 or p_op > maxop then
    return jsonb_build_object('ok', false, 'error', 'opcion_invalida');
  end if;
  coste := tpp.evento_coste(t, p_op);
  if pf.monedas < coste then
    return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes', 'falta', coste - pf.monedas);
  end if;
  if coste > 0 then update tpp.perfiles set monedas = monedas - coste where id = p_uid; resultado := 'gasto'; end if;
  ef := coalesce((select jsonb_agg(x) from jsonb_array_elements(coalesce(ev -> 'efectos', '[]'::jsonb)) x
                   where (x ->> 'hasta')::double precision > ahora), '[]'::jsonb);

  if t = 'apagon' then
    if p_op = 0 then
      update tpp.plantas set horas_vividas = horas_vividas + 3 where usuario_id = p_uid and estado = 'viva' and desafio is null;
      ev := jsonb_set(ev, '{flags}', coalesce(ev -> 'flags', '{}'::jsonb) || '{"generador": true}');
    else resultado := 'asumido'; end if;
  elsif t = 'gato' then
    if p_op = 1 then
      ev := jsonb_set(ev, '{flags}', coalesce(ev -> 'flags', '{}'::jsonb) || '{"malla": true}');
    elsif p_op = 2 then
      ev := jsonb_set(ev, '{flags}', coalesce(ev -> 'flags', '{}'::jsonb) || jsonb_build_object('gato_x2', ahora + 7 * 86400));
    end if;
  elsif t = 'calor' then
    if p_op = 0 then
      ef := ef || jsonb_build_object('k', 'calor', 'v', -4, 'hasta', ahora + 12 * 3600);
      insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, 'ventilador', 1)
        on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + 1;
    elsif p_op = 1 then
      ef := ef || jsonb_build_object('k', 'calor', 'v', -6, 'hasta', ahora + 4 * 3600);
    else
      ef := ef || jsonb_build_object('k', 'crec', 'v', 0.9, 'hasta', ahora + 12 * 3600)
              || jsonb_build_object('k', 'agua', 'v', 2, 'hasta', ahora + 12 * 3600);
      resultado := 'asumido';
    end if;
  elsif t = 'visita' then
    if p_op = 0 then update tpp.perfiles set xp = xp + 40 where id = p_uid;
    elsif p_op = 1 then ef := ef || jsonb_build_object('k', 'ventas', 'v', 1.1, 'hasta', ahora + 3 * 86400);
    else resultado := 'sin_cambios'; end if;
  elsif t = 'regalo' then
    if p_op = 0 or p_op = 2 then
      update tpp.inventario set cantidad = cantidad - 1 where usuario_id = p_uid and objeto = 'abono_casero' and cantidad > 0;
      ef := ef || jsonb_build_object('k', 'crec', 'v', 1.15, 'hasta', ahora + 86400);
    end if;
    if p_op = 2 then ev := jsonb_set(ev, '{flags}', coalesce(ev -> 'flags', '{}'::jsonb) || '{"regalos": true}'); end if;
  elsif t = 'plaga' then
    ids := array(select (x #>> '{}')::uuid from jsonb_array_elements(coalesce(it -> 'datos' -> 'plantas', '[]'::jsonb)) x);
    if p_op = 0 then
      update tpp.plantas set plaga = null, plaga_desde = null where id = any (ids);
    elsif p_op = 1 then
      update tpp.plantas set plaga = null, plaga_desde = null, inmune_hasta = now() + interval '3 days' where id = any (ids);
    else
      update tpp.plantas set plaga = null, plaga_desde = null
       where id = (select id from tpp.plantas where id = any (ids) order by random() limit 1);
      resultado := 'asumido';
    end if;
  end if;

  ev := jsonb_set(ev, '{efectos}', ef);
  ev := jsonb_set(ev, '{cola}', coalesce((select jsonb_agg(x) from jsonb_array_elements(ev -> 'cola') x where (x ->> 'id')::bigint <> p_id), '[]'::jsonb));
  it := jsonb_build_object('tipo', t, 'op', p_op, 'resultado', resultado, 'coste', coste, 'en', now());
  ev := jsonb_set(ev, '{decididos}', coalesce(ev -> 'decididos', '[]'::jsonb) || it);
  ev := jsonb_set(ev, '{registro}', coalesce((select jsonb_agg(x) from (
      select x from jsonb_array_elements(it || '[]'::jsonb || coalesce(ev -> 'registro', '[]'::jsonb)) x limit 30) q), '[]'::jsonb));
  update tpp.perfiles set eventos = ev where id = p_uid;
  return jsonb_build_object('ok', true, 'resultado', resultado, 'coste', coste, 'estado', tpp.estado_json(p_uid));
end;
$$;

create function tpp.cerrar_eventos(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  update tpp.perfiles set eventos = (eventos - 'resumen' - 'decididos') where id = p_uid;
  return jsonb_build_object('ok', true);
end;
$$;

create function tpp.usar_abono_casero(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  ok integer;
begin
  update tpp.inventario set cantidad = cantidad - 1 where usuario_id = p_uid and objeto = 'abono_casero' and cantidad > 0;
  get diagnostics ok = row_count;
  if ok = 0 then return jsonb_build_object('ok', false, 'error', 'sin_objeto') || tpp.estado_json(p_uid); end if;
  update tpp.perfiles set eventos = jsonb_set(coalesce(eventos, '{}'::jsonb), '{efectos}', coalesce(eventos -> 'efectos', '[]'::jsonb)
    || jsonb_build_object('k', 'crec', 'v', 1.15, 'hasta', extract(epoch from now()) + 86400)) where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

-- Públicas.
create function public.tpp_mis_eventos() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mis_eventos(auth.uid());
end;
$$;
create function public.tpp_decidir_evento(p_id bigint, p_opcion integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.decidir_evento(auth.uid(), p_id, p_opcion);
end;
$$;
create function public.tpp_cerrar_eventos() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.cerrar_eventos(auth.uid());
end;
$$;
create function public.tpp_usar_abono_casero() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.usar_abono_casero(auth.uid());
end;
$$;

revoke all on function tpp.mult_ventas(uuid), tpp.dar_semilla(uuid), tpp.eventos_al_volver(uuid), tpp.mis_eventos(uuid),
  tpp.evento_coste(text, integer), tpp.decidir_evento(uuid, bigint, integer), tpp.cerrar_eventos(uuid), tpp.usar_abono_casero(uuid)
  from public, anon, authenticated;
revoke all on function public.tpp_mis_eventos(), public.tpp_decidir_evento(bigint, integer), public.tpp_cerrar_eventos(),
  public.tpp_usar_abono_casero() from public, anon;
grant execute on function public.tpp_mis_eventos(), public.tpp_decidir_evento(bigint, integer), public.tpp_cerrar_eventos(),
  public.tpp_usar_abono_casero() to authenticated;

-- Parches a funciones existentes.
do $mig$
declare
  d text;
  o text;
begin
  -- Sincronización: efectos activos (calor, crecimiento, consumo de agua).
  d := pg_get_functiondef('tpp.sincronizar(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'  fuera boolean;\nbegin', E'  fuera boolean;\n  ef jsonb;\n  efe jsonb;\nbegin');
  d := replace(d, E'  fuera := extract(epoch', E'  if p.desafio is null then\n    select coalesce(e.eventos -> ''efectos'', ''[]''::jsonb) into ef from tpp.perfiles e where e.id = p.usuario_id;\n    for efe in select x from jsonb_array_elements(coalesce(ef, ''[]''::jsonb)) x loop\n      if (efe ->> ''hasta'')::double precision > extract(epoch from ahora) then\n        case efe ->> ''k''\n          when ''calor'' then calor_luz := calor_luz + (efe ->> ''v'')::double precision;\n          when ''crec'' then vel := vel * (efe ->> ''v'')::double precision;\n          when ''agua'' then f_agua := f_agua * (efe ->> ''v'')::double precision;\n          else null;\n        end case;\n      end if;\n    end loop;\n  end if;\n\n  fuera := extract(epoch');
  if d = o or position('efe ->>' in d) = 0 or position('ef jsonb;' in d) = 0 then raise exception 'no se pudo parchear sincronizar'; end if;
  execute d;

  -- Estado: genera los eventos al volver tras 2 h o más fuera.
  d := pg_get_functiondef('tpp.estado_json(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'  if perfil.ultima_vez is not null and perfil.ultima_vez < now() - interval ''4 hours'' then perform tpp.robo_al_volver(p_uid); end if;',
    E'  if perfil.ultima_vez is not null and perfil.ultima_vez < now() - interval ''2 hours'' then perform tpp.eventos_al_volver(p_uid); end if;\n  if perfil.ultima_vez is not null and perfil.ultima_vez < now() - interval ''4 hours'' then perform tpp.robo_al_volver(p_uid); end if;');
  if d = o then raise exception 'no se pudo parchear estado_json'; end if;
  execute d;

  -- Plantar: una semilla regalada (semilla:<variedad>:<tipo>) se gasta en vez de pagar.
  d := pg_get_functiondef('tpp.plantar(uuid,text,text)'::regprocedure);
  o := d;
  d := replace(d, E'  if perfil.monedas < coste then',
    E'  if coste > 0 and exists (select 1 from tpp.inventario where usuario_id = p_uid and objeto = ''semilla:'' || p_variedad || '':'' || p_tipo and cantidad > 0) then\n    update tpp.inventario set cantidad = cantidad - 1 where usuario_id = p_uid and objeto = ''semilla:'' || p_variedad || '':'' || p_tipo;\n    coste := 0;\n  end if;\n  if perfil.monedas < coste then');
  if d = o then raise exception 'no se pudo parchear plantar'; end if;
  execute d;

  -- Ventas con bono (visita: esqueje regalado).
  d := pg_get_functiondef('tpp.vender_gramos(uuid,text,integer)'::regprocedure);
  o := d;
  d := replace(d, 'round(n * pg)::int', 'round(n * pg * tpp.mult_ventas(p_uid))::int');
  if d = o then raise exception 'no se pudo parchear vender_gramos'; end if;
  execute d;

  d := pg_get_functiondef('tpp.sacar_secado(uuid,integer,text)'::regprocedure);
  o := d;
  d := replace(d, E'precio := (r ->> ''precio'')::int;', E'precio := round((r ->> ''precio'')::int * tpp.mult_ventas(p_uid))::int;');
  if d = o then raise exception 'no se pudo parchear sacar_secado'; end if;
  execute d;

  d := pg_get_functiondef('tpp.secar_cosecha(uuid,text,integer)'::regprocedure);
  o := d;
  d := replace(d, E'floor((c ->> ''monedas'')::int * 0.5)::int', E'floor((c ->> ''monedas'')::int * 0.5 * tpp.mult_ventas(p_uid))::int');
  if d = o then raise exception 'no se pudo parchear secar_cosecha'; end if;
  execute d;
end
$mig$;
