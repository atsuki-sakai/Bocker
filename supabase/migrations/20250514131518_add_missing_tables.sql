-- CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Create reservation table
CREATE TABLE IF NOT EXISTS reservation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  _id TEXT,
  -- customerId UUID REFERENCES customer(id),
  customerId UUID,
  customerName TEXT,
  -- staffId UUID NOT NULL REFERENCES staff(id),
  staffId UUID, -- NOT NULLを削除
  staffName TEXT,
  menus JSONB, -- Example: '[{"menuId": "uuid", "quantity": 1}]'
  -- salonId UUID NOT NULL REFERENCES salon(id),
  salonId UUID, -- NOT NULLを削除
  options JSONB, -- Example: '[{"optionId": "uuid", "quantity": 1}]'
  unitPrice DOUBLE PRECISION,
  totalPrice DOUBLE PRECISION,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled_by_salon', 'cancelled_by_customer', 'completed', 'noshow')),
  startTimeUnix BIGINT,
  endTimeUnix BIGINT,
  usePoints DOUBLE PRECISION,
  couponId UUID, -- Needs coupon table first
  couponDiscount DOUBLE PRECISION,
  featuredHairimgPath TEXT,
  notes TEXT,
  paymentMethod TEXT CHECK (paymentMethod IN ('cash', 'credit_card', 'electronic_money', 'qr_code')),
  creationTime TIMESTAMPTZ DEFAULT now(),
  updatedTime TIMESTAMPTZ DEFAULT now(),
  isArchive BOOLEAN DEFAULT false
);
