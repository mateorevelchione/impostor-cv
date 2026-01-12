-- Tabla para almacenar el contador de partidos
CREATE TABLE IF NOT EXISTS castelar_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_matches INTEGER NOT NULL DEFAULT 0,
  initial_match_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para registrar cada partido con su fecha
CREATE TABLE IF NOT EXISTS castelar_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  match_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  winning_team TEXT[] NOT NULL,
  losing_team TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para filtrar por año
CREATE INDEX IF NOT EXISTS idx_castelar_matches_year ON castelar_matches(year);
CREATE INDEX IF NOT EXISTS idx_castelar_matches_date ON castelar_matches(match_date);

-- Habilitar RLS (Row Level Security)
ALTER TABLE castelar_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE castelar_matches ENABLE ROW LEVEL SECURITY;

-- Políticas para castelar_config (permitir lectura y escritura para anon)
CREATE POLICY "Allow anon to read castelar_config" ON castelar_config
  FOR SELECT USING (true);

CREATE POLICY "Allow anon to insert castelar_config" ON castelar_config
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon to update castelar_config" ON castelar_config
  FOR UPDATE USING (true);

-- Políticas para castelar_matches (permitir lectura y escritura para anon)
CREATE POLICY "Allow anon to read castelar_matches" ON castelar_matches
  FOR SELECT USING (true);

CREATE POLICY "Allow anon to insert castelar_matches" ON castelar_matches
  FOR INSERT WITH CHECK (true);
