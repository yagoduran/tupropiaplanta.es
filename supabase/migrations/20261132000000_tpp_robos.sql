-- Robos mientras el jugador está desconectado. Al volver tras 4 h o más fuera (tpp.perfiles.ultima_vez) hay una tirada del 25 %
-- (tutorial hecho y 100 monedas o más): si sale, se llevan entre el 5 % y el 10 % de las monedas (mínimo 10, máximo 500).
-- La mejora de armario «Seguridad» (rama seg) baja la probabilidad a la mitad, a la cuarta parte y a cero (niveles 1, 2 y 3).
-- El robo queda en tpp.perfiles.robo hasta que el jugador lo ve (public.tpp_ver_robo) y avisa con una notificación de tipo «robo».
-- Para deshacer: borrar public.tpp_ver_robo, tpp.ver_robo, tpp.robo_al_volver y la columna robo de tpp.perfiles; quitar la rama «seg»
-- de tpp.mejoras() y volver a aplicar la versión anterior de tpp.estado_json (sin la llamada a robo_al_volver ni la clave 'robo').

alter table tpp.perfiles add column if not exists robo jsonb;

create function tpp.robo_al_volver(p_uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  nivel integer;
  prob double precision;
  robado integer;
begin
  select * into perfil from tpp.perfiles where id = p_uid for update;
  if not perfil.tutorial_hecho or perfil.monedas < 100 or perfil.robo is not null then
    return;
  end if;
  nivel := coalesce((perfil.mejoras ->> 'seg')::int, 0);
  prob := 0.25 * case nivel when 0 then 1.0 when 1 then 0.5 when 2 then 0.25 else 0 end;
  if random() >= prob then
    return;
  end if;
  robado := least(500, greatest(10, floor(perfil.monedas * (0.05 + random() * 0.05))::int));
  update tpp.perfiles
     set monedas = monedas - robado,
         robo = jsonb_build_object('monedas', robado, 'en', now())
   where id = p_uid;
  perform tpp.notificar(p_uid, 'robo', '¡Te han robado!', 'Un ladrón se llevó ' || robado || ' monedas mientras no estabas.');
end;
$$;

create function tpp.ver_robo(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  update tpp.perfiles set robo = null where id = p_uid;
  return jsonb_build_object('ok', true);
end;
$$;

create function public.tpp_ver_robo() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.ver_robo(auth.uid());
end;
$$;

revoke all on function tpp.robo_al_volver(uuid) from public, anon, authenticated;
revoke all on function tpp.ver_robo(uuid) from public, anon, authenticated;
revoke all on function public.tpp_ver_robo() from public, anon;
grant execute on function public.tpp_ver_robo() to authenticated;

do $mig$
declare
  d text;
  o text;
begin
  -- Rama «Seguridad» de las mejoras del armario.
  d := pg_get_functiondef('tpp.mejoras()'::regprocedure);
  o := d;
  d := replace(d, '"cap": [', '"seg": [{"precio":900,"nivel":9},{"precio":3000,"nivel":20},{"precio":7500,"nivel":30}],' || chr(10) || '    "cap": [');
  if d = o then raise exception 'no se pudo parchear tpp.mejoras'; end if;
  execute d;

  -- Tirada de robo al volver y robo pendiente en el estado.
  d := pg_get_functiondef('tpp.estado_json(uuid)'::regprocedure);
  o := d;
  d := regexp_replace(
    d,
    'if perfil\.ultima_vez is null or perfil\.ultima_vez < now\(\) - interval ''1 minute'' then',
    'if perfil.ultima_vez is not null and perfil.ultima_vez < now() - interval ''4 hours'' then perform tpp.robo_al_volver(p_uid); end if; if perfil.ultima_vez is null or perfil.ultima_vez < now() - interval ''1 minute'' then'
  );
  if d = o then raise exception 'no se pudo parchear estado_json (robo)'; end if;
  o := d;
  d := regexp_replace(d, '''nivel'', nivel,', '''robo'', perfil.robo, ''nivel'', nivel,');
  if d = o then raise exception 'no se pudo parchear estado_json (clave)'; end if;
  execute d;
end;
$mig$;
