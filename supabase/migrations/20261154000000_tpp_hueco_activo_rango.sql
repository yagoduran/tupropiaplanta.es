-- El hueco activo ya puede ser el de cualquier habitación de la casa (hasta 99; el 9 sigue siendo el del desafío).
-- Para deshacer: volver a poner el rango de 1 a 9 (solo si ninguna planta está fuera de él).

alter table tpp.perfiles drop constraint perfiles_hueco_activo_check;
alter table tpp.perfiles add constraint perfiles_hueco_activo_check check (hueco_activo >= 1 and hueco_activo <= 99);
