-- Mejoras de habitación: cada habitación tiene 3 niveles que refuerzan su bono (se guardan en tpp.perfiles.mejoras como h_armario,
-- h_sotano, h_invernadero y h_azotea, así se pierden al renacer como las demás mejoras). Solo cuentan en la habitación en la que estás
-- y no valen en los desafíos.
--   Armario: nutrientes bajan 5 / 10 / 15 % más despacio. Sótano: plagas -15 / -20 / -30 % (antes -10 %).
--   Invernadero: crecimiento +20 / +25 / +30 % (antes +15 %). Azotea: monedas al cosechar +25 / +30 / +40 % (antes +20 %).
-- Para deshacer: volver a aplicar las versiones anteriores de tpp.mejoras, tpp.comprar_mejora, tpp.sincronizar y tpp.accion.

create or replace function tpp.mejoras() returns jsonb
language sql immutable set search_path = '' as $$
  select '{
    "vent": [{"precio":500,"nivel":5},{"precio":1500,"nivel":12},{"precio":4000,"nivel":20}],
    "riego": [{"precio":600,"nivel":6},{"precio":2000,"nivel":15},{"precio":5000,"nivel":25}],
    "sens": [{"precio":800,"nivel":8},{"precio":2800,"nivel":24},{"precio":6000,"nivel":30}],
    "luz": [{"precio":700,"nivel":7},{"precio":2200,"nivel":14},{"precio":7000,"nivel":28}],
    "seg": [{"precio":900,"nivel":9},{"precio":3000,"nivel":20},{"precio":7500,"nivel":30}],
    "cap": [{"precio":1000,"nivel":10},{"precio":3500,"nivel":18},{"precio":8000,"nivel":32}],
    "h_armario": [{"precio":1500,"nivel":5},{"precio":4000,"nivel":15},{"precio":9000,"nivel":25}],
    "h_sotano": [{"precio":2500,"nivel":18},{"precio":6000,"nivel":26},{"precio":12000,"nivel":34}],
    "h_invernadero": [{"precio":6000,"nivel":28},{"precio":14000,"nivel":34},{"precio":30000,"nivel":40}],
    "h_azotea": [{"precio":15000,"nivel":38},{"precio":35000,"nivel":42},{"precio":80000,"nivel":45}]
  }'::jsonb;
$$;

do $mig$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('tpp.comprar_mejora(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, E'  actual := coalesce((perfil.mejoras ->> p_rama)::int, 0);',
    E'  if p_rama like ''h\\_%'' and not (perfil.habitaciones ? substr(p_rama, 3)) then\n    return jsonb_build_object(''ok'', false, ''error'', ''habitacion_no_tuya'') || tpp.estado_json(p_uid);\n  end if;\n  actual := coalesce((perfil.mejoras ->> p_rama)::int, 0);');
  if d = o then raise exception 'comprar_mejora no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.sincronizar(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'if hab = ''sotano'' then f_plaga := f_plaga * 0.9; end if;',
    E'if hab = ''sotano'' then f_plaga := f_plaga * case coalesce((mj ->> ''h_sotano'')::int, 0) when 1 then 0.85 when 2 then 0.8 when 3 then 0.7 else 0.9 end; end if;\n    if hab = ''armario'' then f_nutr := f_nutr * (1 - 0.05 * coalesce((mj ->> ''h_armario'')::int, 0)); end if;');
  if d = o then raise exception 'sincronizar sotano no cambia'; end if;
  o := d;
  d := replace(d, E'if hab = ''invernadero'' then vel := vel * 1.15; end if;',
    E'if hab = ''invernadero'' then vel := vel * case coalesce((mj ->> ''h_invernadero'')::int, 0) when 1 then 1.2 when 2 then 1.25 when 3 then 1.3 else 1.15 end; end if;');
  if d = o then raise exception 'sincronizar invernadero no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, E'(case when habitacion = ''azotea'' then 1.2 else 1 end)',
    E'(case when habitacion = ''azotea'' then (case coalesce((mejoras ->> ''h_azotea'')::int, 0) when 1 then 1.25 when 2 then 1.3 when 3 then 1.4 else 1.2 end) else 1 end)');
  if d = o then raise exception 'accion no cambia'; end if;
  execute d;
end
$mig$;
