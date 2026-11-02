-- Arregla tpp.huecos_json() de 20261151000000 (no se podía referir a su propia variable por el nombre de la función) y le añade
-- el agua, los nutrientes, la luz y la salud de cada hueco (la ficha de la casa). Sustituye a 20261152000000.
-- Para deshacer: volver a aplicar tpp.huecos_json() de 20261151000000_tpp_casa_habitaciones.sql con la variable renombrada.

create or replace function tpp.huecos_json(perfil tpp.perfiles) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  lista jsonb := '[]'::jsonb;
  h text;
  i integer;
  num integer;
  pid uuid;
  p tpp.plantas;
  vida text;
begin
  foreach h in array array['armario', 'salon', 'cocina', 'dormitorio', 'bano', 'terraza', 'invernadero', 'sotano', 'azotea'] loop
    continue when not (perfil.habitaciones ? h);
    for i in 1..tpp.sitios_habitacion(perfil, h) loop
      num := (tpp.habitaciones() -> h ->> 'base')::int + i;
      pid := null;
      select pl.id into pid from tpp.plantas pl where pl.usuario_id = perfil.id and pl.hueco = num
        order by (pl.estado = 'viva') desc, pl.plantada_en desc limit 1;
      if pid is null then
        vida := 'vacio';
        p := null;
      else
        p := tpp.sincronizar(pid);
        vida := p.estado;
      end if;
      lista := lista || jsonb_build_object('hueco', num, 'habitacion', h, 'sitio', i, 'vida', vida,
        'plaga', p.plaga is not null, 'variedad', p.variedad,
        'fase', case when p.id is null then null else tpp.fase_planta(p) end,
        'agua', round(p.agua), 'nutrientes', round(p.nutrientes), 'luz', round(p.luz), 'salud', round(p.salud));
    end loop;
  end loop;
  return jsonb_build_object(
    'activo', perfil.hueco_activo,
    'desafio', (select pl.desafio from tpp.plantas pl where pl.usuario_id = perfil.id and pl.hueco = 9 and pl.estado = 'viva' limit 1),
    'desbloqueados', tpp.huecos_total(perfil),
    'maximo', 25 + 3,
    'siguiente', null,
    'lista', lista
  );
end;
$$;
