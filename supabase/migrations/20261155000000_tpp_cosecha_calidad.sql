-- Premios por calidad (bloque 4): al cosechar, los gramos, las monedas y la experiencia dependen de las estrellas
-- (1 a 5, sacadas de la salud). Las monedas y la XP se reparten con la misma media de antes: 3 estrellas ≈ lo de siempre.
-- La cosecha pendiente guarda además «factores»: el estado de la planta al cosechar (1 a 5), para «Qué ha influido».

do $mig$
declare
  d text := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure);
  o text;
begin
  o := d;
  d := replace(d, E'xp_cosecha integer;\n  gramos_c integer;\nbegin', E'xp_cosecha integer;\n  gramos_c integer;\n  q_c integer;\nbegin');
  if d = o then raise exception 'declare no cambia'; end if;

  o := d;
  d := replace(d,
    $a$gramos_c := greatest(1, round(20 * coalesce((tpp.datos_variedad(p_uid, p.variedad) ->> 'recompensa')::double precision, 1) * p.salud / 100 * (case when p.sexo = 'macho' then 0.2 else 1 end))::int);$a$,
    $b$q_c := greatest(1, least(5, ceil(p.salud / 20)::int));
    recompensa := greatest(1, round(recompensa * 160.0 / (60 + p.salud) * (array[0.318, 0.612, 1, 1.606, 2.5])[q_c])::int);
    xp_cosecha := greatest(1, round(xp_cosecha * (array[0.286, 0.571, 1, 1.714, 2.857])[q_c])::int);
    gramos_c := greatest(1, round((array[18, 26, 34, 42, 50])[q_c] * coalesce((tpp.datos_variedad(p_uid, p.variedad) ->> 'recompensa')::double precision, 1) * (case when p.sexo = 'macho' then 0.2 else 1 end))::int);$b$);
  if d = o then raise exception 'gramos no cambia'; end if;

  o := d;
  d := replace(d,
    $a$'calidad', greatest(1, least(5, ceil(p.salud / 20)::int)),$a$,
    $b$'calidad', q_c,
        'factores', jsonb_build_array(
          jsonb_build_object('id', 'luz', 'valor', greatest(1, least(5, ceil(p.luz / 20)::int))),
          jsonb_build_object('id', 'riego', 'valor', greatest(1, least(5, ceil(p.agua / 20)::int))),
          jsonb_build_object('id', 'abono', 'valor', greatest(1, least(5, ceil(p.nutrientes / 20)::int))),
          jsonb_build_object('id', 'plagas', 'valor', case when p.plaga is not null then 2 else 5 end),
          jsonb_build_object('id', 'salud', 'valor', q_c)),$b$);
  if d = o then raise exception 'factores no cambia'; end if;
  execute d;
end
$mig$;
