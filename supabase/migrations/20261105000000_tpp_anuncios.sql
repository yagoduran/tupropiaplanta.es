-- Fase 6a: ayuda extra por ver anuncio (máx. 3 al día, hora de Madrid): +25 monedas y se quitan las esperas de la planta.
-- Por ahora el anuncio es de prueba; el servidor solo controla el límite diario y la recompensa.
-- (estado_json queda con la línea nueva "anuncios": volver a aplicar esta migración si se reaplican las anteriores.)

alter table tpp.perfiles
  add column anuncios_dia date,
  add column anuncios_n integer not null default 0;

create function tpp.anuncios_json(p tpp.perfiles) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'restantes', 3 - case when p.anuncios_dia = (now() at time zone 'Europe/Madrid')::date then p.anuncios_n else 0 end,
    'monedas', 25
  );
$$;

create function tpp.ver_anuncio(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  usados integer;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  usados := case when perfil.anuncios_dia = hoy then perfil.anuncios_n else 0 end;
  if usados >= 3 then
    return jsonb_build_object('ok', false, 'error', 'anuncios_agotados') || tpp.estado_json(p_uid);
  end if;
  update tpp.perfiles set monedas = monedas + 25, anuncios_dia = hoy, anuncios_n = usados + 1 where id = p_uid;
  update tpp.plantas set esperas = '{}'::jsonb where usuario_id = p_uid and estado = 'viva';
  return jsonb_build_object('ok', true, 'recompensa', 25) || tpp.estado_json(p_uid);
end;
$$;

create function public.tpp_ver_anuncio() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.ver_anuncio(auth.uid());
end;
$$;

revoke all on function tpp.anuncios_json(tpp.perfiles) from public, anon, authenticated;
revoke all on function tpp.ver_anuncio(uuid) from public, anon, authenticated;
revoke all on function public.tpp_ver_anuncio() from public, anon;
grant execute on function public.tpp_ver_anuncio() to authenticated;

create or replace function tpp.estado_json(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  p tpp.plantas;
  pid uuid;
  nivel integer;
  esperas jsonb := '{}'::jsonb;
  k text;
  v text;
  resta integer;
  planta jsonb := null;
  inv jsonb;
  nuevos jsonb;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  nuevos := tpp.revisar_logros(p_uid);
  select * into perfil from tpp.perfiles where id = p_uid;

  select id into pid from tpp.plantas where usuario_id = p_uid and estado = 'viva';
  if pid is null then
    select id into pid from tpp.plantas where usuario_id = p_uid order by plantada_en desc limit 1;
  end if;
  if pid is not null then
    p := tpp.sincronizar(pid);
  end if;

  if p.id is not null then
    for k, v in select * from jsonb_each_text(p.esperas) loop
      resta := ceil(extract(epoch from (v::timestamptz - now())))::int;
      if resta > 0 then esperas := esperas || jsonb_build_object(k, resta); end if;
    end loop;
    planta := jsonb_build_object(
      'id', p.id,
      'variedad', p.variedad,
      'vida', p.estado,
      'fase', tpp.fase_planta(p),
      'estado', tpp.estado_visual(p),
      'agua', round(p.agua::numeric, 1),
      'nutrientes', round(p.nutrientes::numeric, 1),
      'luz', round(p.luz::numeric, 1),
      'temperatura', p.temperatura,
      'ph', p.ph,
      'salud', round(p.salud::numeric, 1),
      'segundos_vida', floor(p.horas_vividas * 3600),
      'esperas', esperas,
      'plaga', case when p.plaga is null then null
        else jsonb_build_object('tipo', p.plaga, 'grave', now() - p.plaga_desde > interval '6 hours') end
    );
  end if;

  select coalesce(jsonb_object_agg(objeto, cantidad), '{}'::jsonb) into inv
    from tpp.inventario where usuario_id = p_uid and cantidad > 0;

  nivel := tpp.nivel_de(perfil.xp);
  return jsonb_build_object(
    'perfil', jsonb_build_object(
      'usuario', perfil.usuario,
      'monedas', perfil.monedas,
      'xp', perfil.xp,
      'tutorial_hecho', perfil.tutorial_hecho,
      'tutorial_paso', perfil.tutorial_paso,
      'ajustes', perfil.ajustes,
      'equipo', perfil.equipo,
      'inventario', inv,
      'logros', tpp.logros_json(perfil),
      'logros_nuevos', nuevos,
      'diaria', tpp.diaria_json(perfil),
      'anuncios', tpp.anuncios_json(perfil),
      'nivel', nivel,
      'xp_pct', round(100 * (perfil.xp - 25 * (nivel - 1) ^ 2) / (25 * nivel ^ 2 - 25 * (nivel - 1) ^ 2))
    ),
    'planta', planta
  );
end;
$$;
