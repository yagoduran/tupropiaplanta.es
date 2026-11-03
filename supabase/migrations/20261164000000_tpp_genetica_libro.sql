-- El libro solo cuenta los 10 pares F1 del diseño.
create or replace function tpp.libro(p_uid uuid) returns jsonb language plpgsql security definer set search_path = '' as
$f$
declare
  perfil tpp.perfiles;
  vars jsonb;
  f1 jsonb;
  fen jsonb;
  total integer;
  tr jsonb;
  ids text[] := array['primer', 'fenotipos', 'tres_cuartos', 'coleccionista', 'libro'];
  listos boolean[];
  hechos jsonb;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  select coalesce(jsonb_agg(k order by k), '[]'::jsonb) into vars
    from jsonb_object_keys(coalesce(perfil.estadisticas -> 'variedades', '{}'::jsonb)) k where tpp.ficha_base() ? k;
  select coalesce(jsonb_agg(k order by k), '[]'::jsonb) into f1 from jsonb_object_keys(coalesce(perfil.estadisticas -> 'libro_f1', '{}'::jsonb)) k
    where k in ('aurora+clasica', 'aurora+cristal', 'aurora+dorada', 'aurora+hoja-azul', 'aurora+noche', 'clasica+cristal', 'clasica+dorada', 'cristal+dorada', 'cristal+noche', 'hoja-azul+noche');
  select coalesce(jsonb_agg(k order by k), '[]'::jsonb) into fen
    from jsonb_object_keys(coalesce(perfil.estadisticas -> 'libro_fen', '{}'::jsonb)) k where k in ('black', 'resina', 'enana', 'fantasma', 'brasa');
  total := jsonb_array_length(vars) + jsonb_array_length(f1) + jsonb_array_length(fen);
  hechos := coalesce(perfil.ajustes -> 'trofeos', '[]'::jsonb);
  listos := array[
    exists (select 1 from tpp.hibridos where usuario_id = p_uid and datos is not null),
    jsonb_array_length(fen) >= 5,
    total >= 24,
    jsonb_array_length(vars) >= 16,
    total >= 31];
  select jsonb_agg(jsonb_build_object('id', ids[i], 'listo', listos[i], 'reclamado', hechos ? ids[i]) order by i) into tr
    from generate_subscripts(ids, 1) i;
  return jsonb_build_object('variedades', vars, 'f1', f1, 'fenotipos', fen, 'total', total, 'trofeos', tr);
end;
$f$;

