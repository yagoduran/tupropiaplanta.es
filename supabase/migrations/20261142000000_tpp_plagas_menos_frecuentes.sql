-- Las plagas aparecían demasiado: la probabilidad de que aparezcan baja un 70 %.
--
-- Para deshacer: volver a poner 0.02 y 0.015 en tpp.sincronizar(uuid) (líneas con random() y f_plaga).

do $mig$
declare
  d text := pg_get_functiondef('tpp.sincronizar(uuid)'::regprocedure);
  o text;
begin
  o := d;
  d := replace(d, 'random() < 0.02 * f_plaga * f_moho', 'random() < 0.006 * f_plaga * f_moho');
  if d = o then raise exception 'moho no cambia'; end if;
  o := d;
  d := replace(d, 'case when buena then 0.0015 else 0.015 end', 'case when buena then 0.00045 else 0.0045 end');
  if d = o then raise exception 'plaga no cambia'; end if;
  execute d;
end
$mig$;
