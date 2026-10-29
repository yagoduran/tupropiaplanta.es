-- Fase 5a: logros y recompensa diaria.
-- Para deshacer: alter table tpp.perfiles drop column estadisticas, drop column logros, drop column racha, drop column ultimo_diario;
-- y borrar las funciones tpp.logros, tpp.valor_logro, tpp.logros_json, tpp.revisar_logros, tpp.contar, tpp.diaria_json,
-- tpp.reclamar_diaria y public.tpp_reclamar_diaria. (accion, comprar, plantar y estado_json quedan con las líneas nuevas: volver a aplicar sus migraciones anteriores.)

alter table tpp.perfiles
  add column estadisticas jsonb not null default '{}'::jsonb,
  add column logros jsonb not null default '{}'::jsonb,
  add column racha integer not null default 0,
  add column ultimo_diario date;

-- Lista de logros: lo que decide el servidor (meta y premio). Los textos y las medallas viven en la web.
create function tpp.logros() returns jsonb
language sql immutable set search_path = '' as $$
  select '[
    {"id":"primera_cosecha","stat":"cosechas","meta":1,"premio":50},
    {"id":"cosechas_5","stat":"cosechas","meta":5,"premio":150},
    {"id":"cosechas_20","stat":"cosechas","meta":20,"premio":500},
    {"id":"nivel_5","stat":"nivel","meta":5,"premio":50},
    {"id":"nivel_10","stat":"nivel","meta":10,"premio":150},
    {"id":"nivel_20","stat":"nivel","meta":20,"premio":400},
    {"id":"riegos_50","stat":"riegos","meta":50,"premio":60},
    {"id":"abonos_25","stat":"abonos","meta":25,"premio":60},
    {"id":"compras_5","stat":"compras","meta":5,"premio":60},
    {"id":"variedades_5","stat":"variedades","meta":5,"premio":200},
    {"id":"racha_7","stat":"racha_max","meta":7,"premio":150},
    {"id":"gastado_1000","stat":"gastado","meta":1000,"premio":100}
  ]'::jsonb;
$$;

create function tpp.valor_logro(p tpp.perfiles, p_stat text) returns integer
language sql stable set search_path = '' as $$
  select case p_stat
    when 'nivel' then tpp.nivel_de(p.xp)
    when 'variedades' then (select count(*)::int from jsonb_object_keys(coalesce(p.estadisticas -> 'variedades', '{}'::jsonb)))
    else coalesce((p.estadisticas ->> p_stat)::int, 0)
  end;
$$;

-- Valor actual de cada logro (para las barras de progreso) y lista de los ya conseguidos.
create function tpp.logros_json(p tpp.perfiles) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'valores', (select jsonb_object_agg(l ->> 'id', least(tpp.valor_logro(p, l ->> 'stat'), (l ->> 'meta')::int))
                from jsonb_array_elements(tpp.logros()) l),
    'hechos', (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(p.logros) k)
  );
$$;

-- Suma uno (o n) a una estadística del jugador.
create function tpp.contar(p_uid uuid, p_clave text, p_n integer) returns void
language sql security definer set search_path = '' as $$
  update tpp.perfiles
    set estadisticas = jsonb_set(estadisticas, array[p_clave], to_jsonb(coalesce((estadisticas ->> p_clave)::int, 0) + p_n))
    where id = p_uid;
$$;

-- Da los logros recién cumplidos (con su premio en monedas) y devuelve sus ids.
create function tpp.revisar_logros(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  l jsonb;
  nuevos jsonb := '[]'::jsonb;
  hechos jsonb;
  premio integer := 0;
begin
  select * into perfil from tpp.perfiles where id = p_uid;
  if perfil.id is null then return nuevos; end if;
  hechos := perfil.logros;
  for l in select * from jsonb_array_elements(tpp.logros()) loop
    if hechos -> (l ->> 'id') is null and tpp.valor_logro(perfil, l ->> 'stat') >= (l ->> 'meta')::int then
      nuevos := nuevos || to_jsonb(l ->> 'id');
      hechos := hechos || jsonb_build_object(l ->> 'id', now());
      premio := premio + (l ->> 'premio')::int;
    end if;
  end loop;
  if premio > 0 then
    update tpp.perfiles set logros = hechos, monedas = monedas + premio where id = p_uid;
  end if;
  return nuevos;
end;
$$;

-- Recompensa diaria: racha de 7 días (20, 30, 40, 50, 60, 80 y 100 monedas). Si se falta un día, vuelve a empezar.
-- El día cambia a medianoche, hora de Madrid.
create function tpp.diaria_json(p tpp.perfiles) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  disponible boolean := p.ultimo_diario is distinct from hoy;
  racha integer := case when p.ultimo_diario >= hoy - 1 then p.racha else 0 end;
begin
  return jsonb_build_object(
    'racha', racha,
    'disponible', disponible,
    'premios', '[20,30,40,50,60,80,100]'::jsonb
  );
end;
$$;

create function tpp.reclamar_diaria(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  dia integer;
  premio integer;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  if perfil.ultimo_diario = hoy then
    return jsonb_build_object('ok', false, 'error', 'diaria_ya_reclamada') || tpp.estado_json(p_uid);
  end if;
  dia := case when perfil.ultimo_diario = hoy - 1 and perfil.racha < 7 then perfil.racha + 1 else 1 end;
  premio := (array[20, 30, 40, 50, 60, 80, 100])[dia];
  update tpp.perfiles set racha = dia, ultimo_diario = hoy, monedas = monedas + premio,
    estadisticas = jsonb_set(estadisticas, '{racha_max}', to_jsonb(greatest(coalesce((estadisticas ->> 'racha_max')::int, 0), dia)))
    where id = p_uid;
  return jsonb_build_object('ok', true, 'recompensa', premio) || tpp.estado_json(p_uid);
end;
$$;

create function public.tpp_reclamar_diaria() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.reclamar_diaria(auth.uid());
end;
$$;

revoke all on function tpp.logros() from public, anon, authenticated;
revoke all on function tpp.valor_logro(tpp.perfiles, text) from public, anon, authenticated;
revoke all on function tpp.logros_json(tpp.perfiles) from public, anon, authenticated;
revoke all on function tpp.contar(uuid, text, integer) from public, anon, authenticated;
revoke all on function tpp.revisar_logros(uuid) from public, anon, authenticated;
revoke all on function tpp.diaria_json(tpp.perfiles) from public, anon, authenticated;
revoke all on function tpp.reclamar_diaria(uuid) from public, anon, authenticated;
revoke all on function public.tpp_reclamar_diaria() from public, anon;
grant execute on function public.tpp_reclamar_diaria() to authenticated;

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

  select id into pid from tpp.plantas where usuario_id = p_uid and estado = 'viva';
  if pid is null then
    select id into pid from tpp.plantas where usuario_id = p_uid order by plantada_en desc limit 1;
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
      'esperas', esperas
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
      'nivel', nivel,
      'xp_pct', round(100 * (perfil.xp - 25 * (nivel - 1) ^ 2) / (25 * nivel ^ 2 - 25 * (nivel - 1) ^ 2))
    ),
    'planta', planta
  );
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
begin
  perform tpp.asegurar_perfil(p_uid);

  if p_accion not in ('regar', 'abonar', 'podar', 'ajustar_luz', 'cosechar') then
    return jsonb_build_object('ok', false, 'error', 'accion_desconocida') || tpp.estado_json(p_uid);
  end if;

  select id into pid from tpp.plantas where usuario_id = p_uid and estado = 'viva';
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

create or replace function tpp.comprar(p_uid uuid, p_objeto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  item jsonb;
  precio integer;
  tipo text;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  select c into item from jsonb_array_elements(tpp.catalogo()) c where c ->> 'id' = p_objeto;
  if item is null then
    return jsonb_build_object('ok', false, 'error', 'objeto_desconocido') || tpp.estado_json(p_uid);
  end if;
  precio := (item ->> 'precio')::int;
  tipo := item ->> 'tipo';

  if precio = 0 or (tipo <> 'consumible' and tpp.tiene(p_uid, p_objeto)) then
    return jsonb_build_object('ok', false, 'error', 'ya_lo_tienes') || tpp.estado_json(p_uid);
  end if;
  if tpp.nivel_de(perfil.xp) < (item ->> 'nivel')::int then
    return jsonb_build_object('ok', false, 'error', 'nivel_insuficiente') || tpp.estado_json(p_uid);
  end if;
  if perfil.monedas < precio then
    return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.estado_json(p_uid);
  end if;

  update tpp.perfiles set monedas = monedas - precio where id = p_uid;
  perform tpp.contar(p_uid, 'compras', 1);
  perform tpp.contar(p_uid, 'gastado', precio);
  insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, p_objeto, 1)
    on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + 1;

  if tipo = 'maceta' or tipo = 'luz' then
    update tpp.perfiles set equipo = equipo || jsonb_build_object(tipo, p_objeto) where id = p_uid;
  elsif tipo = 'decoracion' then
    update tpp.perfiles set equipo = jsonb_set(equipo, '{decoracion}', (equipo -> 'decoracion') || to_jsonb(p_objeto)) where id = p_uid;
  end if;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
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
  if exists (select 1 from tpp.plantas where usuario_id = p_uid and estado = 'viva') then
    return jsonb_build_object('ok', false, 'error', 'ya_hay_planta') || tpp.estado_json(p_uid);
  end if;
  insert into tpp.plantas (usuario_id, variedad) values (p_uid, p_variedad);
  update tpp.perfiles set estadisticas = jsonb_set(estadisticas, '{variedades}',
    coalesce(estadisticas -> 'variedades', '{}'::jsonb) || jsonb_build_object(p_variedad, true)) where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;
