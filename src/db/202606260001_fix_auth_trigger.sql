-- Migration: 202606260001_fix_auth_trigger.sql
-- Description: Drop and recreate auth trigger and handle_new_user function with defensive logging, security definer, explicit search_path, and upsert logic.

-- Drop existing trigger and function defensively
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate function with explicit search_path, security definer, and exception handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_role public.user_role;
  v_full_name TEXT;
  v_email TEXT;
BEGIN
  v_email := COALESCE(new.email, '');

  BEGIN
    -- Extract variables from user metadata or fallback
    IF new.raw_user_meta_data IS NOT NULL THEN
      -- Handle company_id extraction
      IF (new.raw_user_meta_data->>'company_id') IS NOT NULL AND (new.raw_user_meta_data->>'company_id') <> '' THEN
        v_company_id := (new.raw_user_meta_data->>'company_id')::uuid;
      ELSE
        v_company_id := NULL;
      END IF;

      -- Handle role extraction
      IF (new.raw_user_meta_data->>'role') IS NOT NULL AND (new.raw_user_meta_data->>'role') <> '' THEN
        v_role := (new.raw_user_meta_data->>'role')::public.user_role;
      ELSE
        v_role := 'sales_executive'::public.user_role;
      END IF;

      -- Handle full_name extraction
      v_full_name := COALESCE(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        'New Executive'
      );
    ELSE
      v_company_id := NULL;
      v_role := 'sales_executive'::public.user_role;
      v_full_name := 'New Executive';
    END IF;

    -- Default company fallback: if company doesn't exist/not supplied, link to our seeded first company
    IF v_company_id IS NULL THEN
      SELECT id INTO v_company_id FROM public.companies ORDER BY created_at ASC LIMIT 1;
    END IF;

    -- Standard UPSERT into profiles
    INSERT INTO public.profiles (
      id,
      company_id,
      full_name,
      phone,
      email,
      role,
      is_active,
      avatar_url,
      created_at,
      updated_at
    )
    VALUES (
      new.id,
      v_company_id,
      v_full_name,
      new.phone,
      v_email,
      v_role,
      TRUE,
      CASE WHEN new.raw_user_meta_data IS NOT NULL THEN new.raw_user_meta_data->>'avatar_url' ELSE NULL END,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      company_id = EXCLUDED.company_id,
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      updated_at = NOW();

  EXCEPTION WHEN OTHERS THEN
    -- RAISE LOG with detailed context
    RAISE LOG 'Exception in handle_new_user for User ID: %, Company ID: %, Role: %, Email: %. Error: %',
      new.id,
      v_company_id,
      v_role,
      v_email,
      SQLERRM;
    -- Rethrow the exception
    RAISE;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
