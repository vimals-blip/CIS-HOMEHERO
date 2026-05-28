
-- Enums
CREATE TYPE public.app_role AS ENUM ('CUSTOMER', 'PROVIDER', 'ADMIN');
CREATE TYPE public.provider_status AS ENUM ('ONLINE', 'OFFLINE', 'BUSY');
CREATE TYPE public.doc_type AS ENUM ('AADHAAR', 'PAN', 'BANK');
CREATE TYPE public.doc_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE public.booking_status AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE public.payment_status AS ENUM ('CREATED', 'PAID', 'REFUNDED');
CREATE TYPE public.txn_type AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE public.coupon_type AS ENUM ('FLAT', 'PERCENT');

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  phone text,
  avatar_url text,
  city text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles (separate table)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Admin policy for user_roles
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN')) WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- Providers
CREATE TABLE public.providers (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio text,
  experience_years int DEFAULT 0,
  hourly_rate numeric(10,2) DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  status public.provider_status NOT NULL DEFAULT 'OFFLINE',
  avg_rating numeric(3,2) DEFAULT 0,
  review_count int NOT NULL DEFAULT 0,
  bank_account_number text,
  bank_ifsc text,
  bank_name text,
  pin_codes text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.providers TO authenticated;
GRANT SELECT ON public.providers TO anon;
GRANT ALL ON public.providers TO service_role;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "providers public read" ON public.providers FOR SELECT USING (true);
CREATE POLICY "providers self insert" ON public.providers FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "providers self update" ON public.providers FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "admins manage providers" ON public.providers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'ADMIN')) WITH CHECK (public.has_role(auth.uid(),'ADMIN'));

-- Provider documents
CREATE TABLE public.provider_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  type public.doc_type NOT NULL,
  file_url text NOT NULL,
  status public.doc_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.provider_documents TO authenticated;
GRANT ALL ON public.provider_documents TO service_role;
ALTER TABLE public.provider_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "provider sees own docs" ON public.provider_documents FOR SELECT TO authenticated
  USING (provider_id = auth.uid() OR public.has_role(auth.uid(),'ADMIN'));
CREATE POLICY "provider inserts own docs" ON public.provider_documents FOR INSERT TO authenticated
  WITH CHECK (provider_id = auth.uid());
CREATE POLICY "admin updates docs" ON public.provider_documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'ADMIN'));

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon_name text,
  base_price numeric(10,2) NOT NULL DEFAULT 0,
  commission_pct numeric(5,2) NOT NULL DEFAULT 15,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'ADMIN')) WITH CHECK (public.has_role(auth.uid(),'ADMIN'));

-- Provider categories
CREATE TABLE public.provider_categories (
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  custom_price numeric(10,2),
  PRIMARY KEY (provider_id, category_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_categories TO authenticated;
GRANT SELECT ON public.provider_categories TO anon;
GRANT ALL ON public.provider_categories TO service_role;
ALTER TABLE public.provider_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pc public read" ON public.provider_categories FOR SELECT USING (true);
CREATE POLICY "pc self manage" ON public.provider_categories FOR ALL TO authenticated
  USING (provider_id = auth.uid()) WITH CHECK (provider_id = auth.uid());

-- Availability
CREATE TABLE public.availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  day_of_week int NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_slots TO authenticated;
GRANT SELECT ON public.availability_slots TO anon;
GRANT ALL ON public.availability_slots TO service_role;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slots public read" ON public.availability_slots FOR SELECT USING (true);
CREATE POLICY "slots self manage" ON public.availability_slots FOR ALL TO authenticated
  USING (provider_id = auth.uid()) WITH CHECK (provider_id = auth.uid());

-- Bookings
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id),
  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'PENDING',
  address text NOT NULL,
  lat numeric, lng numeric,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  platform_fee numeric(10,2) NOT NULL DEFAULT 0,
  provider_amount numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  coupon_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings parties read" ON public.bookings FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR provider_id = auth.uid() OR public.has_role(auth.uid(),'ADMIN'));
CREATE POLICY "customer creates booking" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());
CREATE POLICY "parties update booking" ON public.bookings FOR UPDATE TO authenticated
  USING (customer_id = auth.uid() OR provider_id = auth.uid() OR public.has_role(auth.uid(),'ADMIN'));

-- Payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  razorpay_order_id text,
  razorpay_payment_id text,
  amount numeric(10,2) NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'CREATED',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments parties read" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id
    AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid() OR public.has_role(auth.uid(),'ADMIN'))));
CREATE POLICY "payments customer insert" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid()));

-- Transactions
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  type public.txn_type NOT NULL,
  amount numeric(10,2) NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "txn self read" ON public.transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'ADMIN'));

-- Provider wallet
CREATE TABLE public.provider_wallet (
  provider_id uuid PRIMARY KEY REFERENCES public.providers(id) ON DELETE CASCADE,
  pending_balance numeric(10,2) NOT NULL DEFAULT 0,
  available_balance numeric(10,2) NOT NULL DEFAULT 0,
  total_earned numeric(10,2) NOT NULL DEFAULT 0
);
GRANT SELECT ON public.provider_wallet TO authenticated;
GRANT ALL ON public.provider_wallet TO service_role;
ALTER TABLE public.provider_wallet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet self read" ON public.provider_wallet FOR SELECT TO authenticated
  USING (provider_id = auth.uid() OR public.has_role(auth.uid(),'ADMIN'));

-- Reviews
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  provider_reply text,
  is_flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT USING (NOT is_flagged);
CREATE POLICY "customer writes review" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());
CREATE POLICY "provider replies" ON public.reviews FOR UPDATE TO authenticated
  USING (provider_id = auth.uid() OR public.has_role(auth.uid(),'ADMIN'));

-- Coupons
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type public.coupon_type NOT NULL,
  value numeric(10,2) NOT NULL,
  max_uses int,
  used_count int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons public read active" ON public.coupons FOR SELECT USING (is_active);
CREATE POLICY "admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'ADMIN')) WITH CHECK (public.has_role(auth.uid(),'ADMIN'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;

  -- Assign role from metadata (default CUSTOMER)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'CUSTOMER'))
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed categories
INSERT INTO public.categories (name, icon_name, base_price) VALUES
  ('Cleaning', 'Sparkles', 299),
  ('Plumbing', 'Wrench', 399),
  ('Electrician', 'Zap', 449),
  ('Carpentry', 'Hammer', 499),
  ('Painting', 'PaintBucket', 1999),
  ('AC Repair', 'AirVent', 599)
ON CONFLICT (name) DO NOTHING;
