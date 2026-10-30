-- Cada hueco enseña ahora la variedad y la fase de su planta (para dibujar una mini planta en el selector).
-- Para deshacer: volver a aplicar tpp.huecos_json() de 20261114000000_tpp_armario_habitaciones.sql.

create or replace function tpp.huecos_json(perfil tpp.perfiles) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  lista jsonb := '[]'::jsonb;
  i integer;
  pid uuid;
  p tpp.plantas;
  vida text;
begin
  for i in 1..tpp.huecos_total(perfil) loop
    pid := null;
    select id into pid from tpp.plantas where usuario_id = perfil.id and hueco = i
      order by (estado = 'viva') desc, plantada_en desc limit 1;
    if pid is null then
      vida := 'vacio';
      p := null;
    else
      p := tpp.sincronizar(pid);
      vida := p.estado;
    end if;
    lista := lista || jsonb_build_object('hueco', i, 'vida', vida, 'plaga', p.plaga is not null,
      'variedad', p.variedad, 'fase', case when p.id is null then null else tpp.fase_planta(p) end);
  end loop;
  return jsonb_build_object(
    'activo', perfil.hueco_activo,
    'desafio', (select desafio from tpp.plantas where usuario_id = perfil.id and hueco = 9 and estado = 'viva' limit 1),
    'desbloqueados', tpp.huecos_total(perfil),
    'maximo', 8,
    'siguiente', null,
    'lista', lista
  );
end;
$$;
