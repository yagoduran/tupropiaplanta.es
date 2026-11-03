-- Bloque 8b: el avatar de la casa isométrica se guarda en los ajustes (clave avatar_casa).
-- tono 0-3, ropa 0-1, color_ropa 0-3, pelo 0-2, color_pelo 0-3.
-- Para deshacer: volver a aplicar tpp.ajustes de 20261103000000_tpp_ranking.sql.

do $mig$
declare
  d text;
  nuevo text;
begin
  d := pg_get_functiondef('tpp.ajustes(uuid, jsonb)'::regprocedure);
  nuevo := replace(d,
    $a$    end if;
  end loop;$a$,
    $b$    elsif k = 'avatar_casa' and jsonb_typeof(p_ajustes -> k) = 'object' then
      nuevo := nuevo || jsonb_build_object(k, jsonb_build_object(
        'tono', greatest(0, least(3, coalesce(round((p_ajustes -> k ->> 'tono')::numeric), 0))),
        'ropa', greatest(0, least(1, coalesce(round((p_ajustes -> k ->> 'ropa')::numeric), 0))),
        'color_ropa', greatest(0, least(3, coalesce(round((p_ajustes -> k ->> 'color_ropa')::numeric), 0))),
        'pelo', greatest(0, least(2, coalesce(round((p_ajustes -> k ->> 'pelo')::numeric), 0))),
        'color_pelo', greatest(0, least(3, coalesce(round((p_ajustes -> k ->> 'color_pelo')::numeric), 0)))
      ));
    end if;
  end loop;$b$);
  if nuevo = d then raise exception 'no se pudo parchear tpp.ajustes'; end if;
  execute nuevo;
end
$mig$;
