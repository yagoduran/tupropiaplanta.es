-- Avisos de "ya está disponible" en la campana: regalo diario, misiones nuevas y desafíos renovados.
-- Se generan al pedir el estado (sin tareas programadas) y una sola vez por día o semana (hora de Madrid).
-- La primera vez solo se guardan las marcas, sin avisar, para no llenar la campana a los jugadores actuales.
--
-- Para deshacer: volver a poner en tpp.estado_json la línea "nuevos := tpp.revisar_logros(p_uid);" sin la llamada
-- previa a tpp.avisos_disponibles, y después:
--   drop function tpp.avisos_disponibles(uuid);
--   alter table tpp.perfiles drop column avisos_disp;

alter table tpp.perfiles add column if not exists avisos_disp jsonb not null default '{}'::jsonb;

create or replace function tpp.avisos_disponibles(p_uid uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  p tpp.perfiles;
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  semana date := date_trunc('week', now() at time zone 'Europe/Madrid')::date;
  v jsonb;
begin
  select * into p from tpp.perfiles where id = p_uid;
  if p.id is null or not p.tutorial_hecho then return; end if;
  v := p.avisos_disp;
  if v = '{}'::jsonb then
    update tpp.perfiles set avisos_disp = jsonb_build_object('diaria', hoy, 'misiones', hoy, 'desafios', semana) where id = p_uid;
    return;
  end if;
  if v ->> 'diaria' is distinct from hoy::text then
    if p.ultimo_diario is distinct from hoy then
      perform tpp.notificar(p_uid, 'disponible', 'Regalo diario listo', 'Ya puedes reclamar el regalo de hoy.');
    end if;
    v := v || jsonb_build_object('diaria', hoy);
  end if;
  if v ->> 'misiones' is distinct from hoy::text then
    perform tpp.notificar(p_uid, 'disponible', 'Misiones nuevas', 'Hay misiones nuevas para hoy.');
    v := v || jsonb_build_object('misiones', hoy);
  end if;
  if v ->> 'desafios' is distinct from semana::text then
    if exists (select 1 from tpp.plantas where usuario_id = p_uid and desafio is not null) then
      perform tpp.notificar(p_uid, 'disponible', 'Desafíos renovados', 'Ya puedes volver a jugar los desafíos de esta semana.');
    end if;
    v := v || jsonb_build_object('desafios', semana);
  end if;
  if v is distinct from p.avisos_disp then
    update tpp.perfiles set avisos_disp = v where id = p_uid;
  end if;
end;
$function$;

do $$
declare
  d text := pg_get_functiondef('tpp.estado_json(uuid)'::regprocedure);
  o text := d;
begin
  d := replace(d, 'nuevos := tpp.revisar_logros(p_uid);', 'perform tpp.avisos_disponibles(p_uid); nuevos := tpp.revisar_logros(p_uid);');
  if d = o then raise exception 'estado_json no cambia'; end if;
  execute d;
end;
$$;
