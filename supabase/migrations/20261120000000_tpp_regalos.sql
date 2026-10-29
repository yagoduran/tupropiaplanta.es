-- Regalos entre amigos. Cada jugador puede enviar 3 regalos al día (se renuevan a las 00:00, hora de Madrid), uno por amigo y día.
-- Tipos: monedas (50, salen del saldo del que regala; 1 regalo de monedas al día por jugador y máx. 3 recibidos al día),
-- agua (+30 de agua en la planta del amigo, gratis) y abono (un Abono normal, fert_generico, que sale del inventario del que regala).
-- Sin texto libre: solo se puede añadir uno de los 8 saludos con emoji. El amigo lo recibe solo y se le avisa en la campana.
-- Misión semanal nueva «Envía 3 regalos» (+300 monedas).
-- Para deshacer: borrar las funciones public.tpp_regalos y tpp_enviar_regalo, tpp.mis_regalos y tpp.enviar_regalo, la tabla tpp.regalos,
-- y volver a aplicar las versiones anteriores de misiones_def y mis_amigos.

create table tpp.regalos (
  id bigint generated always as identity primary key,
  de uuid not null references auth.users (id) on delete cascade,
  para uuid not null references auth.users (id) on delete cascade,
  dia date not null,
  tipo text not null check (tipo in ('monedas', 'agua', 'abono')),
  saludo text,
  creado_en timestamptz not null default now(),
  unique (de, para, dia)
);
create index regalos_para on tpp.regalos (para, dia);
alter table tpp.regalos enable row level security;

create function tpp.mis_regalos(p_uid uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'restantes', 3 - (select count(*)::int from tpp.regalos where de = p_uid and dia = (now() at time zone 'Europe/Madrid')::date),
    'abonos', coalesce((select cantidad from tpp.inventario where usuario_id = p_uid and objeto = 'fert_generico'), 0),
    'monedas_hoy', exists (select 1 from tpp.regalos where de = p_uid and tipo = 'monedas' and dia = (now() at time zone 'Europe/Madrid')::date));
$$;

create function tpp.enviar_regalo(p_uid uuid, p_usuario text, p_tipo text, p_saludo text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  otro uuid := tpp.id_de_usuario(p_usuario);
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  pid uuid;
  nombre text;
  texto text;
begin
  perform tpp.asegurar_perfil(p_uid);
  if p_tipo not in ('monedas', 'agua', 'abono') then
    return jsonb_build_object('ok', false, 'error', 'regalo_desconocido') || tpp.mis_regalos(p_uid);
  end if;
  if p_saludo is not null and p_saludo not in ('sonrisa', 'corazon', 'gracias', 'animo', 'sorpresa', 'risa', 'pulgar', 'planta') then
    return jsonb_build_object('ok', false, 'error', 'saludo_desconocido') || tpp.mis_regalos(p_uid);
  end if;
  if otro is null or otro = p_uid or tpp.relacion(p_uid, otro) <> 'amigos' or tpp.bloqueado(p_uid, otro) then
    return jsonb_build_object('ok', false, 'error', 'no_es_amigo') || tpp.mis_regalos(p_uid);
  end if;
  if (select count(*) from tpp.regalos where de = p_uid and dia = hoy) >= 3 then
    return jsonb_build_object('ok', false, 'error', 'regalo_limite') || tpp.mis_regalos(p_uid);
  end if;
  if exists (select 1 from tpp.regalos where de = p_uid and para = otro and dia = hoy) then
    return jsonb_build_object('ok', false, 'error', 'regalo_ya_enviado') || tpp.mis_regalos(p_uid);
  end if;

  if p_tipo = 'monedas' then
    if exists (select 1 from tpp.regalos where de = p_uid and tipo = 'monedas' and dia = hoy)
       or (select count(*) from tpp.regalos where para = otro and tipo = 'monedas' and dia = hoy) >= 3 then
      return jsonb_build_object('ok', false, 'error', 'regalo_monedas_limite') || tpp.mis_regalos(p_uid);
    end if;
    update tpp.perfiles set monedas = monedas - 50 where id = p_uid and monedas >= 50;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'monedas_insuficientes') || tpp.mis_regalos(p_uid);
    end if;
    update tpp.perfiles set monedas = monedas + 50 where id = otro;
    texto := '50 monedas';
  elsif p_tipo = 'agua' then
    select id into pid from tpp.plantas where usuario_id = otro and estado = 'viva' and desafio is null order by hueco limit 1;
    if pid is null then
      return jsonb_build_object('ok', false, 'error', 'visita_sin_planta') || tpp.mis_regalos(p_uid);
    end if;
    perform tpp.sincronizar(pid);
    update tpp.plantas set agua = least(100, agua + 30) where id = pid;
    texto := 'agua extra para tu planta (+30)';
  else
    update tpp.inventario set cantidad = cantidad - 1 where usuario_id = p_uid and objeto = 'fert_generico' and cantidad > 0;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'regalo_sin_abono') || tpp.mis_regalos(p_uid);
    end if;
    insert into tpp.inventario (usuario_id, objeto, cantidad) values (otro, 'fert_generico', 1)
      on conflict (usuario_id, objeto) do update set cantidad = tpp.inventario.cantidad + 1;
    texto := 'un abono';
  end if;

  insert into tpp.regalos (de, para, dia, tipo, saludo) values (p_uid, otro, hoy, p_tipo, p_saludo);
  select usuario into nombre from tpp.perfiles where id = p_uid;
  perform tpp.notificar(otro, 'regalo', 'Regalo recibido', nombre || ' te ha enviado ' || texto || '.');
  perform tpp.mision_sumar(p_uid, 'regalo');
  return jsonb_build_object('ok', true) || tpp.mis_regalos(p_uid) || tpp.estado_json(p_uid);
end;
$$;

create function public.tpp_regalos() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.mis_regalos(auth.uid());
end;
$$;

create function public.tpp_enviar_regalo(p_usuario text, p_tipo text, p_saludo text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  return tpp.enviar_regalo(auth.uid(), p_usuario, p_tipo, p_saludo);
end;
$$;

revoke all on function tpp.mis_regalos(uuid) from public, anon, authenticated;
revoke all on function tpp.enviar_regalo(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.tpp_regalos() from public, anon;
revoke all on function public.tpp_enviar_regalo(text, text, text) from public, anon;
grant execute on function public.tpp_regalos() to authenticated;
grant execute on function public.tpp_enviar_regalo(text, text, text) to authenticated;

create or replace function tpp.misiones_def() returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_array(
    jsonb_build_object('id', 'd_regar', 'grupo', 'd', 'clave', 'regar', 'meta', 5, 'nombre', 'Riega 5 veces', 'desc', 'Riega tu planta 5 veces hoy.', 'premio', jsonb_build_object('tipo', 'monedas', 'n', 100)),
    jsonb_build_object('id', 'd_abonar', 'grupo', 'd', 'clave', 'abonar', 'meta', 2, 'nombre', 'Abona tu planta', 'desc', 'Usa abono 2 veces hoy.', 'premio', jsonb_build_object('tipo', 'xp', 'n', 40)),
    jsonb_build_object('id', 'd_luz', 'grupo', 'd', 'clave', 'luz', 'meta', 1, 'nombre', 'Ajusta la luz', 'desc', 'Ajusta la luz de tu planta una vez hoy.', 'premio', jsonb_build_object('tipo', 'monedas', 'n', 60)),
    jsonb_build_object('id', 'd_visita', 'grupo', 'd', 'clave', 'visita', 'meta', 1, 'nombre', 'Visita a un amigo', 'desc', 'Entra en la planta de un amigo.', 'premio', jsonb_build_object('tipo', 'monedas', 'n', 60)),
    jsonb_build_object('id', 's_cosechar', 'grupo', 's', 'clave', 'cosechar', 'meta', 1, 'nombre', 'Cosecha una planta', 'desc', 'Completa una cosecha esta semana.', 'premio', jsonb_build_object('tipo', 'monedas', 'n', 250)),
    jsonb_build_object('id', 's_sana', 'grupo', 's', 'clave', 'sana', 'meta', 1, 'nombre', 'Planta sana', 'desc', 'Cosecha con la salud por encima del 80 %.', 'premio', jsonb_build_object('tipo', 'xp', 'n', 150)),
    jsonb_build_object('id', 's_regalos', 'grupo', 's', 'clave', 'regalo', 'meta', 3, 'nombre', 'Envía 3 regalos', 'desc', 'Regala algo a tus amigos.', 'premio', jsonb_build_object('tipo', 'monedas', 'n', 300))
  );
$$;

do $$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('tpp.mis_amigos(uuid)'::regprocedure);
  o := d;
  d := replace(d, '''max'', 50,', E'''max'', 50,\n    ''regalos_restantes'', 3 - (select count(*)::int from tpp.regalos where de = p_uid and dia = hoy),');
  d := replace(d, '''saludado'', v.saludo is not null)', '''saludado'', v.saludo is not null,' || E'\n        ''regalado'', exists (select 1 from tpp.regalos r where r.de = p_uid and r.para = p.id and r.dia = hoy))');
  if d = o or position('regalado' in d) = 0 or position('regalos_restantes' in d) = 0 then raise exception 'mis_amigos no cambia'; end if;
  execute d;
end $$;
