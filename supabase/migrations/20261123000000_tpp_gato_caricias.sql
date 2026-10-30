-- Gato: logro por acariciarlo 10 veces (hace falta tenerlo puesto en la cámara).
-- Se guarda en perfiles.estadisticas: caricias (total) y caricia_en (momento de la última, en segundos).
-- Solo cuenta una caricia cada 5 segundos.
-- Para deshacer: drop function public.tpp_acariciar_gato(); drop function tpp.acariciar_gato(uuid);
-- y volver a aplicar tpp.logros() de 20261102000000_tpp_logros_diaria.sql (sin "gato_caricias").

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
    {"id":"gato_caricias","stat":"caricias","meta":10,"premio":100}
  ]'::jsonb;
$$;

create function tpp.acariciar_gato(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  ahora double precision := extract(epoch from now());
  antes double precision;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  if not (coalesce(perfil.equipo -> 'decoracion', '[]'::jsonb) ? 'gato') then
    return jsonb_build_object('ok', false, 'error', 'sin_gato') || tpp.estado_json(p_uid);
  end if;
  antes := coalesce((perfil.estadisticas ->> 'caricia_en')::double precision, 0);
  if ahora - antes >= 5 then
    update tpp.perfiles
      set estadisticas = estadisticas || jsonb_build_object(
        'caricias', coalesce((estadisticas ->> 'caricias')::int, 0) + 1,
        'caricia_en', ahora)
      where id = p_uid;
  end if;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

create function public.tpp_acariciar_gato() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.acariciar_gato(auth.uid());
end;
$$;

revoke all on function tpp.acariciar_gato(uuid) from public, anon, authenticated;
revoke all on function public.tpp_acariciar_gato() from public, anon;
grant execute on function public.tpp_acariciar_gato() to authenticated;
