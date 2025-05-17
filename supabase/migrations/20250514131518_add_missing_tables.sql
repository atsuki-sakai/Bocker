CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Create salon table
CREATE TABLE IF NOT EXISTS salon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT NOT NULL DEFAULT auth.jwt()->>'sub',
  stripe_connect_id TEXT,
  stripe_connect_status TEXT,
  stripe_connect_created_at BIGINT,
  stripe_customer_id TEXT,
  email TEXT,
  subscription_id TEXT,
  subscription_status TEXT,
  plan_name TEXT,
  price_id TEXT,
  billing_period TEXT CHECK (billing_period IN ('monthly', 'yearly')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_salon_clerk_id ON salon(clerk_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_salon_stripe_connect_id ON salon(stripe_connect_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_salon_stripe_customer_id ON salon(stripe_customer_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_salon_email ON salon(email) WHERE NOT is_archive;

-- Enable RLS (Row Level Security)
ALTER TABLE salon ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can view their own data" ON salon
  FOR SELECT USING ((auth.jwt()->>'sub') = salon.clerk_id);

CREATE POLICY "Enable public read" ON salon
  FOR SELECT
  USING (true);

-- Create policies
DROP POLICY IF EXISTS "Enable read access for authenticated salon" ON salon;
CREATE POLICY "Enable read access for authenticated salon" ON salon
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON salon;
CREATE POLICY "Enable insert for authenticated users" ON salon
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable update for salon owners" ON salon;

-- Create customer table
CREATE TABLE IF NOT EXISTS customer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  line_id TEXT,
  line_user_name TEXT,
  phone TEXT,
  email TEXT,
  password TEXT,
  first_name TEXT,
  last_name TEXT,
  searchble_text TEXT,
  use_count INTEGER,
  last_reservation_date_unix BIGINT,
  tags TEXT[],
  initial_tracking JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_salon_id ON customer(salon_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_customer_salon_line_id ON customer(salon_id, line_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_customer_salon_phone ON customer(salon_id, phone) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_customer_salon_email ON customer(salon_id, email) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_customer_salon_searchble_text ON customer(salon_id, searchble_text) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_customer_salon_line_user_name ON customer(salon_id, line_user_name) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE customer ENABLE ROW LEVEL SECURITY;

-- Full text search index (simple)
CREATE INDEX IF NOT EXISTS idx_customer_searchble_text_fts ON customer USING gin(to_tsvector('simple', searchble_text));

-- Create subscription table
CREATE TABLE IF NOT EXISTS subscription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  subscription_id TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  price_id TEXT,
  plan_name TEXT,
  billing_period TEXT CHECK (billing_period IN ('monthly', 'yearly')),
  current_period_end BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscription_subscription_id ON subscription(subscription_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_subscription_stripe_customer_id ON subscription(stripe_customer_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_subscription_salon_id ON subscription(salon_id) WHERE NOT is_archive;

-- Enable RLS (Row Level Security)
ALTER TABLE subscription ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON subscription
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for authenticated users" ON subscription
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for subscription owners" ON subscription
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create salon_option table
CREATE TABLE IF NOT EXISTS salon_option (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  name TEXT NOT NULL,
  unit_price DOUBLE PRECISION,
  sale_price DOUBLE PRECISION,
  order_limit INTEGER,
  in_stock INTEGER,
  time_to_min INTEGER,
  tags TEXT[],
  description TEXT,
  img_path TEXT,
  thumbnail_path TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_salon_option_salon_id ON salon_option(salon_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_salon_option_salon_id_name ON salon_option(salon_id, name) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE salon_option ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON salon_option
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for salon owners" ON salon_option
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for salon owners" ON salon_option
  FOR UPDATE USING (true);

-- Create salon_api_config table
CREATE TABLE IF NOT EXISTS salon_api_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  line_access_token TEXT,
  line_channel_secret TEXT,
  liff_id TEXT,
  line_channel_id TEXT,
  destination_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_salon_api_config_salon_id ON salon_api_config(salon_id) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE salon_api_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON salon_api_config
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for salon owners" ON salon_api_config
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for salon owners" ON salon_api_config
  FOR UPDATE USING (true);

-- Create salon_config table
CREATE TABLE IF NOT EXISTS salon_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  salon_name TEXT,
  email TEXT,
  phone TEXT,
  postal_code TEXT,
  address TEXT,
  reservation_rules TEXT,
  img_path TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_salon_config_salon_id ON salon_config(salon_id) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE salon_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON salon_config
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for salon owners" ON salon_config
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for salon owners" ON salon_config
  FOR UPDATE USING (true);

-- Create salon_schedule_config table
CREATE TABLE IF NOT EXISTS salon_schedule_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  available_sheet INTEGER,
  reservation_limit_days INTEGER,
  available_cancel_days INTEGER,
  today_first_later_minutes INTEGER,
  reservation_interval_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_salon_schedule_config_salon_id ON salon_schedule_config(salon_id) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE salon_schedule_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON salon_schedule_config
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for salon owners" ON salon_schedule_config
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for salon owners" ON salon_schedule_config
  FOR UPDATE USING (true);

-- Create salon_referral table
CREATE TABLE IF NOT EXISTS salon_referral (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  referral_code TEXT,
  referral_count INTEGER,
  updated_at_unix BIGINT,
  total_referral_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_salon_referral_referral_count ON salon_referral(referral_count) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_salon_referral_salon_id ON salon_referral(salon_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_salon_referral_referral_code ON salon_referral(referral_code) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_salon_referral_total_referral_count ON salon_referral(total_referral_count) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_salon_referral_updated_at_unix ON salon_referral(updated_at_unix) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_salon_referral_referral_and_total_count ON salon_referral(referral_count, total_referral_count) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE salon_referral ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Enable read for authenticated users" ON salon_referral;
DROP POLICY IF EXISTS "Enable insert for salon owners" ON salon_referral;
DROP POLICY IF EXISTS "Enable update for salon owners" ON salon_referral;
DROP POLICY IF EXISTS "Enable delete for salon owners" ON salon_referral;

-- 全ユーザー許可のポリシーを追加
CREATE POLICY "Enable read for all users" ON salon_referral
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Enable insert for all users" ON salon_referral
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON salon_referral
  FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Enable delete for all users" ON salon_referral
  FOR DELETE TO anon, authenticated USING (true);

-- Customer policies (Ensure these are the final and correct versions)
DROP POLICY IF EXISTS "Enable read for authenticated users" ON customer;
CREATE POLICY "Enable read for all users" ON customer
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for salon owners" ON customer;
CREATE POLICY "Enable insert for all users" ON customer
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for salon owners" ON customer;
CREATE POLICY "Enable update for all users" ON customer
  FOR UPDATE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Enable delete for salon owners" ON customer;
CREATE POLICY "Enable delete for all users" ON customer
  FOR DELETE TO anon, authenticated USING (true);

-- This policy might be too broad, consider if it's truly needed or if specific owner policies are enough.
-- CREATE POLICY "Enable update for authenticated users" ON customer
--   FOR UPDATE USING (auth.uid() IS NOT NULL); 

-- Create salon_week_schedule table
CREATE TABLE IF NOT EXISTS salon_week_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  is_open BOOLEAN,
  day_of_week TEXT CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_hour TEXT, -- HH:MM format
  end_hour TEXT, -- HH:MM format
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_salon_week_schedule_salon_id ON salon_week_schedule(salon_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_salon_week_schedule_salon_week_is_open_day_of_week ON salon_week_schedule(salon_id, day_of_week, is_open) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE salon_week_schedule ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON salon_week_schedule
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable insert for salon owners" ON salon_week_schedule
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM salon WHERE id = salon_week_schedule.salon_id /* AND ここに認証条件を記述してください */));
CREATE POLICY "Enable update for salon owners" ON salon_week_schedule
  FOR UPDATE USING (EXISTS (SELECT 1 FROM salon WHERE id = salon_week_schedule.salon_id /* AND ここに認証条件を記述してください */));

-- Create salon_schedule_exception table
CREATE TABLE IF NOT EXISTS salon_schedule_exception (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  type TEXT CHECK (type IN ('holiday', 'shortened_hours', 'temporary_closure')),
  date TEXT NOT NULL, -- YYYY-MM-DD format
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_salon_schedule_exception_salon_id ON salon_schedule_exception(salon_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_salon_schedule_exception_salon_date ON salon_schedule_exception(salon_id, date) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_salon_schedule_exception_salon_date_type ON salon_schedule_exception(salon_id, date, type) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_salon_schedule_exception_salon_type ON salon_schedule_exception(salon_id, type) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE salon_schedule_exception ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON salon_schedule_exception
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable insert for salon owners" ON salon_schedule_exception
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM salon WHERE id = salon_schedule_exception.salon_id /* AND ここに認証条件を記述してください */));
CREATE POLICY "Enable update for salon owners" ON salon_schedule_exception
  FOR UPDATE USING (EXISTS (SELECT 1 FROM salon WHERE id = salon_schedule_exception.salon_id /* AND ここに認証条件を記述してください */));

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  name TEXT,
  age INTEGER,
  email TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'unknown')),
  instagram_link TEXT,
  description TEXT,
  img_path TEXT,
  thumbnail_path TEXT,
  tags TEXT[],
  featured_hairimg_path TEXT[],
  is_active BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_salon_id_is_active ON staff(salon_id, is_active) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_staff_name_is_active ON staff(name, is_active) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_staff_email_is_active ON staff(email, is_active) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_staff_salon_id_name_is_active ON staff(salon_id, name, is_active) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_staff_salon_id_email_is_active ON staff(salon_id, email, is_active) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON staff
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners" ON staff
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM salon WHERE id = staff.salon_id /* AND ここに認証条件を記述してください */));
CREATE POLICY "Enable update for salon owners" ON staff
  FOR UPDATE USING (EXISTS (SELECT 1 FROM salon WHERE id = staff.salon_id /* AND ここに認証条件を記述してください */));

-- Create staff_week_schedule table
CREATE TABLE IF NOT EXISTS staff_week_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  salon_id UUID NOT NULL REFERENCES salon(id),
  is_open BOOLEAN,
  day_of_week TEXT CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_hour TEXT, -- HH:MM format
  end_hour TEXT, -- HH:MM format
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_week_schedule_salon_staff_week_is_open ON staff_week_schedule(salon_id, staff_id, day_of_week, is_open) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_staff_week_schedule_staff_id ON staff_week_schedule(staff_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_staff_week_schedule_salon_id_staff_id_day_of_week ON staff_week_schedule(salon_id, staff_id, day_of_week) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_staff_week_schedule_salon_id_staff_id ON staff_week_schedule(salon_id, staff_id) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE staff_week_schedule ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON staff_week_schedule
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners or staff themselves" ON staff_week_schedule
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM salon WHERE id = staff_week_schedule.salon_id /* AND ここにサロンオーナー向けの認証条件を記述してください */) OR
    EXISTS (SELECT 1 FROM staff WHERE id = staff_week_schedule.staff_id /* AND ここにスタッフ本人向けの認証条件を記述してください. 例: staff.clerk_clerk_id = get_clerk_clerk_id_from_request() */)
  );
CREATE POLICY "Enable update for salon owners or staff themselves" ON staff_week_schedule
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM salon WHERE id = staff_week_schedule.salon_id /* AND ここにサロンオーナー向けの認証条件を記述してください */) OR
    EXISTS (SELECT 1 FROM staff WHERE id = staff_week_schedule.staff_id /* AND ここにスタッフ本人向けの認証条件を記述してください */)
  );

-- Create staff_schedule table
CREATE TABLE IF NOT EXISTS staff_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  salon_id UUID NOT NULL REFERENCES salon(id),
  date TEXT, -- YYYY-MM-DD format
  start_time_unix BIGINT,
  end_time_unix BIGINT,
  notes TEXT,
  type TEXT CHECK (type IN ('holiday')), -- staffScheduleType, currently only 'holiday'
  is_all_day BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_schedule_staff_id ON staff_schedule(staff_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_staff_schedule_salon_staff_id ON staff_schedule(salon_id, staff_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_staff_schedule_salon_staff_date ON staff_schedule(salon_id, staff_id, date) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_staff_schedule_salon_staff_date_type ON staff_schedule(salon_id, staff_id, date, type) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_staff_schedule_staff_start_end ON staff_schedule(staff_id, start_time_unix, end_time_unix) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_staff_schedule_salon_staff_all_day ON staff_schedule(salon_id, staff_id, is_all_day) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_staff_schedule_salon_data_start_end ON staff_schedule(salon_id, date, start_time_unix, end_time_unix) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_staff_schedule_salon_staff_date_all_day ON staff_schedule(salon_id, staff_id, date, is_all_day) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE staff_schedule ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON staff_schedule
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners or staff themselves" ON staff_schedule
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM salon WHERE id = staff_schedule.salon_id /* AND ここにサロンオーナー向けの認証条件を記述してください */) OR
    EXISTS (SELECT 1 FROM staff WHERE id = staff_schedule.staff_id /* AND ここにスタッフ本人向けの認証条件を記述してください */)
  );
CREATE POLICY "Enable update for salon owners or staff themselves" ON staff_schedule
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM salon WHERE id = staff_schedule.salon_id /* AND ここにサロンオーナー向けの認証条件を記述してください */) OR
    EXISTS (SELECT 1 FROM staff WHERE id = staff_schedule.staff_id /* AND ここにスタッフ本人向けの認証条件を記述してください */)
  );

-- Create customer_detail table
CREATE TABLE IF NOT EXISTS customer_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customer(id),
  email TEXT,
  age INTEGER,
  birthday TEXT, -- YYYY-MM-DD format
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'unknown')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_detail_customer_id ON customer_detail(customer_id) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE customer_detail ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON customer_detail
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners" ON customer_detail
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer c
      JOIN salon s ON c.salon_id = s.id
      WHERE c.id = customer_detail.customer_id
    )
  );
CREATE POLICY "Enable update for salon owners" ON customer_detail
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM customer c
      JOIN salon s ON c.salon_id = s.id
      WHERE c.id = customer_detail.customer_id
    )
  );


-- Create customer_points table
CREATE TABLE IF NOT EXISTS customer_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customer(id),
  salon_id UUID NOT NULL REFERENCES salon(id),
  total_points DOUBLE PRECISION,
  last_transaction_date_unix BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_points_salon_customer_archive ON customer_points(salon_id, customer_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_customer_points_customer_id ON customer_points(customer_id) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE customer_points ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON customer_points
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners" ON customer_points
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM salon WHERE id = customer_points.salon_id /* AND ここに認証条件を記述してください */));
CREATE POLICY "Enable update for salon owners" ON customer_points
  FOR UPDATE USING (EXISTS (SELECT 1 FROM salon WHERE id = customer_points.salon_id /* AND ここに認証条件を記述してください */));


-- Create carte table
CREATE TABLE IF NOT EXISTS carte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  customer_id UUID NOT NULL REFERENCES customer(id),
  skin_type TEXT,
  hair_type TEXT,
  allergy_history TEXT,
  medical_history TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_carte_salon_customer ON carte(salon_id, customer_id) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE carte ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON carte
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners" ON carte
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM salon WHERE id = carte.salon_id /* AND ここに認証条件を記述してください */));
CREATE POLICY "Enable update for salon owners" ON carte
  FOR UPDATE USING (EXISTS (SELECT 1 FROM salon WHERE id = carte.salon_id /* AND ここに認証条件を記述してください */));

-- Create reservation table
CREATE TABLE IF NOT EXISTS reservation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customer(id),
  customer_name TEXT,
  staff_id UUID NOT NULL REFERENCES staff(id),
  staff_name TEXT,
  menus JSONB, -- Example: '[{"menuId": "uuid", "quantity": 1}]'
  salon_id UUID NOT NULL REFERENCES salon(id),
  options JSONB, -- Example: '[{"optionId": "uuid", "quantity": 1}]'
  unit_price DOUBLE PRECISION,
  total_price DOUBLE PRECISION,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled_by_salon', 'cancelled_by_customer', 'completed', 'noshow')),
  start_time_unix BIGINT,
  end_time_unix BIGINT,
  use_points DOUBLE PRECISION,
  coupon_id UUID, -- Needs coupon table first
  coupon_discount DOUBLE PRECISION,
  featured_hairimg_path TEXT,
  notes TEXT,
  payment_method TEXT CHECK (payment_method IN ('cash', 'credit_card', 'electronic_money', 'qr_code')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create carte_detail table
CREATE TABLE IF NOT EXISTS carte_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carte_id UUID NOT NULL REFERENCES carte(id),
  reservation_id UUID NOT NULL REFERENCES reservation(id),
  before_hairimg_path TEXT,
  after_hairimg_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_carte_detail_carte_id_reservation_id ON carte_detail(carte_id, reservation_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_carte_detail_carte_id ON carte_detail(carte_id) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE carte_detail ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON carte_detail
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners" ON carte_detail
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM carte ca
      JOIN salon s ON ca.salon_id = s.id
      WHERE ca.id = carte_detail.carte_id
    )
  );
CREATE POLICY "Enable update for salon owners" ON carte_detail
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM carte ca
      JOIN salon s ON ca.salon_id = s.id
      WHERE ca.id = carte_detail.carte_id
    )
  );


-- Create staff_auth table
CREATE TABLE IF NOT EXISTS staff_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  pin_code TEXT,
  role TEXT CHECK (role IN ('admin', 'staff', 'owner')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_auth_staff_id ON staff_auth(staff_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_staff_auth_pin_code ON staff_auth(pin_code) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE staff_auth ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON staff_auth
  FOR SELECT USING (true); -- Staff might read their own, salon owner might read all
CREATE POLICY "Enable insert for salon owners" ON staff_auth
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff st
      JOIN salon s ON st.salon_id = s.id
      WHERE st.id = staff_auth.staff_id
    )
  );
CREATE POLICY "Enable update for salon owners" ON staff_auth
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM staff st
      JOIN salon s ON st.salon_id = s.id
      WHERE st.id = staff_auth.staff_id
    )
  );

-- Create time_card table
CREATE TABLE IF NOT EXISTS time_card (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  staff_id UUID NOT NULL REFERENCES staff(id),
  start_date_time_unix BIGINT,
  end_date_time_unix BIGINT,
  worked_time INTEGER, -- minutes
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_time_card_salon_staff ON time_card(salon_id, staff_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_time_card_salon_staff_start_time ON time_card(salon_id, staff_id, start_date_time_unix) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_time_card_salon_start_time ON time_card(salon_id, start_date_time_unix) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_time_card_salon_staff_end_time ON time_card(salon_id, staff_id, end_date_time_unix) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_time_card_salon_notes ON time_card(salon_id, notes) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE time_card ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON time_card
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners or staff themselves" ON time_card
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM salon WHERE id = time_card.salon_id /* AND ここにサロンオーナー向けの認証条件を記述してください */) OR
    EXISTS (SELECT 1 FROM staff WHERE id = time_card.staff_id /* AND ここにスタッフ本人向けの認証条件を記述してください */)
  );
CREATE POLICY "Enable update for salon owners or staff themselves" ON time_card
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM salon WHERE id = time_card.salon_id /* AND ここにサロンオーナー向けの認証条件を記述してください */) OR
    EXISTS (SELECT 1 FROM staff WHERE id = time_card.staff_id /* AND ここにスタッフ本人向けの認証条件を記述してください */)
  );

-- Create staff_config table
CREATE TABLE IF NOT EXISTS staff_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  salon_id UUID NOT NULL REFERENCES salon(id),
  extra_charge DOUBLE PRECISION,
  priority INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_config_staff_id ON staff_config(staff_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_staff_config_salon_id ON staff_config(salon_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_staff_config_staff_id_priority ON staff_config(staff_id, priority) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE staff_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON staff_config
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners" ON staff_config
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM salon WHERE id = staff_config.salon_id /* AND ここに認証条件を記述してください */));
CREATE POLICY "Enable update for salon owners" ON staff_config
  FOR UPDATE USING (EXISTS (SELECT 1 FROM salon WHERE id = staff_config.salon_id /* AND ここに認証条件を記述してください */));


-- Create menu table
CREATE TABLE IF NOT EXISTS menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  name TEXT,
  unit_price DOUBLE PRECISION,
  sale_price DOUBLE PRECISION,
  time_to_min INTEGER,
  img_path TEXT,
  thumbnail_path TEXT,
  description TEXT,
  target_gender TEXT CHECK (target_gender IN ('male', 'female', 'other', 'unknown')),
  target_type TEXT CHECK (target_type IN ('all', 'new', 'repeat')),
  categories TEXT[] CHECK (array_length(categories, 1) IS NULL OR categories[1] IN ('cut', 'color', 'perm', 'treatment', 'spa', 'other')), -- Example categories
  tags TEXT[],
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'both')),
  is_active BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_menu_salon_id ON menu(salon_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_menu_salon_id_name ON menu(salon_id, name) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_menu_salon_id_gender ON menu(salon_id, target_gender) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_menu_salon_id_type ON menu(salon_id, target_type) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_menu_salon_id_category ON menu USING gin(salon_id, categories) WHERE NOT is_archive; -- GIN for array

-- Enable RLS
ALTER TABLE menu ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON menu
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners" ON menu
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM salon WHERE id = menu.salon_id /* AND ここに認証条件を記述してください */));
CREATE POLICY "Enable update for salon owners" ON menu
  FOR UPDATE USING (EXISTS (SELECT 1 FROM salon WHERE id = menu.salon_id /* AND ここに認証条件を記述してください */));

-- Create menu_exclusion_staff table
CREATE TABLE IF NOT EXISTS menu_exclusion_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  menu_id UUID NOT NULL REFERENCES menu(id),
  staff_id UUID NOT NULL REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_menu_exclusion_staff_salon_menu_staff ON menu_exclusion_staff(salon_id, menu_id, staff_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_menu_exclusion_staff_salon_menu_id ON menu_exclusion_staff(salon_id, menu_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_menu_exclusion_staff_salon_staff_id ON menu_exclusion_staff(salon_id, staff_id) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE menu_exclusion_staff ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON menu_exclusion_staff
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners" ON menu_exclusion_staff
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM salon WHERE id = menu_exclusion_staff.salon_id /* AND ここに認証条件を記述してください */));
CREATE POLICY "Enable update for salon owners" ON menu_exclusion_staff
  FOR UPDATE USING (EXISTS (SELECT 1 FROM salon WHERE id = menu_exclusion_staff.salon_id /* AND ここに認証条件を記述してください */));
CREATE POLICY "Enable delete for salon owners" ON menu_exclusion_staff
  FOR DELETE USING (EXISTS (SELECT 1 FROM salon WHERE id = menu_exclusion_staff.salon_id /* AND ここに認証条件を記述してください */));

-- Create product table
CREATE TABLE IF NOT EXISTS product (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  stripe_connect_id TEXT,
  tags TEXT[],
  name TEXT,
  unit_price DOUBLE PRECISION,
  sale_price DOUBLE PRECISION,
  img_path TEXT,
  description TEXT,
  target_gender TEXT CHECK (target_gender IN ('male', 'female', 'other', 'unknown')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'both')),
  is_active BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_salon_id ON product(salon_id) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE product ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON product
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners" ON product
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM salon WHERE id = product.salon_id /* AND ここに認証条件を記述してください */));
CREATE POLICY "Enable update for salon owners" ON product
  FOR UPDATE USING (EXISTS (SELECT 1 FROM salon WHERE id = product.salon_id /* AND ここに認証条件を記述してください */));

-- Create coupon table
CREATE TABLE IF NOT EXISTS coupon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  coupon_uid TEXT, -- 8-digit uppercase alphanumeric
  name TEXT,
  discount_type TEXT CHECK (discount_type IN ('fixed', 'percentage')),
  percentage_discount_value DOUBLE PRECISION,
  fixed_discount_value DOUBLE PRECISION,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_coupon_salon_id ON coupon(salon_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_coupon_name ON coupon(name) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_coupon_salon_coupon_uid ON coupon(salon_id, coupon_uid) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_coupon_salon_coupon_uid_active ON coupon(salon_id, coupon_uid, is_active) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE coupon ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON coupon
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners" ON coupon
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM salon WHERE id = coupon.salon_id /* AND ここに認証条件を記述してください */));
CREATE POLICY "Enable update for salon owners" ON coupon
  FOR UPDATE USING (EXISTS (SELECT 1 FROM salon WHERE id = coupon.salon_id /* AND ここに認証条件を記述してください */));

-- Add coupon_id FOREIGN KEY to reservation now that coupon table exists
ALTER TABLE reservation
  ADD CONSTRAINT fk_coupon_id FOREIGN KEY (coupon_id) REFERENCES coupon(id);


-- Create coupon_exclusion_menu table
CREATE TABLE IF NOT EXISTS coupon_exclusion_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  coupon_id UUID NOT NULL REFERENCES coupon(id),
  menu_id UUID NOT NULL REFERENCES menu(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_coupon_exclusion_menu_salon_menu_id ON coupon_exclusion_menu(salon_id, menu_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_coupon_exclusion_menu_salon_coupon_id ON coupon_exclusion_menu(salon_id, coupon_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_coupon_exclusion_menu_salon_coupon_id_menu_id ON coupon_exclusion_menu(salon_id, coupon_id, menu_id) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE coupon_exclusion_menu ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON coupon_exclusion_menu
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners" ON coupon_exclusion_menu
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM salon WHERE id = coupon_exclusion_menu.salon_id /* AND ここに認証条件を記述してください */));
CREATE POLICY "Enable update for salon owners" ON coupon_exclusion_menu
  FOR UPDATE USING (EXISTS (SELECT 1 FROM salon WHERE id = coupon_exclusion_menu.salon_id /* AND ここに認証条件を記述してください */));
CREATE POLICY "Enable delete for salon owners" ON coupon_exclusion_menu
  FOR DELETE USING (EXISTS (SELECT 1 FROM salon WHERE id = coupon_exclusion_menu.salon_id /* AND ここに認証条件を記述してください */));

-- Create coupon_config table
CREATE TABLE IF NOT EXISTS coupon_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  coupon_id UUID NOT NULL REFERENCES coupon(id),
  start_date_unix BIGINT,
  end_date_unix BIGINT,
  max_use_count INTEGER,
  number_of_use INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_coupon_config_salon_coupon_id ON coupon_config(salon_id, coupon_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_coupon_config_coupon_id ON coupon_config(coupon_id) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE coupon_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON coupon_config
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners" ON coupon_config
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM salon WHERE id = coupon_config.salon_id /* AND ここに認証条件を記述してください */));
CREATE POLICY "Enable update for salon owners" ON coupon_config
  FOR UPDATE USING (EXISTS (SELECT 1 FROM salon WHERE id = coupon_config.salon_id /* AND ここに認証条件を記述してください */));

-- Create coupon_transaction table
CREATE TABLE IF NOT EXISTS coupon_transaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupon(id),
  customer_id UUID NOT NULL REFERENCES customer(id),
  reservation_id UUID NOT NULL REFERENCES reservation(id),
  transaction_date_unix BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_coupon_transaction_coupon_id ON coupon_transaction(coupon_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_coupon_transaction_customer_id ON coupon_transaction(customer_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_coupon_transaction_reservation_id ON coupon_transaction(reservation_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_coupon_transaction_transaction_date ON coupon_transaction(transaction_date_unix) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE coupon_transaction ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON coupon_transaction
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners" ON coupon_transaction -- Or related to reservation owner
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservation r
      JOIN salon s ON r.salon_id = s.id
      WHERE r.id = coupon_transaction.reservation_id /* AND ここに認証条件を記述してください */
    )
  );
-- Update/Delete policies might be restrictive, often transactions are immutable.

-- Reservation table (Re-iterating with FK dependency on coupon, if not already handled)
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reservation_salon_id ON reservation(salon_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_reservation_customer_id ON reservation(salon_id, customer_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_reservation_staff_id_status ON reservation(salon_id, staff_id, status) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_reservation_status ON reservation(salon_id, status) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_reservation_salon_status_start ON reservation(salon_id, status, start_time_unix) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_reservation_staff_date ON reservation(salon_id, staff_id, start_time_unix) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_reservation_staff_date_status ON reservation(salon_id, staff_id, status, start_time_unix) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_reservation_customer_date ON reservation(salon_id, customer_id, start_time_unix) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_reservation_salon_staff_status_start_end ON reservation(salon_id, staff_id, status, start_time_unix, end_time_unix) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE reservation ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON reservation
  FOR SELECT USING (true); -- Customer, Staff, Salon Owner might have read access
CREATE POLICY "Enable insert for authenticated users" ON reservation -- Customers can make reservations
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for salon owners or relevant staff/customer" ON reservation
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM salon WHERE id = reservation.salon_id /* AND ここにサロンオーナー向けの認証条件を記述してください */) OR
    EXISTS (SELECT 1 FROM staff WHERE id = reservation.staff_id /* AND ここにスタッフ本人向けの認証条件を記述してください */) OR
    EXISTS (SELECT 1 FROM customer WHERE id = reservation.customer_id /* AND ここに顧客本人向けの認証条件を記述してください */)
  );


-- Create point_config table
CREATE TABLE IF NOT EXISTS point_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  is_fixed_point BOOLEAN,
  point_rate DOUBLE PRECISION,
  fixed_point DOUBLE PRECISION,
  point_expiration_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_point_config_salon_id ON point_config(salon_id) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE point_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON point_config
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners" ON point_config
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM salon WHERE id = point_config.salon_id /* AND ここに認証条件を記述してください */));
CREATE POLICY "Enable update for salon owners" ON point_config
  FOR UPDATE USING (EXISTS (SELECT 1 FROM salon WHERE id = point_config.salon_id /* AND ここに認証条件を記述してください */));

-- Create point_exclusion_menu table
CREATE TABLE IF NOT EXISTS point_exclusion_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  point_config_id UUID NOT NULL REFERENCES point_config(id),
  menu_id UUID NOT NULL REFERENCES menu(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_point_exclusion_menu_salon_point_config_menu ON point_exclusion_menu(salon_id, point_config_id, menu_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_point_exclusion_menu_salon_point_config_id ON point_exclusion_menu(salon_id, point_config_id) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE point_exclusion_menu ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON point_exclusion_menu
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners" ON point_exclusion_menu
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM salon WHERE id = point_exclusion_menu.salon_id /* AND ここに認証条件を記述してください */));
CREATE POLICY "Enable update for salon owners" ON point_exclusion_menu
  FOR UPDATE USING (EXISTS (SELECT 1 FROM salon WHERE id = point_exclusion_menu.salon_id /* AND ここに認証条件を記述してください */));
CREATE POLICY "Enable delete for salon owners" ON point_exclusion_menu
  FOR DELETE USING (EXISTS (SELECT 1 FROM salon WHERE id = point_exclusion_menu.salon_id /* AND ここに認証条件を記述してください */));


-- Create point_task_queue table
CREATE TABLE IF NOT EXISTS point_task_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  reservation_id UUID NOT NULL REFERENCES reservation(id),
  customer_id UUID NOT NULL REFERENCES customer(id),
  points DOUBLE PRECISION,
  scheduled_for_unix BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_point_task_queue_reservation_id ON point_task_queue(reservation_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_point_task_queue_customer_id ON point_task_queue(customer_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_point_task_queue_scheduled_for ON point_task_queue(scheduled_for_unix) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_point_task_queue_salon_id ON point_task_queue(salon_id) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE point_task_queue ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON point_task_queue
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners" ON point_task_queue
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM salon WHERE id = point_task_queue.salon_id /* AND ここに認証条件を記述してください */));
-- Update/Delete likely handled by system/cron jobs

-- Create point_auth table
CREATE TABLE IF NOT EXISTS point_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservation(id),
  customer_id UUID NOT NULL REFERENCES customer(id),
  auth_code TEXT, -- 6-digit alphanumeric
  expiration_time_unix BIGINT,
  points DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_point_auth_reservation_id ON point_auth(reservation_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_point_auth_customer_id ON point_auth(customer_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_point_auth_expiration_time ON point_auth(expiration_time_unix) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE point_auth ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for relevant users" ON point_auth -- Salon owner, customer
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM reservation r JOIN salon s ON r.salon_id = s.id WHERE r.id = point_auth.reservation_id)
  );
CREATE POLICY "Enable insert for salon owners" ON point_auth
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservation r
      JOIN salon s ON r.salon_id = s.id
      WHERE r.id = point_auth.reservation_id /* AND ここに認証条件を記述してください */
    )
  );
-- Update/Delete policies

-- Create point_transaction table
CREATE TABLE IF NOT EXISTS point_transaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  reservation_id UUID NOT NULL REFERENCES reservation(id),
  customer_id UUID NOT NULL REFERENCES customer(id),
  points DOUBLE PRECISION,
  transaction_type TEXT CHECK (transaction_type IN ('earn', 'spend', 'expire', 'cancel_earn', 'cancel_spend')),
  transaction_date_unix BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_point_transaction_salon_reservation_id ON point_transaction(salon_id, reservation_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_point_transaction_salon_customer_id ON point_transaction(salon_id, customer_id) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_point_transaction_salon_customer_reservation ON point_transaction(salon_id, customer_id, reservation_id) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE point_transaction ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for authenticated users" ON point_transaction
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for salon owners" ON point_transaction
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM salon WHERE id = point_transaction.salon_id /* AND ここに認証条件を記述してください */));
-- Transactions are usually immutable.

-- Create tracking_event table
CREATE TABLE IF NOT EXISTS tracking_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  session_id TEXT,
  code TEXT CHECK (code IN ('web', 'line', 'googleMap', 'facebook', 'youtube', 'tiktok', 'instagram', 'x', 'unknown')),
  event_type TEXT CHECK (event_type IN ('click', 'page_view', 'conversion')),
  -- Omitting created_at, updated_at, is_archive from CommonFields as they are not in schema for this table
  event_time TIMESTAMPTZ DEFAULT now() -- Assuming an event time is needed
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tracking_event_session_id_details ON tracking_event(session_id, salon_id, event_type, code);

-- Enable RLS
ALTER TABLE tracking_event ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public insert for tracking events" ON tracking_event
  FOR INSERT WITH CHECK (true); -- Events can come from unauthenticated users
CREATE POLICY "Enable read for salon owners" ON tracking_event
  FOR SELECT USING (EXISTS (SELECT 1 FROM salon WHERE id = tracking_event.salon_id /* AND ここに認証条件を記述してください */));


-- Create tracking_summaries table
CREATE TABLE IF NOT EXISTS tracking_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  date TEXT NOT NULL, -- YYYY-MM-DD
  event_type TEXT CHECK (event_type IN ('click', 'page_view', 'conversion')),
  code TEXT CHECK (code IN ('web', 'line', 'googleMap', 'facebook', 'youtube', 'tiktok', 'instagram', 'x', 'unknown')),
  total_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tracking_summaries_salon_date ON tracking_summaries(salon_id, date) WHERE NOT is_archive;
CREATE INDEX IF NOT EXISTS idx_tracking_summaries_salon_date_event_type ON tracking_summaries(salon_id, date, event_type) WHERE NOT is_archive;

-- Enable RLS
ALTER TABLE tracking_summaries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for salon owners" ON tracking_summaries
  FOR SELECT USING (EXISTS (SELECT 1 FROM salon WHERE id = tracking_summaries.salon_id /* AND ここに認証条件を記述してください */));
CREATE POLICY "Enable insert for system/backend roles" ON tracking_summaries -- Summaries are typically generated by a backend process
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM salon WHERE id = tracking_summaries.salon_id /* AND ここに認証条件を記述してください */)); -- Or a specific service role
CREATE POLICY "Enable update for system/backend roles" ON tracking_summaries
  FOR UPDATE USING (EXISTS (SELECT 1 FROM salon WHERE id = tracking_summaries.salon_id /* AND ここに認証条件を記述してください */)); -- Or a specific service role 