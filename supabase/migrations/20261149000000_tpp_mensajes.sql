-- Sugerencias y avisos de error enviados por los jugadores desde la cabecera.
-- Tabla privada: solo se lee desde el panel de Supabase. Máximo 3 envíos al día por jugador.
--
-- Para deshacer: drop function public.tpp_enviar_mensaje(text, text, text, jsonb);
-- drop function tpp.enviar_mensaje(uuid, text, text, text, jsonb); drop table tpp.mensajes;

create table if not exists tpp.mensajes (
  id bigint generated always as identity primary key,
  usuario_id uuid not null,
  tipo text not null check (tipo in ('sugerencia', 'error')),
  donde text,
  texto text not null,
  contexto jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);
alter table tpp.mensajes enable row level security;
revoke all on tpp.mensajes from public, anon, authenticated;
create index if not exists mensajes_usuario_creado_idx on tpp.mensajes (usuario_id, creado_en desc);

create or replace function tpp.enviar_mensaje(p_uid uuid, p_tipo text, p_texto text, p_donde text, p_contexto jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  t text := btrim(coalesce(p_texto, ''));
  hoy integer;
begin
  if p_tipo not in ('sugerencia', 'error') then return jsonb_build_object('ok', false, 'error', 'tipo'); end if;
  if p_tipo = 'sugerencia' and (char_length(t) < 1 or char_length(t) > 500) then
    return jsonb_build_object('ok', false, 'error', 'texto');
  end if;
  if p_tipo = 'error' and (char_length(t) < 10 or char_length(t) > 1000) then
    return jsonb_build_object('ok', false, 'error', 'texto');
  end if;
  select count(*) into hoy from tpp.mensajes where usuario_id = p_uid and creado_en > now() - interval '1 day';
  if hoy >= 3 then return jsonb_build_object('ok', false, 'error', 'limite'); end if;
  insert into tpp.mensajes (usuario_id, tipo, donde, texto, contexto)
  values (p_uid, p_tipo, left(p_donde, 120), t, coalesce(p_contexto, '{}'::jsonb));
  return jsonb_build_object('ok', true, 'quedan', 2 - hoy);
end;
$function$;

create or replace function public.tpp_enviar_mensaje(p_tipo text, p_texto text, p_donde text default null, p_contexto jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.enviar_mensaje(auth.uid(), p_tipo, p_texto, p_donde, p_contexto);
end;
$function$;

revoke all on function tpp.enviar_mensaje(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.tpp_enviar_mensaje(text, text, text, jsonb) from public, anon;
grant execute on function public.tpp_enviar_mensaje(text, text, text, jsonb) to authenticated;
