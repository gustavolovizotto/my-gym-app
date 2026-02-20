-- 1. Tabela de Divisões de Treino (Workout Divisions)
CREATE TABLE IF NOT EXISTS public.workout_divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- ex: PPL
  frequency INTEGER NOT NULL, -- ex: 3 (dias na semana)
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workout_divisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários gerenciam suas próprias divisões" ON public.workout_divisions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Tabela de Separações (Workout Splits)
CREATE TABLE IF NOT EXISTS public.workout_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES public.workout_divisions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- ex: Push, Pull, Legs
  order_index INTEGER NOT NULL, -- 1, 2, 3
  user_id UUID REFERENCES auth.users(id) NOT NULL
);

ALTER TABLE public.workout_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários gerenciam seus próprios splits" ON public.workout_splits FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Tabela de Exercícios (Exercises)
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID REFERENCES public.workout_splits(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  muscle_group TEXT,
  rest_time INTEGER DEFAULT 90, -- Tempo de descanso em segundos
  target_sets INTEGER DEFAULT 3, -- Quantidade de séries alvo
  user_id UUID REFERENCES auth.users(id) NOT NULL
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários gerenciam seus próprios exercícios" ON public.exercises FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Tabela de Histórico de Treinos (Workout Logs)
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id TEXT NOT NULL, -- ID da sessão de treino
  split_id UUID REFERENCES public.workout_splits(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  weight NUMERIC NOT NULL,
  reps INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL
);

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários gerenciam seus próprios logs" ON public.workout_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- MIGRATIONS / ATUALIZAÇÕES
-- ==========================================
-- Se você já havia criado a tabela `exercises` antes, rode os comandos abaixo 
-- no SQL Editor do Supabase para adicionar as novas colunas sem perder os dados:

-- ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS rest_time INTEGER DEFAULT 90;
-- ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS target_sets INTEGER DEFAULT 3;
