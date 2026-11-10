-- Todos los objetos hacen lo que dicen: macetas, abonos, herramientas, decoración (ánimo),
-- objetos de los eventos al volver y compras del mercado negro. La ficha de variedad (temperatura,
-- resistencia a plagas, tolerancia y ventana de cosecha) pasa a contar de verdad.

alter table tpp.plantas add column if not exists extras jsonb not null default '{}'::jsonb;

-- Ayuda para parchear funciones: falla si no encuentra el texto.
create or replace function tpp._parche(d text, viejo text, nuevo text) returns text language plpgsql as $$
begin
  if position(viejo in d) = 0 then raise exception 'parche no encontrado: %', left(viejo, 80); end if;
  return replace(d, viejo, nuevo);
end;
$$;

-- Estación del año (Madrid), igual que la escena.
create or replace function tpp.estacion(p_ts timestamptz default now())
returns text language sql stable set search_path = '' as $$
  select case
    when d >= make_date(y, 12, 21) or d < make_date(y, 3, 20) then 'invierno'
    when d < make_date(y, 6, 21) then 'primavera'
    when d < make_date(y, 9, 22) then 'verano'
    else 'otono' end
  from (select (p_ts at time zone 'Europe/Madrid')::date d, extract(year from (p_ts at time zone 'Europe/Madrid'))::int y) q;
$$;

-- Ánimo de la casa: lo dan la decoración colocada y las macetas de rayas en uso. Cada punto es +1 % de XP (máx. 20).
create or replace function tpp.animo_de(p_uid uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select least(20, coalesce((
      select sum(case x
        when 'lampara_lava' then 3
        when 'sofa' then 2 when 'guitarra' then 2
        when 'deco_primavera' then 2 when 'deco_verano' then 2 when 'deco_otono' then 2 when 'deco_invierno' then 2
        when 'alfombra' then 1 when 'lampara_pie' then 1 when 'cuadro' then 1 when 'banderines' then 1 when 'puf' then 1
        when 'vela' then 1 when 'cojines' then 1 when 'reloj_pared' then 1 when 'mesa_baja' then 1 when 'estanteria' then 1
        when 'poster' then 1 when 'planta_adorno' then 1
        else 0 end)
      from jsonb_array_elements_text(coalesce(pf.equipo -> 'decoracion', '[]'::jsonb)) x), 0)
    + (select count(*) from jsonb_each_text(pf.macetas) m where m.value = 'rayas'))::int
  from tpp.perfiles pf where pf.id = p_uid;
$$;

-- Multiplicador de XP de cuidados y cosechas.
create or replace function tpp.mult_xp(p_uid uuid)
returns double precision language sql stable security definer set search_path = '' as $$
  select (1 + tpp.animo_de(p_uid) / 100.0)
    * case when coalesce(pf.equipo -> 'decoracion', '[]'::jsonb) ? 'neon_tpp' then 1.10 else 1 end
  from tpp.perfiles pf where pf.id = p_uid;
$$;

-- Añade un efecto temporal a la casa (calor, crec, agua, ventas, plaga).
create or replace function tpp.poner_efecto(p_uid uuid, p_k text, p_v double precision, p_segundos integer)
returns void language sql security definer set search_path = '' as $$
  update tpp.perfiles set eventos = jsonb_set(coalesce(eventos, '{}'::jsonb), '{efectos}',
    coalesce((select jsonb_agg(x) from jsonb_array_elements(coalesce(eventos -> 'efectos', '[]'::jsonb)) x
               where (x ->> 'hasta')::double precision > extract(epoch from now())), '[]'::jsonb)
    || jsonb_build_object('k', p_k, 'v', p_v, 'hasta', extract(epoch from now()) + p_segundos))
  where id = p_uid;
$$;

-- Efectos temporales activos, para enseñarlos en el juego.
create or replace function tpp.efectos_json(p_uid uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((select jsonb_agg(jsonb_build_object('k', x ->> 'k', 'v', (x ->> 'v')::double precision,
      'resta', floor((x ->> 'hasta')::double precision - extract(epoch from now()))::int) order by (x ->> 'hasta')::double precision)
    from tpp.perfiles pf, jsonb_array_elements(coalesce(pf.eventos -> 'efectos', '[]'::jsonb)) x
    where pf.id = p_uid and (x ->> 'hasta')::double precision > extract(epoch from now())), '[]'::jsonb);
$$;

-- Horas vividas que necesita una planta para llegar a la cosecha (fase 8).
create or replace function tpp.horas_madurez(p tpp.plantas)
returns double precision language sql stable set search_path = '' as $$
  select (case when d.v ? 'fases' then (select sum(x::numeric) from jsonb_array_elements_text(d.v -> 'fases') x) / 60.0
               else 10 * coalesce((d.v ->> 'ciclo')::double precision, 1) end)
    * case when p.tipo in ('auto', 'autofem') then 0.65 else 1 end
    * case p.fenotipo when 'enana' then 0.75 when 'relampago' then 0.5 else 1 end
  from (select tpp.datos_variedad(p.usuario_id, p.variedad) v) d;
$$;

-- Minutos que lleva la planta lista sin cosechar (0 si aún no lo está).
create or replace function tpp.minutos_pasada(p tpp.plantas)
returns double precision language sql stable set search_path = '' as $$
  select greatest(0, (p.horas_vividas - tpp.horas_madurez(p)) * 60);
$$;

revoke all on function tpp._parche(text, text, text) from public, anon, authenticated;
revoke all on function tpp.estacion(timestamptz) from public, anon, authenticated;
revoke all on function tpp.animo_de(uuid) from public, anon, authenticated;
revoke all on function tpp.mult_xp(uuid) from public, anon, authenticated;
revoke all on function tpp.poner_efecto(uuid, text, double precision, integer) from public, anon, authenticated;
revoke all on function tpp.efectos_json(uuid) from public, anon, authenticated;
revoke all on function tpp.horas_madurez(tpp.plantas) from public, anon, authenticated;
revoke all on function tpp.minutos_pasada(tpp.plantas) from public, anon, authenticated;

-- La estantería añade una percha al secadero.
create or replace function tpp.secado_capacidad(p_uid uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select least(7, 2 + ceil(coalesce((mejoras ->> 'cap')::int, 0) * 4 / 3.0)::int
    + case when coalesce(equipo -> 'decoracion', '[]'::jsonb) ? 'estanteria' then 1 else 0 end)
  from tpp.perfiles where id = p_uid;
$$;

-- Mercado negro: descripciones que coinciden con lo que hace cada objeto.
create or replace function tpp.negro_catalogo()
returns jsonb language sql immutable set search_path = '' as $$ select '[
 {"id":"semilla-sombra","n":"Semilla Sombra","tipo":"Semilla única","d":"Una semilla feminizada de Noche que siempre sale con el fenotipo Black (+30 % de gramos). Va a tu inventario.","precio":4500,"riesgo":3,"stock":1},
 {"id":"semilla-eclipse","n":"Semilla Eclipse","tipo":"Semilla única","d":"Desbloquea para siempre la variedad Sol de Medianoche, que no se vende en la tienda.","precio":3800,"riesgo":2,"stock":1},
 {"id":"semilla-relampago","n":"Polvo Relámpago","tipo":"Consumible","d":"Úsalo en una plántula (fases 1 a 3): crece el doble de rápido, pero rinde la mitad.","precio":2200,"riesgo":2,"stock":2},
 {"id":"lampara-pirata","n":"Lámpara pirata","tipo":"Consumible","d":"Al usarla, todas tus plantas crecen un 10 % más rápido durante 7 días.","precio":1600,"riesgo":1,"stock":2},
 {"id":"abono-volcanico","n":"Abono volcánico","tipo":"Consumible","d":"+40 % de crecimiento durante 24 h. Si usas otro antes de que acabe, quema las hojas (−20 de salud).","precio":900,"riesgo":1,"stock":3},
 {"id":"bolsa-antiolor","n":"Bolsa antiolor","tipo":"Objeto","d":"Durante 7 días cada compra suma la mitad de sospecha.","precio":700,"riesgo":0,"stock":2},
 {"id":"radio-porteria","n":"Radio de la portería","tipo":"Objeto","d":"El portero te avisa: la próxima vez que la sospecha fuera a llegar a 100 se queda en 95. Un uso.","precio":1200,"riesgo":1,"stock":1},
 {"id":"maceta-doble","n":"Maceta de doble fondo","tipo":"Objeto","d":"En una inspección, esconde lo que compraste aquí.","precio":2500,"riesgo":1,"stock":1}
]'::jsonb $$;

-- Usar un objeto del inventario: abonos y potenciadores sobre la planta activa, o efectos para toda la casa.
create or replace function tpp.usar(p_uid uuid, p_objeto text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  p tpp.plantas;
  pid uuid;
  fase integer;
  v_casa boolean := p_objeto in ('ventilador', 'abono_casero', 'trampa_adhesiva', 'abono_volcanico', 'lampara_pirata');
  v_planta boolean := p_objeto in ('fert_generico', 'fert_crecimiento', 'fert_floracion', 'fert_mejorador',
      'base_universal', 'crecimiento_plus', 'floracion_plus', 'humus', 'bioestimulante', 'abono_dorado',
      'raices', 'calmag', 'te_compost', 'pk_booster', 'relampago');
  v_quema boolean := false;
begin
  perform tpp.asegurar_perfil(p_uid);
  if p_objeto in ('pulverizador', 'fungicida', 'insecticida_eco') then
    return tpp.tratar(p_uid, p_objeto);
  end if;
  if not v_casa and not v_planta then
    return jsonb_build_object('ok', false, 'error', 'objeto_desconocido') || tpp.estado_json(p_uid);
  end if;
  if not exists (select 1 from tpp.inventario where usuario_id = p_uid and objeto = p_objeto and cantidad > 0) then
    return jsonb_build_object('ok', false, 'error', 'sin_existencias') || tpp.estado_json(p_uid);
  end if;

  if v_casa then
    if p_objeto = 'abono_volcanico' and exists (
        select 1 from jsonb_array_elements(tpp.efectos_json(p_uid)) x where x ->> 'k' = 'crec' and (x ->> 'v')::double precision = 1.4) then
      perform tpp.sincronizar(pl.id) from tpp.plantas pl where pl.usuario_id = p_uid and pl.estado = 'viva';
      update tpp.plantas set salud = greatest(1, salud - 20) where usuario_id = p_uid and estado = 'viva' and desafio is null;
      v_quema := true;
    end if;
    update tpp.inventario set cantidad = cantidad - 1 where usuario_id = p_uid and objeto = p_objeto;
    case p_objeto
      when 'ventilador' then perform tpp.poner_efecto(p_uid, 'calor', -4, 12 * 3600);
      when 'abono_casero' then perform tpp.poner_efecto(p_uid, 'crec', 1.15, 86400);
      when 'trampa_adhesiva' then perform tpp.poner_efecto(p_uid, 'plaga', 0.7, 3 * 86400);
      when 'abono_volcanico' then perform tpp.poner_efecto(p_uid, 'crec', 1.4, 86400);
      when 'lampara_pirata' then perform tpp.poner_efecto(p_uid, 'crec', 1.1, 7 * 86400);
      else null;
    end case;
    return jsonb_build_object('ok', true, 'quema', v_quema) || tpp.estado_json(p_uid);
  end if;

  select id into pid from tpp.plantas where usuario_id = p_uid and estado = 'viva' and hueco = tpp.hueco_activo(p_uid);
  if pid is null then
    return jsonb_build_object('ok', false, 'error', 'sin_planta') || tpp.estado_json(p_uid);
  end if;
  p := tpp.sincronizar(pid);
  if p.estado <> 'viva' then
    return jsonb_build_object('ok', false, 'error', 'planta_muerta') || tpp.estado_json(p_uid);
  end if;
  if p.desafio = 'reloj' and p_objeto in ('fert_crecimiento', 'raices', 'relampago') then
    return jsonb_build_object('ok', false, 'error', 'desafio_prohibido') || tpp.estado_json(p_uid);
  end if;
  fase := tpp.fase_planta(p);
  if (p_objeto in ('fert_crecimiento', 'crecimiento_plus') and fase not between 4 and 5)
     or (p_objeto in ('fert_floracion', 'floracion_plus', 'pk_booster') and fase not between 6 and 7)
     or (p_objeto in ('raices', 'relampago') and fase > 3) then
    return jsonb_build_object('ok', false, 'error', 'fase_incorrecta') || tpp.estado_json(p_uid);
  end if;
  if (p_objeto in ('fert_mejorador', 'bioestimulante') and p.bonus_cosecha >= 0.1)
     or (p_objeto = 'raices' and coalesce((p.extras ->> 'raices')::boolean, false))
     or (p_objeto = 'pk_booster' and coalesce((p.extras ->> 'pk')::boolean, false))
     or (p_objeto = 'relampago' and p.fenotipo is not null) then
    return jsonb_build_object('ok', false, 'error', 'ya_aplicado') || tpp.estado_json(p_uid);
  end if;
  update tpp.inventario set cantidad = cantidad - 1 where usuario_id = p_uid and objeto = p_objeto;
  update tpp.plantas set
    nutrientes = least(100, nutrientes + case p_objeto
      when 'fert_generico' then 20 when 'fert_crecimiento' then 35 when 'fert_floracion' then 25
      when 'base_universal' then 20 when 'crecimiento_plus' then 40 when 'floracion_plus' then 40 when 'humus' then 15
      when 'abono_dorado' then 100 when 'calmag' then 10 when 'te_compost' then 30 when 'pk_booster' then 20 else 0 end),
    quimico = quimico or p_objeto not in ('humus', 'te_compost', 'raices', 'relampago'),
    salud = least(100, salud + case p_objeto when 'humus' then 5 when 'abono_dorado' then 10 else 0 end),
    ph = case when p_objeto = 'calmag' then 6.5 else ph end,
    horas_vividas = horas_vividas + case when p_objeto = 'raices' then 0.33 else 0 end,
    fenotipo = case when p_objeto = 'relampago' then 'relampago' else fenotipo end,
    extras = extras || case p_objeto when 'raices' then '{"raices": true}'::jsonb when 'pk_booster' then '{"pk": true}'::jsonb else '{}'::jsonb end,
    bonus_cosecha = case
      when p_objeto in ('fert_floracion', 'fert_mejorador', 'bioestimulante') then bonus_cosecha + 0.1 else bonus_cosecha end
  where id = p.id;
  if p_objeto = 'te_compost' then perform tpp.poner_efecto(p_uid, 'plaga', 0.9, 2 * 86400); end if;
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

-- El abono casero pasa por la función general.
create or replace function tpp.usar_abono_casero(p_uid uuid)
returns jsonb language sql security definer set search_path = '' as $$ select tpp.usar(p_uid, 'abono_casero'); $$;

-- Parches de funciones existentes.
do $m$
declare d text;
begin
  -- catalogo: el insecticida y la trampa son consumibles; objetos que solo se consiguen jugando.
  d := pg_get_functiondef('tpp.catalogo()'::regprocedure);
  d := tpp._parche(d, $${"id":"insecticida_eco","tipo":"herramienta"$$, $${"id":"insecticida_eco","tipo":"consumible"$$);
  d := tpp._parche(d, $${"id":"trampa_adhesiva","tipo":"herramienta"$$, $${"id":"trampa_adhesiva","tipo":"consumible"$$);
  d := tpp._parche(d, $${"id":"deco_invierno","tipo":"decoracion","precio":-1,"nivel":1}$$,
    $${"id":"deco_invierno","tipo":"decoracion","precio":-1,"nivel":1},{"id":"maceta_morada","tipo":"maceta","precio":-1,"nivel":1},{"id":"abono_casero","tipo":"consumible","precio":-1,"nivel":1},{"id":"ventilador","tipo":"consumible","precio":-1,"nivel":1},{"id":"abono_volcanico","tipo":"consumible","precio":-1,"nivel":1},{"id":"lampara_pirata","tipo":"consumible","precio":-1,"nivel":1},{"id":"relampago","tipo":"consumible","precio":-1,"nivel":1}$$);
  execute d;

  -- comprar: el insecticida ecológico trae 3 usos.
  d := pg_get_functiondef('tpp.comprar(uuid,text,integer)'::regprocedure);
  d := tpp._parche(d, $$  insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, p_objeto, n)
    on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + n;$$,
    $$  insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, p_objeto, n * case when p_objeto = 'insecticida_eco' then 3 else 1 end)
    on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + excluded.cantidad;$$);
  execute d;

  -- fase_planta: el polvo relámpago acorta el ciclo a la mitad.
  d := pg_get_functiondef('tpp.fase_planta(tpp.plantas)'::regprocedure);
  d := replace(d, $$case when p.fenotipo = 'enana' then 0.75 else 1 end$$, $$case p.fenotipo when 'enana' then 0.75 when 'relampago' then 0.5 else 1 end$$);
  if d not like '%relampago%' then raise exception 'fase_planta no parcheada'; end if;
  execute d;

  d := pg_get_functiondef('tpp.fenotipo_gramos(text)'::regprocedure);
  d := tpp._parche(d, $$when 'brasa' then 1.1$$, $$when 'brasa' then 1.1 when 'relampago' then 0.5$$);
  execute d;

  -- poner_maceta: trasplantar una planta ya crecida sin pala le cuesta salud.
  d := pg_get_functiondef('tpp.poner_maceta(uuid,integer,text)'::regprocedure);
  d := tpp._parche(d, $$  update tpp.perfiles set macetas = macetas || jsonb_build_object(p_hueco::text, p_objeto) where id = p_uid;$$,
    $$  update tpp.perfiles set macetas = macetas || jsonb_build_object(p_hueco::text, p_objeto) where id = p_uid;
  if not tpp.tiene(p_uid, 'pala') then
    update tpp.plantas pl set salud = greatest(1, salud - 10)
      where pl.usuario_id = p_uid and pl.hueco = p_hueco and pl.estado = 'viva' and tpp.fase_planta(pl) >= 3;
  end if;$$);
  execute d;

  -- plantar: las semillas del inventario se plantan sin mirar el nivel; la Semilla Sombra sale Black.
  d := pg_get_functiondef('tpp.plantar(uuid,text,text)'::regprocedure);
  d := tpp._parche(d, $$  if p_tipo <> 'cruce' and tpp.nivel_de(perfil.xp) < (v ->> 'nivel')::int then$$,
    $$  v_inv := p_tipo in ('auto', 'fem', 'autofem') and exists (select 1 from tpp.inventario
    where usuario_id = p_uid and objeto = 'semilla:' || p_variedad || ':' || p_tipo and cantidad > 0);
  if p_tipo <> 'cruce' and not v_inv and tpp.nivel_de(perfil.xp) < (v ->> 'nivel')::int then$$);
  d := tpp._parche(d, $$  if p_tipo <> 'cruce' and coalesce((v ->> 'hibrida')::boolean, false) and not (perfil.semillas_hibridas ? p_variedad) then$$,
    $$  if p_tipo <> 'cruce' and not v_inv and coalesce((v ->> 'hibrida')::boolean, false) and not (perfil.semillas_hibridas ? p_variedad) then$$);
  d := tpp._parche(d, $$  fen text;
begin$$, $$  fen text;
  v_inv boolean := false;
begin$$);
  d := tpp._parche(d, $$  fen := tpp.tirar_fenotipo(p_uid, p_variedad, p_tipo = 'cruce');$$,
    $$  fen := tpp.tirar_fenotipo(p_uid, p_variedad, p_tipo = 'cruce');
  if v_inv and p_variedad = 'noche' and coalesce((perfil.negro ->> 'sombra')::int, 0) > 0 then
    fen := 'black';
    update tpp.perfiles set negro = negro || jsonb_build_object('sombra', (negro ->> 'sombra')::int - 1) where id = p_uid;
  end if;$$);
  execute d;

  -- negro_comprar: lo comprado hace efecto o va al inventario.
  d := pg_get_functiondef('tpp.negro_comprar(uuid,text)'::regprocedure);
  d := tpp._parche(d, $$  if v_mon < (v_obj ->> 'precio')::int then return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.negro_estado(p_uid); end if;$$,
    $$  if v_mon < (v_obj ->> 'precio')::int then return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.negro_estado(p_uid); end if;
  if p_id = 'semilla-eclipse' and exists (select 1 from tpp.perfiles where id = p_uid and semillas_hibridas ? 'sol-medianoche') then
    return jsonb_build_object('ok', false, 'error', 'ya_lo_tienes') || tpp.negro_estado(p_uid);
  end if;$$);
  d := tpp._parche(d, $$  v_sosp := least(100, v_sosp + v_sube);
  v_inv := coalesce(v_n -> 'inv', '{}'::jsonb);
  v_inv := v_inv || jsonb_build_object(p_id, coalesce((v_inv ->> p_id)::int, 0) + 1);$$,
    $$  v_sosp := least(100, v_sosp + v_sube);
  v_inv := coalesce(v_n -> 'inv', '{}'::jsonb);
  if v_sosp >= 100 and coalesce((v_inv ->> 'radio-porteria')::int, 0) > 0 and p_id <> 'radio-porteria' then
    v_sosp := 95;
    v_inv := v_inv || jsonb_build_object('radio-porteria', (v_inv ->> 'radio-porteria')::int - 1);
    perform tpp.notificar(p_uid, 'negro', 'El portero te avisa', 'Viene una inspección: has parado a tiempo. La sospecha se queda en 95.');
  end if;
  if p_id in ('radio-porteria', 'maceta-doble') then
    v_inv := v_inv || jsonb_build_object(p_id, coalesce((v_inv ->> p_id)::int, 0) + 1);
  elsif p_id = 'bolsa-antiolor' then
    v_n := coalesce(v_n, '{}'::jsonb) || jsonb_build_object('antiolor', greatest(coalesce((v_n ->> 'antiolor')::bigint, 0), v_ahora) + 7 * 86400);
  elsif p_id = 'semilla-eclipse' then
    update tpp.perfiles set semillas_hibridas = semillas_hibridas || '"sol-medianoche"'::jsonb where id = p_uid;
  elsif p_id = 'semilla-sombra' then
    v_n := coalesce(v_n, '{}'::jsonb) || jsonb_build_object('sombra', coalesce((v_n ->> 'sombra')::int, 0) + 1);
    insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, 'semilla:noche:fem', 1)
      on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + 1;
  else
    insert into tpp.inventario (usuario_id, objeto, cantidad)
      values (p_uid, case p_id when 'semilla-relampago' then 'relampago' when 'lampara-pirata' then 'lampara_pirata' else 'abono_volcanico' end, 1)
      on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + 1;
  end if;$$);
  execute d;

  -- negro_inspeccion: si registran, se llevan lo del mercado negro que no hayas usado.
  d := pg_get_functiondef('tpp.negro_inspeccion(uuid,text)'::regprocedure);
  d := tpp._parche(d, $$    perform tpp.notificar(p_uid, 'negro', 'Te han registrado',$$,
    $$    delete from tpp.inventario where usuario_id = p_uid and objeto in ('relampago', 'lampara_pirata', 'abono_volcanico');
    perform tpp.notificar(p_uid, 'negro', 'Te han registrado',$$);
  execute d;

  -- tratar: XP con el ánimo de la casa.
  d := pg_get_functiondef('tpp.tratar(uuid,text)'::regprocedure);
  d := tpp._parche(d, $$update tpp.perfiles set xp = xp + 10 where id = p_uid;$$, $$update tpp.perfiles set xp = xp + round(10 * tpp.mult_xp(p_uid))::int where id = p_uid;$$);
  execute d;

  -- estado_json: todas las plantas se ponen al día antes de los eventos; el estado cuenta ánimo, efectos y madurez.
  d := pg_get_functiondef('tpp.estado_json(uuid)'::regprocedure);
  d := tpp._parche(d, $$  perfil := tpp.asegurar_perfil(p_uid);
  if perfil.ultima_vez is not null and perfil.ultima_vez < now() - interval '2 hours' then$$,
    $$  perfil := tpp.asegurar_perfil(p_uid);
  perform tpp.sincronizar(pl.id) from tpp.plantas pl where pl.usuario_id = p_uid and pl.estado = 'viva';
  if perfil.ultima_vez is not null and perfil.ultima_vez < now() - interval '2 hours' then$$);
  d := tpp._parche(d, $$      'esperas', esperas,$$, $$      'esperas', esperas,
      'extras', p.extras,
      'madurez', case when p.estado = 'viva' and tpp.fase_planta(p) >= 8 then jsonb_build_object(
        'pasada', round(tpp.minutos_pasada(p))::int,
        'ventana', coalesce((tpp.ficha_de(p_uid, p.variedad) ->> 'ventana')::int, 240)) else null end,$$);
  d := tpp._parche(d, $$      'inventario', inv,$$, $$      'inventario', inv,
      'animo', tpp.animo_de(p_uid),
      'xp_mult', round(tpp.mult_xp(p_uid)::numeric, 2),
      'efectos', tpp.efectos_json(p_uid),$$);
  execute d;

  -- sincronizar: macetas, decoración, herramientas, ficha de variedad y efectos nuevos.
  d := pg_get_functiondef('tpp.sincronizar(uuid)'::regprocedure);
  d := tpp._parche(d, $$  amp double precision := 4;
begin$$, $$  amp double precision := 4;
  v_tmin double precision := 18;
  v_tmax double precision := 30;
  v_mac text;
  v_deco jsonb;
  v_lupa boolean := false;
  fi jsonb;
  v_mes integer;
begin$$);
  d := tpp._parche(d, $$  case tpp.maceta_de(p.usuario_id, p.hueco)
    when 'maceta_terracota' then f_agua := 0.9;$$, $$  v_mac := tpp.maceta_de(p.usuario_id, p.hueco);
  v_deco := coalesce(equipo -> 'decoracion', '[]'::jsonb);
  v_lupa := tpp.tiene(p.usuario_id, 'lupa');
  case v_mac
    when 'colgante' then f_plaga := 0.85;
    when 'cubo' then f_agua := 0.95;
    when 'maceta_terracota' then f_agua := 0.9;$$);
  d := tpp._parche(d, $$  if coalesce(equipo -> 'decoracion', '[]'::jsonb) ? 'acuario' then f_salud := f_salud * 0.95; end if;$$,
    $$  if coalesce(equipo -> 'decoracion', '[]'::jsonb) ? 'acuario' then f_salud := f_salud * 0.95; end if;
  if v_deco ? 'figura_semillita' then f_plaga := f_plaga * 0.85; end if;
  if v_deco ? 'cortina' and hab not in ('armario', 'sotano') then calor_luz := calor_luz - 1; end if;$$);
  d := tpp._parche(d, $$    if hab = 'cocina' then calor_luz := calor_luz + 2; end if;$$,
    $$    if hab = 'cocina' then calor_luz := calor_luz + 2; end if;
    if hab = 'sotano' then calor_luz := calor_luz - 4; end if;
    if hab not in ('armario', 'sotano') then
      v_mes := extract(month from (ahora at time zone 'Europe/Madrid'));
      calor_luz := calor_luz + case when v_mes in (12, 1, 2) then -2 when v_mes in (6, 7, 8) then 2 else 0 end;
    end if;
    if tpp.tiene(p.usuario_id, 'temporizador') then vel := vel * 1.03; end if;$$);
  d := tpp._parche(d, $$f_luz := f_luz * 0.85; f_plaga := f_plaga * 1.25; end if;$$,
    $$f_luz := f_luz * 0.85; f_plaga := f_plaga * case when v_mac = 'hormigon' then 1 else 1.25 end; end if;$$);
  d := tpp._parche(d, $$  if p.desafio is null then f_plaga := f_plaga * (1 - ((90 - (f_var - 1) * 100) - 80) / 400.0); end if;$$,
    $$  fi := tpp.ficha_de(p.usuario_id, p.variedad);
  v_tmin := coalesce((fi ->> 'tMin')::double precision, 18);
  v_tmax := coalesce((fi ->> 'tMax')::double precision, 30);
  if p.desafio is null then
    f_plaga := f_plaga * (array[1.5, 1.25, 1, 0.75, 0.4])[greatest(1, least(5, coalesce((fi ->> 'plagas')::int, 3)))];
    f_salud := f_salud * (array[1.3, 1.15, 1, 0.9, 0.8])[greatest(1, least(5, coalesce((fi ->> 'tolerancia')::int, 3)))];
  end if;$$);
  d := tpp._parche(d, $$          when 'agua' then f_agua := f_agua * (efe ->> 'v')::double precision;$$,
    $$          when 'agua' then f_agua := f_agua * (efe ->> 'v')::double precision;
          when 'plaga' then f_plaga := f_plaga * (efe ->> 'v')::double precision;$$);
  d := tpp._parche(d, $$    if grados < 18 or grados > 30 then crec := crec * 0.85; end if;$$,
    $$    if grados < v_tmin - 1 or grados > v_tmax + 1 then
      crec := crec * case when grados < v_tmin - 4 or grados > v_tmax + 4 then 0.8 else 0.9 end;
    end if;$$);
  d := tpp._parche(d, $$    encendida := mod((hora - li + 24)::numeric, 24::numeric) < lh and v_luz_on;$$,
    $$    encendida := mod((hora - li + 24)::numeric, 24::numeric) < lh and v_luz_on;
    if v_mac = 'neon' and not encendida then crec := crec * 1.05; end if;$$);
  d := tpp._parche(d, $$case when t - p.plaga_desde > interval '6 hours' then 2.5 else 1 end * esc * dt;$$,
    $$case when t - p.plaga_desde > interval '6 hours' then 2.5 when v_lupa then 0.5 else 1 end * esc * dt;$$);
  execute d;

  -- accion: herramientas y macetas con efecto, XP con ánimo, ventana de cosecha y PK booster.
  d := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure);
  d := tpp._parche(d, $$  q_c integer;
begin$$, $$  q_c integer;
  v_mx double precision := 1;
  v_mac text;
  v_g double precision := 1;
  v_pas double precision := 0;
  v_ven double precision := 240;
  v_pasada boolean := false;
begin$$);
  d := tpp._parche(d, $$  p := tpp.sincronizar(pid);
  if p.estado <> 'viva' then$$, $$  p := tpp.sincronizar(pid);
  v_mx := tpp.mult_xp(p_uid);
  v_mac := tpp.maceta_de(p_uid, p.hueco);
  if p.estado <> 'viva' then$$);
  d := tpp._parche(d, $$    q_c := greatest(1, least(5, ceil(p.salud / 20)::int));$$,
    $$    q_c := greatest(1, least(5, ceil(p.salud / 20)::int));
    if coalesce((p.extras ->> 'pk')::boolean, false) then q_c := least(5, q_c + 1); end if;
    if p.sexo <> 'macho' then
      v_pas := tpp.minutos_pasada(p);
      v_ven := coalesce((tpp.ficha_de(p_uid, p.variedad) ->> 'ventana')::double precision, 240);
      if v_pas > v_ven then
        v_pasada := true;
        q_c := greatest(1, q_c - 1 - (v_pas > 2 * v_ven)::int);
      end if;
    end if;
    v_g := (case when v_mac = 'tela_grande' then 1.10 else 1 end)
      * (case when tpp.tiene(p_uid, 'guantes') then 1.05 else 1 end)
      * (case when tpp.tiene(p_uid, 'tijeras_precision') then 1.05 else 1 end);
    if v_mac = 'dorada' then recompensa := round(recompensa * 1.15)::int; end if;
    xp_cosecha := round(xp_cosecha * v_mx
      * (case when v_mac = 'maceta_' || tpp.estacion() then 1.05 else 1 end)
      * (case when v_mac = 'maceta_morada' then 1.10 else 1 end))::int;$$);
  d := tpp._parche(d, $$* (case when p.cruzada then 0.6 else 1 end) * tpp.fenotipo_gramos(p.fenotipo))::int);$$,
    $$* (case when p.cruzada then 0.6 else 1 end) * tpp.fenotipo_gramos(p.fenotipo) * v_g)::int);$$);
  d := tpp._parche(d, $$        'calidad', q_c, 'organico', not p.quimico,$$, $$        'calidad', q_c, 'pasada', v_pasada, 'organico', not p.quimico,$$);
  d := tpp._parche(d, $$  if p_accion = 'podar' and tpp.tiene(p_uid, 'tijeras') then
    extra_salud := 15;
  end if;$$, $$  if p_accion = 'podar' and tpp.tiene(p_uid, 'tijeras') then
    extra_salud := 15;
  end if;
  if p_accion = 'podar' and tpp.tiene(p_uid, 'tijeras_precision') then
    extra_salud := 20;
  end if;$$);
  d := tpp._parche(d, $$agua = case when p_accion = 'regar' then least(100, agua + 50) else agua end,$$,
    $$agua = case when p_accion = 'regar' then least(100, agua + case when tpp.tiene(p_uid, 'regadera_cobre') then 70 else 50 end) else agua end,$$);
  d := tpp._parche(d, $$  update tpp.perfiles set xp = xp + 5 + bono_xp, monedas = monedas + ganadas where id = p_uid;$$,
    $$  update tpp.perfiles set xp = xp + round((5 + bono_xp) * v_mx)::int, monedas = monedas + ganadas where id = p_uid;$$);
  execute d;
end;
$m$;

drop function tpp._parche(text, text, text);
