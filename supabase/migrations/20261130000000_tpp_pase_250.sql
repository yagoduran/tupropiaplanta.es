-- Pase de temporada al ritmo nuevo: 250 puntos por nivel (antes 80), 30 niveles = 7.500 puntos.
-- Lo que da cada cosa no cambia. Los puntos ya ganados se conservan (el nivel se recalcula con los 250).
-- Para deshacer: volver a aplicar 20261121000000_tpp_eventos_pase.sql (pase_puntos, mi_pase, reclamar_pase) con 80 y 2400.

do $mig$
declare
  f text;
  d text;
  o text;
begin
  foreach f in array array['tpp.pase_puntos(uuid,integer)', 'tpp.mi_pase(uuid)', 'tpp.reclamar_pase(uuid,integer,text)'] loop
    d := pg_get_functiondef(f::regprocedure);
    o := d;
    d := replace(d, '/ 80)', '/ 250)');
    d := replace(d, '/ 80;', '/ 250;');
    d := replace(d, 'least(2400,', 'least(7500,');
    d := replace(d, '''por_nivel'', 80', '''por_nivel'', 250');
    if d = o then raise exception '% no cambia', f; end if;
    if d ~ '/ 80\M' then raise exception '% aún tiene 80', f; end if;
    execute d;
  end loop;
end
$mig$;
