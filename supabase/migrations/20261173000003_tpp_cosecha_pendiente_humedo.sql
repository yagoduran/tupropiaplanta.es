-- Si cosechas con otra cosecha aún sin decidir, la anterior se vende en húmedo (×0,5), no a precio completo.
do $m$
declare d text;
begin
  d := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure);
  if position($$    perform tpp.resolver_cosecha(p_uid, true);$$ in d) = 0 then raise exception 'accion no parcheada'; end if;
  d := replace(d, $$    perform tpp.resolver_cosecha(p_uid, true);$$,
    $$    if exists (select 1 from tpp.perfiles where id = p_uid and cosecha_pendiente is not null) then
      perform tpp.secar_cosecha(p_uid, 'humedo', 0);
    end if;$$);
  execute d;
end;
$m$;
