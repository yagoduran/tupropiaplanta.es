-- Contacto y problemas: los mensajes del formulario se guardan aquí y los lee solo el titular (desde Supabase).
-- Para deshacer: drop function public.tpp_contacto(text, text, text, text); drop table tpp.contactos; drop sequence tpp.contacto_n;

create sequence tpp.contacto_n start 20001;

create table tpp.contactos (
  id uuid primary key default gen_random_uuid(),
  caso text not null default ('TPP-' || nextval('tpp.contacto_n')),
  usuario_id uuid references auth.users (id) on delete set null,
  asunto text not null,
  email text not null,
  mensaje text not null,
  datos text,
  creado_en timestamptz not null default now()
);

-- Sin políticas: nadie accede a la tabla desde la web.
alter table tpp.contactos enable row level security;

create function public.tpp_contacto(p_asunto text, p_email text, p_mensaje text, p_datos text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  nuevo text;
begin
  if p_asunto not in ('Problema técnico', 'Mi cuenta', 'Monedas y compras', 'Sugerencia', 'Otro') then
    raise exception 'asunto_invalido';
  end if;
  if length(p_email) not between 5 and 200 or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'email_invalido';
  end if;
  if length(trim(p_mensaje)) not between 10 and 2000 then
    raise exception 'mensaje_invalido';
  end if;
  -- Límites contra abusos: 5 mensajes al día por jugador y 40 a la hora en total.
  if uid is not null and (select count(*) from tpp.contactos where usuario_id = uid and creado_en > now() - interval '1 day') >= 5 then
    raise exception 'demasiados';
  end if;
  if (select count(*) from tpp.contactos where creado_en > now() - interval '1 hour') >= 40 then
    raise exception 'demasiados';
  end if;
  insert into tpp.contactos (usuario_id, asunto, email, mensaje, datos)
    values (uid, p_asunto, trim(p_email), trim(p_mensaje), left(p_datos, 500))
    returning caso into nuevo;
  return jsonb_build_object('ok', true, 'caso', nuevo);
end;
$$;

revoke all on function public.tpp_contacto(text, text, text, text) from public;
grant execute on function public.tpp_contacto(text, text, text, text) to anon, authenticated;
