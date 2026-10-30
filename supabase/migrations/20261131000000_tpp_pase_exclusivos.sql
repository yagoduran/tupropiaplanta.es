-- Premios exclusivos de la pista especial del pase: decoración (nivel 10), marco (15, si la temporada lo tiene),
-- maceta (20), semilla de edición limitada (25) y título (30), uno por temporada. Solo se consiguen en el pase:
-- van en el catálogo con precio -1 (no se compran, no se venden en el mercado).
-- Objetos: deco_<temporada> y maceta_<temporada>. Títulos: ts_<temporada> (se guardan en tpp.perfiles.temporada -> titulos).
-- Para deshacer: volver a aplicar las versiones anteriores de tpp.catalogo (20261107000000), tpp.pase_premio, tpp.reclamar_pase
-- (20261121000000), tpp.comprar (20261102000000), tpp.mercado_publicar (20261122000000) y tpp.progresion.

do $mig$
declare
  d text;
  o text;
  extra text := '';
  e text;
begin
  -- Catálogo: 4 macetas y 4 decoraciones exclusivas.
  foreach e in array array['primavera', 'verano', 'otono', 'invierno'] loop
    extra := extra || format(',{"id":"maceta_%s","tipo":"maceta","precio":-1,"nivel":1},{"id":"deco_%s","tipo":"decoracion","precio":-1,"nivel":1}', e, e);
  end loop;
  d := pg_get_functiondef('tpp.catalogo()'::regprocedure);
  o := d;
  d := replace(d, '{"id":"gato","tipo":"decoracion","precio":1500,"nivel":10}', '{"id":"gato","tipo":"decoracion","precio":1500,"nivel":10}' || extra);
  if d = o then raise exception 'catalogo no cambia'; end if;
  execute d;

  -- No se pueden comprar.
  d := pg_get_functiondef('tpp.comprar(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, E'  precio := (item ->> ''precio'')::int;\n', E'  precio := (item ->> ''precio'')::int;\n  if precio < 0 then\n    return jsonb_build_object(''ok'', false, ''error'', ''objeto_desconocido'') || tpp.estado_json(p_uid);\n  end if;\n');
  if d = o then raise exception 'comprar no cambia'; end if;
  execute d;

  -- Ni vender en el mercado.
  d := pg_get_functiondef('tpp.mercado_publicar(uuid,text,integer)'::regprocedure);
  o := d;
  d := replace(d, '(item ->> ''precio'')::int = 0', '(item ->> ''precio'')::int <= 0');
  if d = o then raise exception 'mercado_publicar no cambia'; end if;
  execute d;

  -- Títulos de temporada.
  d := pg_get_functiondef('tpp.progresion(uuid)'::regprocedure);
  o := d;
  d := replace(d, '''enciclopedia'', pct >= 100', '''enciclopedia'', pct >= 100,' || E'\n      ''ts_primavera'', coalesce(perfil.temporada -> ''titulos'', ''[]''::jsonb) ? ''ts_primavera'',' ||
    E'\n      ''ts_verano'', coalesce(perfil.temporada -> ''titulos'', ''[]''::jsonb) ? ''ts_verano'',' ||
    E'\n      ''ts_otono'', coalesce(perfil.temporada -> ''titulos'', ''[]''::jsonb) ? ''ts_otono'',' ||
    E'\n      ''ts_invierno'', coalesce(perfil.temporada -> ''titulos'', ''[]''::jsonb) ? ''ts_invierno''');
  if d = o then raise exception 'progresion no cambia'; end if;
  execute d;

  -- Reclamar: maceta, decoración y título.
  d := pg_get_functiondef('tpp.reclamar_pase(uuid,integer,text)'::regprocedure);
  o := d;
  d := replace(d, E'    when ''marco'' then',
    E'    when ''maceta'', ''decoracion'' then\n' ||
    E'      insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, premio ->> ''id'', 1)\n' ||
    E'        on conflict (usuario_id, objeto) do update set cantidad = greatest(tpp.inventario.cantidad, 1);\n' ||
    E'    when ''titulo'' then\n' ||
    E'      if not (coalesce(t -> ''titulos'', ''[]''::jsonb) ? (premio ->> ''id'')) then\n' ||
    E'        t := jsonb_set(t, ''{titulos}'', coalesce(t -> ''titulos'', ''[]''::jsonb) || to_jsonb(premio ->> ''id''));\n' ||
    E'      end if;\n' ||
    E'    when ''marco'' then');
  if d = o then raise exception 'reclamar_pase no cambia'; end if;
  execute d;
end
$mig$;

-- Premios de la pista especial.
create or replace function tpp.pase_premio(p_nivel integer, p_pista text, p_evento jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select case
    when p_pista = 'g' then
      case when p_nivel % 10 = 0 then jsonb_build_object('tipo', 'monedas', 'n', 500, 'etq', 'Cofre de monedas')
           when p_nivel % 5 = 0 then jsonb_build_object('tipo', 'objeto', 'id', 'fert_crecimiento', 'n', 3, 'etq', 'Abono de crecimiento x3')
           when p_nivel % 3 = 0 then jsonb_build_object('tipo', 'xp', 'n', 100, 'etq', '100 XP')
           else jsonb_build_object('tipo', 'monedas', 'n', 50 + p_nivel * 10, 'etq', (50 + p_nivel * 10) || ' monedas') end
    else
      case when p_nivel = 30 then jsonb_build_object('tipo', 'titulo', 'id', 'ts_' || (p_evento ->> 'id'),
             'etq', 'Título «' || case p_evento ->> 'id' when 'primavera' then 'Alma de primavera' when 'verano' then 'Hijo del verano'
                                      when 'otono' then 'Guardián del otoño' else 'Corazón de invierno' end || '»')
           when p_nivel = 25 then jsonb_build_object('tipo', 'semilla', 'id', p_evento ->> 'edicion', 'etq', p_evento ->> 'edicion_nombre')
           when p_nivel = 20 then jsonb_build_object('tipo', 'maceta', 'id', 'maceta_' || (p_evento ->> 'id'),
             'etq', 'Maceta de ' || case p_evento ->> 'id' when 'otono' then 'otoño' else p_evento ->> 'id' end)
           when p_nivel = 15 and p_evento ->> 'marco' is not null then jsonb_build_object('tipo', 'marco', 'id', p_evento ->> 'marco', 'etq', 'Marco de temporada')
           when p_nivel = 10 then jsonb_build_object('tipo', 'decoracion', 'id', 'deco_' || (p_evento ->> 'id'),
             'etq', case p_evento ->> 'id' when 'primavera' then 'Tulipán de primavera' when 'verano' then 'Limonada de verano'
                                           when 'otono' then 'Calabaza de otoño' else 'Muñeco de nieve' end)
           when p_nivel % 5 = 0 then jsonb_build_object('tipo', 'objeto', 'id', 'fert_floracion', 'n', 1, 'etq', 'Abono de floración')
           when p_nivel % 2 = 1 then jsonb_build_object('tipo', 'monedas', 'n', 100 + p_nivel * 20, 'etq', (100 + p_nivel * 20) || ' monedas')
           else jsonb_build_object('tipo', 'xp', 'n', 150, 'etq', '150 XP') end
    end;
$$;
