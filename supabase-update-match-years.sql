-- Script para actualizar los años de los partidos existentes
-- Todos los partidos anteriores al último serán de 2025
-- El último partido será de 2026

-- Primero, actualizar todos los partidos al año 2025
UPDATE castelar_matches
SET year = 2025
WHERE match_date < (SELECT MAX(match_date) FROM castelar_matches);

-- Luego, actualizar el último partido (el más reciente) a 2026
UPDATE castelar_matches
SET year = 2026
WHERE match_date = (SELECT MAX(match_date) FROM castelar_matches);

-- Si querés verificar los resultados, ejecutá esto:
-- SELECT id, match_date, match_number, year, winning_team, losing_team 
-- FROM castelar_matches 
-- ORDER BY match_date ASC;
