-- Plaga con tres niveles (bloque 4): leve (menos de 3 horas), media (de 3 a 6 horas) y grave (más de 6 horas).
-- El estado del juego añade «media» junto a «grave».
-- Para deshacer: volver a la versión de tpp.estado_json de 20261155 (sin 'media').
do $mig$
declare
  d text := pg_get_functiondef('tpp.estado_json(uuid)'::regprocedure);
  o text := d;
begin
  d := replace(d, $a$jsonb_build_object('tipo', p.plaga, 'grave', now() - p.plaga_desde > interval '6 hours')$a$,
    $a$jsonb_build_object('tipo', p.plaga, 'grave', now() - p.plaga_desde > interval '6 hours',
          'media', now() - p.plaga_desde > interval '3 hours' and now() - p.plaga_desde <= interval '6 hours')$a$);
  if d = o then raise exception 'estado_json no cambia'; end if;
  execute d;
end
$mig$;
