-- Script para insertar un partido manualmente
-- USO: Reemplazá los valores entre < > con tus datos reales
-- 
-- Ejemplo:
-- Si el partido #1 fue el 15 de enero de 2025, y ganaron los jugadores con IDs 'abc123' y 'def456'
-- y perdieron 'ghi789' y 'jkl012', ejecutá esto:

-- IMPORTANTE: Necesitás los IDs reales de los jugadores de la tabla castelar_players
-- Para ver los IDs de los jugadores, ejecutá primero:
-- SELECT id, name FROM castelar_players ORDER BY name;

-- Ejemplo de inserción manual de un partido:
/*
INSERT INTO castelar_matches (
  match_date,
  match_number,
  year,
  winning_team,
  losing_team
) VALUES (
  '2025-01-15 20:00:00+00'::timestamptz,  -- Fecha del partido (ajustá según corresponda)
  1,                                        -- Número de partido
  2025,                                     -- Año
  ARRAY['id-jugador-1', 'id-jugador-2'],   -- IDs de los ganadores (reemplazá con IDs reales)
  ARRAY['id-jugador-3', 'id-jugador-4']    -- IDs de los perdedores (reemplazá con IDs reales)
);
*/

-- Para insertar múltiples partidos de 2025, podés hacer algo así:
-- (Ajustá las fechas, números y IDs según tus partidos reales)

/*
-- Partido 1
INSERT INTO castelar_matches (match_date, match_number, year, winning_team, losing_team)
VALUES ('2025-01-15 20:00:00+00'::timestamptz, 1, 2025, 
        ARRAY['id-ganador-1', 'id-ganador-2'], 
        ARRAY['id-perdedor-1', 'id-perdedor-2']);

-- Partido 2
INSERT INTO castelar_matches (match_date, match_number, year, winning_team, losing_team)
VALUES ('2025-01-22 20:00:00+00'::timestamptz, 2, 2025, 
        ARRAY['id-ganador-1', 'id-ganador-2'], 
        ARRAY['id-perdedor-1', 'id-perdedor-2']);

-- ... y así sucesivamente
*/

-- IMPORTANTE: 
-- 1. Primero ejecutá esto para ver los IDs de tus jugadores:
SELECT id, name FROM castelar_players ORDER BY name;

-- 2. Luego, insertá los partidos usando los IDs reales de arriba
-- 3. Ajustá las fechas y números de partido según corresponda
