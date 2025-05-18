-- CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Create reservation table
CREATE TABLE IF NOT EXISTS reservation (
  _id TEXT PRIMARY KEY NOT NULL,
  -- customerId UUID REFERENCES customer(id),
  customer_id TEXT,
  customer_name TEXT,
  -- staffId UUID NOT NULL REFERENCES staff(id),
  staff_id TEXT, -- NOT NULLを削除
  staff_name TEXT,
  menus JSONB, -- Example: '[{"menuId": "TEXT", "quantity": 1}]'
  -- salonId TEXT NOT NULL REFERENCES salon(id),
  salon_id TEXT, -- NOT NULLを削除
  options JSONB, -- Example: '[{"optionId": "TEXT", "quantity": 1}]'
  unit_price DOUBLE PRECISION,
  total_price DOUBLE PRECISION,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'refunded')),
  start_time_unix BIGINT,
  end_time_unix BIGINT,
  use_points DOUBLE PRECISION,
  coupon_id TEXT, -- Needs coupon table first
  coupon_discount DOUBLE PRECISION,
  featured_hair_img_path TEXT,
  notes TEXT,
  payment_method TEXT CHECK (payment_method IN ('cash', 'credit_card', 'electronic_money', 'qr_code')),
  creation_time TIMESTAMPTZ DEFAULT now(),
  updated_time TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);
