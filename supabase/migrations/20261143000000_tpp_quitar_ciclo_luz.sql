-- Se quita el ciclo de luz: ya no hay horario que configurar ni penalización por un horario roto.
-- Las columnas perfiles.luz_horas y luz_inicio se quedan en la base de datos sin uso.
--
-- Para deshacer: volver a poner en tpp.sincronizar(uuid) las líneas que usaban roto (ver 20261136000000_tpp_mecanicas_plantas.sql).

do $mig$
declare
  d text := pg_get_functiondef('tpp.sincronizar(uuid)'::regprocedure);
  o text;
begin
  o := d;
  d := replace(d, 'crec := crec * 1.1; else crec := crec * 0.5; roto := true; end if;', 'crec := crec * 1.1; end if;');
  if d = o then raise exception 'crec no cambia'; end if;
  o := d;
  d := replace(d, E'    if roto then p.salud := p.salud - 0.4 * esc * dt; cz := coalesce(cz, ''ciclo_luz''); end if;\n', '');
  if d = o then raise exception 'salud no cambia'; end if;
  execute d;
end
$mig$;
