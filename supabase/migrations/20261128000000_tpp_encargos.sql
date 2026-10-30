-- Encargos: cada cosecha da gramos de su variedad (20 g x multiplicador de la variedad x salud / 100, mínimo 1) que se guardan
-- en tpp.perfiles.almacen. Cada 2 horas (hasta 3 a la vez) llega un encargo por el móvil del juego: X gramos de una variedad
-- que el jugador ya conoce, con plazo de 24 h; al entregarlo se descuentan los gramos y se cobran monedas y XP.
-- El encargo nuevo se crea al abrir el panel o al pedir los avisos; avisa con una notificación de tipo «encargo».
-- Para deshacer: borrar public.tpp_encargos, public.tpp_entregar_encargo, tpp.encargos_al_dia, tpp.mis_encargos, tpp.entregar_encargo,
-- las columnas almacen y encargos de tpp.perfiles y volver a aplicar las versiones anteriores de tpp.accion y public.tpp_notificaciones.

alter table tpp.perfiles
  add column if not exists almacen jsonb not null default '{}'::jsonb,
  add column if not exists encargos jsonb not null default '{}'::jsonb;

-- Quita los caducados y, si toca, crea uno nuevo.
create function tpp.encargos_al_dia(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e jsonb;
  lista jsonb;
  prox timestamptz;
  vars text[];
  v text;
  mult double precision;
  g integer;
  remites text[] := array['Marta, la vecina', 'Don Ramón', 'Lucía, del vivero', 'Pepe, el cartero', 'La abuela Carmen', 'Sergio, el botánico'];
begin
  perform tpp.asegurar_perfil(p_uid);
  select encargos into e from tpp.perfiles where id = p_uid for update;
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
    g := (5 * round((20 + random() * 40) / 5))::int;
    lista := lista || jsonb_build_array(jsonb_build_object(
      'id', substr(md5(random()::text || clock_timestamp()::text), 1, 8),
      'remite', remites[1 + floor(random() * array_length(remites, 1))::int],
      'variedad', v,
      'g', g,
      'monedas', (5 * round(g * 10 * mult / 5))::int,
      'xp', round(g * mult)::int,
      'hasta', now() + interval '24 hours'));
    prox := now() + interval '2 hours';
    perform tpp.notificar(p_uid, 'encargo', 'Tienes un encargo nuevo', 'Te han escrito al móvil pidiéndote plantas. Tienes 24 horas.');
  end if;
  e := jsonb_build_object('lista', lista, 'proximo', prox);
  update tpp.perfiles set encargos = e where id = p_uid;
  return e;
end;
$$;

-- Lo que ve el jugador: sus encargos con los gramos que tiene y el tiempo que queda.
create function tpp.mis_encargos(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e jsonb;
  alm jsonb;
begin
  e := tpp.encargos_al_dia(p_uid);
  select almacen into alm from tpp.perfiles where id = p_uid;
  return jsonb_build_object(
    'almacen', alm,
    'siguiente_en', case when jsonb_array_length(e -> 'lista') >= 3 then null
                         else greatest(0, floor(extract(epoch from ((e ->> 'proximo')::timestamptz - now()))))::int end,
    'lista', coalesce((select jsonb_agg(
        (x - 'hasta') || jsonb_build_object(
          'tengo', coalesce((alm ->> (x ->> 'variedad'))::int, 0),
          'restan', greatest(0, floor(extract(epoch from ((x ->> 'hasta')::timestamptz - now()))))::int)
        order by (x ->> 'hasta')::timestamptz) from jsonb_array_elements(e -> 'lista') x), '[]'::jsonb));
end;
$$;

-- Entrega un encargo: descuenta los gramos y paga.
create function tpp.entregar_encargo(p_uid uuid, p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e jsonb;
  x jsonb;
  alm jsonb;
  tiene integer;
begin
  e := tpp.encargos_al_dia(p_uid);
  select y into x from jsonb_array_elements(e -> 'lista') y where y ->> 'id' = p_id;
  if x is null then
    return jsonb_build_object('ok', false, 'error', 'encargo_desconocido') || tpp.estado_json(p_uid);
  end if;
  select almacen into alm from tpp.perfiles where id = p_uid for update;
  tiene := coalesce((alm ->> (x ->> 'variedad'))::int, 0);
  if tiene < (x ->> 'g')::int then
    return jsonb_build_object('ok', false, 'error', 'faltan_gramos') || tpp.estado_json(p_uid);
  end if;
  e := jsonb_set(e, '{lista}', coalesce((select jsonb_agg(y) from jsonb_array_elements(e -> 'lista') y where y ->> 'id' <> p_id), '[]'::jsonb));
  update tpp.perfiles set
    almacen = almacen || jsonb_build_object(x ->> 'variedad', tiene - (x ->> 'g')::int),
    encargos = e,
    monedas = monedas + (x ->> 'monedas')::int,
    xp = xp + (x ->> 'xp')::int
    where id = p_uid;
  perform tpp.pase_puntos(p_uid, 30);
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

create function public.tpp_encargos() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mis_encargos(auth.uid());
end;
$$;

create function public.tpp_entregar_encargo(p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.entregar_encargo(auth.uid(), p_id);
end;
$$;

revoke all on function tpp.encargos_al_dia(uuid) from public, anon, authenticated;
revoke all on function tpp.mis_encargos(uuid) from public, anon, authenticated;
revoke all on function tpp.entregar_encargo(uuid, text) from public, anon, authenticated;
revoke all on function public.tpp_encargos() from public, anon;
revoke all on function public.tpp_entregar_encargo(text) from public, anon;
grant execute on function public.tpp_encargos() to authenticated;
grant execute on function public.tpp_entregar_encargo(text) to authenticated;

do $mig$
declare
  d text;
  o text;
begin
  -- Cosechar también guarda gramos.
  d := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, E'xp = xp + xp_cosecha,\n',
    E'xp = xp + xp_cosecha,\n      almacen = almacen || jsonb_build_object(p.variedad, coalesce((almacen ->> p.variedad)::int, 0)\n        + greatest(1, round(20 * coalesce((tpp.datos_variedad(p_uid, p.variedad) ->> ''recompensa'')::double precision, 1) * p.salud / 100)::int)),\n');
  if d = o then raise exception 'accion no cambia'; end if;
  execute d;

  -- Los avisos se piden a menudo: así los encargos llegan aunque no abras el panel.
  d := pg_get_functiondef('public.tpp_notificaciones()'::regprocedure);
  o := d;
  d := replace(d, 'return tpp.mis_notificaciones(auth.uid());', E'perform tpp.encargos_al_dia(auth.uid());\n  return tpp.mis_notificaciones(auth.uid());');
  if d = o then raise exception 'notificaciones no cambia'; end if;
  execute d;
end
$mig$;
