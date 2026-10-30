-- Desbloquea los títulos Curioso (1 cruce), Genetista (50 cruces) y Creador (10 híbridos) y el marco Dorado (maestría de oro en Dorada del Sur).
-- Antes estaban fijados a false en tpp.progresion.
-- Para deshacer: volver a poner 'curioso', false, 'genetista', false, 'creador', false y 'dorado', false en tpp.progresion
-- (mismo método: pg_get_functiondef + replace).
do $$
declare d text;
begin
  d := pg_get_functiondef('tpp.progresion(uuid)'::regprocedure);
  d := replace(d, E'''curioso'', false, ''genetista'', false, ''creador'', false',
    E'''curioso'', coalesce((perfil.estadisticas ->> ''cruces'')::int, 0) >= 1, ''genetista'', coalesce((perfil.estadisticas ->> ''cruces'')::int, 0) >= 50, ''creador'', (select count(*) from tpp.hibridos h where h.usuario_id = p_uid) >= 10');
  d := replace(d, E'''dorado'', false,', E'''dorado'', tpp.maestria_nivel(p_uid, ''dorada'') >= 10,');
  execute d;
end $$;
