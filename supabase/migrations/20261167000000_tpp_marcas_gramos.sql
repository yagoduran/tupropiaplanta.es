-- 8i (parte A) · Marcas de los gramos guardados: orgánico, sin plagas, curado y Top Shelf.
-- Sirven para los capítulos de las historias de clientes (p. ej. «índica curada», «medicinal», «sin plagas»).
--  · plantas.quimico: la planta recibió algún abono que no es orgánico (orgánicos: humus, té de compost y abono casero).
--  · plantas.tuvo_plaga: la planta tuvo plaga alguna vez.
--  · perfiles.almacen_marcas: {variedad: {org, limpia, curado, top}} = gramos guardados que cumplen cada marca.
alter table tpp.plantas add column if not exists quimico boolean not null default false;
alter table tpp.plantas add column if not exists tuvo_plaga boolean not null default false;
alter table tpp.perfiles add column if not exists almacen_marcas jsonb not null default '{}'::jsonb;
alter table tpp.perfiles add column if not exists reputacion_global integer not null default 0;

-- Al cambiar el almacén, ninguna marca puede superar los gramos que quedan.
create or replace function tpp.recortar_marcas() returns trigger language plpgsql set search_path = '' as
$f$
begin
  if new.almacen is distinct from old.almacen then
    new.almacen_marcas := coalesce((
      select jsonb_object_agg(s.v, s.m) from (
        select x.key as v,
               coalesce((select jsonb_object_agg(t.k, least(t.c::int, q.tot)) from jsonb_each_text(x.value) t(k, c)), '{}'::jsonb) as m
        from jsonb_each(new.almacen_marcas) x(key, value),
             lateral (select coalesce((new.almacen ->> x.key)::int, 0) as tot) q
        where q.tot > 0) s), '{}'::jsonb);
  end if;
  return new;
end;
$f$;

drop trigger if exists tpp_recortar_marcas on tpp.perfiles;
create trigger tpp_recortar_marcas before update of almacen on tpp.perfiles
  for each row execute function tpp.recortar_marcas();

-- Suma gramos con marcas (se llama justo después de añadir los gramos al almacén).
create or replace function tpp.marcas_sumar(p_uid uuid, p_v text, p_g integer, p_org boolean, p_limpia boolean, p_curado boolean, p_top boolean)
returns void language plpgsql security definer set search_path = '' as
$f$
declare
  v_m jsonb;
  v_tot integer;
begin
  select coalesce(almacen_marcas -> p_v, '{}'::jsonb), coalesce((almacen ->> p_v)::int, 0) into v_m, v_tot from tpp.perfiles where id = p_uid;
  v_m := jsonb_build_object(
    'org', least(v_tot, coalesce((v_m ->> 'org')::int, 0) + case when p_org then p_g else 0 end),
    'limpia', least(v_tot, coalesce((v_m ->> 'limpia')::int, 0) + case when p_limpia then p_g else 0 end),
    'curado', least(v_tot, coalesce((v_m ->> 'curado')::int, 0) + case when p_curado then p_g else 0 end),
    'top', least(v_tot, coalesce((v_m ->> 'top')::int, 0) + case when p_top then p_g else 0 end));
  update tpp.perfiles set almacen_marcas = almacen_marcas || jsonb_build_object(p_v, v_m) where id = p_uid;
end;
$f$;

do $mig$
declare
  d text;
  o text;
begin
  -- La planta tuvo plaga (se anota cada vez que se sincroniza).
  d := pg_get_functiondef('tpp.sincronizar(uuid)'::regprocedure); o := d;
  d := replace(d, 'plaga = p.plaga, plaga_desde = p.plaga_desde, causa = cz_fin',
    'tuvo_plaga = tuvo_plaga or (p.plaga is not null), plaga = p.plaga, plaga_desde = p.plaga_desde, causa = cz_fin');
  if d = o then raise exception 'sincronizar: sin cambio'; end if;
  execute d;

  -- Abono que no es orgánico (todos menos el humus).
  d := pg_get_functiondef('tpp.usar(uuid,text)'::regprocedure); o := d;
  d := replace(d, E'    salud = least(100, salud + case p_objeto when ''humus'' then 5',
    E'    quimico = quimico or p_objeto <> ''humus'',\n    salud = least(100, salud + case p_objeto when ''humus'' then 5');
  if d = o then raise exception 'usar: sin cambio'; end if;
  execute d;

  -- La cosecha lleva las marcas de la planta.
  d := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure); o := d;
  d := regexp_replace(d, '''calidad'', q_c,(\s*)''factores''', '''calidad'', q_c, ''organico'', not p.quimico, ''limpia'', not p.tuvo_plaga,\1''factores''');
  if d = o then raise exception 'accion: sin cambio'; end if;
  execute d;

  -- Secado: la marca viaja con la cosecha.
  d := pg_get_functiondef('tpp.secar_cosecha(uuid,text,integer)'::regprocedure); o := d;
  d := replace(d, '''calidad'', coalesce((c ->> ''calidad'')::int, 3), ''monedas'', (c ->> ''monedas'')::int, ''t0''',
    '''calidad'', coalesce((c ->> ''calidad'')::int, 3), ''organico'', coalesce((c ->> ''organico'')::boolean, false), ''limpia'', coalesce((c ->> ''limpia'')::boolean, false), ''monedas'', (c ->> ''monedas'')::int, ''t0''');
  if d = o then raise exception 'secar_cosecha: sin cambio'; end if;
  execute d;

  -- Guardar la cosecha sin secar.
  d := pg_get_functiondef('tpp.resolver_cosecha(uuid,boolean)'::regprocedure); o := d;
  d := replace(d, 'perform tpp.mision_sumar(p_uid, case when p_vender then ''vender'' else ''guardar'' end);',
    E'if not p_vender then\n    perform tpp.marcas_sumar(p_uid, v, g, coalesce((c ->> ''organico'')::boolean, false), coalesce((c ->> ''limpia'')::boolean, false), false, false);\n  end if;\n  perform tpp.mision_sumar(p_uid, case when p_vender then ''vender'' else ''guardar'' end);');
  if d = o then raise exception 'resolver_cosecha: sin cambio'; end if;
  execute d;

  -- Guardar desde la percha o el tarro (curado = tarro de 1 a 3 días; Top Shelf = 3 días).
  d := pg_get_functiondef('tpp.sacar_secado(uuid,integer,text)'::regprocedure); o := d;
  d := replace(d, E'    perform tpp.mision_sumar(p_uid, ''guardar'');\n    precio := 0;',
    E'    perform tpp.marcas_sumar(p_uid, v, g, coalesce((it ->> ''organico'')::boolean, false), coalesce((it ->> ''limpia'')::boolean, false),\n      coalesce((it ->> ''curar'')::int, 0) > 0, coalesce((it ->> ''curar'')::int, 0) = 72);\n    perform tpp.mision_sumar(p_uid, ''guardar'');\n    precio := 0;');
  if d = o then raise exception 'sacar_secado: sin cambio'; end if;
  execute d;
end $mig$;

revoke all on function tpp.recortar_marcas(), tpp.marcas_sumar(uuid, text, integer, boolean, boolean, boolean, boolean) from public, anon, authenticated;
