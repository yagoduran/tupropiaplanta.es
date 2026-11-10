-- Sospecha vecinal (olor de las plantas en floración), minijuegos de cuidado (poda y lavado de raíces) y bono del salón.

alter table tpp.perfiles add column if not exists vecinos jsonb not null default '{}'::jsonb;

create or replace function tpp._parche(d text, viejo text, nuevo text) returns text language plpgsql as $$
begin
  if position(viejo in d) = 0 then raise exception 'parche no encontrado: %', left(viejo, 80); end if;
  return replace(d, viejo, nuevo);
end;
$$;

-- Olor por hora: cada planta huele según su fase; el filtro de carbón (mejora del extractor) lo reduce.
create or replace function tpp.olor_de(p_uid uuid)
returns double precision language sql stable security definer set search_path = '' as $$
  select round((coalesce(sum(case tpp.fase_planta(pl) when 5 then 1.5 when 6 then 2.5 when 7 then 3.5 when 8 then 2 else 0 end), 0)
    * (select case coalesce((mejoras ->> 'ext')::int, 0) when 0 then 1 when 1 then 0.4 else 0.26 end from tpp.perfiles where id = p_uid))::numeric, 2)
  from tpp.plantas pl where pl.usuario_id = p_uid and pl.estado = 'viva' and pl.desafio is null;
$$;

-- Pone al día la sospecha: sube con el olor y baja 1 punto por hora. A 100, multa.
create or replace function tpp.vecinos_al_dia(p_uid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  pf tpp.perfiles;
  v jsonb;
  ahora double precision := extract(epoch from now());
  s double precision;
  s2 double precision;
  h double precision;
  multa integer;
begin
  select * into pf from tpp.perfiles where id = p_uid for update;
  if pf.id is null or not pf.tutorial_hecho or tpp.nivel_de(pf.xp) < 3 then return; end if;
  v := coalesce(pf.vecinos, '{}'::jsonb);
  if v ->> 'ts' is null then
    update tpp.perfiles set vecinos = v || jsonb_build_object('s', 0, 'ts', ahora) where id = p_uid;
    return;
  end if;
  h := least(8, (ahora - (v ->> 'ts')::double precision) / 3600.0);
  if h < 0.02 then return; end if;
  s := coalesce((v ->> 's')::double precision, 0);
  s2 := greatest(0, least(100, s + (tpp.olor_de(p_uid) - 1) * h));
  v := v || jsonb_build_object('s', round(s2::numeric, 2), 'ts', ahora);
  if s < 50 and s2 >= 50 then
    perform tpp.notificar(p_uid, 'vecinos', 'La vecina ha notado el olor', 'Dice que huele raro en la escalera. Mejora el extractor o usa un ambientador.');
  end if;
  if s < 80 and s2 >= 80 then
    perform tpp.notificar(p_uid, 'vecinos', 'Nota en el buzón', 'Los vecinos se quejan del olor. Si la sospecha llega al 100 % habrá multa.');
  end if;
  if s2 >= 100 then
    multa := least(pf.monedas, greatest(500, least(5000, round(pf.monedas * 0.1)::int)));
    v := v || jsonb_build_object('s', 40, 'multa', jsonb_build_object('monedas', multa, 'en', now()));
    update tpp.perfiles set monedas = monedas - multa where id = p_uid;
    perform tpp.notificar(p_uid, 'vecinos', 'Multa por olores', 'La comunidad te ha multado con ' || multa || ' monedas. La sospecha baja al 40 %.');
  end if;
  update tpp.perfiles set vecinos = v where id = p_uid;
end;
$$;

create or replace function tpp.vecinos_json(p_uid uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'sospecha', round(coalesce((vecinos ->> 's')::numeric, 0)),
    'olor', tpp.olor_de(p_uid),
    'multa', vecinos -> 'multa',
    'ambientador', greatest(0, floor(coalesce((vecinos ->> 'amb')::double precision, 0) + 6 * 3600 - extract(epoch from now())))::int)
  from tpp.perfiles where id = p_uid;
$$;

create or replace function tpp.ver_multa(p_uid uuid)
returns void language sql security definer set search_path = '' as $$
  update tpp.perfiles set vecinos = vecinos - 'multa' where id = p_uid;
$$;

create or replace function public.tpp_ver_multa() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  perform tpp.ver_multa(auth.uid());
end;
$$;

-- Minijuegos de cuidado. El resultado (0 a 3 estrellas) lo manda el juego; el servidor comprueba fase y que no se repita.
create or replace function tpp.minijuego(p_uid uuid, p_tipo text, p_estrellas integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  p tpp.plantas;
  pid uuid;
  fase integer;
  e integer := greatest(0, least(3, coalesce(p_estrellas, 0)));
  k text;
begin
  perform tpp.asegurar_perfil(p_uid);
  if p_tipo not in ('poda', 'lavado') then
    return jsonb_build_object('ok', false, 'error', 'accion_desconocida') || tpp.estado_json(p_uid);
  end if;
  select id into pid from tpp.plantas where usuario_id = p_uid and estado = 'viva' and hueco = tpp.hueco_activo(p_uid);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'sin_planta') || tpp.estado_json(p_uid); end if;
  p := tpp.sincronizar(pid);
  if p.estado <> 'viva' then return jsonb_build_object('ok', false, 'error', 'planta_muerta') || tpp.estado_json(p_uid); end if;
  if p.desafio is not null then return jsonb_build_object('ok', false, 'error', 'desafio_prohibido') || tpp.estado_json(p_uid); end if;
  fase := tpp.fase_planta(p);
  if p_tipo = 'poda' then
    if fase not between 3 and 5 then return jsonb_build_object('ok', false, 'error', 'fase_incorrecta') || tpp.estado_json(p_uid); end if;
    k := 'poda_f' || fase;
    if p.extras ? k then return jsonb_build_object('ok', false, 'error', 'ya_aplicado') || tpp.estado_json(p_uid); end if;
    update tpp.plantas set
      extras = extras || jsonb_build_object(k, e)
        || case when e = 0 then jsonb_build_object('estres', extract(epoch from now()) + 2 * 3600) else '{}'::jsonb end,
      bonus_cosecha = bonus_cosecha + (array[0, 0.03, 0.04, 0.05])[e + 1],
      salud = least(100, salud + case when e > 0 then 5 else 0 end)
    where id = p.id;
    if e > 0 then
      perform tpp.mision_sumar(p_uid, 'podar');
      perform tpp.procesado_restos(p_uid, 2 * e, 3);
    end if;
  else
    if fase <> 7 then return jsonb_build_object('ok', false, 'error', 'fase_incorrecta') || tpp.estado_json(p_uid); end if;
    if p.extras ? 'lavado' then return jsonb_build_object('ok', false, 'error', 'ya_aplicado') || tpp.estado_json(p_uid); end if;
    update tpp.plantas set extras = extras || jsonb_build_object('lavado', e) where id = p.id;
  end if;
  if e > 0 then
    update tpp.perfiles set xp = xp + round(10 * e * tpp.mult_xp(p_uid))::int where id = p_uid;
  end if;
  return jsonb_build_object('ok', true, 'estrellas', e) || tpp.estado_json(p_uid);
end;
$$;

create or replace function public.tpp_minijuego(p_tipo text, p_estrellas integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.minijuego(auth.uid(), p_tipo, p_estrellas);
end;
$$;

revoke all on function tpp._parche(text, text, text) from public, anon, authenticated;
revoke all on function tpp.olor_de(uuid) from public, anon, authenticated;
revoke all on function tpp.vecinos_al_dia(uuid) from public, anon, authenticated;
revoke all on function tpp.vecinos_json(uuid) from public, anon, authenticated;
revoke all on function tpp.ver_multa(uuid) from public, anon, authenticated;
revoke all on function tpp.minijuego(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.tpp_ver_multa() from public, anon;
grant execute on function public.tpp_ver_multa() to authenticated;
revoke all on function public.tpp_minijuego(text, integer) from public, anon;
grant execute on function public.tpp_minijuego(text, integer) to authenticated;

do $m$
declare d text;
begin
  -- Ambientador en la tienda.
  d := pg_get_functiondef('tpp.catalogo()'::regprocedure);
  d := tpp._parche(d, $${"id":"maceta_morada","tipo":"maceta","precio":-1,"nivel":1}$$,
    $${"id":"ambientador","tipo":"consumible","precio":80,"nivel":3},{"id":"maceta_morada","tipo":"maceta","precio":-1,"nivel":1}$$);
  execute d;

  d := pg_get_functiondef('tpp.usar(uuid,text)'::regprocedure);
  d := tpp._parche(d, $$'abono_volcanico', 'lampara_pirata');$$, $$'abono_volcanico', 'lampara_pirata', 'ambientador');$$);
  d := tpp._parche(d, $$    update tpp.inventario set cantidad = cantidad - 1 where usuario_id = p_uid and objeto = p_objeto;
    case p_objeto$$, $$    if p_objeto = 'ambientador' then
      if (tpp.vecinos_json(p_uid) ->> 'ambientador')::int > 0 then
        return jsonb_build_object('ok', false, 'error', 'ambientador_espera') || tpp.estado_json(p_uid);
      end if;
      update tpp.perfiles set vecinos = vecinos || jsonb_build_object(
        's', greatest(0, coalesce((vecinos ->> 's')::numeric, 0) - 20), 'amb', extract(epoch from now())) where id = p_uid;
    end if;
    update tpp.inventario set cantidad = cantidad - 1 where usuario_id = p_uid and objeto = p_objeto;
    case p_objeto$$);
  execute d;

  -- estado_json: la sospecha se pone al día y se enseña.
  d := pg_get_functiondef('tpp.estado_json(uuid)'::regprocedure);
  d := tpp._parche(d, $$  perform tpp.sincronizar(pl.id) from tpp.plantas pl where pl.usuario_id = p_uid and pl.estado = 'viva';$$,
    $$  perform tpp.sincronizar(pl.id) from tpp.plantas pl where pl.usuario_id = p_uid and pl.estado = 'viva';
  perform tpp.vecinos_al_dia(p_uid);$$);
  d := tpp._parche(d, $$      'animo', tpp.animo_de(p_uid),$$, $$      'animo', tpp.animo_de(p_uid),
      'vecinos', tpp.vecinos_json(p_uid),$$);
  execute d;

  -- sincronizar: estrés por una poda fallida y luz de ventana del salón.
  d := pg_get_functiondef('tpp.sincronizar(uuid)'::regprocedure);
  d := tpp._parche(d, $$    if hab = 'cocina' then calor_luz := calor_luz + 2; end if;$$,
    $$    if hab = 'cocina' then calor_luz := calor_luz + 2; end if;
    if hab = 'salon' then f_luz := f_luz * 0.9; end if;
    if coalesce((p.extras ->> 'estres')::double precision, 0) > extract(epoch from ahora) then vel := vel * 0.8; end if;$$);
  execute d;

  -- accion: el lavado de raíces mejora el precio y, con 3 estrellas, la calidad.
  d := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure);
  d := tpp._parche(d, $$    if coalesce((p.extras ->> 'pk')::boolean, false) then q_c := least(5, q_c + 1); end if;$$,
    $$    if coalesce((p.extras ->> 'pk')::boolean, false) then q_c := least(5, q_c + 1); end if;
    if coalesce((p.extras ->> 'lavado')::int, 0) = 3 then q_c := least(5, q_c + 1); end if;
    recompensa := round(recompensa * (1 + 0.05 * coalesce((p.extras ->> 'lavado')::int, 0)))::int;$$);
  execute d;
end;
$m$;

drop function tpp._parche(text, text, text);
