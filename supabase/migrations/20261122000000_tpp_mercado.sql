-- Mercado entre jugadores. Se venden objetos y abonos del inventario (1 unidad por oferta; no los gratuitos ni los que se llevan puestos).
-- Precio entre 0,5× y 5× el precio de tienda; comisión del 5 % para el vendedor; la oferta caduca a los 3 días y el objeto vuelve al inventario.
-- Máx. 10 ofertas activas por jugador y 10 compras al día (hora de Madrid). No se compran las propias ofertas ni las de quien te ha bloqueado
-- o has bloqueado. Los objetos que no son abonos no se pueden comprar si ya se tienen. El vendedor cobra con el botón de Mis ventas.
-- Para deshacer: borrar las funciones public.tpp_mercado* y tpp.mercado*, y la tabla tpp.ofertas (devolver antes al inventario los objetos en venta).

create table tpp.ofertas (
  id bigint generated always as identity primary key,
  vendedor uuid not null references auth.users (id) on delete cascade,
  objeto text not null,
  precio integer not null check (precio >= 1),
  creada_en timestamptz not null default now(),
  caduca_en timestamptz not null,
  estado text not null default 'venta' check (estado in ('venta', 'vendida', 'caducada', 'retirada', 'cobrada')),
  comprador uuid references auth.users (id) on delete set null,
  vendida_en timestamptz
);
create index ofertas_venta on tpp.ofertas (estado, caduca_en);
create index ofertas_vendedor on tpp.ofertas (vendedor, estado);
create index ofertas_comprador on tpp.ofertas (comprador, vendida_en);
alter table tpp.ofertas enable row level security;

create function tpp.mercado_comision(p_precio integer) returns integer
language sql immutable set search_path = '' as $$ select round(p_precio * 0.05)::int; $$;

-- Las ofertas que han caducado dejan de estar a la venta, vuelven al inventario del vendedor y se le avisa.
create function tpp.mercado_limpiar() returns void
language plpgsql security definer set search_path = '' as $$
declare
  o record;
begin
  for o in select * from tpp.ofertas where estado = 'venta' and caduca_en <= now() for update skip locked loop
    update tpp.ofertas set estado = 'caducada' where id = o.id;
    insert into tpp.inventario (usuario_id, objeto, cantidad) values (o.vendedor, o.objeto, 1)
      on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + 1;
    perform tpp.notificar(o.vendedor, 'mercado', 'Oferta caducada', 'Nadie ha comprado tu oferta y ha caducado. El objeto vuelve a tu inventario.');
  end loop;
end;
$$;

create function tpp.mercado(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  perfil tpp.perfiles;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  perform tpp.mercado_limpiar();
  return jsonb_build_object(
    'max', 10,
    'activas', (select count(*)::int from tpp.ofertas where vendedor = p_uid and estado = 'venta'),
    'compras_hoy', (select count(*)::int from tpp.ofertas where comprador = p_uid and (vendida_en at time zone 'Europe/Madrid')::date = hoy),
    'compras_max', 10,
    'ofertas', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'objeto', o.objeto, 'precio', o.precio,
        'queda', greatest(0, extract(epoch from (o.caduca_en - now()))::int), 'vendedor', tpp.ficha_jugador(o.vendedor),
        'tiene', exists (select 1 from tpp.inventario i where i.usuario_id = p_uid and i.objeto = o.objeto and i.cantidad > 0)) order by o.creada_en desc)
      from (select * from tpp.ofertas where estado = 'venta' and vendedor <> p_uid and not tpp.bloqueado(p_uid, vendedor)
            order by creada_en desc limit 80) o), '[]'::jsonb),
    'mias', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'objeto', o.objeto, 'precio', o.precio, 'estado', o.estado,
        'queda', greatest(0, extract(epoch from (o.caduca_en - now()))::int), 'neto', o.precio - tpp.mercado_comision(o.precio),
        'comprador', (select usuario from tpp.perfiles where id = o.comprador)) order by o.creada_en desc)
      from (select * from tpp.ofertas where vendedor = p_uid and estado in ('venta', 'vendida', 'caducada')
            order by creada_en desc limit 40) o), '[]'::jsonb),
    'inventario', coalesce((
      select jsonb_agg(jsonb_build_object('objeto', i.objeto, 'cantidad', i.cantidad, 'precio', (c ->> 'precio')::int,
        'en_uso', (perfil.equipo ->> 'maceta' = i.objeto or perfil.equipo ->> 'luz' = i.objeto
                   or coalesce(perfil.equipo -> 'decoracion', '[]'::jsonb) ? i.objeto)) order by (c ->> 'precio')::int)
      from tpp.inventario i
      join jsonb_array_elements(tpp.catalogo()) c on c ->> 'id' = i.objeto and (c ->> 'precio')::int > 0
      where i.usuario_id = p_uid and i.cantidad > 0), '[]'::jsonb));
end;
$$;

create function tpp.mercado_publicar(p_uid uuid, p_objeto text, p_precio integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  item jsonb;
  base integer;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  perform tpp.mercado_limpiar();
  select c into item from jsonb_array_elements(tpp.catalogo()) c where c ->> 'id' = p_objeto;
  if item is null or (item ->> 'precio')::int = 0 then
    return jsonb_build_object('ok', false, 'error', 'objeto_desconocido') || tpp.mercado(p_uid);
  end if;
  base := (item ->> 'precio')::int;
  if p_precio is null or p_precio < greatest(1, ceil(base * 0.5)::int) or p_precio > base * 5 then
    return jsonb_build_object('ok', false, 'error', 'precio_fuera_rango') || tpp.mercado(p_uid);
  end if;
  if (select count(*) from tpp.ofertas where vendedor = p_uid and estado = 'venta') >= 10 then
    return jsonb_build_object('ok', false, 'error', 'mercado_limite') || tpp.mercado(p_uid);
  end if;
  if perfil.equipo ->> 'maceta' = p_objeto or perfil.equipo ->> 'luz' = p_objeto
     or coalesce(perfil.equipo -> 'decoracion', '[]'::jsonb) ? p_objeto then
    return jsonb_build_object('ok', false, 'error', 'objeto_en_uso') || tpp.mercado(p_uid);
  end if;
  update tpp.inventario set cantidad = cantidad - 1 where usuario_id = p_uid and objeto = p_objeto and cantidad > 0;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'sin_existencias') || tpp.mercado(p_uid);
  end if;
  insert into tpp.ofertas (vendedor, objeto, precio, caduca_en) values (p_uid, p_objeto, p_precio, now() + interval '3 days');
  return jsonb_build_object('ok', true) || tpp.mercado(p_uid);
end;
$$;

create function tpp.mercado_comprar(p_uid uuid, p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  o tpp.ofertas;
  tipo text;
  comprador text;
  nombre_obj text;
begin
  perform tpp.asegurar_perfil(p_uid);
  perform tpp.mercado_limpiar();
  select * into o from tpp.ofertas where id = p_id for update;
  if o.id is null or o.estado <> 'venta' then
    return jsonb_build_object('ok', false, 'error', 'oferta_no_disponible') || tpp.mercado(p_uid);
  end if;
  if o.vendedor = p_uid then
    return jsonb_build_object('ok', false, 'error', 'oferta_propia') || tpp.mercado(p_uid);
  end if;
  if tpp.bloqueado(p_uid, o.vendedor) then
    return jsonb_build_object('ok', false, 'error', 'oferta_no_disponible') || tpp.mercado(p_uid);
  end if;
  if (select count(*) from tpp.ofertas where comprador = p_uid and (vendida_en at time zone 'Europe/Madrid')::date = hoy) >= 10 then
    return jsonb_build_object('ok', false, 'error', 'compras_limite') || tpp.mercado(p_uid);
  end if;
  select c ->> 'tipo' into tipo from jsonb_array_elements(tpp.catalogo()) c where c ->> 'id' = o.objeto;
  if tipo <> 'consumible' and exists (select 1 from tpp.inventario where usuario_id = p_uid and objeto = o.objeto and cantidad > 0) then
    return jsonb_build_object('ok', false, 'error', 'ya_lo_tienes') || tpp.mercado(p_uid);
  end if;
  update tpp.perfiles set monedas = monedas - o.precio where id = p_uid and monedas >= o.precio;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.mercado(p_uid);
  end if;
  insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, o.objeto, 1)
    on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + 1;
  update tpp.ofertas set estado = 'vendida', comprador = p_uid, vendida_en = now() where id = o.id;
  select usuario into comprador from tpp.perfiles where id = p_uid;
  perform tpp.notificar(o.vendedor, 'mercado', 'Has vendido algo', comprador || ' ha comprado tu oferta. Ve a Mis ventas para cobrar ' ||
    (o.precio - tpp.mercado_comision(o.precio)) || ' monedas.');
  return jsonb_build_object('ok', true) || tpp.mercado(p_uid) || tpp.estado_json(p_uid);
end;
$$;

-- Retirar una oferta a la venta (el objeto vuelve al inventario) o volver a publicar una caducada con el mismo precio.
create function tpp.mercado_retirar(p_uid uuid, p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  o tpp.ofertas;
begin
  perform tpp.asegurar_perfil(p_uid);
  perform tpp.mercado_limpiar();
  select * into o from tpp.ofertas where id = p_id and vendedor = p_uid for update;
  if o.id is null or o.estado <> 'venta' then
    return jsonb_build_object('ok', false, 'error', 'oferta_no_disponible') || tpp.mercado(p_uid);
  end if;
  update tpp.ofertas set estado = 'retirada' where id = o.id;
  insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, o.objeto, 1)
    on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + 1;
  return jsonb_build_object('ok', true) || tpp.mercado(p_uid);
end;
$$;

create function tpp.mercado_republicar(p_uid uuid, p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  o tpp.ofertas;
  r jsonb;
begin
  perform tpp.asegurar_perfil(p_uid);
  perform tpp.mercado_limpiar();
  select * into o from tpp.ofertas where id = p_id and vendedor = p_uid for update;
  if o.id is null or o.estado <> 'caducada' then
    return jsonb_build_object('ok', false, 'error', 'oferta_no_disponible') || tpp.mercado(p_uid);
  end if;
  r := tpp.mercado_publicar(p_uid, o.objeto, o.precio);
  if (r ->> 'ok')::boolean then
    update tpp.ofertas set estado = 'retirada' where id = o.id;
  end if;
  return tpp.mercado(p_uid) || jsonb_build_object('ok', (r ->> 'ok')::boolean, 'error', r -> 'error');
end;
$$;

create function tpp.mercado_cobrar(p_uid uuid, p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  o tpp.ofertas;
begin
  perform tpp.asegurar_perfil(p_uid);
  select * into o from tpp.ofertas where id = p_id and vendedor = p_uid for update;
  if o.id is null or o.estado <> 'vendida' then
    return jsonb_build_object('ok', false, 'error', 'oferta_no_disponible') || tpp.mercado(p_uid);
  end if;
  update tpp.ofertas set estado = 'cobrada' where id = o.id;
  update tpp.perfiles set monedas = monedas + o.precio - tpp.mercado_comision(o.precio) where id = p_uid;
  return jsonb_build_object('ok', true, 'cobrado', o.precio - tpp.mercado_comision(o.precio)) || tpp.mercado(p_uid) || tpp.estado_json(p_uid);
end;
$$;

create function public.tpp_mercado() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mercado(auth.uid());
end;
$$;
create function public.tpp_mercado_publicar(p_objeto text, p_precio integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mercado_publicar(auth.uid(), p_objeto, p_precio);
end;
$$;
create function public.tpp_mercado_comprar(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mercado_comprar(auth.uid(), p_id);
end;
$$;
create function public.tpp_mercado_retirar(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mercado_retirar(auth.uid(), p_id);
end;
$$;
create function public.tpp_mercado_republicar(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mercado_republicar(auth.uid(), p_id);
end;
$$;
create function public.tpp_mercado_cobrar(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mercado_cobrar(auth.uid(), p_id);
end;
$$;

revoke all on function tpp.mercado_comision(integer) from public, anon, authenticated;
revoke all on function tpp.mercado_limpiar() from public, anon, authenticated;
revoke all on function tpp.mercado(uuid) from public, anon, authenticated;
revoke all on function tpp.mercado_publicar(uuid, text, integer) from public, anon, authenticated;
revoke all on function tpp.mercado_comprar(uuid, bigint) from public, anon, authenticated;
revoke all on function tpp.mercado_retirar(uuid, bigint) from public, anon, authenticated;
revoke all on function tpp.mercado_republicar(uuid, bigint) from public, anon, authenticated;
revoke all on function tpp.mercado_cobrar(uuid, bigint) from public, anon, authenticated;
revoke all on function public.tpp_mercado() from public, anon;
revoke all on function public.tpp_mercado_publicar(text, integer) from public, anon;
revoke all on function public.tpp_mercado_comprar(bigint) from public, anon;
revoke all on function public.tpp_mercado_retirar(bigint) from public, anon;
revoke all on function public.tpp_mercado_republicar(bigint) from public, anon;
revoke all on function public.tpp_mercado_cobrar(bigint) from public, anon;
grant execute on function public.tpp_mercado() to authenticated;
grant execute on function public.tpp_mercado_publicar(text, integer) to authenticated;
grant execute on function public.tpp_mercado_comprar(bigint) to authenticated;
grant execute on function public.tpp_mercado_retirar(bigint) to authenticated;
grant execute on function public.tpp_mercado_republicar(bigint) to authenticated;
grant execute on function public.tpp_mercado_cobrar(bigint) to authenticated;
