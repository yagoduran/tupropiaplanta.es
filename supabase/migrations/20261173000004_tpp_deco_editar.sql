-- Modo editar decoración del salón: el jugador coloca, gira y quita sus objetos. Las posiciones se guardan en equipo.deco_pos.
-- Suelo: {"x":0-5,"y":0-5,"r":0|1}. Pared: {"p":"d"|"i","x":0-5} (d = pared derecha, índice x; i = pared izquierda, índice y).

create or replace function tpp.guardar_deco(p_uid uuid, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  suelo_ids constant text[] := array['gato', 'radio', 'planta_adorno', 'lampara_lava', 'puf', 'acuario', 'lampara_pie'];
  pared_ids constant text[] := array['poster', 'banderines', 'cuadro', 'figura_semillita', 'neon_tpp'];
  -- Casillas del salón que no se pueden usar: muebles fijos, sitios de plantas y la salida.
  ocupadas constant text[] := array['2,0', '4,0', '5,1', '0,3', '0,4', '0,0', '2,2', '4,2', '2,4', '4,4', '3,3', '5,5'];
  it jsonb;
  d_id text;
  x integer;
  y integer;
  pa text;
  clave text;
  vistos text[] := '{}';
  casillas text[] := '{}';
  ids text[] := '{}';
  pos jsonb := '{}'::jsonb;
  resto jsonb;
begin
  perform tpp.asegurar_perfil(p_uid);
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 20 then
    return jsonb_build_object('ok', false, 'error', 'deco_invalida') || tpp.estado_json(p_uid);
  end if;
  for it in select * from jsonb_array_elements(p_items) loop
    begin
      d_id := it ->> 'id';
      x := (it ->> 'x')::int;
      y := coalesce((it ->> 'y')::int, 0);
      pa := it ->> 'p';
    exception when others then
      return jsonb_build_object('ok', false, 'error', 'deco_invalida') || tpp.estado_json(p_uid);
    end;
    if d_id is null or d_id = any(vistos) or x not between 0 and 5 or y not between 0 and 5 then
      return jsonb_build_object('ok', false, 'error', 'deco_invalida') || tpp.estado_json(p_uid);
    end if;
    vistos := vistos || d_id;
    if not tpp.tiene(p_uid, d_id) then
      return jsonb_build_object('ok', false, 'error', 'no_lo_tienes') || tpp.estado_json(p_uid);
    end if;
    if d_id = any(suelo_ids) then
      clave := x || ',' || y;
      if clave = any(ocupadas) or ('s' || clave) = any(casillas) then
        return jsonb_build_object('ok', false, 'error', 'deco_ocupada') || tpp.estado_json(p_uid);
      end if;
      casillas := casillas || ('s' || clave);
      pos := pos || jsonb_build_object(d_id, jsonb_build_object('x', x, 'y', y, 'r', case when (it ->> 'r') = '1' then 1 else 0 end));
    elsif d_id = any(pared_ids) then
      if pa not in ('d', 'i') then
        return jsonb_build_object('ok', false, 'error', 'deco_invalida') || tpp.estado_json(p_uid);
      end if;
      clave := pa || x;
      if (pa = 'd' and x = 3) or (pa = 'i' and x = 2) or clave = any(casillas) then
        return jsonb_build_object('ok', false, 'error', 'deco_ocupada') || tpp.estado_json(p_uid);
      end if;
      casillas := casillas || clave;
      pos := pos || jsonb_build_object(d_id, jsonb_build_object('p', pa, 'x', x));
    else
      return jsonb_build_object('ok', false, 'error', 'deco_invalida') || tpp.estado_json(p_uid);
    end if;
    ids := ids || d_id;
  end loop;

  -- Lo que se ve en el salón lo decide el editor; el resto de decoración puesta (sin dibujo en el salón) se conserva.
  select coalesce(jsonb_agg(x2), '[]'::jsonb) into resto
    from jsonb_array_elements(coalesce((select equipo -> 'decoracion' from tpp.perfiles where id = p_uid), '[]'::jsonb)) x2
    where not ((x2 #>> '{}') = any(suelo_ids) or (x2 #>> '{}') = any(pared_ids));
  update tpp.perfiles set equipo = jsonb_set(jsonb_set(coalesce(equipo, '{}'::jsonb), '{decoracion}', resto || to_jsonb(ids)), '{deco_pos}', pos, true)
    where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

create or replace function public.tpp_guardar_deco(p_items jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.guardar_deco(auth.uid(), p_items);
end;
$$;

revoke all on function tpp.guardar_deco(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.tpp_guardar_deco(jsonb) from public, anon;
grant execute on function public.tpp_guardar_deco(jsonb) to authenticated;
