-- Bloque 8d: variedades con los datos del diseño (fases en minutos, precio de semilla y de gramo, gramos por cosecha, niveles, barras de consumo)
-- y ritmo de 10 h para Verde Clásica (antes 72 h): los consumos y el desgaste se aceleran x7,2 para que la planta pida lo mismo en menos tiempo.
-- Las plantas vivas se convierten a la nueva escala. Plantar cuesta el precio de semilla (salvo semillas de cruce, premio o regaladas).
-- Para deshacer: volver a aplicar las versiones anteriores de tpp.variedades (ver migración 20261116), fase_planta, sincronizar, plantar, accion y vender_gramos;
-- las horas de las plantas vivas se pueden volver a multiplicar por 7,2.
create or replace function tpp.variedades() returns jsonb
language sql immutable set search_path = '' as $$ select '{"noche":{"hoja":"noche","ciclo":1.0,"nivel":15,"sabor":92,"rareza":"epica","desgaste":1.2,"recompensa":2.2,"semilla":650,"gramo":40,"gramos":30,"fases":[25,45,70,110,150,120,240],"riego":150,"ventana":360,"b_agua":3,"b_nutr":4,"b_luz":2},"aurora":{"hoja":"cristal","ciclo":1.0,"nivel":1,"sabor":98,"rareza":"legendaria","hibrida":true,"desgaste":1.2,"recompensa":3.4,"semilla":3000,"gramo":110,"gramos":40,"fases":[30,60,100,150,200,160,320],"riego":180,"ventana":360,"b_agua":3,"b_nutr":4,"b_luz":4},"dorada":{"hoja":"dorada","ciclo":1.0,"nivel":8,"sabor":80,"rareza":"rara","desgaste":1.0,"recompensa":1.7,"semilla":300,"gramo":26,"gramos":38,"fases":[20,40,60,80,110,90,170],"riego":90,"ventana":180,"b_agua":4,"b_nutr":4,"b_luz":5},"clasica":{"hoja":"clasica","ciclo":1.0,"nivel":1,"sabor":50,"rareza":"comun","desgaste":1.0,"recompensa":1.0,"semilla":50,"gramo":12,"gramos":28,"fases":[20,40,60,90,120,90,180],"riego":120,"ventana":240,"b_agua":3,"b_nutr":3,"b_luz":3},"cristal":{"hoja":"cristal","ciclo":1.0,"nivel":25,"sabor":95,"rareza":"legendaria","desgaste":1.3,"recompensa":3.0,"semilla":1500,"gramo":70,"gramos":22,"fases":[30,60,90,140,180,150,300],"riego":240,"ventana":480,"b_agua":1,"b_nutr":2,"b_luz":4},"ed-otono":{"hoja":"noche","ciclo":1.0,"nivel":1,"sabor":92,"rareza":"epica","hibrida":true,"desgaste":1.2,"recompensa":2.2,"semilla":400,"gramo":34,"gramos":30,"fases":[20,40,60,100,130,110,200],"riego":150,"ventana":480,"b_agua":2,"b_nutr":4,"b_luz":2},"ed-verano":{"hoja":"dorada","ciclo":1.0,"nivel":1,"sabor":80,"rareza":"rara","hibrida":true,"desgaste":1.0,"recompensa":1.7,"semilla":400,"gramo":30,"gramos":40,"fases":[15,30,50,80,110,80,150],"riego":60,"ventana":180,"b_agua":5,"b_nutr":3,"b_luz":5},"hoja-azul":{"hoja":"hoja-azul","ciclo":1.0,"nivel":3,"sabor":66,"rareza":"poco_comun","desgaste":1.0,"recompensa":1.3,"semilla":120,"gramo":18,"gramos":26,"fases":[20,40,70,100,140,100,200],"riego":180,"ventana":300,"b_agua":2,"b_nutr":3,"b_luz":3},"ed-invierno":{"hoja":"cristal","ciclo":1.0,"nivel":1,"sabor":95,"rareza":"legendaria","hibrida":true,"desgaste":1.3,"recompensa":3.0,"semilla":400,"gramo":36,"gramos":26,"fases":[25,50,70,110,140,120,220],"riego":240,"ventana":360,"b_agua":1,"b_nutr":2,"b_luz":3},"brisa-dorada":{"hoja":"dorada","ciclo":1.0,"nivel":1,"sabor":76,"rareza":"rara","hibrida":true,"desgaste":1.0,"recompensa":1.5,"semilla":380,"gramo":30,"gramos":36,"fases":[20,35,55,80,100,90,160],"riego":120,"ventana":180,"b_agua":3,"b_nutr":4,"b_luz":4},"ed-primavera":{"hoja":"hoja-azul","ciclo":1.0,"nivel":1,"sabor":66,"rareza":"poco_comun","hibrida":true,"desgaste":1.0,"recompensa":1.3,"semilla":400,"gramo":32,"gramos":32,"fases":[15,30,50,80,100,80,150],"riego":90,"ventana":240,"b_agua":4,"b_nutr":3,"b_luz":4},"ambar-antiguo":{"hoja":"dorada","ciclo":1.0,"nivel":1,"sabor":88,"rareza":"rara","hibrida":true,"desgaste":1.0,"recompensa":2.0,"semilla":500,"gramo":34,"gramos":34,"fases":[30,50,80,120,160,140,260],"riego":180,"ventana":600,"b_agua":2,"b_nutr":2,"b_luz":3},"escarcha-azul":{"hoja":"cristal","ciclo":1.0,"nivel":1,"sabor":92,"rareza":"legendaria","hibrida":true,"desgaste":1.15,"recompensa":2.6,"semilla":1800,"gramo":75,"gramos":24,"fases":[30,60,90,130,170,150,290],"riego":240,"ventana":420,"b_agua":1,"b_nutr":2,"b_luz":3},"verde-azulado":{"hoja":"hoja-azul","ciclo":1.0,"nivel":1,"sabor":62,"rareza":"poco_comun","hibrida":true,"desgaste":0.95,"recompensa":1.15,"semilla":150,"gramo":20,"gramos":30,"fases":[20,40,60,90,120,100,190],"riego":150,"ventana":300,"b_agua":2,"b_nutr":3,"b_luz":3},"menta-nocturna":{"hoja":"noche","ciclo":1.0,"nivel":1,"sabor":84,"rareza":"epica","hibrida":true,"desgaste":1.1,"recompensa":1.6,"semilla":600,"gramo":38,"gramos":32,"fases":[25,40,65,100,130,110,210],"riego":120,"ventana":300,"b_agua":3,"b_nutr":3,"b_luz":2},"sol-medianoche":{"hoja":"noche","ciclo":1.0,"nivel":1,"sabor":90,"rareza":"epica","hibrida":true,"desgaste":1.15,"recompensa":2.4,"semilla":900,"gramo":48,"gramos":44,"fases":[25,45,70,100,140,120,230],"riego":90,"ventana":240,"b_agua":4,"b_nutr":5,"b_luz":5}}'::jsonb; $$;

create or replace function tpp.fase_planta(p tpp.plantas) returns integer
language sql stable set search_path = '' as $$
  select case when d.v ? 'fases' then
      1 + (select count(*) from (
        select sum(x::numeric) over (order by o) acum from jsonb_array_elements_text(d.v -> 'fases') with ordinality t(x, o)
      ) s where s.acum / 60.0 * case when p.tipo in ('auto', 'autofem') then 0.65 else 1 end <= p.horas_vividas)::int
    else
      tpp.fase_de(p.horas_vividas * 7.2 / (coalesce((d.v ->> 'ciclo')::double precision, 1) * case when p.tipo in ('auto', 'autofem') then 0.65 else 1 end))
    end
  from (select tpp.datos_variedad(p.usuario_id, p.variedad) v) d;
$$;

do $mig$
declare
  d text;
  o text;
begin
  -- Ritmo: todo el desgaste se acelera x7,2; los desafíos mantienen sus 24 h.
  d := pg_get_functiondef('tpp.sincronizar(uuid)'::regprocedure);
  o := d;
  d := replace(d, E'  esc double precision := 1;', E'  esc double precision := 7.2;');
  d := replace(d, E'    vel := 3;\n    esc := 3;', E'    vel := 0.4167;\n    esc := 3;');
  d := replace(d, E'  f_agua := f_agua * f_var;\n  f_nutr := f_nutr * f_var;\n  f_luz := f_luz * f_var;',
    E'  f_agua := f_agua * coalesce((dv ->> ''b_agua'')::double precision / 3, f_var);\n  f_nutr := f_nutr * coalesce((dv ->> ''b_nutr'')::double precision / 3, f_var);\n  f_luz := f_luz * coalesce((dv ->> ''b_luz'')::double precision / 3, f_var);');
  if position('esc double precision := 7.2' in d) = 0 or position('vel := 0.4167' in d) = 0 or position('b_agua' in d) = 0 then raise exception 'sincronizar no cambia'; end if;
  execute d;

  -- Plantar cuesta el precio de semilla (las híbridas, de premio o de cruce, no).
  d := pg_get_functiondef('tpp.plantar(uuid,text,text)'::regprocedure);
  o := d;
  d := replace(d, E'  if perfil.monedas < coste then',
    E'  if not coalesce((v ->> ''hibrida'')::boolean, false) then\n    coste := coste + coalesce((v ->> ''semilla'')::int, 0);\n  end if;\n  if perfil.monedas < coste then');
  if d = o then raise exception 'plantar no cambia'; end if;
  execute d;

  -- Gramos por cosecha del diseño y precio por gramo del diseño.
  d := pg_get_functiondef('tpp.accion(uuid,text)'::regprocedure);
  o := d;
  d := replace(d, E'round((array[18, 26, 34, 42, 50])[q_c] * coalesce((tpp.datos_variedad(p_uid, p.variedad) ->> ''recompensa'')::double precision, 1)',
    E'round((array[0.55, 0.8, 1, 1.2, 1.4])[q_c] * coalesce((tpp.datos_variedad(p_uid, p.variedad) ->> ''gramos'')::double precision, 34 * coalesce((tpp.datos_variedad(p_uid, p.variedad) ->> ''recompensa'')::double precision, 1))');
  if d = o then raise exception 'accion no cambia'; end if;
  execute d;

  d := pg_get_functiondef('tpp.vender_gramos(uuid,text,integer)'::regprocedure);
  o := d;
  d := replace(d, E'pg double precision := 6 * coalesce((tpp.variedades() -> p_variedad ->> ''recompensa'')::double precision, 1);',
    E'pg double precision := coalesce((tpp.variedades() -> p_variedad ->> ''gramo'')::double precision, 6 * coalesce((tpp.variedades() -> p_variedad ->> ''recompensa'')::double precision, 1));');
  if d = o then raise exception 'vender_gramos no cambia'; end if;
  execute d;
end
$mig$;

-- Plantas vivas: pasan de la escala de 72 h a la nueva (misma fracción del ciclo).
update tpp.plantas p set horas_vividas = horas_vividas / 7.2 where estado = 'viva';

-- Las semillas regaladas (fem/autofem ya consumidas) no pagan el precio de la semilla.
do $mig$ declare d text; o text; begin
  d := pg_get_functiondef('tpp.plantar(uuid,text,text)'::regprocedure); o := d;
  d := replace(d, E'  if not coalesce((v ->> ''hibrida'')::boolean, false) then', E'  if not coalesce((v ->> ''hibrida'')::boolean, false) and not (coste = 0 and p_tipo <> ''foto'') then');
  if d = o then raise exception 'plantar no cambia'; end if;
  execute d;
end $mig$;
