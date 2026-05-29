
-- 1. Move phone out of public profiles into owner-only table
CREATE TABLE public.profile_contacts (
  user_id uuid PRIMARY KEY,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_contacts TO authenticated;
GRANT ALL ON public.profile_contacts TO service_role;
ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts self read" ON public.profile_contacts
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "contacts self upsert" ON public.profile_contacts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "contacts self update" ON public.profile_contacts
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Backfill existing phone numbers
INSERT INTO public.profile_contacts (user_id, phone)
SELECT id, phone FROM public.profiles WHERE phone IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.profiles DROP COLUMN phone;

-- Update signup trigger to write phone to new table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name')
  ON CONFLICT (id) DO NOTHING;

  IF (NEW.raw_user_meta_data->>'phone') IS NOT NULL THEN
    INSERT INTO public.profile_contacts (user_id, phone)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'phone')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'CUSTOMER'))
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Move bank details out of public providers into owner+admin-only table
CREATE TABLE public.provider_payouts (
  provider_id uuid PRIMARY KEY,
  bank_account_number text,
  bank_ifsc text,
  bank_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_payouts TO authenticated;
GRANT ALL ON public.provider_payouts TO service_role;
ALTER TABLE public.provider_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts self read" ON public.provider_payouts
  FOR SELECT TO authenticated USING (provider_id = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "payouts self insert" ON public.provider_payouts
  FOR INSERT TO authenticated WITH CHECK (provider_id = auth.uid());
CREATE POLICY "payouts self update" ON public.provider_payouts
  FOR UPDATE TO authenticated USING (provider_id = auth.uid()) WITH CHECK (provider_id = auth.uid());
CREATE POLICY "payouts admin manage" ON public.provider_payouts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN')) WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

INSERT INTO public.provider_payouts (provider_id, bank_account_number, bank_ifsc, bank_name)
SELECT id, bank_account_number, bank_ifsc, bank_name FROM public.providers
WHERE bank_account_number IS NOT NULL OR bank_ifsc IS NOT NULL OR bank_name IS NOT NULL
ON CONFLICT (provider_id) DO NOTHING;

ALTER TABLE public.providers
  DROP COLUMN bank_account_number,
  DROP COLUMN bank_ifsc,
  DROP COLUMN bank_name;

-- 3. Restrict coupons reads to authenticated users only
DROP POLICY IF EXISTS "coupons public read active" ON public.coupons;
REVOKE SELECT ON public.coupons FROM anon;
CREATE POLICY "coupons authenticated read active" ON public.coupons
  FOR SELECT TO authenticated USING (is_active);

-- 4. Lock down payments: explicit admin-only UPDATE/DELETE
CREATE POLICY "payments admin update" ON public.payments
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "payments admin delete" ON public.payments
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
