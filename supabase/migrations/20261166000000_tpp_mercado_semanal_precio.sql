-- 8h · El precio de la semana se redondea siempre hacia arriba en el .5 (igual que en la pantalla).
create or replace function tpp.mercado_precio(p_pg double precision, p_variedad text, p_ts timestamptz default now())
returns double precision language sql stable set search_path = '' as
$f$
  select case when (tpp.mercado_semana(tpp.mercado_lunes(p_ts)) -> 'mods' ->> p_variedad) is null then p_pg
    else greatest(1, floor((p_pg * (100 + (tpp.mercado_semana(tpp.mercado_lunes(p_ts)) -> 'mods' ->> p_variedad)::int) + 50) / 100)) end
$f$;

do $mig$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('tpp.vender_gramos(uuid,text,integer)'::regprocedure);
  o := d;
  d := replace(d, E'  pg := case when tpp.mercado_mult(p_variedad) is null then pg else greatest(1, round(pg * tpp.mercado_mult(p_variedad))) end;',
    E'  pg := tpp.mercado_precio(pg, p_variedad);');
  if d = o then raise exception 'vender_gramos: no se pudo parchear'; end if;
  execute d;
end $mig$;

revoke all on function tpp.mercado_precio(double precision, text, timestamptz) from public, anon, authenticated;
