-- Obras de la casa: 4 proyectos grandes con tiempo real, uno a la vez, que dan un bono permanente.
-- Se guardan en perfiles.obras = {"hechas": ["salon", ...], "activa": {"id": "...", "fin": <epoch>} | null}.
-- Una obra cuenta como hecha en cuanto pasa su hora de fin (no hace falta abrir la pantalla).

alter table tpp.perfiles add column if not exists obras jsonb not null default '{}'::jsonb;

create or replace function tpp.obras_def() returns jsonb language sql immutable set search_path = '' as $$
  select '[
    {"id":"salon","nombre":"Reforma del salón","desc":"+5 % de XP en cuidados y minijuegos.","nivel":12,"precio":4000,"horas":4},
    {"id":"cocina","nombre":"Cocina profesional","desc":"+10 % de monedas al vender procesados.","nivel":20,"precio":10000,"horas":12},
    {"id":"sotano","nombre":"Sótano blindado","desc":"−25 % de sospecha al comprar en el mercado negro.","nivel":28,"precio":25000,"horas":24},
    {"id":"ampliacion","nombre":"Gran ampliación","desc":"+1 hueco de cultivo en el salón.","nivel":36,"precio":60000,"horas":48}
  ]'::jsonb;
$$;

-- ¿Está hecha esta obra? (también si ya pasó su hora de fin aunque nadie la haya recogido)
create or replace function tpp.obra_hecha(p_obras jsonb, p_id text) returns boolean language sql stable set search_path = '' as $$
  select coalesce(p_obras -> 'hechas', '[]'::jsonb) ? p_id
      or (p_obras -> 'activa' ->> 'id' = p_id
          and (p_obras -> 'activa' ->> 'fin')::bigint <= extract(epoch from now())::bigint);
$$;

-- Cierra la obra activa si ya terminó y avisa al jugador.
create or replace function tpp.obras_sync(p_uid uuid) returns void language plpgsql security definer set search_path = '' as $$
declare
  o jsonb;
  d jsonb;
begin
  perform tpp.asegurar_perfil(p_uid);
  select obras into o from tpp.perfiles where id = p_uid for update;
  if o -> 'activa' is null or jsonb_typeof(o -> 'activa') <> 'object' then return; end if;
  if (o -> 'activa' ->> 'fin')::bigint > extract(epoch from now())::bigint then return; end if;
  select x into d from jsonb_array_elements(tpp.obras_def()) x where x ->> 'id' = o -> 'activa' ->> 'id';
  update tpp.perfiles set obras = jsonb_build_object(
    'hechas', coalesce(o -> 'hechas', '[]'::jsonb) || to_jsonb(o -> 'activa' ->> 'id'),
    'activa', null) where id = p_uid;
  perform tpp.notificar(p_uid, 'obra', 'Obra terminada', coalesce(d ->> 'nombre', 'La obra') || ' ya está lista. ' || coalesce(d ->> 'desc', ''));
end;
$$;

create or replace function tpp.obras_estado(p_uid uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o jsonb;
  niv integer;
  ahora bigint := extract(epoch from now())::bigint;
  activa text;
  fin bigint;
  res jsonb := '[]'::jsonb;
  d jsonb;
  est text;
  resta bigint;
begin
  perform tpp.obras_sync(p_uid);
  select obras, tpp.nivel_de(xp) into o, niv from tpp.perfiles where id = p_uid;
  activa := o -> 'activa' ->> 'id';
  fin := (o -> 'activa' ->> 'fin')::bigint;
  for d in select x from jsonb_array_elements(tpp.obras_def()) x loop
    est := case
      when coalesce(o -> 'hechas', '[]'::jsonb) ? (d ->> 'id') then 'hecha'
      when activa = d ->> 'id' then 'en_curso'
      when niv < (d ->> 'nivel')::int then 'bloqueada'
      else 'disponible' end;
    resta := case when est = 'en_curso' then greatest(0, fin - ahora) else 0 end;
    res := res || jsonb_build_array(d || jsonb_build_object(
      'estado', est, 'resta', resta,
      'acelerar', case when est = 'en_curso' then greatest(50, ceil(resta / 60.0)::int) else null end));
  end loop;
  return jsonb_build_object('obras', res, 'ocupada', activa is not null);
end;
$$;

create or replace function tpp.empezar_obra(p_uid uuid, p_id text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o jsonb;
  d jsonb;
  mon integer;
  niv integer;
begin
  perform tpp.obras_sync(p_uid);
  select obras, monedas, tpp.nivel_de(xp) into o, mon, niv from tpp.perfiles where id = p_uid for update;
  select x into d from jsonb_array_elements(tpp.obras_def()) x where x ->> 'id' = p_id;
  if d is null then return jsonb_build_object('ok', false, 'error', 'obra_invalida') || tpp.obras_estado(p_uid); end if;
  if coalesce(o -> 'hechas', '[]'::jsonb) ? p_id then return jsonb_build_object('ok', false, 'error', 'obra_hecha') || tpp.obras_estado(p_uid); end if;
  if o -> 'activa' is not null and jsonb_typeof(o -> 'activa') = 'object' then
    return jsonb_build_object('ok', false, 'error', 'obra_en_curso') || tpp.obras_estado(p_uid);
  end if;
  if niv < (d ->> 'nivel')::int then return jsonb_build_object('ok', false, 'error', 'nivel_insuficiente') || tpp.obras_estado(p_uid); end if;
  if mon < (d ->> 'precio')::int then return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.obras_estado(p_uid); end if;
  update tpp.perfiles set
    monedas = monedas - (d ->> 'precio')::int,
    obras = jsonb_build_object('hechas', coalesce(o -> 'hechas', '[]'::jsonb),
      'activa', jsonb_build_object('id', p_id, 'fin', extract(epoch from now())::bigint + (d ->> 'horas')::int * 3600))
  where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.obras_estado(p_uid) || tpp.estado_json(p_uid);
end;
$$;

-- Acelerar: 1 moneda por minuto que falta (mínimo 50) y la obra termina al momento.
create or replace function tpp.acelerar_obra(p_uid uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o jsonb;
  mon integer;
  resta bigint;
  coste integer;
begin
  perform tpp.obras_sync(p_uid);
  select obras, monedas into o, mon from tpp.perfiles where id = p_uid for update;
  if o -> 'activa' is null or jsonb_typeof(o -> 'activa') <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'sin_obra') || tpp.obras_estado(p_uid);
  end if;
  resta := greatest(0, (o -> 'activa' ->> 'fin')::bigint - extract(epoch from now())::bigint);
  coste := greatest(50, ceil(resta / 60.0)::int);
  if mon < coste then return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.obras_estado(p_uid); end if;
  update tpp.perfiles set monedas = monedas - coste,
    obras = jsonb_build_object('hechas', coalesce(o -> 'hechas', '[]'::jsonb),
      'activa', jsonb_build_object('id', o -> 'activa' ->> 'id', 'fin', extract(epoch from now())::bigint - 1))
  where id = p_uid;
  perform tpp.obras_sync(p_uid);
  return jsonb_build_object('ok', true) || tpp.obras_estado(p_uid) || tpp.estado_json(p_uid);
end;
$$;

create or replace function public.tpp_obras() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.obras_estado(auth.uid());
end;
$$;

create or replace function public.tpp_empezar_obra(p_id text) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.empezar_obra(auth.uid(), p_id);
end;
$$;

create or replace function public.tpp_acelerar_obra() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.acelerar_obra(auth.uid());
end;
$$;

revoke all on function tpp.obras_def() from public, anon, authenticated;
revoke all on function tpp.obra_hecha(jsonb, text) from public, anon, authenticated;
revoke all on function tpp.obras_sync(uuid) from public, anon, authenticated;
revoke all on function tpp.obras_estado(uuid) from public, anon, authenticated;
revoke all on function tpp.empezar_obra(uuid, text) from public, anon, authenticated;
revoke all on function tpp.acelerar_obra(uuid) from public, anon, authenticated;
revoke all on function public.tpp_obras() from public, anon;
revoke all on function public.tpp_empezar_obra(text) from public, anon;
revoke all on function public.tpp_acelerar_obra() from public, anon;
grant execute on function public.tpp_obras() to authenticated;
grant execute on function public.tpp_empezar_obra(text) to authenticated;
grant execute on function public.tpp_acelerar_obra() to authenticated;

-- ===== Bonos de las obras =====

-- Salón: +5 % de XP en cuidados y minijuegos.
create or replace function tpp.mult_xp(p_uid uuid)
 returns double precision
 language sql
 stable security definer
 set search_path to ''
as $function$
  select (1 + tpp.animo_de(p_uid) / 100.0)
    * case when coalesce(pf.equipo -> 'decoracion', '[]'::jsonb) ? 'neon_tpp' then 1.10 else 1 end
    * case when tpp.obra_hecha(pf.obras, 'salon') then 1.05 else 1 end
  from tpp.perfiles pf where pf.id = p_uid;
$function$;

-- Ampliación: +1 hueco en el salón (las bases van de 10 en 10, no se pisan).
create or replace function tpp.sitios_habitacion(perfil tpp.perfiles, p_id text)
 returns integer
 language sql
 stable
 set search_path to ''
as $function$
  select coalesce((tpp.habitaciones() -> p_id ->> 'slots')::int, 0)
    + case when p_id = 'armario' then coalesce((perfil.mejoras ->> 'cap')::int, 0) else 0 end
    + case when p_id = 'salon' and tpp.obra_hecha(perfil.obras, 'ampliacion') then 1 else 0 end;
$function$;

-- Cocina: +10 % de monedas al vender procesados.
create or replace function tpp.procesado_vender(p_uid uuid, p_prod text, p_cant integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_p jsonb;
  v_n integer;
  v_q integer;
  v_c integer;
  v_pago integer;
  v_obras jsonb;
begin
  perform tpp.asegurar_perfil(p_uid);
  select procesado, obras into v_p, v_obras from tpp.perfiles where id = p_uid for update;
  v_n := coalesce((v_p -> 'prod' -> p_prod ->> 'n')::int, 0);
  v_q := coalesce((v_p -> 'prod' -> p_prod ->> 'q')::int, 3);
  v_c := least(v_n, coalesce(p_cant, v_n));
  if v_c <= 0 then return jsonb_build_object('ok', false, 'error', 'sin_gramos') || tpp.procesado_estado(p_uid); end if;
  v_pago := round(v_c * tpp.proc_precio(p_prod, v_q) * tpp.mult_ventas(p_uid)
    * case when tpp.obra_hecha(v_obras, 'cocina') then 1.10 else 1 end)::int;
  v_p := jsonb_set(v_p, array['prod', p_prod, 'n'], to_jsonb(v_n - v_c), true);
  update tpp.perfiles set procesado = v_p, monedas = monedas + v_pago where id = p_uid;
  return jsonb_build_object('ok', true, 'recompensa', v_pago) || tpp.procesado_estado(p_uid) || tpp.estado_json(p_uid);
end;
$function$;

-- Sótano: −25 % de sospecha al comprar en el mercado negro.
create or replace function tpp.negro_comprar(p_uid uuid, p_id text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_n jsonb;
  v_glob integer;
  v_mon integer;
  v_lunes date := tpp.mercado_lunes(now());
  v_ahora bigint := extract(epoch from now())::bigint;
  v_obj jsonb;
  v_comp jsonb;
  v_ya integer;
  v_sosp integer;
  v_sube integer;
  v_inv jsonb;
  v_obras jsonb;
begin
  perform tpp.asegurar_perfil(p_uid);
  select negro, reputacion_global, monedas, obras into v_n, v_glob, v_mon, v_obras from tpp.perfiles where id = p_uid for update;
  if tpp.rango_glob(v_glob) < 2 then return jsonb_build_object('ok', false, 'error', 'negro_bloqueado'); end if;
  if coalesce((v_n ->> 'insp')::boolean, false) then return jsonb_build_object('ok', false, 'error', 'inspeccion_pendiente') || tpp.negro_estado(p_uid); end if;
  if coalesce((v_n ->> 'cerrado')::bigint, 0) > v_ahora then return jsonb_build_object('ok', false, 'error', 'negro_cerrado') || tpp.negro_estado(p_uid); end if;
  select e into v_obj from jsonb_array_elements(tpp.negro_catalogo()) e where e ->> 'id' = p_id;
  if v_obj is null or not (p_id = any (tpp.negro_semana(v_lunes))) then
    return jsonb_build_object('ok', false, 'error', 'objeto_no_disponible') || tpp.negro_estado(p_uid);
  end if;
  v_comp := case when (v_n -> 'compras' ->> 'lunes') = v_lunes::text then coalesce(v_n -> 'compras' -> 'items', '{}'::jsonb) else '{}'::jsonb end;
  v_ya := coalesce((v_comp ->> p_id)::int, 0);
  if v_ya >= (v_obj ->> 'stock')::int then return jsonb_build_object('ok', false, 'error', 'negro_agotado') || tpp.negro_estado(p_uid); end if;
  if v_mon < (v_obj ->> 'precio')::int then return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.negro_estado(p_uid); end if;
  if p_id = 'semilla-eclipse' and exists (select 1 from tpp.perfiles where id = p_uid and semillas_hibridas ? 'sol-medianoche') then
    return jsonb_build_object('ok', false, 'error', 'ya_lo_tienes') || tpp.negro_estado(p_uid);
  end if;
  v_sosp := tpp.negro_sospecha(v_n);
  v_sube := 15 * (v_obj ->> 'riesgo')::int;
  if coalesce((v_n ->> 'antiolor')::bigint, 0) > v_ahora then v_sube := v_sube / 2; end if;
  if tpp.obra_hecha(v_obras, 'sotano') then v_sube := round(v_sube * 0.75)::int; end if;
  v_sosp := least(100, v_sosp + v_sube);
  v_inv := coalesce(v_n -> 'inv', '{}'::jsonb);
  if v_sosp >= 100 and coalesce((v_inv ->> 'radio-porteria')::int, 0) > 0 and p_id <> 'radio-porteria' then
    v_sosp := 95;
    v_inv := v_inv || jsonb_build_object('radio-porteria', (v_inv ->> 'radio-porteria')::int - 1);
    perform tpp.notificar(p_uid, 'negro', 'El portero te avisa', 'Viene una inspección: has parado a tiempo. La sospecha se queda en 95.');
  end if;
  if p_id in ('radio-porteria', 'maceta-doble') then
    v_inv := v_inv || jsonb_build_object(p_id, coalesce((v_inv ->> p_id)::int, 0) + 1);
  elsif p_id = 'bolsa-antiolor' then
    v_n := coalesce(v_n, '{}'::jsonb) || jsonb_build_object('antiolor', greatest(coalesce((v_n ->> 'antiolor')::bigint, 0), v_ahora) + 7 * 86400);
  elsif p_id = 'semilla-eclipse' then
    update tpp.perfiles set semillas_hibridas = semillas_hibridas || '"sol-medianoche"'::jsonb where id = p_uid;
  elsif p_id = 'semilla-sombra' then
    v_n := coalesce(v_n, '{}'::jsonb) || jsonb_build_object('sombra', coalesce((v_n ->> 'sombra')::int, 0) + 1);
    insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, 'semilla:noche:fem', 1)
      on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + 1;
  else
    insert into tpp.inventario (usuario_id, objeto, cantidad)
      values (p_uid, case p_id when 'semilla-relampago' then 'relampago' when 'lampara-pirata' then 'lampara_pirata' else 'abono_volcanico' end, 1)
      on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + 1;
  end if;
  v_n := coalesce(v_n, '{}'::jsonb) || jsonb_build_object(
    'sosp', v_sosp, 'ts', v_ahora, 'insp', v_sosp >= 100, 'inv', v_inv,
    'compras', jsonb_build_object('lunes', v_lunes::text, 'items', v_comp || jsonb_build_object(p_id, v_ya + 1)));
  update tpp.perfiles set monedas = monedas - (v_obj ->> 'precio')::int, negro = v_n where id = p_uid;
  if v_sosp >= 100 then
    perform tpp.notificar(p_uid, 'negro', '¡Inspección!', 'Han llamado a tu puerta. Decide qué haces: pagar, esconder o dejar que registren.');
  end if;
  return jsonb_build_object('ok', true) || tpp.negro_estado(p_uid) || tpp.estado_json(p_uid);
end;
$function$;
