-- ==========================================
-- Schema inicial do MY GYM
-- Idempotente: seguro rodar tanto em projeto novo quanto em projeto
-- onde esse schema já foi criado manualmente pelo SQL Editor.
-- ==========================================

-- 1. Divisões de Treino (Workout Divisions)
CREATE TABLE IF NOT EXISTS public.workout_divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  frequency INTEGER NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workout_divisions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_divisions' AND policyname = 'Usuários gerenciam suas próprias divisões'
  ) THEN
    CREATE POLICY "Usuários gerenciam suas próprias divisões" ON public.workout_divisions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 2. Separações (Workout Splits)
CREATE TABLE IF NOT EXISTS public.workout_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES public.workout_divisions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL
);

ALTER TABLE public.workout_splits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_splits' AND policyname = 'Usuários gerenciam seus próprios splits'
  ) THEN
    CREATE POLICY "Usuários gerenciam seus próprios splits" ON public.workout_splits FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Exercícios (Exercises)
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID REFERENCES public.workout_splits(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  muscle_group TEXT,
  rest_time INTEGER DEFAULT 90,
  target_sets INTEGER DEFAULT 3,
  rep_range TEXT,
  description TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exercises' AND policyname = 'Usuários gerenciam seus próprios exercícios'
  ) THEN
    CREATE POLICY "Usuários gerenciam seus próprios exercícios" ON public.exercises FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Histórico de Treinos (Workout Logs)
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id TEXT NOT NULL,
  split_id UUID REFERENCES public.workout_splits(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  weight NUMERIC NOT NULL,
  reps INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL
);

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_logs' AND policyname = 'Usuários gerenciam seus próprios logs'
  ) THEN
    CREATE POLICY "Usuários gerenciam seus próprios logs" ON public.workout_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 5. Perfis (Profiles) com XP e Streak
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT,
  xp INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  last_workout_date DATE
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Perfil próprio'
  ) THEN
    CREATE POLICY "Perfil próprio" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 6. Conquistas (Achievements)
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  seen BOOLEAN DEFAULT false,
  UNIQUE(user_id, achievement_key)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'achievements' AND policyname = 'Conquistas próprias'
  ) THEN
    CREATE POLICY "Conquistas próprias" ON public.achievements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 7. Configurações do Usuário (Config)
CREATE TABLE IF NOT EXISTS public.config (
  pkconfig SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  value BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, name)
);

ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'config' AND policyname = 'Config própria'
  ) THEN
    CREATE POLICY "Config própria" ON public.config FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
