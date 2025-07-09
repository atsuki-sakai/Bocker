-- Sync production Bocker schema with DEV_Bocker development schema
-- This migration adds missing fields to match the development environment exactly

-- ===============================
-- 1. Add missing fields to reservation table
-- ===============================

-- Add payment intent field
ALTER TABLE reservation 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Add pending expiry management
ALTER TABLE reservation 
ADD COLUMN IF NOT EXISTS pending_expiry bigint;

-- Add cancellation management fields
ALTER TABLE reservation 
ADD COLUMN IF NOT EXISTS cancelled_at bigint;

ALTER TABLE reservation 
ADD COLUMN IF NOT EXISTS cancelled_by text;

ALTER TABLE reservation 
ADD COLUMN IF NOT EXISTS cancel_reason text;

-- Add reminder management fields
ALTER TABLE reservation 
ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false;

ALTER TABLE reservation 
ADD COLUMN IF NOT EXISTS reminder_sent_at bigint;

-- Add free nomination fields (this is the key field needed for is_free_nomination)
ALTER TABLE reservation 
ADD COLUMN IF NOT EXISTS is_free_nomination boolean DEFAULT false;

ALTER TABLE reservation 
ADD COLUMN IF NOT EXISTS assigned_staff_id text;

ALTER TABLE reservation 
ADD COLUMN IF NOT EXISTS assigned_staff_name text;

ALTER TABLE reservation 
ADD COLUMN IF NOT EXISTS assignment_timestamp bigint;

ALTER TABLE reservation 
ADD COLUMN IF NOT EXISTS last_staff_change jsonb;

-- ===============================
-- 2. Add missing field to reservation_detail table
-- ===============================

ALTER TABLE reservation_detail 
ADD COLUMN IF NOT EXISTS cancellation_info jsonb;

-- ===============================
-- 3. Add CHECK constraint for cancelled_by field
-- ===============================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'reservation_cancelled_by_check'
    ) THEN
        ALTER TABLE reservation 
        ADD CONSTRAINT reservation_cancelled_by_check 
        CHECK (cancelled_by IS NULL OR cancelled_by IN ('customer', 'staff', 'system'));
    END IF;
END $$;

-- ===============================
-- 4. Create indexes for new fields (performance optimization)
-- ===============================

-- Index for free nomination searches
CREATE INDEX IF NOT EXISTS idx_reservation_free_nomination 
ON reservation(is_free_nomination) 
WHERE is_free_nomination = true;

-- Index for pending expiry management
CREATE INDEX IF NOT EXISTS idx_reservation_pending_expiry 
ON reservation(pending_expiry) 
WHERE pending_expiry IS NOT NULL;

-- Index for cancellation searches
CREATE INDEX IF NOT EXISTS idx_reservation_cancelled_at 
ON reservation(cancelled_at) 
WHERE cancelled_at IS NOT NULL;

-- Index for reminder management
CREATE INDEX IF NOT EXISTS idx_reservation_reminder_sent 
ON reservation(reminder_sent, reminder_sent_at) 
WHERE reminder_sent = true;

-- ===============================
-- 5. Update comments for new fields
-- ===============================

COMMENT ON COLUMN reservation.stripe_payment_intent_id IS 'Stripe Payment Intent ID for payment tracking';
COMMENT ON COLUMN reservation.pending_expiry IS 'Unix timestamp when pending reservation expires';
COMMENT ON COLUMN reservation.cancelled_at IS 'Unix timestamp when reservation was cancelled';
COMMENT ON COLUMN reservation.cancelled_by IS 'Who cancelled the reservation: customer, staff, or system';
COMMENT ON COLUMN reservation.cancel_reason IS 'Reason for cancellation';
COMMENT ON COLUMN reservation.reminder_sent IS 'Flag indicating if reminder was sent';
COMMENT ON COLUMN reservation.reminder_sent_at IS 'Unix timestamp when reminder was sent';
COMMENT ON COLUMN reservation.is_free_nomination IS 'Flag for free staff nomination reservations';
COMMENT ON COLUMN reservation.assigned_staff_id IS 'Actually assigned staff ID (Convex format)';
COMMENT ON COLUMN reservation.assigned_staff_name IS 'Actually assigned staff name';
COMMENT ON COLUMN reservation.assignment_timestamp IS 'Unix timestamp when staff was assigned';
COMMENT ON COLUMN reservation.last_staff_change IS 'JSON history of staff changes';
COMMENT ON COLUMN reservation_detail.cancellation_info IS 'JSON information about cancellation';

-- ===============================
-- 6. Verification - Check that all expected fields exist
-- ===============================

DO $$
DECLARE
    missing_fields text[] := '{}';
    field_name text;
    expected_reservation_fields text[] := ARRAY[
        'stripe_payment_intent_id', 'pending_expiry', 'cancelled_at', 
        'cancelled_by', 'cancel_reason', 'reminder_sent', 'reminder_sent_at',
        'is_free_nomination', 'assigned_staff_id', 'assigned_staff_name',
        'assignment_timestamp', 'last_staff_change'
    ];
BEGIN
    -- Check reservation table fields
    FOREACH field_name IN ARRAY expected_reservation_fields
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'reservation' 
            AND column_name = field_name
            AND table_schema = 'public'
        ) THEN
            missing_fields := array_append(missing_fields, 'reservation.' || field_name);
        END IF;
    END LOOP;

    -- Check reservation_detail table fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reservation_detail' 
        AND column_name = 'cancellation_info'
        AND table_schema = 'public'
    ) THEN
        missing_fields := array_append(missing_fields, 'reservation_detail.cancellation_info');
    END IF;

    -- Report results
    IF array_length(missing_fields, 1) > 0 THEN
        RAISE EXCEPTION 'Migration failed: Missing fields: %', array_to_string(missing_fields, ', ');
    ELSE
        RAISE NOTICE 'Migration successful: All expected fields are present in production schema';
    END IF;
END $$;