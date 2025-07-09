-- Rename customer_id to customer_uid in tables
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'carte' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE "public"."carte" RENAME COLUMN "customer_id" TO "customer_uid";
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'point_task_queue' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE "public"."point_task_queue" RENAME COLUMN "customer_id" TO "customer_uid";
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'point_transaction' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE "public"."point_transaction" RENAME COLUMN "customer_id" TO "customer_uid";
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reservation' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE "public"."reservation" RENAME COLUMN "customer_id" TO "customer_uid";
    END IF;
END $$;

-- Drop existing foreign key constraints
ALTER TABLE "public"."carte_detail"
DROP CONSTRAINT IF EXISTS "carte_detail_carte_id_fkey";

ALTER TABLE "public"."carte"
DROP CONSTRAINT IF EXISTS "carte_customer_id_fkey";

ALTER TABLE "public"."customer_points"
DROP CONSTRAINT IF EXISTS "customer_points_customer_uid_fkey";

ALTER TABLE "public"."point_task_queue"
DROP CONSTRAINT IF EXISTS "point_task_queue_customer_id_fkey";

ALTER TABLE "public"."point_transaction"
DROP CONSTRAINT IF EXISTS "point_transaction_customer_id_fkey";

-- Recreate foreign key constraints with ON DELETE CASCADE
ALTER TABLE "public"."carte_detail"
ADD CONSTRAINT "carte_detail_carte_id_fkey"
FOREIGN KEY (carte_id)
REFERENCES "public"."carte"(id)
ON DELETE CASCADE;

ALTER TABLE "public"."carte"
ADD CONSTRAINT "carte_customer_uid_fkey"
FOREIGN KEY (customer_uid)
REFERENCES "public"."customer"(uid)
ON DELETE CASCADE;

ALTER TABLE "public"."customer_points"
ADD CONSTRAINT "customer_points_customer_uid_fkey"
FOREIGN KEY (customer_uid)
REFERENCES "public"."customer"(uid)
ON DELETE CASCADE;

ALTER TABLE "public"."point_task_queue"
ADD CONSTRAINT "point_task_queue_customer_uid_fkey"
FOREIGN KEY (customer_uid)
REFERENCES "public"."customer"(uid)
ON DELETE CASCADE;

ALTER TABLE "public"."point_transaction"
ADD CONSTRAINT "point_transaction_customer_uid_fkey"
FOREIGN KEY (customer_uid)
REFERENCES "public"."customer"(uid)
ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_carte_customer_uid"
ON "public"."carte"("customer_uid");

CREATE INDEX IF NOT EXISTS "idx_point_task_queue_customer_uid"
ON "public"."point_task_queue"("customer_uid");

CREATE INDEX IF NOT EXISTS "idx_point_transaction_customer_uid"
ON "public"."point_transaction"("customer_uid");

CREATE INDEX IF NOT EXISTS "idx_reservation_customer_uid"
ON "public"."reservation"("customer_uid"); 