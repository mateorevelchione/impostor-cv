-- Script para verificar el estado de la tabla castelar_matches
-- Ejecutá esto en el SQL Editor de Supabase para ver qué hay

-- Ver todos los partidos registrados
SELECT 
  id, 
  match_date, 
  match_number, 
  year, 
  winning_team, 
  losing_team,
  created_at
FROM castelar_matches 
ORDER BY match_date DESC;

-- Contar cuántos partidos hay
SELECT COUNT(*) as total_matches FROM castelar_matches;

-- Ver la estructura de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'castelar_matches'
ORDER BY ordinal_position;

-- Verificar las políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'castelar_matches';
