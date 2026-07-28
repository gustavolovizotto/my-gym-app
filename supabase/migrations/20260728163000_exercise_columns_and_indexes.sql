-- ==========================================
-- Colunas faltando em `exercises` e índices/constraints de performance e integridade
-- Idempotente: seguro rodar mesmo que parte disso já exista no banco.
-- ==========================================

-- 1. Colunas usadas pelo app (Dexie/frontend) mas que podem faltar no Supabase
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS target_reps INTEGER,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT;

-- 2. CHECK constraints em workout_logs para impedir dados fisicamente inválidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workout_logs_weight_positive'
  ) THEN
    ALTER TABLE public.workout_logs
      ADD CONSTRAINT workout_logs_weight_positive CHECK (weight > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workout_logs_reps_positive'
  ) THEN
    ALTER TABLE public.workout_logs
      ADD CONSTRAINT workout_logs_reps_positive CHECK (reps > 0);
  END IF;
END $$;

-- 3. Índices para as queries mais frequentes
-- Histórico por usuário ordenado por data (history/page.tsx, evolution/page.tsx)
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_timestamp
  ON public.workout_logs(user_id, timestamp DESC);

-- Lookup de logs por exercício (ExerciseCard useLiveQuery, evolution/page.tsx)
CREATE INDEX IF NOT EXISTS idx_workout_logs_exercise
  ON public.workout_logs(exercise_id);

-- Lookup de splits por divisão (workout/page.tsx TodayWorkoutSelection)
CREATE INDEX IF NOT EXISTS idx_workout_splits_division
  ON public.workout_splits(division_id);

-- Lookup de exercícios por split (division/[id]/page.tsx, workout/page.tsx)
CREATE INDEX IF NOT EXISTS idx_exercises_split
  ON public.exercises(split_id);
