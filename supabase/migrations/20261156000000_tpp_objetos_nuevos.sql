-- Objetos nuevos (bloque 7): 57 objetos más (macetas, luces, abonos, herramientas y decoración), compra por cantidad
-- y los efectos que ya tienen mecánica en el juego. El resto se enseña en la tienda como «próximamente».
-- Los ids pulverizador, medidor_ph y radio del diseño chocaban con objetos que ya existían: se quedan los de antes.

do $mig$
declare
  d text := pg_get_functiondef('tpp.catalogo()'::regprocedure);
  o text := d;
begin
  d := replace(d, $a${"id":"gato","tipo":"decoracion","precio":1500,"nivel":10},$a$, $b${"id":"gato","tipo":"decoracion","precio":1500,"nivel":10},{"id":"hormigon","tipo":"maceta","precio":400,"nivel":3},{"id":"madera","tipo":"maceta","precio":450,"nivel":4},{"id":"autorriego","tipo":"maceta","precio":1800,"nivel":10},{"id":"tela_grande","tipo":"maceta","precio":900,"nivel":6},{"id":"colgante","tipo":"maceta","precio":700,"nivel":5},{"id":"cubo","tipo":"maceta","precio":250,"nivel":2},{"id":"esmaltada","tipo":"maceta","precio":800,"nivel":6},{"id":"rayas","tipo":"maceta","precio":350,"nivel":3},{"id":"japonesa","tipo":"maceta","precio":2200,"nivel":12},{"id":"cobre","tipo":"maceta","precio":2500,"nivel":14},{"id":"neon","tipo":"maceta","precio":5200,"nivel":20},{"id":"dorada","tipo":"maceta","precio":12000,"nivel":30},{"id":"bombilla_calida","tipo":"luz","precio":150,"nivel":1},{"id":"fluorescente_doble","tipo":"luz","precio":600,"nivel":4},{"id":"panel_cuadrado","tipo":"luz","precio":1400,"nivel":8},{"id":"barra_led","tipo":"luz","precio":1600,"nivel":9},{"id":"espectro_completo","tipo":"luz","precio":3200,"nivel":14},{"id":"sodio","tipo":"luz","precio":2600,"nivel":12},{"id":"foco_clip","tipo":"luz","precio":300,"nivel":2},{"id":"led_cuantico","tipo":"luz","precio":14000,"nivel":30},{"id":"base_universal","tipo":"consumible","precio":60,"nivel":1},{"id":"crecimiento_plus","tipo":"consumible","precio":180,"nivel":5},{"id":"floracion_plus","tipo":"consumible","precio":200,"nivel":6},{"id":"raices","tipo":"consumible","precio":220,"nivel":6},{"id":"calmag","tipo":"consumible","precio":120,"nivel":3},{"id":"humus","tipo":"consumible","precio":90,"nivel":2},{"id":"te_compost","tipo":"consumible","precio":480,"nivel":10},{"id":"bioestimulante","tipo":"consumible","precio":650,"nivel":12},{"id":"pk_booster","tipo":"consumible","precio":1500,"nivel":18},{"id":"abono_dorado","tipo":"consumible","precio":4000,"nivel":28},{"id":"regadera_cobre","tipo":"herramienta","precio":900,"nivel":5},{"id":"tijeras_precision","tipo":"herramienta","precio":1500,"nivel":10},{"id":"lupa","tipo":"herramienta","precio":300,"nivel":3},{"id":"guantes","tipo":"herramienta","precio":250,"nivel":2},{"id":"temporizador","tipo":"herramienta","precio":800,"nivel":6},{"id":"pala","tipo":"herramienta","precio":350,"nivel":3},{"id":"insecticida_eco","tipo":"herramienta","precio":400,"nivel":4},{"id":"trampa_adhesiva","tipo":"herramienta","precio":150,"nivel":3},{"id":"sofa","tipo":"decoracion","precio":800,"nivel":2},{"id":"alfombra","tipo":"decoracion","precio":300,"nivel":1},{"id":"lampara_pie","tipo":"decoracion","precio":350,"nivel":2},{"id":"cuadro","tipo":"decoracion","precio":400,"nivel":3},{"id":"estanteria","tipo":"decoracion","precio":900,"nivel":5},{"id":"reloj_pared","tipo":"decoracion","precio":250,"nivel":2},{"id":"tocadiscos","tipo":"decoracion","precio":2400,"nivel":12},{"id":"guitarra","tipo":"decoracion","precio":1100,"nivel":7},{"id":"banderines","tipo":"decoracion","precio":150,"nivel":1},{"id":"cortina","tipo":"decoracion","precio":300,"nivel":2},{"id":"puf","tipo":"decoracion","precio":280,"nivel":2},{"id":"mesa_baja","tipo":"decoracion","precio":450,"nivel":3},{"id":"espejo","tipo":"decoracion","precio":1200,"nivel":8},{"id":"vela","tipo":"decoracion","precio":120,"nivel":1},{"id":"acuario","tipo":"decoracion","precio":2800,"nivel":14},{"id":"lampara_lava","tipo":"decoracion","precio":1900,"nivel":11},{"id":"cojines","tipo":"decoracion","precio":200,"nivel":1},{"id":"figura_semillita","tipo":"decoracion","precio":6000,"nivel":22},{"id":"neon_tpp","tipo":"decoracion","precio":15000,"nivel":30},$b$);
  if d = o then raise exception 'catalogo no cambia'; end if;
  execute d;
end
$mig$;

-- Efectos al sincronizar: macetas, luces y decoración nuevas.
do $mig$
declare
  d text := pg_get_functiondef('tpp.sincronizar(uuid)'::regprocedure);
  o text;
begin
  o := d;
  d := replace(d, $a$when 'maceta_ceramica' then f_agua := 0.9; f_nutr := 0.9;
    else null;$a$,
    $b$when 'maceta_ceramica' then f_agua := 0.9; f_nutr := 0.9;
    when 'autorriego' then f_agua := 0.7;
    when 'esmaltada' then f_salud := 0.95;
    when 'japonesa' then f_plaga := 0.9;
    when 'cobre' then f_plaga := 0.9;
    else null;$b$);
  if d = o then raise exception 'macetas no cambia'; end if;

  o := d;
  d := replace(d, $a$when 'led_pro' then f_luz := 0.55;
    else null;$a$,
    $b$when 'led_pro' then f_luz := 0.55;
    when 'fluorescente_doble' then f_luz := 0.8;
    when 'panel_cuadrado' then f_luz := 0.7;
    when 'barra_led' then f_luz := 0.75;
    when 'espectro_completo' then f_luz := 0.8;
    when 'sodio' then f_luz := 0.8;
    when 'foco_clip' then f_luz := 0.9;
    when 'led_cuantico' then f_luz := 0.8;
    else null;$b$);
  if d = o then raise exception 'luces no cambia'; end if;

  o := d;
  d := replace(d, $a$when 'led_pro' then -1 else 0 end;$a$,
    $b$when 'led_pro' then -1 when 'panel_cuadrado' then -1 when 'sodio' then 3 else 0 end;
  if coalesce(equipo ->> 'maceta', '') = 'madera' then calor_luz := calor_luz + 1; end if;$b$);
  if d = o then raise exception 'calor no cambia'; end if;

  o := d;
  d := replace(d, $a$if coalesce(equipo -> 'decoracion', '[]'::jsonb) ? 'gato' then f_plaga := 0.7; end if;$a$,
    $b$if coalesce(equipo -> 'decoracion', '[]'::jsonb) ? 'gato' then f_plaga := 0.7; end if;
  if coalesce(equipo -> 'decoracion', '[]'::jsonb) ? 'espejo' then f_luz := f_luz * 0.95; end if;
  if coalesce(equipo -> 'decoracion', '[]'::jsonb) ? 'acuario' then f_salud := f_salud * 0.95; end if;$b$);
  if d = o then raise exception 'decoracion no cambia'; end if;

  o := d;
  d := replace(d, $a$if coalesce((mj ->> 'luz')::int, 0) >= 2 then calor_luz := calor_luz - 1; end if;$a$,
    $b$if coalesce((mj ->> 'luz')::int, 0) >= 2 then calor_luz := calor_luz - 1; end if;
    vel := vel * case coalesce(equipo ->> 'luz', '') when 'espectro_completo' then 1.2 when 'led_cuantico' then 1.35 else 1 end;
    if coalesce(equipo -> 'decoracion', '[]'::jsonb) ? 'tocadiscos' then vel := vel * 1.05; end if;$b$);
  if d = o then raise exception 'vel no cambia'; end if;
  execute d;
end
$mig$;

-- Abonos nuevos al usarlos.
do $mig$
declare
  d text := pg_get_functiondef('tpp.usar(uuid,text)'::regprocedure);
  o text;
begin
  o := d;
  d := replace(d, $a$if p_objeto not in ('fert_generico', 'fert_crecimiento', 'fert_floracion', 'fert_mejorador') then$a$,
    $b$if p_objeto not in ('fert_generico', 'fert_crecimiento', 'fert_floracion', 'fert_mejorador',
      'base_universal', 'crecimiento_plus', 'floracion_plus', 'humus', 'bioestimulante', 'abono_dorado') then$b$);
  if d = o then raise exception 'lista no cambia'; end if;

  o := d;
  d := replace(d, $a$or (p_objeto = 'fert_floracion' and fase not between 6 and 7) then$a$,
    $b$or (p_objeto = 'fert_floracion' and fase not between 6 and 7)
     or (p_objeto = 'crecimiento_plus' and fase not between 4 and 5)
     or (p_objeto = 'floracion_plus' and fase not between 6 and 7) then$b$);
  if d = o then raise exception 'fases no cambia'; end if;

  o := d;
  d := replace(d, $a$if p_objeto = 'fert_mejorador' and p.bonus_cosecha >= 0.1 then$a$,
    $b$if p_objeto in ('fert_mejorador', 'bioestimulante') and p.bonus_cosecha >= 0.1 then$b$);
  if d = o then raise exception 'mejorador no cambia'; end if;

  o := d;
  d := replace(d, $a$when 'fert_generico' then 20 when 'fert_crecimiento' then 35 when 'fert_floracion' then 25 else 0 end),
    bonus_cosecha = case p_objeto
      when 'fert_floracion' then bonus_cosecha + 0.1 when 'fert_mejorador' then bonus_cosecha + 0.1 else bonus_cosecha end$a$,
    $b$when 'fert_generico' then 20 when 'fert_crecimiento' then 35 when 'fert_floracion' then 25
      when 'base_universal' then 20 when 'crecimiento_plus' then 40 when 'floracion_plus' then 40 when 'humus' then 15
      when 'abono_dorado' then 100 else 0 end),
    salud = least(100, salud + case p_objeto when 'humus' then 5 when 'abono_dorado' then 10 else 0 end),
    bonus_cosecha = case p_objeto
      when 'fert_floracion' then bonus_cosecha + 0.1 when 'fert_mejorador' then bonus_cosecha + 0.1
      when 'bioestimulante' then bonus_cosecha + 0.1 else bonus_cosecha end$b$);
  if d = o then raise exception 'update no cambia'; end if;
  execute d;
end
$mig$;

-- Compra por cantidad: los consumibles se pueden comprar de golpe; el resto, de uno en uno.
drop function if exists public.tpp_comprar(text);
drop function if exists tpp.comprar(uuid, text);

create function tpp.comprar(p_uid uuid, p_objeto text, p_cantidad integer default 1) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  item jsonb;
  precio integer;
  tipo text;
  n integer := greatest(1, least(coalesce(p_cantidad, 1), 99));
begin
  perfil := tpp.asegurar_perfil(p_uid);
  select c into item from jsonb_array_elements(tpp.catalogo()) c where c ->> 'id' = p_objeto;
  if item is null then
    return jsonb_build_object('ok', false, 'error', 'objeto_desconocido') || tpp.estado_json(p_uid);
  end if;
  precio := (item ->> 'precio')::int;
  if precio < 0 then
    return jsonb_build_object('ok', false, 'error', 'objeto_desconocido') || tpp.estado_json(p_uid);
  end if;
  tipo := item ->> 'tipo';
  if tipo <> 'consumible' then n := 1; end if;

  if precio = 0 or (tipo <> 'consumible' and tpp.tiene(p_uid, p_objeto)) then
    return jsonb_build_object('ok', false, 'error', 'ya_lo_tienes') || tpp.estado_json(p_uid);
  end if;
  if tpp.nivel_de(perfil.xp) < (item ->> 'nivel')::int then
    return jsonb_build_object('ok', false, 'error', 'nivel_insuficiente') || tpp.estado_json(p_uid);
  end if;
  if perfil.monedas < precio * n then
    return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.estado_json(p_uid);
  end if;

  update tpp.perfiles set monedas = monedas - precio * n where id = p_uid;
  perform tpp.contar(p_uid, 'compras', n);
  perform tpp.contar(p_uid, 'gastado', precio * n);
  insert into tpp.inventario (usuario_id, objeto, cantidad) values (p_uid, p_objeto, n)
    on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + n;

  if tipo = 'maceta' or tipo = 'luz' then
    update tpp.perfiles set equipo = equipo || jsonb_build_object(tipo, p_objeto) where id = p_uid;
  elsif tipo = 'decoracion' then
    update tpp.perfiles set equipo = jsonb_set(equipo, '{decoracion}', (equipo -> 'decoracion') || to_jsonb(p_objeto)) where id = p_uid;
  end if;
  perform tpp.mision_sumar(p_uid, 'comprar');
  return jsonb_build_object('ok', true) || tpp.estado_json(p_uid);
end;
$$;

create function public.tpp_comprar(p_objeto text, p_cantidad integer default 1) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.comprar(auth.uid(), p_objeto, p_cantidad);
end;
$$;

revoke all on function tpp.comprar(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.tpp_comprar(text, integer) from public, anon;
grant execute on function public.tpp_comprar(text, integer) to authenticated;
