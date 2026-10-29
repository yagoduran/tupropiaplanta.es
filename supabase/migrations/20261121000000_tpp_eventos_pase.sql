-- Eventos de temporada y pase de temporada.
-- Eventos (fechas del diseño): Primavera 20 mar-20 abr, Verano 21 jun-21 jul, Otoño 22 sep-20 nov, Invierno 21 dic-20 ene.
-- Cada evento tiene 3 misiones; al completarlas se consigue la semilla de edición limitada (ed-primavera, ed-verano, ed-otono,
-- ed-invierno: mismo dibujo y datos que la variedad base, no cuentan en la colección) y 500 monedas; Otoño y Invierno dan además un marco.
-- Pase: dura lo que el evento activo; 30 niveles de 80 puntos. Puntos: misión diaria reclamada +20, semanal +60, misión de evento +100,
-- cosecha +50. Pista gratis para todos y pista especial por 1.200 monedas. Lo no reclamado se pierde al cambiar de temporada.
-- El progreso de la temporada se guarda en tpp.perfiles.temporada (los marcos conseguidos se conservan).
-- Para deshacer: borrar las funciones public.tpp_evento, tpp_pase, tpp_reclamar_pase y tpp_comprar_pase, tpp.eventos, evento_activo,
-- temporada_al_dia, temporada_sumar, pase_puntos, pase_premio, mi_evento, mi_pase, reclamar_pase y comprar_pase, la columna temporada de
-- tpp.perfiles, y volver a aplicar las versiones anteriores de variedades, mision_sumar, reclamar_mision, accion, plantar, progresion,
-- progresion_datos, prestigio_datos, perfil_publico y renacer.

alter table tpp.perfiles add column if not exists temporada jsonb not null default '{}'::jsonb;

create or replace function tpp.variedades() returns jsonb
language sql immutable set search_path = '' as $$
  select '{
    "clasica":   {"nivel":1,  "recompensa":1.0, "ciclo":1.0,  "desgaste":1.0, "sabor":50, "rareza":"comun",      "hoja":"clasica"},
    "hoja-azul": {"nivel":3,  "recompensa":1.3, "ciclo":1.0,  "desgaste":1.0, "sabor":66, "rareza":"poco_comun", "hoja":"hoja-azul"},
    "dorada":    {"nivel":6,  "recompensa":1.7, "ciclo":1.15, "desgaste":1.0, "sabor":80, "rareza":"rara",       "hoja":"dorada"},
    "noche":     {"nivel":10, "recompensa":2.2, "ciclo":1.3,  "desgaste":1.2, "sabor":92, "rareza":"epica",      "hoja":"noche"},
    "cristal":   {"nivel":15, "recompensa":3.0, "ciclo":1.5,  "desgaste":1.3, "sabor":95, "rareza":"legendaria", "hoja":"cristal"},
    "verde-azulado":  {"nivel":1, "hibrida":true, "recompensa":1.15, "ciclo":0.95, "desgaste":0.95, "sabor":62, "rareza":"poco_comun", "hoja":"hoja-azul"},
    "brisa-dorada":   {"nivel":1, "hibrida":true, "recompensa":1.5,  "ciclo":1.05, "desgaste":1.0,  "sabor":76, "rareza":"rara",       "hoja":"dorada"},
    "menta-nocturna": {"nivel":1, "hibrida":true, "recompensa":1.6,  "ciclo":1.15, "desgaste":1.1,  "sabor":84, "rareza":"epica",      "hoja":"noche"},
    "sol-medianoche": {"nivel":1, "hibrida":true, "recompensa":2.4,  "ciclo":1.3,  "desgaste":1.15, "sabor":90, "rareza":"epica",      "hoja":"noche"},
    "escarcha-azul":  {"nivel":1, "hibrida":true, "recompensa":2.6,  "ciclo":1.35, "desgaste":1.15, "sabor":92, "rareza":"legendaria", "hoja":"cristal"},
    "ambar-antiguo":  {"nivel":1, "hibrida":true, "recompensa":2.0,  "ciclo":1.2,  "desgaste":1.0,  "sabor":88, "rareza":"rara",       "hoja":"dorada"},
    "aurora":         {"nivel":1, "hibrida":true, "recompensa":3.4,  "ciclo":1.55, "desgaste":1.2,  "sabor":98, "rareza":"legendaria", "hoja":"cristal"},
    "ed-primavera":   {"nivel":1, "hibrida":true, "recompensa":1.3,  "ciclo":1.0,  "desgaste":1.0,  "sabor":66, "rareza":"poco_comun", "hoja":"hoja-azul"},
    "ed-verano":      {"nivel":1, "hibrida":true, "recompensa":1.7,  "ciclo":1.15, "desgaste":1.0,  "sabor":80, "rareza":"rara",       "hoja":"dorada"},
    "ed-otono":       {"nivel":1, "hibrida":true, "recompensa":2.2,  "ciclo":1.3,  "desgaste":1.2,  "sabor":92, "rareza":"epica",      "hoja":"noche"},
    "ed-invierno":    {"nivel":1, "hibrida":true, "recompensa":3.0,  "ciclo":1.5,  "desgaste":1.3,  "sabor":95, "rareza":"legendaria", "hoja":"cristal"}
  }'::jsonb;
$$;

create function tpp.eventos() returns jsonb
language sql immutable set search_path = '' as $$
  select '{
    "primavera": {"nombre":"Primavera en flor", "fechas":"Del 20 de marzo al 20 de abril", "ini":[3,20], "fin":[4,20],
      "desc":"Flores en la ventana, luz suave de mañana y una Hoja Azul de edición limitada.",
      "edicion":"ed-primavera", "edicion_nombre":"Hoja Azul de Primavera", "rareza":"poco_comun", "marco":null,
      "misiones":[{"id":"pr_semillas","clave":"plantar","meta":3,"nombre":"Planta 3 semillas"},
                  {"id":"pr_alba","clave":"alba","meta":5,"nombre":"Riega al amanecer 5 veces (de 6:00 a 10:00)"},
                  {"id":"pr_regalos","clave":"regalo","meta":3,"nombre":"Envía 3 regalos"}]},
    "verano": {"nombre":"Verano soleado", "fechas":"Del 21 de junio al 21 de julio", "ini":[6,21], "fin":[7,21],
      "desc":"Sol fuerte, ventilador y limonada. La Dorada del Sur crece más rápido con calor.",
      "edicion":"ed-verano", "edicion_nombre":"Dorada del Sur de Verano", "rareza":"rara", "marco":null,
      "misiones":[{"id":"ve_riegos","clave":"regar","meta":10,"nombre":"Riega 10 veces"},
                  {"id":"ve_cosecha","clave":"cosechar","meta":1,"nombre":"Cosecha una planta"},
                  {"id":"ve_sol","clave":"sol","meta":1,"nombre":"Cosecha con la salud al 90 % o más"}]},
    "otono": {"nombre":"Otoño dorado", "fechas":"Del 22 de septiembre al 20 de noviembre", "ini":[9,22], "fin":[11,20],
      "desc":"Hojas que caen, calabazas y luz de atardecer. Consigue la Noche Púrpura de edición limitada.",
      "edicion":"ed-otono", "edicion_nombre":"Noche Púrpura de Otoño", "rareza":"epica", "marco":"otono",
      "misiones":[{"id":"ot_hojas","clave":"cuidado","meta":20,"nombre":"Recoge 20 hojas doradas (cada riego, abono, poda o ajuste de luz da una)"},
                  {"id":"ot_tarde","clave":"dia","meta":1,"nombre":"Cosecha antes de las 19:00"},
                  {"id":"ot_visitas","clave":"visita","meta":5,"nombre":"Visita a 5 amigos"}]},
    "invierno": {"nombre":"Invierno helado", "fechas":"Del 21 de diciembre al 20 de enero", "ini":[12,21], "fin":[1,20],
      "desc":"Nieve en la ventana, luces de colores y el Cristal Helado con escarcha.",
      "edicion":"ed-invierno", "edicion_nombre":"Cristal Helado de Invierno", "rareza":"legendaria", "marco":"escarcha",
      "misiones":[{"id":"in_riegos","clave":"regar","meta":8,"nombre":"Riega 8 veces"},
                  {"id":"in_luz","clave":"luz","meta":3,"nombre":"Ajusta la luz 3 veces"},
                  {"id":"in_regalos","clave":"regalo","meta":3,"nombre":"Envía 3 regalos"}]}
  }'::jsonb;
$$;

-- Evento que está en marcha hoy (hora de Madrid), con su fecha de inicio y fin, o null.
create function tpp.evento_activo() returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  k text;
  e jsonb;
  y integer;
  ini date;
  fin date;
begin
  for k, e in select * from jsonb_each(tpp.eventos()) loop
    for y in (extract(year from hoy)::int - 1)..(extract(year from hoy)::int) loop
      ini := make_date(y, (e -> 'ini' ->> 0)::int, (e -> 'ini' ->> 1)::int);
      fin := make_date(case when (e -> 'fin' ->> 0)::int < (e -> 'ini' ->> 0)::int then y + 1 else y end,
                       (e -> 'fin' ->> 0)::int, (e -> 'fin' ->> 1)::int);
      if hoy between ini and fin then
        return e || jsonb_build_object('id', k, 'inicio', ini, 'fin', fin, 'clave', k || '-' || y);
      end if;
    end loop;
  end loop;
  return null;
end;
$$;

-- Progreso de temporada del jugador, vacío si cambió la temporada (no guarda nada).
create function tpp.temporada_al_dia(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t jsonb;
  ev jsonb := tpp.evento_activo();
begin
  select temporada into t from tpp.perfiles where id = p_uid;
  t := coalesce(t, '{}'::jsonb);
  if ev is not null and (t ->> 'k') is distinct from (ev ->> 'clave') then
    t := (t - 'm' - 'ev' - 'pts' - 'premium' - 'rf' - 'rs' - 'nivel') || jsonb_build_object('k', ev ->> 'clave');
  end if;
  return t;
end;
$$;

-- Puntos de pase: sube de nivel cada 80 (máximo 30 niveles) y avisa.
create function tpp.pase_puntos(p_uid uuid, p_n integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t jsonb;
  antes integer;
  despues integer;
begin
  if tpp.evento_activo() is null then return; end if;
  t := tpp.temporada_al_dia(p_uid);
  antes := least(30, coalesce((t ->> 'pts')::int, 0) / 80);
  t := t || jsonb_build_object('pts', least(2400, coalesce((t ->> 'pts')::int, 0) + p_n));
  despues := least(30, (t ->> 'pts')::int / 80);
  update tpp.perfiles set temporada = t where id = p_uid;
  if despues > antes then
    perform tpp.notificar(p_uid, 'pase', 'Nivel de pase', 'Has llegado al nivel ' || despues || ' del pase de temporada.');
  end if;
end;
$$;

-- Suma progreso a las misiones del evento activo y entrega el premio al completar las tres.
create function tpp.temporada_sumar(p_uid uuid, p_clave text, p_n integer default 1) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ev jsonb := tpp.evento_activo();
  t jsonb;
  def jsonb;
  previo integer;
  nuevo integer;
  puntos integer := 0;
  listo boolean;
begin
  if ev is null then return; end if;
  t := tpp.temporada_al_dia(p_uid);
  for def in select x from jsonb_array_elements(ev -> 'misiones') x where x ->> 'clave' = p_clave loop
    previo := coalesce((t -> 'm' ->> (def ->> 'id'))::int, 0);
    if previo >= (def ->> 'meta')::int then continue; end if;
    nuevo := least((def ->> 'meta')::int, previo + p_n);
    t := jsonb_set(t, '{m}', coalesce(t -> 'm', '{}'::jsonb) || jsonb_build_object(def ->> 'id', nuevo));
    if nuevo >= (def ->> 'meta')::int then
      puntos := puntos + 100;
      perform tpp.notificar(p_uid, 'evento', 'Misión del evento', '«' || (def ->> 'nombre') || '» completada.');
    end if;
  end loop;
  select bool_and(coalesce((t -> 'm' ->> (x ->> 'id'))::int, 0) >= (x ->> 'meta')::int) into listo
    from jsonb_array_elements(ev -> 'misiones') x;
  if listo and not coalesce((t ->> 'ev')::boolean, false) then
    t := t || jsonb_build_object('ev', true);
    update tpp.perfiles set monedas = monedas + 500,
      semillas_hibridas = case when semillas_hibridas ? (ev ->> 'edicion') then semillas_hibridas else semillas_hibridas || to_jsonb(ev ->> 'edicion') end
      where id = p_uid;
    if ev ->> 'marco' is not null and not (coalesce(t -> 'marcos', '[]'::jsonb) ? (ev ->> 'marco')) then
      t := jsonb_set(t, '{marcos}', coalesce(t -> 'marcos', '[]'::jsonb) || to_jsonb(ev ->> 'marco'));
    end if;
    perform tpp.notificar(p_uid, 'evento', '¡Evento completado!', 'Has conseguido ' || (ev ->> 'edicion_nombre') || ' y 500 monedas.');
  end if;
  update tpp.perfiles set temporada = t where id = p_uid;
  if puntos > 0 then perform tpp.pase_puntos(p_uid, puntos); end if;
end;
$$;

-- Premio de un nivel del pase. Pista g = gratis, s = especial.
create function tpp.pase_premio(p_nivel integer, p_pista text, p_evento jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select case
    when p_pista = 'g' then
      case when p_nivel % 10 = 0 then jsonb_build_object('tipo', 'monedas', 'n', 500, 'etq', 'Cofre de monedas')
           when p_nivel % 5 = 0 then jsonb_build_object('tipo', 'objeto', 'id', 'fert_crecimiento', 'n', 3, 'etq', 'Abono de crecimiento x3')
           when p_nivel % 3 = 0 then jsonb_build_object('tipo', 'xp', 'n', 100, 'etq', '100 XP')
           else jsonb_build_object('tipo', 'monedas', 'n', 50 + p_nivel * 10, 'etq', (50 + p_nivel * 10) || ' monedas') end
    else
      case when p_nivel = 30 then jsonb_build_object('tipo', 'semilla', 'id', p_evento ->> 'edicion', 'etq', p_evento ->> 'edicion_nombre')
           when p_nivel = 10 and p_evento ->> 'marco' is not null then jsonb_build_object('tipo', 'marco', 'id', p_evento ->> 'marco', 'etq', 'Marco de temporada')
           when p_nivel = 10 then jsonb_build_object('tipo', 'monedas', 'n', 500, 'etq', '500 monedas')
           when p_nivel = 20 then jsonb_build_object('tipo', 'monedas', 'n', 800, 'etq', '800 monedas')
           when p_nivel % 5 = 0 then jsonb_build_object('tipo', 'objeto', 'id', 'fert_floracion', 'n', 1, 'etq', 'Abono de floración')
           when p_nivel % 2 = 1 then jsonb_build_object('tipo', 'monedas', 'n', 100 + p_nivel * 20, 'etq', (100 + p_nivel * 20) || ' monedas')
           else jsonb_build_object('tipo', 'xp', 'n', 150, 'etq', '150 XP') end
    end;
$$;

create function tpp.mi_evento(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  ahora timestamp := now() at time zone 'Europe/Madrid';
  act jsonb := tpp.evento_activo();
  t jsonb;
  k text;
  e jsonb;
  res jsonb := '[]'::jsonb;
  estado text;
  restan integer := null;
  empieza integer := null;
  ini date;
  yr integer := extract(year from hoy)::int;
  m jsonb;
begin
  perform tpp.asegurar_perfil(p_uid);
  t := tpp.temporada_al_dia(p_uid);
  for k, e in select * from jsonb_each(tpp.eventos()) loop
    ini := make_date(yr, (e -> 'ini' ->> 0)::int, (e -> 'ini' ->> 1)::int);
    restan := null; empieza := null;
    if act is not null and act ->> 'id' = k then
      estado := 'now';
      restan := floor(extract(epoch from (((act ->> 'fin')::date + 1)::timestamp - ahora)))::int;
    elsif hoy < ini then
      estado := 'soon';
      empieza := floor(extract(epoch from (ini::timestamp - ahora)))::int;
    else
      estado := 'past';
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('nombre', x ->> 'nombre', 'meta', (x ->> 'meta')::int,
        'v', case when estado = 'now' then coalesce((t -> 'm' ->> (x ->> 'id'))::int, 0) else 0 end)), '[]'::jsonb)
      into m from jsonb_array_elements(e -> 'misiones') x;
    res := res || jsonb_build_array(jsonb_build_object('id', k, 'nombre', e ->> 'nombre', 'fechas', e ->> 'fechas', 'desc', e ->> 'desc',
      'edicion', e ->> 'edicion', 'edicion_nombre', e ->> 'edicion_nombre', 'rareza', e ->> 'rareza', 'estado', estado,
      'restan', restan, 'empieza_en', empieza, 'misiones', m,
      'tengo', exists (select 1 from tpp.perfiles where id = p_uid and semillas_hibridas ? (e ->> 'edicion')),
      'completo', estado = 'now' and coalesce((t ->> 'ev')::boolean, false)));
  end loop;
  return jsonb_build_object('activo', act ->> 'id', 'eventos', res);
end;
$$;

create function tpp.mi_pase(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  ev jsonb := tpp.evento_activo();
  t jsonb;
  pts integer;
  nivel integer;
  premium boolean;
  niveles jsonb := '[]'::jsonb;
  lv integer;
  g jsonb;
  s jsonb;
  ahora timestamp := now() at time zone 'Europe/Madrid';
  prox integer;
  hoy date := (now() at time zone 'Europe/Madrid')::date;
begin
  perform tpp.asegurar_perfil(p_uid);
  if ev is null then
    select min(extract(epoch from (f.d::timestamp - ahora)))::int into prox from (
      select make_date(y, (e.value -> 'ini' ->> 0)::int, (e.value -> 'ini' ->> 1)::int) d
      from jsonb_each(tpp.eventos()) e, generate_series(extract(year from hoy)::int, extract(year from hoy)::int + 1) y) f
      where f.d > hoy;
    return jsonb_build_object('activo', false, 'proximo_en', prox);
  end if;
  t := tpp.temporada_al_dia(p_uid);
  pts := coalesce((t ->> 'pts')::int, 0);
  nivel := least(30, pts / 80);
  premium := coalesce((t ->> 'premium')::boolean, false);
  for lv in 1..30 loop
    g := tpp.pase_premio(lv, 'g', ev) || jsonb_build_object('estado',
      case when coalesce(t -> 'rf', '[]'::jsonb) ? lv::text then 'reclamado' when lv <= nivel then 'listo' else 'futuro' end);
    s := tpp.pase_premio(lv, 's', ev) || jsonb_build_object('estado',
      case when coalesce(t -> 'rs', '[]'::jsonb) ? lv::text then 'reclamado' when not premium then 'bloqueado' when lv <= nivel then 'listo' else 'futuro' end);
    niveles := niveles || jsonb_build_array(jsonb_build_object('n', lv, 'g', g, 's', s));
  end loop;
  return jsonb_build_object('activo', true, 'evento', ev ->> 'nombre', 'nivel', nivel, 'pts', pts, 'por_nivel', 80, 'premium', premium,
    'precio', 1200, 'restan', floor(extract(epoch from (((ev ->> 'fin')::date + 1)::timestamp - ahora)))::int, 'niveles', niveles);
end;
$$;

create function tpp.reclamar_pase(p_uid uuid, p_nivel integer, p_pista text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  ev jsonb := tpp.evento_activo();
  t jsonb;
  clave text;
  premio jsonb;
  nivel integer;
begin
  perform tpp.asegurar_perfil(p_uid);
  if ev is null or p_pista not in ('g', 's') or p_nivel not between 1 and 30 then
    return jsonb_build_object('ok', false, 'error', 'pase_invalido') || tpp.mi_pase(p_uid) || tpp.estado_json(p_uid);
  end if;
  t := tpp.temporada_al_dia(p_uid);
  clave := case when p_pista = 'g' then 'rf' else 'rs' end;
  nivel := least(30, coalesce((t ->> 'pts')::int, 0) / 80);
  if p_nivel > nivel then
    return jsonb_build_object('ok', false, 'error', 'pase_nivel') || tpp.mi_pase(p_uid) || tpp.estado_json(p_uid);
  end if;
  if p_pista = 's' and not coalesce((t ->> 'premium')::boolean, false) then
    return jsonb_build_object('ok', false, 'error', 'pase_bloqueado') || tpp.mi_pase(p_uid) || tpp.estado_json(p_uid);
  end if;
  if coalesce(t -> clave, '[]'::jsonb) ? p_nivel::text then
    return jsonb_build_object('ok', false, 'error', 'pase_reclamado') || tpp.mi_pase(p_uid) || tpp.estado_json(p_uid);
  end if;
  premio := tpp.pase_premio(p_nivel, p_pista, ev);
  t := jsonb_set(t, array[clave], coalesce(t -> clave, '[]'::jsonb) || to_jsonb(p_nivel::text));
  case premio ->> 'tipo'
    when 'monedas' then update tpp.perfiles set monedas = monedas + (premio ->> 'n')::int where id = p_uid;
    when 'xp' then update tpp.perfiles set xp = xp + (premio ->> 'n')::int where id = p_uid;
    when 'objeto' then
      insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, premio ->> 'id', (premio ->> 'n')::int)
        on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + (premio ->> 'n')::int;
    when 'semilla' then
      update tpp.perfiles set
        semillas_hibridas = case when semillas_hibridas ? (premio ->> 'id') then semillas_hibridas else semillas_hibridas || to_jsonb(premio ->> 'id') end,
        monedas = monedas + case when semillas_hibridas ? (premio ->> 'id') then 500 else 0 end
        where id = p_uid;
    when 'marco' then
      if not (coalesce(t -> 'marcos', '[]'::jsonb) ? (premio ->> 'id')) then
        t := jsonb_set(t, '{marcos}', coalesce(t -> 'marcos', '[]'::jsonb) || to_jsonb(premio ->> 'id'));
      end if;
    else null;
  end case;
  update tpp.perfiles set temporada = t where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.mi_pase(p_uid) || tpp.estado_json(p_uid);
end;
$$;

create function tpp.comprar_pase(p_uid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t jsonb;
begin
  perform tpp.asegurar_perfil(p_uid);
  if tpp.evento_activo() is null then
    return jsonb_build_object('ok', false, 'error', 'pase_invalido') || tpp.mi_pase(p_uid) || tpp.estado_json(p_uid);
  end if;
  t := tpp.temporada_al_dia(p_uid);
  if coalesce((t ->> 'premium')::boolean, false) then
    return jsonb_build_object('ok', false, 'error', 'pase_comprado') || tpp.mi_pase(p_uid) || tpp.estado_json(p_uid);
  end if;
  update tpp.perfiles set monedas = monedas - 1200 where id = p_uid and monedas >= 1200;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.mi_pase(p_uid) || tpp.estado_json(p_uid);
  end if;
  update tpp.perfiles set temporada = t || jsonb_build_object('premium', true) where id = p_uid;
  return jsonb_build_object('ok', true) || tpp.mi_pase(p_uid) || tpp.estado_json(p_uid);
end;
$$;

create function public.tpp_evento() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mi_evento(auth.uid());
end;
$$;

create function public.tpp_pase() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mi_pase(auth.uid());
end;
$$;

create function public.tpp_reclamar_pase(p_nivel integer, p_pista text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.reclamar_pase(auth.uid(), p_nivel, p_pista);
end;
$$;

create function public.tpp_comprar_pase() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.comprar_pase(auth.uid());
end;
$$;

revoke all on function tpp.eventos() from public, anon, authenticated;
revoke all on function tpp.evento_activo() from public, anon, authenticated;
revoke all on function tpp.temporada_al_dia(uuid) from public, anon, authenticated;
revoke all on function tpp.pase_puntos(uuid, integer) from public, anon, authenticated;
revoke all on function tpp.temporada_sumar(uuid, text, integer) from public, anon, authenticated;
revoke all on function tpp.pase_premio(integer, text, jsonb) from public, anon, authenticated;
revoke all on function tpp.mi_evento(uuid) from public, anon, authenticated;
revoke all on function tpp.mi_pase(uuid) from public, anon, authenticated;
revoke all on function tpp.reclamar_pase(uuid, integer, text) from public, anon, authenticated;
revoke all on function tpp.comprar_pase(uuid) from public, anon, authenticated;
revoke all on function public.tpp_evento() from public, anon;
revoke all on function public.tpp_pase() from public, anon;
revoke all on function public.tpp_reclamar_pase(integer, text) from public, anon;
revoke all on function public.tpp_comprar_pase() from public, anon;
grant execute on function public.tpp_evento() to authenticated;
grant execute on function public.tpp_pase() to authenticated;
grant execute on function public.tpp_reclamar_pase(integer, text) to authenticated;
grant execute on function public.tpp_comprar_pase() to authenticated;

-- Ganchos en funciones que ya existían.
do $$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('tpp.mision_sumar(uuid,text,integer)'::regprocedure);
  o := d;
  d := replace(d, E'  update tpp.perfiles set misiones = m where id = p_uid;\nend;', E'  update tpp.perfiles set misiones = m where id = p_uid;\n  perform tpp.temporada_sumar(p_uid, p_clave, p_n);\nend;');
  if d = o then raise exception 'mision_sumar no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.reclamar_mision(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, E'    where id = p_uid;\n  return jsonb_build_object(''ok'', true) || tpp.estado_json(p_uid);', E'    where id = p_uid;\n  perform tpp.pase_puntos(p_uid, case when def ->> ''grupo'' = ''d'' then 20 else 60 end);\n  return jsonb_build_object(''ok'', true) || tpp.estado_json(p_uid);');
  if d = o then raise exception 'reclamar_mision no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, E'    if p.salud >= 80 then perform tpp.mision_sumar(p_uid, ''sana''); end if;',
    E'    if p.salud >= 80 then perform tpp.mision_sumar(p_uid, ''sana''); end if;\n    if p.salud >= 90 then perform tpp.temporada_sumar(p_uid, ''sol''); end if;\n    if extract(hour from (now() at time zone ''Europe/Madrid'')) < 19 then perform tpp.temporada_sumar(p_uid, ''dia''); end if;\n    perform tpp.pase_puntos(p_uid, 50);');
  d := replace(d, E'    perform tpp.mision_sumar(p_uid, case p_accion when ''ajustar_luz'' then ''luz'' else p_accion end);',
    E'    perform tpp.mision_sumar(p_uid, case p_accion when ''ajustar_luz'' then ''luz'' else p_accion end);\n    perform tpp.temporada_sumar(p_uid, ''cuidado'');\n    if p_accion = ''regar'' and extract(hour from (now() at time zone ''Europe/Madrid'')) between 6 and 9 then perform tpp.temporada_sumar(p_uid, ''alba''); end if;');
  if d = o or position('''alba''' in d) = 0 or position('pase_puntos' in d) = 0 then raise exception 'accion no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.plantar(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, E'jsonb_build_object(p_variedad, true)) where id = p_uid;', E'jsonb_build_object(p_variedad, true)) where id = p_uid;\n  perform tpp.temporada_sumar(p_uid, ''plantar'');');
  if d = o then raise exception 'plantar no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.progresion_datos(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'''{}''::jsonb)));', E'''{}''::jsonb)) k where k not like ''ed-%'');');
  d := replace(d, E'''{}''::jsonb)) k),', E'''{}''::jsonb)) k where k not like ''ed-%''),');
  if d = o then raise exception 'progresion_datos no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.progresion(uuid)'::regprocedure);
  o := d;
  d := replace(d, '''otono'', false, ''escarcha'', false', '''otono'', coalesce((perfil.temporada -> ''marcos'') ? ''otono'', false), ''escarcha'', coalesce((perfil.temporada -> ''marcos'') ? ''escarcha'', false)');
  if d = o then raise exception 'progresion no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.prestigio_datos(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'var_n := (select count(*)::int from jsonb_object_keys(coalesce(perfil.estadisticas -> ''variedades'', ''{}''::jsonb)));', E'var_n := (select count(*)::int from jsonb_object_keys(coalesce(perfil.estadisticas -> ''variedades'', ''{}''::jsonb)) k where k not like ''ed-%'');');
  if d = o then raise exception 'prestigio_datos no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.perfil_publico(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, E'(select count(*)::int from jsonb_object_keys(coalesce(perfil.estadisticas -> ''variedades'', ''{}''::jsonb)))', E'(select count(*)::int from jsonb_object_keys(coalesce(perfil.estadisticas -> ''variedades'', ''{}''::jsonb)) k where k not like ''ed-%'')');
  if d = o then raise exception 'perfil_publico no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.renacer(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, E'semillas_hibridas = ''[]''::jsonb,', E'semillas_hibridas = (select coalesce(jsonb_agg(x), ''[]''::jsonb) from jsonb_array_elements_text(semillas_hibridas) x where x like ''ed-%''),');
  if d = o then raise exception 'renacer no cambia'; end if;
  execute d;
end $$;
