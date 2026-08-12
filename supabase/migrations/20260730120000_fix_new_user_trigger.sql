-- ==========================================
-- Corrige o erro "Database error saving new user" no signUp.
--
-- Causa: a função handle_new_user() (trigger AFTER INSERT ON
-- auth.users, criada manualmente no SQL Editor antes de existirem
-- migrations neste projeto) não inseria a coluna `email` em
-- public.profiles, que é NOT NULL sem default. Todo cadastro
-- falhava com "null value in column email violates not-null
-- constraint", que o Supabase Auth reporta como
-- {"code":"unexpected_failure","message":"Database error saving new user"}.
--
-- Esta migration também traz para o controle de versão colunas de
-- `profiles` que já existiam no banco real mas nunca foram
-- rastreadas aqui (idempotente: seguro rodar tanto em banco novo
-- quanto no banco real já existente).
-- ==========================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS push_subscription JSONB,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'athlete';

-- Backfill defensivo antes de aplicar NOT NULL (no-op se a coluna já
-- existia populada, como no banco real).
UPDATE public.profiles SET email = '' WHERE email IS NULL;
ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  BEGIN
    INSERT INTO public.profiles (id, email, name, date_of_birth, role)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data ->> 'name',
      NULLIF(NEW.raw_user_meta_data ->> 'date_of_birth', '')::date,
      COALESCE(NEW.raw_user_meta_data ->> 'role', 'athlete')
    )
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email,
          name = EXCLUDED.name,
          date_of_birth = EXCLUDED.date_of_birth,
          role = EXCLUDED.role;
    RETURN NEW;
  END;
  $function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
