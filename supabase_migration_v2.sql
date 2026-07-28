-- ==========================================
-- MIGRATION V2 — Constraints, índices e colunas faltando
-- ==========================================
-- ANTES de aplicar, rode esta query para verificar dados inválidos:
-- SELECT id, weight, reps FROM public.workout_logs WHERE weight <= 0 OR reps <= 0;
-- Se retornar linhas, corrija-as antes de adicionar as constraints.
-- ==========================================

-- 1. Colunas faltando em `exercises` (presentes no Dexie mas ausentes no Supabase)
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS target_reps INTEGER,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. CHECK constraints em workout_logs para impedir dados fisicamente inválidos
ALTER TABLE public.workout_logs
  ADD CONSTRAINT workout_logs_weight_positive CHECK (weight > 0),
  ADD CONSTRAINT workout_logs_reps_positive   CHECK (reps > 0);

-- 3. Índices para as queries mais frequentes
--    (Supabase cria índice automático em PKs e FKs declaradas, mas não em colunas usadas em WHERE/ORDER BY)

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
