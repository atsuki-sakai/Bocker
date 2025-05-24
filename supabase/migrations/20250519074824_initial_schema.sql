-- Supabase migration script to create customer related tables

-- customer tablp
CREATE TABLE IF NOT EXISTS customer (
    uid UUID PRIMARY KEY NOT NULL,
    salon_id TEXT, -- Assuming salon table exists and has TEXT id
    line_id TEXT,
    line_user_name TEXT,
    phone TEXT,
    email TEXT,
    password_hash TEXT, -- Store hashed password, not plain text
    first_name TEXT,
    last_name TEXT,
    searchable_text TEXT,
    use_count INTEGER,
    last_reservation_date_unix TIMESTAMP,
    tags JSONB, -- Assuming tags are stored as a JSON array of strings
    initial_tracking JSONB, -- Assuming initial_tracking is a JSON object
    _creation_time TIMESTAMPTZ DEFAULT now(),
    is_archive BOOLEAN DEFAULT false,
    updated_time TIMESTAMPTZ DEFAULT now() -- Added for consistency
);

-- Add indexes for customer table
CREATE INDEX IF NOT EXISTS idx_customer_salon_id ON customer (salon_id);
CREATE INDEX IF NOT EXISTS idx_customer_line_id ON customer (line_id);
CREATE INDEX IF NOT EXISTS idx_customer_email ON customer (email);
CREATE INDEX IF NOT EXISTS idx_customer_phone ON customer (phone);

-- customer_detail table
CREATE TABLE IF NOT EXISTS customer_detail (
    uid UUID PRIMARY KEY NOT NULL,
    customer_uid UUID NOT NULL REFERENCES customer(uid) ON DELETE CASCADE,
    email TEXT,
    age INTEGER,
    birthday TEXT, -- Assuming YYYY-MM-DD format
    gender TEXT, -- Consider using an ENUM if values are fixed
    notes TEXT,
    _creation_time TIMESTAMPTZ DEFAULT now(),
    is_archive BOOLEAN DEFAULT false,
    updated_time TIMESTAMPTZ DEFAULT now() -- Added for consistency
);

-- Add index for customer_detail table
CREATE INDEX IF NOT EXISTS idx_customer_detail_customer_uid ON customer_detail (customer_uid);

-- customer_points table
CREATE TABLE IF NOT EXISTS customer_points (
    uid UUID PRIMARY KEY NOT NULL,
    customer_uid UUID NOT NULL REFERENCES customer(uid) ON DELETE CASCADE,
    salon_id TEXT, -- Assuming salon table exists
    total_points INTEGER,
    last_transaction_date_unix BIGINT,
    _creation_time TIMESTAMPTZ DEFAULT now(),
    is_archive BOOLEAN DEFAULT false,
    updated_time TIMESTAMPTZ DEFAULT now() -- Added for consistency
);

-- Add indexes for customer_points table
CREATE INDEX IF NOT EXISTS idx_customer_points_customer_uid ON customer_points (customer_uid);
CREATE INDEX IF NOT EXISTS idx_customer_points_salon_id ON customer_points (salon_id);

-- Trigger function to update updated_time column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_time = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to customer table
DROP TRIGGER IF EXISTS update_customer_modtime ON customer;
CREATE TRIGGER update_customer_modtime
BEFORE UPDATE ON customer
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Apply trigger to customer_detail table
DROP TRIGGER IF EXISTS update_customer_detail_modtime ON customer_detail;
CREATE TRIGGER update_customer_detail_modtime
BEFORE UPDATE ON customer_detail
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Apply trigger to customer_points table
DROP TRIGGER IF EXISTS update_customer_points_modtime ON customer_points;
CREATE TRIGGER update_customer_points_modtime
BEFORE UPDATE ON customer_points
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

CREATE OR REPLACE FUNCTION create_customer_with_details_and_points(
    -- customer table fields
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_phone TEXT,
    p_salon_id TEXT, -- Matches table definition (TEXT)
    p_line_id TEXT,
    p_line_user_name TEXT,
    p_password_hash TEXT,
    -- customer_detail table fields
    p_detail_email TEXT,
    p_detail_gender TEXT,
    p_detail_birthday TEXT, -- Changed from DATE to TEXT to match customer_detail.birthday column type
    p_detail_age INTEGER,
    p_detail_notes TEXT,
    -- customer_points table fields
    p_initial_points INTEGER
)
RETURNS SETOF customer -- Returns the created customer record(s)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_customer_uid UUID; -- Variable to store the uid of the newly created customer
BEGIN
    -- Step 1: Insert into 'customer' table
    -- The 'uid' is generated using gen_random_uuid().
    -- '_creation_time', 'updated_time', 'is_archive' are explicitly set.
    INSERT INTO public.customer (
        uid, email, first_name, last_name, phone, salon_id, line_id, line_user_name, password_hash,
        _creation_time, updated_time, is_archive
    ) VALUES (
        gen_random_uuid(), p_email, p_first_name, p_last_name, p_phone, p_salon_id, p_line_id, p_line_user_name, p_password_hash,
        NOW(), NOW(), FALSE
    ) RETURNING uid INTO new_customer_uid; -- Retrieve the generated 'uid'

    -- Step 2: Insert into 'customer_detail' table
    -- Uses 'new_customer_uid' obtained from the 'customer' table insertion as the foreign key.
    -- 'uid' for customer_detail is also generated.
    INSERT INTO public.customer_detail (
        uid, customer_uid, email, gender, birthday, age, notes,
        _creation_time, updated_time, is_archive
    ) VALUES (
        gen_random_uuid(), new_customer_uid, p_detail_email, p_detail_gender, p_detail_birthday, p_detail_age, p_detail_notes,
        NOW(), NOW(), FALSE
    );

    -- Step 3: Insert into 'customer_points' table
    -- Uses 'new_customer_uid' as the foreign key.
    -- 'uid' for customer_points is also generated.
    -- 'last_transaction_date_unix' is set to the current epoch time.
    INSERT INTO public.customer_points (
        uid, customer_uid, salon_id, total_points, last_transaction_date_unix,
        _creation_time, updated_time, is_archive
    ) VALUES (
        gen_random_uuid(), new_customer_uid, p_salon_id, p_initial_points, EXTRACT(EPOCH FROM NOW()),
        NOW(), NOW(), FALSE
    );

    -- Step 4: Return the newly created customer record from the 'customer' table
    RETURN QUERY SELECT * FROM public.customer WHERE uid = new_customer_uid;

EXCEPTION
    WHEN OTHERS THEN
        -- Log the error or re-raise to be caught by the calling client
        RAISE INFO 'Error in create_customer_with_details_and_points: SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
        RAISE; -- Re-throw the caught exception
END;
$$;

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
  start_time_unix TIMESTAMP,
  end_time_unix TIMESTAMP,
  use_points DOUBLE PRECISION,
  coupon_id TEXT, -- Needs coupon table first
  coupon_discount DOUBLE PRECISION,
  featured_hair_img_path TEXT,
  notes TEXT,
  payment_method TEXT CHECK (payment_method IN ('cash', 'credit_card', 'electronic_money', 'qr_code')),
  _creation_time TIMESTAMPTZ DEFAULT now(),
  updated_time TIMESTAMPTZ DEFAULT now(),
  is_archive BOOLEAN DEFAULT false
);
