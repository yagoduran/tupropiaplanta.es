-- Logros de plagas eliminadas (10 y 50) y de huecos de cultivo (4 y 8).
-- Las plagas se cuentan desde ahora en perfiles.estadisticas.plagas_tratadas; los huecos salen de tpp.huecos_total.
-- Para deshacer: volver a aplicar tpp.logros() de 20261123000000_tpp_gato_caricias.sql, tpp.tratar() de
-- 20261106000000_tpp_huecos.sql y tpp.valor_logro() de 20261102000000_tpp_logros_diaria.sql.

create or replace function tpp.logros() returns jsonb
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
    {"id":"gastado_1000","stat":"gastado","meta":1000,"premio":100},
    {"id":"gato_caricias","stat":"caricias","meta":10,"premio":100},
    {"id":"plagas_10","stat":"plagas_tratadas","meta":10,"premio":80},
    {"id":"plagas_50","stat":"plagas_tratadas","meta":50,"premio":200},
    {"id":"huecos_4","stat":"huecos","meta":4,"premio":100},
    {"id":"huecos_8","stat":"huecos","meta":8,"premio":250}
  ]'::jsonb;
$$;

create or replace function tpp.valor_logro(p tpp.perfiles, p_stat text) returns integer
language sql stable set search_path = '' as $$
  select case p_stat
    when 'nivel' then tpp.nivel_de(p.xp)
    when 'huecos' then tpp.huecos_total(p)
    when 'variedades' then (select count(*)::int from jsonb_object_keys(coalesce(p.estadisticas -> 'variedades', '{}'::jsonb)))
    else coalesce((p.estadisticas ->> p_stat)::int, 0)
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
  perform tpp.contar(p_uid, 'plagas_tratadas', 1);
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;
