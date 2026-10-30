-- Sin ciclo de luz configurable: todos los jugadores vuelven al horario por defecto (18 h de luz desde las 6).
update tpp.perfiles set luz_horas = 18, luz_inicio = 6 where luz_horas <> 18 or luz_inicio <> 6;
