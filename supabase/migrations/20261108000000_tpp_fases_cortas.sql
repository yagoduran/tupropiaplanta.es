-- Las dos primeras fases pasan a durar 1 y 4 horas (antes 6 y 24) para que se vea cambio enseguida.
-- Duraciones: 1, 4, 48, 48, 72, 48 y 72 horas (en total 293 horas).
create or replace function tpp.fase_de(horas double precision) returns integer
language sql immutable set search_path = '' as $$
  select 1
    + (horas >= 1)::int + (horas >= 5)::int + (horas >= 53)::int + (horas >= 101)::int
    + (horas >= 173)::int + (horas >= 221)::int + (horas >= 293)::int;
$$;
