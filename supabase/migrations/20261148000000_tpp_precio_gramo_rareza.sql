-- El precio de venta del gramo depende de la variedad: 6 monedas × valor de la variedad (columna recompensa).
-- Para deshacer: volver a la versión de tpp.vender_gramos de 20261144000000.
do $mig$
declare
  d text := pg_get_functiondef('tpp.vender_gramos(uuid,text,integer)'::regprocedure);
  o text;
begin
  o := d;
  d := replace(d, E'  n integer;\n', E'  n integer;\n  pg double precision := 6 * coalesce((tpp.variedades() -> p_variedad ->> ''recompensa'')::double precision, 1);\n');
  if d = o then raise exception 'declare no cambia'; end if;
  o := d;
  d := replace(d, 'monedas = monedas + n * 6,', 'monedas = monedas + round(n * pg)::int,');
  if d = o then raise exception 'monedas no cambia'; end if;
  o := d;
  d := replace(d, '''recompensa'', n * 6,', '''recompensa'', round(n * pg)::int,');
  if d = o then raise exception 'recompensa no cambia'; end if;
  execute d;
end
$mig$;
