-- Saltar el tutorial (paso 0) lo marca como hecho sin dar el regalo de bienvenida.
create or replace function tpp.tutorial(p_uid uuid, p_paso integer, p_terminar boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  perfil tpp.perfiles;
  regalo integer := 0;
begin
  perfil := tpp.asegurar_perfil(p_uid);
  if p_terminar then
    if not perfil.tutorial_hecho then
      regalo := 100;
      update tpp.perfiles set tutorial_hecho = true, tutorial_paso = 8, monedas = monedas + regalo where id = p_uid;
    end if;
  elsif p_paso = 0 then
    update tpp.perfiles set tutorial_hecho = true where id = p_uid;
  elsif not perfil.tutorial_hecho then
    update tpp.perfiles set tutorial_paso = greatest(1, least(8, p_paso)) where id = p_uid;
  end if;
  return jsonb_build_object('ok', true, 'recompensa', regalo) || tpp.estado_json(p_uid);
end;
$$;
