-- Encargos como mensajes: llegan «nuevos» (3 horas para responder), se aceptan o se rechazan, y solo los aceptados se entregan.
--   Plazo de entrega al aceptar: normal 3 días, urgente 24 h, grande (al por mayor) 5 días.
--   Llega 1 encargo cada 3 horas (hasta 3 abiertos entre nuevos y aceptados).
--   Cada encargo tiene un cliente (0 a 11, con retrato). Los caducados y entregados pasan a un historial de 12.
--   Los encargos que ya estaban en marcha se tratan como aceptados.
--
-- Para deshacer: drop function public.tpp_aceptar_encargo(text), public.tpp_rechazar_encargo(text), tpp.aceptar_encargo(uuid, text),
-- tpp.rechazar_encargo(uuid, text) y volver a las versiones de encargos_al_dia, mis_encargos y entregar_encargo de 20261128 y 20261146.

create or replace function tpp.encargos_al_dia(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e jsonb;
  lista jsonb;
  hist jsonb;
  caducados jsonb;
  prox timestamptz;
  vars text[];
  v text;
  mult double precision;
  g integer;
  tipo text;
  msj text;
  plazo integer;
  fac double precision;
  cli integer;
  clientes integer[];
  r double precision := random();
  nombres text[] := array['Doña Rosa', 'Javi', 'Lola', 'Don Ernesto', 'Nuria', 'Kike', 'Carmen', 'El Coleccionista', 'Aitana', 'Paco', 'Valeria', 'Toni'];
  m_normal text[] := array['Hola, ¿me puedes conseguir {g} g de {v}? ¡Te lo pago bien!', 'Buenas, necesito {g} g de {v} para una receta. ¿Te sobra algo?', '¡Hola! Me han hablado de tu {v}. ¿Me vendes {g} g?', 'Oye, ando corto de {v}: ¿me traes {g} g cuando puedas?', 'Tengo una visita mañana y quiero {g} g de {v}. ¡Te lo agradezco!', '¿Qué tal? Busco {g} g de {v} de la buena. ¿Puedes?', 'Me han dicho que cultivas {v}. Necesito {g} g, ¿trato hecho?', 'Hola, vecino. Si tienes {g} g de {v}, te los compro encantado.', 'Un favor: {g} g de {v} para un regalo. ¡Pago bien!', '¡Buenas! Necesito {g} g de {v} para esta semana. ¿Me ayudas?'];
  m_urgente text[] := array['¡URGENTE! Necesito {g} g de {v} ya mismo, te pago extra.', 'Se me ha acabado todo y me hace falta {g} g de {v} hoy. ¡Te doy un plus!', '¡Socorro! {g} g de {v} lo antes posible, pago más de lo normal.', 'Pedido de última hora: {g} g de {v}. ¡Con prisa y buena paga!', 'Me ha salido un compromiso: ¿{g} g de {v} para hoy? Pago extra.'];
  m_grande text[] := array['Hago un pedido grande: {g} g de {v}. Tienes cinco días y te lo pago mejor.', 'Vengo a por mucho: {g} g de {v}. Hay tiempo, pero merece la pena.', 'Para una fiesta necesito {g} g de {v}. Pedido grande, buena recompensa.', 'Encargo especial: {g} g de {v}. Pago más por gramo y tienes cinco días.', 'Si me consigues {g} g de {v}, te hago cliente fijo. Pedido grande.'];
begin
  perform tpp.asegurar_perfil(p_uid);
  select encargos into e from tpp.perfiles where id = p_uid for update;
  select coalesce(jsonb_agg(x || jsonb_build_object('estado', 'caducado',
           'por', case when coalesce(x ->> 'estado', 'aceptado') = 'nuevo' then 'sin responder' else 'sin entregar' end)), '[]'::jsonb)
    into caducados from jsonb_array_elements(coalesce(e -> 'lista', '[]'::jsonb)) x
    where (x ->> 'hasta')::timestamptz <= now();
  hist := (select coalesce(jsonb_agg(h - 'hasta' order by o), '[]'::jsonb) from (
            select h, o from jsonb_array_elements(caducados || coalesce(e -> 'hist', '[]'::jsonb)) with ordinality t(h, o) order by o limit 12) s);
  lista := coalesce((select jsonb_agg(x) from jsonb_array_elements(coalesce(e -> 'lista', '[]'::jsonb)) x
                      where (x ->> 'hasta')::timestamptz > now()), '[]'::jsonb);
  prox := (e ->> 'proximo')::timestamptz;
  if jsonb_array_length(lista) < 3 and (prox is null or now() >= prox) then
    select array_agg(k) into vars from (
      select 'clasica' as k
      union
      select k from jsonb_object_keys(coalesce((select estadisticas -> 'variedades' from tpp.perfiles where id = p_uid), '{}'::jsonb)) k
    ) s where k in (select jsonb_object_keys(tpp.variedades())) and k not like 'ed-%';
    v := vars[1 + floor(random() * array_length(vars, 1))::int];
    mult := (tpp.variedades() -> v ->> 'recompensa')::double precision;
    if r < 0.65 then
      tipo := 'normal'; fac := 1; plazo := 259200; g := (5 * round((20 + random() * 40) / 5))::int;
      msj := m_normal[1 + floor(random() * array_length(m_normal, 1))::int]; clientes := array[0, 1, 3, 6, 8];
    elsif r < 0.85 then
      tipo := 'urgente'; fac := 1.5; plazo := 86400; g := (5 * round((20 + random() * 20) / 5))::int;
      msj := m_urgente[1 + floor(random() * array_length(m_urgente, 1))::int]; clientes := array[4, 5];
    else
      tipo := 'grande'; fac := 1.2; plazo := 432000; g := (5 * round((60 + random() * 60) / 5))::int;
      msj := m_grande[1 + floor(random() * array_length(m_grande, 1))::int]; clientes := array[3, 9];
    end if;
    cli := clientes[1 + floor(random() * array_length(clientes, 1))::int];
    lista := lista || jsonb_build_array(jsonb_build_object(
      'id', substr(md5(random()::text || clock_timestamp()::text), 1, 8),
      'cliente', cli,
      'remite', nombres[cli + 1],
      'estado', 'nuevo',
      'variedad', v,
      'g', g,
      'tipo', tipo,
      'mensaje', msj,
      'plazo', plazo,
      'monedas', (5 * round(g * 10 * mult * fac / 5))::int,
      'xp', round(g * mult * fac)::int,
      'hasta', now() + interval '3 hours'));
    prox := now() + interval '3 hours';
    perform tpp.notificar(p_uid, 'encargo', 'Tienes un encargo nuevo', nombres[cli + 1] || ' te ha escrito al móvil. Tienes 3 horas para responder.');
  end if;
  e := jsonb_build_object('lista', lista, 'hist', hist, 'proximo', prox);
  update tpp.perfiles set encargos = e where id = p_uid;
  return e;
end;
$$;

create or replace function tpp.mis_encargos(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e jsonb;
  alm jsonb;
begin
  e := tpp.encargos_al_dia(p_uid);
  select almacen into alm from tpp.perfiles where id = p_uid;
  return jsonb_build_object(
    'almacen', alm,
    'historial', coalesce(e -> 'hist', '[]'::jsonb),
    'siguiente_en', case when jsonb_array_length(e -> 'lista') >= 3 then null
                         else greatest(0, floor(extract(epoch from ((e ->> 'proximo')::timestamptz - now()))))::int end,
    'lista', coalesce((select jsonb_agg(
        (x - 'hasta') || jsonb_build_object(
          'estado', coalesce(x ->> 'estado', 'aceptado'),
          'tengo', coalesce((alm ->> (x ->> 'variedad'))::int, 0),
          'restan', greatest(0, floor(extract(epoch from ((x ->> 'hasta')::timestamptz - now()))))::int)
        order by (x ->> 'hasta')::timestamptz) from jsonb_array_elements(e -> 'lista') x), '[]'::jsonb));
end;
$$;

create function tpp.aceptar_encargo(p_uid uuid, p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e jsonb;
  x jsonb;
begin
  e := tpp.encargos_al_dia(p_uid);
  select y into x from jsonb_array_elements(e -> 'lista') y where y ->> 'id' = p_id;
  if x is null then return jsonb_build_object('ok', false, 'error', 'encargo_desconocido'); end if;
  if coalesce(x ->> 'estado', 'aceptado') <> 'nuevo' then return jsonb_build_object('ok', false, 'error', 'ya_aceptado'); end if;
  e := jsonb_set(e, '{lista}', (select jsonb_agg(case when y ->> 'id' = p_id
      then y || jsonb_build_object('estado', 'aceptado', 'hasta', now() + make_interval(secs => coalesce((y ->> 'plazo')::int, 86400)))
      else y end) from jsonb_array_elements(e -> 'lista') y));
  update tpp.perfiles set encargos = e where id = p_uid;
  return jsonb_build_object('ok', true);
end;
$$;

-- Rechaza un encargo nuevo (desaparece) o cancela uno aceptado (pasa al historial como caducado).
create function tpp.rechazar_encargo(p_uid uuid, p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e jsonb;
  x jsonb;
begin
  e := tpp.encargos_al_dia(p_uid);
  select y into x from jsonb_array_elements(e -> 'lista') y where y ->> 'id' = p_id;
  if x is null then return jsonb_build_object('ok', false, 'error', 'encargo_desconocido'); end if;
  e := jsonb_set(e, '{lista}', coalesce((select jsonb_agg(y) from jsonb_array_elements(e -> 'lista') y where y ->> 'id' <> p_id), '[]'::jsonb));
  if coalesce(x ->> 'estado', 'aceptado') = 'aceptado' then
    e := jsonb_set(e, '{hist}', jsonb_build_array((x - 'hasta') || jsonb_build_object('estado', 'caducado', 'por', 'cancelado')) || coalesce(e -> 'hist', '[]'::jsonb));
  end if;
  update tpp.perfiles set encargos = e where id = p_uid;
  return jsonb_build_object('ok', true);
end;
$$;

create function public.tpp_aceptar_encargo(p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.aceptar_encargo(auth.uid(), p_id);
end;
$$;

create function public.tpp_rechazar_encargo(p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.rechazar_encargo(auth.uid(), p_id);
end;
$$;

revoke all on function tpp.aceptar_encargo(uuid, text) from public, anon, authenticated;
revoke all on function tpp.rechazar_encargo(uuid, text) from public, anon, authenticated;
revoke all on function public.tpp_aceptar_encargo(text) from public, anon;
revoke all on function public.tpp_rechazar_encargo(text) from public, anon;
grant execute on function public.tpp_aceptar_encargo(text) to authenticated;
grant execute on function public.tpp_rechazar_encargo(text) to authenticated;

do $mig$
declare
  d text := pg_get_functiondef('tpp.entregar_encargo(uuid,text)'::regprocedure);
  o text := d;
begin
  d := replace(d, E'  select almacen into alm from tpp.perfiles where id = p_uid for update;',
    E'  if coalesce(x ->> \'estado\', \'aceptado\') <> \'aceptado\' then\n    return jsonb_build_object(\'ok\', false, \'error\', \'sin_aceptar\') || tpp.estado_json(p_uid);\n  end if;\n  select almacen into alm from tpp.perfiles where id = p_uid for update;');
  if d = o then raise exception 'estado no cambia'; end if;
  o := d;
  d := replace(d, E'  update tpp.perfiles set\n    almacen',
    E'  e := jsonb_set(e, \'{hist}\', jsonb_build_array((x - \'hasta\') || jsonb_build_object(\'estado\', \'entregado\')) || coalesce(e -> \'hist\', \'[]\'::jsonb));\n  update tpp.perfiles set\n    almacen');
  if d = o then raise exception 'hist no cambia'; end if;
  execute d;
end
$mig$;
