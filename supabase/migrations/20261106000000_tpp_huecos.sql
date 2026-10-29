-- Fase 7: huecos de cultivo múltiples (hasta 3). Se amplían con monedas y nivel, como ampliar la casa.
-- El jugador tiene un hueco activo (perfiles.hueco_activo) y todas las acciones actúan sobre la planta de ese hueco.
-- Para deshacer: volver a aplicar las versiones anteriores de accion, plantar, tratar, usar y estado_json,
-- crear de nuevo el índice plantas_una_viva_por_usuario y borrar las columnas y funciones nuevas.

alter table tpp.perfiles
  add column huecos smallint not null default 1 check (huecos between 1 and 3),
  add column hueco_activo smallint not null default 1 check (hueco_activo between 1 and 3);

alter table tpp.plantas add column hueco smallint not null default 1 check (hueco between 1 and 3);

drop index tpp.plantas_una_viva_por_usuario;
create unique index plantas_una_viva_por_hueco on tpp.plantas (usuario_id, hueco) where estado = 'viva';

create function tpp.hueco_activo(p_uid uuid) returns smallint
language sql stable security definer set search_path = '' as $$
  select coalesce((select hueco_activo from tpp.perfiles where id = p_uid), 1::smallint);
$$;

-- Precio y nivel para desbloquear cada hueco (el 1 viene incluido).
create function tpp.hueco_coste(p_hueco integer) returns jsonb
language sql immutable set search_path = '' as $$
  select case p_hueco
    when 2 then '{"precio":2500,"nivel":8}'::jsonb
    when 3 then '{"precio":10000,"nivel":15}'::jsonb
  end;
$$;

-- Resumen de cada hueco desbloqueado para el selector de la pantalla.
create function tpp.huecos_json(perfil tpp.perfiles) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  lista jsonb := '[]'::jsonb;
  i integer;
  pid uuid;
  p tpp.plantas;
  vida text;
begin
  for i in 1..perfil.huecos loop
    pid := null;
    select id into pid from tpp.plantas where usuario_id = perfil.id and hueco = i
      order by (estado = 'viva') desc, plantada_en desc limit 1;
    if pid is null then
      vida := 'vacio';
      p := null;
    else
      p := tpp.sincronizar(pid);
      vida := p.estado;
    end if;
    lista := lista || jsonb_build_object('hueco', i, 'vida', vida, 'plaga', p.plaga is not null);
  end loop;
  return jsonb_build_object(
    'activo', perfil.hueco_activo,
    'desbloqueados', perfil.huecos,
    'siguiente', case when perfil.huecos < 3 then tpp.hueco_coste(perfil.huecos + 1) end,
    'lista', lista
  );
end;
$$;

create function tpp.elegir_hueco(p_uid uuid, p_hueco integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  if p_hueco is null or p_hueco < 1 or p_hueco > perfil.huecos then
    return jsonb_build_object('ok', false, 'error', 'hueco_bloqueado') || tpp.estado_json(p_uid);
  end if;
  update tpp.perfiles set hueco_activo = p_hueco where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

create function tpp.comprar_hueco(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  coste jsonb;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  if perfil.huecos >= 3 then
    return jsonb_build_object('ok', false, 'error', 'huecos_maximos') || tpp.estado_json(p_uid);
  end if;
  coste := tpp.hueco_coste(perfil.huecos + 1);
  if tpp.nivel_de(perfil.xp) < (coste ->> 'nivel')::int then
    return jsonb_build_object('ok', false, 'error', 'nivel_insuficiente') || tpp.estado_json(p_uid);
  end if;
  if perfil.monedas < (coste ->> 'precio')::int then
    return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.estado_json(p_uid);
  end if;
  update tpp.perfiles set monedas = monedas - (coste ->> 'precio')::int, huecos = huecos + 1,
    hueco_activo = huecos + 1 where id = p_uid;
  perform tpp.contar(p_uid, 'gastado', (coste ->> 'precio')::int);
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

create function public.tpp_elegir_hueco(p_hueco integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.elegir_hueco(auth.uid(), p_hueco);
end;
$$;

create function public.tpp_comprar_hueco() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.comprar_hueco(auth.uid());
end;
$$;

revoke all on function tpp.hueco_activo(uuid) from public, anon, authenticated;
revoke all on function tpp.hueco_coste(integer) from public, anon, authenticated;
revoke all on function tpp.huecos_json(tpp.perfiles) from public, anon, authenticated;
revoke all on function tpp.elegir_hueco(uuid, integer) from public, anon, authenticated;
revoke all on function tpp.comprar_hueco(uuid) from public, anon, authenticated;
revoke all on function public.tpp_elegir_hueco(integer) from public, anon;
revoke all on function public.tpp_comprar_hueco() from public, anon;
grant execute on function public.tpp_elegir_hueco(integer) to authenticated;
grant execute on function public.tpp_comprar_hueco() to authenticated;

-- Versiones nuevas de las funciones que trabajan con "la planta" del jugador (ahora la de su hueco activo).
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
begin
  perform tpp.asegurar_perfil(p_uid);

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
    update tpp.perfiles set monedas = monedas + recompensa, xp = xp + 100 where id = p_uid;
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
    salud = case when p_accion = 'podar' then least(100, salud + extra_salud) else salud end,
    esperas = esperas || jsonb_build_object(p_accion, now() + make_interval(secs => espera))
  where id = p.id;
  update tpp.perfiles set xp = xp + 5, monedas = monedas + ganadas where id = p_uid;
  if p_accion = 'regar' then perform tpp.contar(p_uid, 'riegos', 1);
  elsif p_accion = 'abonar' then perform tpp.contar(p_uid, 'abonos', 1);
  end if;

  return jsonb_build_object('ok', true, 'ganadas', ganadas) || tpp.estado_json(p_uid);
end;
$$;
create or replace function tpp.plantar(p_uid uuid, p_variedad text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  v jsonb;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  v := tpp.variedades() -> p_variedad;
  if v is null then
    return jsonb_build_object('ok', false, 'error', 'variedad_desconocida') || tpp.estado_json(p_uid);
  end if;
  if tpp.nivel_de(perfil.xp) < (v ->> 'nivel')::int then
    return jsonb_build_object('ok', false, 'error', 'variedad_bloqueada') || tpp.estado_json(p_uid);
  end if;
  if exists (select 1 from tpp.plantas where usuario_id = p_uid and estado = 'viva' and hueco = tpp.hueco_activo(p_uid)) then
    return jsonb_build_object('ok', false, 'error', 'ya_hay_planta') || tpp.estado_json(p_uid);
  end if;
  insert into tpp.plantas (usuario_id, variedad, hueco) values (p_uid, p_variedad, tpp.hueco_activo(p_uid));
  update tpp.perfiles set estadisticas = jsonb_set(estadisticas, '{variedades}',
    coalesce(estadisticas -> 'variedades', '{}'::jsonb) || jsonb_build_object(p_variedad, true)) where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;
create or replace function tpp.tratar(p_uid uuid, p_objeto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p tpp.plantas;
  pid uuid;
begin
  if not exists (select 1 from tpp.inventario where usuario_id = p_uid and objeto = p_objeto and cantidad > 0) then
    return jsonb_build_object('ok', false, 'error', 'sin_existencias') || tpp.estado_json(p_uid);
  end if;
  select id into pid from tpp.plantas where usuario_id = p_uid and estado = 'viva' and hueco = tpp.hueco_activo(p_uid);
  if pid is null then
    return jsonb_build_object('ok', false, 'error', 'sin_planta') || tpp.estado_json(p_uid);
  end if;
  p := tpp.sincronizar(pid);
  if p.estado <> 'viva' then
    return jsonb_build_object('ok', false, 'error', 'planta_muerta') || tpp.estado_json(p_uid);
  end if;
  if p.plaga is null then
    return jsonb_build_object('ok', false, 'error', 'sin_plaga') || tpp.estado_json(p_uid);
  end if;
  if (p_objeto = 'fungicida') <> (p.plaga = 'moho') then
    return jsonb_build_object('ok', false, 'error', 'tratamiento_incorrecto') || tpp.estado_json(p_uid);
  end if;
  update tpp.inventario set cantidad = cantidad - 1 where usuario_id = p_uid and objeto = p_objeto;
  update tpp.plantas set plaga = null, plaga_desde = null, inmune_hasta = now() + interval '12 hours' where id = p.id;
  update tpp.perfiles set xp = xp + 10 where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;
create or replace function tpp.usar(p_uid uuid, p_objeto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p tpp.plantas;
  pid uuid;
  fase integer;
begin
  perform tpp.asegurar_perfil(p_uid);
  if p_objeto in ('pulverizador', 'fungicida') then
    return tpp.tratar(p_uid, p_objeto);
  end if;
  if p_objeto not in ('fert_generico', 'fert_crecimiento', 'fert_floracion', 'fert_mejorador') then
    return jsonb_build_object('ok', false, 'error', 'objeto_desconocido') || tpp.estado_json(p_uid);
  end if;
  if not exists (select 1 from tpp.inventario where usuario_id = p_uid and objeto = p_objeto and cantidad > 0) then
    return jsonb_build_object('ok', false, 'error', 'sin_existencias') || tpp.estado_json(p_uid);
  end if;

  select id into pid from tpp.plantas where usuario_id = p_uid and estado = 'viva' and hueco = tpp.hueco_activo(p_uid);
  if pid is null then
    return jsonb_build_object('ok', false, 'error', 'sin_planta') || tpp.estado_json(p_uid);
  end if;
  p := tpp.sincronizar(pid);
  if p.estado <> 'viva' then
    return jsonb_build_object('ok', false, 'error', 'planta_muerta') || tpp.estado_json(p_uid);
  end if;
  fase := tpp.fase_planta(p);

  if (p_objeto = 'fert_crecimiento' and fase not between 4 and 5)
     or (p_objeto = 'fert_floracion' and fase not between 6 and 7) then
    return jsonb_build_object('ok', false, 'error', 'fase_incorrecta') || tpp.estado_json(p_uid);
  end if;
  if p_objeto = 'fert_mejorador' and p.bonus_cosecha >= 0.1 then
    return jsonb_build_object('ok', false, 'error', 'ya_aplicado') || tpp.estado_json(p_uid);
  end if;

  update tpp.inventario set cantidad = cantidad - 1 where usuario_id = p_uid and objeto = p_objeto;
  update tpp.plantas set
    nutrientes = least(100, nutrientes + case p_objeto
      when 'fert_generico' then 20 when 'fert_crecimiento' then 35 when 'fert_floracion' then 25 else 0 end),
    bonus_cosecha = case p_objeto
      when 'fert_floracion' then bonus_cosecha + 0.1 when 'fert_mejorador' then bonus_cosecha + 0.1 else bonus_cosecha end
  where id = p.id;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
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
      'temperatura', p.temperatura,
      'ph', p.ph,
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
