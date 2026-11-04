-- 8j · Corrección: jsonb_set no crea claves intermedias; se normaliza perfiles.procesado antes de escribir.
create or replace function tpp.proc_norm(j jsonb) returns jsonb language sql immutable set search_path = '' as
$f$ select '{"materias":{},"puestos":{},"prod":{},"enc":{}}'::jsonb || coalesce(j, '{}'::jsonb) $f$;
revoke all on function tpp.proc_norm(jsonb) from public, anon, authenticated;

do $mig$
declare
  f text;
  d text;
  o text;
begin
  foreach f in array array[
    'tpp.procesado_restos(uuid,integer,integer)', 'tpp.procesado_anadir(uuid,text)', 'tpp.proc_devolver(uuid,jsonb)',
    'tpp.procesado_recoger(uuid,text)', 'tpp.procesado_comprar_masa(uuid,text,integer)', 'tpp.procesado_entregar(uuid,text)'] loop
    d := pg_get_functiondef(f::regprocedure); o := d;
    d := replace(d, 'coalesce(v_p, ''{}''::jsonb)', 'tpp.proc_norm(v_p)');
    if d = o then raise exception '% sin cambios', f; end if;
    execute d;
  end loop;
end $mig$;
