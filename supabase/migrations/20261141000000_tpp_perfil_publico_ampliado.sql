-- Perfil público ampliado: medallas destacadas (3 logros de más premio), variedad favorita, racha y semana,
-- mejor cosecha, días jugados, amigos y fecha de inicio.
--
-- Para deshacer: volver a crear tpp.perfil_publico sin las claves añadidas (ver migraciones anteriores).

create or replace function tpp.perfil_publico(p_uid uuid, p_usuario text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  otro uuid := tpp.id_de_usuario(p_usuario);
  perfil tpp.perfiles;
  rel text;
  lunes date := (date_trunc('week', now() at time zone 'Europe/Madrid'))::date;
begin
  perform tpp.asegurar_perfil(p_uid);
  if otro is null or (otro <> p_uid and tpp.bloqueado(p_uid, otro)) then
    return jsonb_build_object('ok', false, 'error', 'usuario_desconocido');
  end if;
  select * into perfil from tpp.perfiles where id = otro;
  rel := case when otro = p_uid then 'yo' else tpp.relacion(p_uid, otro) end;
  if otro <> p_uid and rel <> 'amigos' and coalesce((perfil.ajustes ->> 'perfil_oculto')::boolean, false) then
    return jsonb_build_object('ok', false, 'error', 'usuario_desconocido');
  end if;
  return jsonb_build_object('ok', true, 'relacion', rel,
    'jugador', tpp.ficha_jugador(otro) || jsonb_build_object(
      'cosechas', coalesce((perfil.estadisticas ->> 'cosechas')::int, 0),
      'variedades', (select count(*)::int from jsonb_object_keys(coalesce(perfil.estadisticas -> 'variedades', '{}'::jsonb)) k where k not like 'ed-%'),
      'variedades_total', 12,
      'logros', (select count(*)::int from jsonb_object_keys(perfil.logros)),
      'logros_total', jsonb_array_length(tpp.logros()),
      'destacados', coalesce((
        select jsonb_agg(x.id order by x.premio desc, x.id)
        from (
          select l ->> 'id' id, (l ->> 'premio')::int premio
          from jsonb_array_elements(tpp.logros()) l
          where perfil.logros ? (l ->> 'id')
          order by (l ->> 'premio')::int desc, l ->> 'id'
          limit 3
        ) x), '[]'::jsonb),
      'favorita', (
        select jsonb_build_object('variedad', variedad, 'cosechas', n)
        from (select variedad, count(*)::int n, max(plantada_en) u from tpp.plantas
              where usuario_id = otro and estado = 'cosechada' group by variedad
              order by n desc, u desc limit 1) f),
      'racha', perfil.racha,
      'semana', (
        select coalesce(jsonb_agg(exists (select 1 from tpp.actividad a where a.usuario_id = otro and a.dia = lunes + d) order by d), '[]'::jsonb)
        from generate_series(0, 6) d),
      'hoy_semana', extract(isodow from now() at time zone 'Europe/Madrid')::int - 1,
      'mejor_cosecha', (select max(gramos) from tpp.cosechas_historial where usuario_id = otro),
      'dias', (select count(*)::int from tpp.actividad where usuario_id = otro),
      'amigos', (select count(*)::int from tpp.amistades where estado = 'amigos' and (solicitante = otro or receptor = otro)),
      'desde', perfil.creado_en));
end;
$function$;
