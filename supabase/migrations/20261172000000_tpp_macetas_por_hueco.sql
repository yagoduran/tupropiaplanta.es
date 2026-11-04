-- Una maceta por planta: cada hueco guarda la suya; las macetas se compran por unidades.
alter table tpp.perfiles add column if not exists macetas jsonb not null default '{}'::jsonb;

-- Maceta puesta en un hueco (la de plástico es la de serie).
create or replace function tpp.maceta_de(p_uid uuid, p_hueco integer)
returns text language sql stable set search_path = '' as $$
  select coalesce((select macetas ->> p_hueco::text from tpp.perfiles where id = p_uid), 'maceta_plastico');
$$;

-- Pone una maceta del inventario en un hueco; la que había vuelve al inventario. Devuelve el error o null.
create or replace function tpp.poner_maceta(p_uid uuid, p_hueco integer, p_objeto text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  actual text;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  if not exists (select 1 from jsonb_array_elements(tpp.catalogo()) c where c ->> 'id' = p_objeto and c ->> 'tipo' = 'maceta') then
    return 'objeto_desconocido';
  end if;
  if not exists (select 1 from jsonb_array_elements(tpp.huecos_json(perfil) -> 'lista') e where (e ->> 'hueco')::int = p_hueco) then
    return 'hueco_no_valido';
  end if;
  actual := tpp.maceta_de(p_uid, p_hueco);
  if actual = p_objeto then return null; end if;
  if p_objeto <> 'maceta_plastico' then
    update tpp.inventario set cantidad = cantidad - 1 where usuario_id = p_uid and objeto = p_objeto and cantidad > 0;
    if not found then return 'no_lo_tienes'; end if;
  end if;
  if actual <> 'maceta_plastico' then
    insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, actual, 1)
      on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + 1;
  end if;
  update tpp.perfiles set macetas = macetas || jsonb_build_object(p_hueco::text, p_objeto) where id = p_uid;
  return null;
end;
$$;
revoke all on function tpp.maceta_de(uuid, integer) from public, anon, authenticated;
revoke all on function tpp.poner_maceta(uuid, integer, text) from public, anon, authenticated;

-- Quien ya tenía una maceta equipada la conserva en todos sus huecos.
do $m$
declare r tpp.perfiles;
begin
  for r in select * from tpp.perfiles where coalesce(equipo ->> 'maceta', 'maceta_plastico') <> 'maceta_plastico' loop
    update tpp.perfiles set macetas = coalesce((
        select jsonb_object_agg(e ->> 'hueco', r.equipo ->> 'maceta') from jsonb_array_elements(tpp.huecos_json(r) -> 'lista') e), '{}'::jsonb)
      where id = r.id;
    update tpp.inventario set cantidad = 0 where usuario_id = r.id and objeto = r.equipo ->> 'maceta';
  end loop;
end;
$m$;

-- Parches de funciones existentes (cada uno falla si no encuentra el texto).
do $m$
declare d text; o text;
begin
  -- sincronizar: la maceta es la del hueco de cada planta.
  d := pg_get_functiondef('tpp.sincronizar(uuid)'::regprocedure); o := d;
  d := replace(d, $$case coalesce(equipo ->> 'maceta', '')$$, $$case tpp.maceta_de(p.usuario_id, p.hueco)$$);
  d := replace(d, $$if coalesce(equipo ->> 'maceta', '') = 'madera' then$$, $$if tpp.maceta_de(p.usuario_id, p.hueco) = 'madera' then$$);
  if d = o or d like '%equipo ->> ''maceta''%' then raise exception 'sincronizar no parcheada'; end if;
  execute d;

  -- comprar: las macetas se compran por unidades y no se equipan solas.
  d := pg_get_functiondef('tpp.comprar(uuid,text,integer)'::regprocedure); o := d;
  d := replace(d, $$if tipo <> 'consumible' then n := 1; end if;$$, $$if tipo not in ('consumible', 'maceta') then n := 1; end if;$$);
  d := replace(d, $$(tipo <> 'consumible' and tpp.tiene(p_uid, p_objeto))$$, $$(tipo not in ('consumible', 'maceta') and tpp.tiene(p_uid, p_objeto))$$);
  d := replace(d, $$if tipo = 'maceta' or tipo = 'luz' then$$, $$if tipo = 'luz' then$$);
  if d = o or d not like '%''consumible'', ''maceta''%' or d like '%tipo = ''maceta'' or%' then raise exception 'comprar no parcheada'; end if;
  execute d;

  -- equipar: una maceta se pone en el hueco activo.
  d := pg_get_functiondef('tpp.equipar(uuid,text)'::regprocedure); o := d;
  d := replace(d, $$  if tipo = 'decoracion' then
    puestos :=$$, $$  if tipo = 'maceta' then
    declare v_err text;
    begin
      v_err := tpp.poner_maceta(p_uid, perfil.hueco_activo, p_objeto);
      if v_err is not null then
        return jsonb_build_object('ok', false, 'error', v_err) || tpp.estado_json(p_uid);
      end if;
      return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
    end;
  end if;

  if tipo = 'decoracion' then
    puestos :=$$);
  if d = o then raise exception 'equipar no parcheada'; end if;
  execute d;

  -- estado_json: el equipo muestra la maceta del hueco activo.
  d := pg_get_functiondef('tpp.estado_json(uuid)'::regprocedure); o := d;
  d := replace(d, $$'equipo', perfil.equipo,$$, $$'equipo', perfil.equipo || jsonb_build_object('maceta', tpp.maceta_de(p_uid, perfil.hueco_activo)),$$);
  if d = o then raise exception 'estado_json no parcheada'; end if;
  execute d;

  -- huecos_json: cada hueco dice su maceta.
  d := pg_get_functiondef('tpp.huecos_json(tpp.perfiles)'::regprocedure); o := d;
  d := replace(d, $$'salud', round(p.salud));$$, $$'salud', round(p.salud), 'maceta', tpp.maceta_de(perfil.id, num));$$);
  if d = o then raise exception 'huecos_json no parcheada'; end if;
  execute d;

  -- mercado: las macetas puestas ya no están en el inventario, así que no cuentan como «en uso».
  d := pg_get_functiondef('tpp.mercado(uuid)'::regprocedure); o := d;
  d := replace(d, $$(perfil.equipo ->> 'maceta' = i.objeto or perfil.equipo ->> 'luz' = i.objeto$$, $$(perfil.equipo ->> 'luz' = i.objeto$$);
  if d = o then raise exception 'mercado no parcheada'; end if;
  execute d;

  d := pg_get_functiondef('tpp.mercado_publicar(uuid,text,integer)'::regprocedure); o := d;
  d := replace(d, $$if perfil.equipo ->> 'maceta' = p_objeto or perfil.equipo ->> 'luz' = p_objeto$$, $$if perfil.equipo ->> 'luz' = p_objeto$$);
  if d = o then raise exception 'mercado_publicar no parcheada'; end if;
  execute d;

  -- renacer: se vuelve a la maceta de serie en todos los huecos.
  d := pg_get_functiondef('tpp.renacer(uuid,text)'::regprocedure); o := d;
  d := replace(d, $$    monedas = 100,$$, $$    monedas = 100,
    macetas = '{}'::jsonb,$$);
  if d = o then raise exception 'renacer no parcheada'; end if;
  execute d;

  -- visitar: se ve la maceta del hueco visitado.
  d := pg_get_functiondef('tpp.visitar(uuid,text)'::regprocedure); o := d;
  d := replace(d, $$coalesce(perfil.equipo ->> 'maceta', 'maceta_plastico')$$, $$tpp.maceta_de(otro, p.hueco)$$);
  if d = o then raise exception 'visitar no parcheada'; end if;
  execute d;
end;
$m$;
