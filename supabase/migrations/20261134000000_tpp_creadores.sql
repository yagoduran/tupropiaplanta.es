-- Creadores de contenido: tpp.perfiles.creador (se activa a mano en Supabase al aprobar la solicitud). Sale en la ficha del jugador
-- (perfil público, amigos) y en el ranking; la solicitud llega por el formulario de contacto con el asunto «Soy creador de contenido».
-- Para activar: update tpp.perfiles set creador = true where usuario = '...';
-- Para deshacer: quitar la columna creador y volver a aplicar las versiones anteriores de tpp.ficha_jugador, tpp.ranking y public.tpp_contacto.

alter table tpp.perfiles add column if not exists creador boolean not null default false;

create or replace function tpp.ficha_jugador(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('usuario', usuario, 'nivel', tpp.nivel_de(xp), 'avatar', coalesce(ajustes ->> 'avatar', 'avatar_gorra'),
    'titulo', ajustes ->> 'titulo', 'marco', ajustes ->> 'marco', 'prestigio', prestigio, 'creador', creador)
  from tpp.perfiles where id = p_id;
$$;

do $mig$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('tpp.ranking(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, 'select p.id, p.usuario, p.xp,', 'select p.id, p.usuario, p.creador, p.xp,');
  d := replace(d, E'''cosechas'', cosechas, ''yo'', id = p_uid)', E'''cosechas'', cosechas, ''yo'', id = p_uid, ''creador'', creador)');
  if d = o or d not like '%''creador'', creador)%' or d not like '%p.creador%' then raise exception 'ranking no cambia'; end if;
  execute d;

  d := pg_get_functiondef('public.tpp_contacto(text,text,text,text)'::regprocedure);
  o := d;
  d := replace(d, '''Sugerencia'', ''Otro''', '''Sugerencia'', ''Soy creador de contenido'', ''Otro''');
  if d = o then raise exception 'contacto no cambia'; end if;
  execute d;
end
$mig$;
