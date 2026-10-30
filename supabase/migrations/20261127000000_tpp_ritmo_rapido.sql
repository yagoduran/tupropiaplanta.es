-- Nuevo ritmo del juego: una planta normal llega a la cosecha en 60 minutos (antes 293 horas).
-- horas_vividas pasa a medir horas reales de ciclo normal (la cosecha llega al cumplirse 1,0).
-- Fases (min): 2, 5, 10, 10, 13, 10, 10. Agua -4,5/min, nutrientes -2,4/min, luz -1,5/min (salud, pH y plagas a la misma escala).
-- Cosecha: 60 + salud monedas y 25 XP (desafíos: 170 x mult monedas y 50 x mult XP). Tope sin conectar: 2 h,
-- y si estás fuera más de 10 min la salud no baja de 25 por el tiempo que no estabas.
-- Las plantas ya plantadas conservan su avance en proporción (horas_vividas / 293).
-- Para deshacer: volver a aplicar las versiones de tpp.fase_de (20261108000000), tpp.sincronizar y tpp.accion (20261115000000 y siguientes)
-- y multiplicar horas_vividas por 293 en tpp.plantas.

create or replace function tpp.fase_de(horas double precision) returns integer
language sql immutable set search_path = '' as $$
  select 1
    + (horas >= 2 / 60.0)::int + (horas >= 7 / 60.0)::int + (horas >= 17 / 60.0)::int + (horas >= 27 / 60.0)::int
    + (horas >= 40 / 60.0)::int + (horas >= 50 / 60.0)::int + (horas >= 1)::int;
$$;

update tpp.plantas set horas_vividas = horas_vividas / 293.0;

do $mig$
declare
  d text;
  o text;
  paso text;
begin
  -- Sincronizar: todo por minuto en vez de por hora.
  d := pg_get_functiondef('tpp.sincronizar(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'  plaga_ini text;\nbegin', E'  plaga_ini text;\n  esc double precision := 180;\n  fuera boolean;\nbegin');
  d := replace(d, E'  restante := least(extract(epoch from (ahora - p.sincronizada_en)) / 3600.0, 720);',
    E'  fuera := extract(epoch from (ahora - p.sincronizada_en)) > 600 and p.desafio is null;\n  restante := least(extract(epoch from (ahora - p.sincronizada_en)) / 3600.0, 2);');
  d := replace(d, 'dt := least(0.5, restante);', 'dt := least(1.0 / 360, restante);');
  d := replace(d, '(6.5 - p.ph) * least(1, 0.1 * dt)', '(6.5 - p.ph) * least(1, 0.1 * esc * dt)');
  d := replace(d, '1.5 * f_agua * dt', '1.5 * esc * f_agua * dt');
  d := replace(d, '0.8 * f_nutr * dt', '0.8 * esc * f_nutr * dt');
  d := replace(d, '0.5 * f_luz * dt', '0.5 * esc * f_luz * dt');
  d := replace(d, 'p.salud := p.salud - 2 * dt;', 'p.salud := p.salud - 2 * esc * dt;');
  d := replace(d, 'p.salud := p.salud - 1 * dt;', 'p.salud := p.salud - 1 * esc * dt;');
  d := replace(d, '0.5 * regen * dt', '0.5 * esc * regen * dt');
  d := replace(d, 'interval ''6 hours'' then 2.5 else 1 end * dt', 'interval ''2 minutes'' then 2.5 else 1 end * esc * dt');
  d := replace(d, 'dt / 0.5', 'dt * 293 / 0.5');
  d := replace(d, E'    if p.salud <= 0 then\n      p.salud := 0;',
    E'    if fuera and salud_antes >= 25 and p.salud < 25 then p.salud := 25; end if;\n    if p.salud <= 0 then\n      p.salud := 0;');
  if d = o then raise exception 'sincronizar no cambia'; end if;
  foreach paso in array array['esc double precision := 180', 'fuera := extract', 'least(1.0 / 360, restante)', '0.1 * esc * dt',
      '1.5 * esc * f_agua', '0.8 * esc * f_nutr', '0.5 * esc * f_luz', '2 * esc * dt', '1 * esc * dt', '0.5 * esc * regen',
      '''2 minutes''', 'dt * 293 / 0.5', 'fuera and salud_antes'] loop
    if position(paso in d) = 0 then raise exception 'sincronizar: falta %', paso; end if;
  end loop;
  execute d;

  -- Estado del jugador: la plaga grave pasa a los 2 minutos.
  d := pg_get_functiondef('tpp.estado_json(uuid)'::regprocedure);
  o := d;
  d := replace(d, 'interval ''6 hours''', 'interval ''2 minutes''');
  if d = o then raise exception 'estado_json no cambia'; end if;
  execute d;

  -- Cosecha: menos monedas y XP.
  d := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, 'recompensa := 1000 * (tpp.desafios()', 'recompensa := 170 * (tpp.desafios()');
  d := replace(d, 'xp = xp + 200 * (tpp.desafios() -> p.desafio ->> ''mult'')::int + 10 * bono_xp',
                  'xp = xp + 50 * (tpp.desafios() -> p.desafio ->> ''mult'')::int + round(2.5 * bono_xp)::int');
  d := replace(d, 'recompensa := round((400 + p.salud * 6) * (1 + p.bonus_cosecha)', 'recompensa := round((60 + p.salud) * (1 + p.bonus_cosecha)');
  d := replace(d, 'xp_cosecha := round((100 + 10 * bono_xp)', 'xp_cosecha := round((25 + 2.5 * bono_xp)');
  foreach paso in array array['recompensa := 170 *', '50 * (tpp.desafios()', '(60 + p.salud)', '(25 + 2.5 * bono_xp)'] loop
    if position(paso in d) = 0 then raise exception 'accion: falta %', paso; end if;
  end loop;
  execute d;
end
$mig$;
