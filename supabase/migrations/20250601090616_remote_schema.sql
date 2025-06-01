

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "btree_gin" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."customer" (
    "uid" "uuid" NOT NULL,
    "salon_id" "text",
    "line_id" "text",
    "line_user_name" "text",
    "phone" "text",
    "email" "text",
    "password_hash" "text",
    "first_name" "text",
    "last_name" "text",
    "searchable_text" "text",
    "use_count" integer,
    "last_reservation_date_unix" bigint,
    "initial_tracking" "jsonb",
    "_creation_time" timestamp with time zone DEFAULT "now"(),
    "is_archive" boolean DEFAULT false,
    "updated_time" timestamp with time zone DEFAULT "now"(),
    "tags" "text"[],
    "tenant_id" "text" DEFAULT ''::"text" NOT NULL,
    "org_id" "text" DEFAULT ''::"text" NOT NULL,
    "password" "text",
    "total_reservation_count" integer,
    "customer_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sort_key" "text"
);


ALTER TABLE "public"."customer" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_customer_with_details_and_points"("p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_salon_id" "text", "p_line_id" "text", "p_line_user_name" "text", "p_password_hash" "text", "p_detail_email" "text", "p_detail_gender" "text", "p_detail_birthday" "date", "p_detail_age" integer, "p_detail_notes" "text", "p_initial_points" integer) RETURNS SETOF "public"."customer"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_customer_uid UUID; -- _id から uid に変更
    created_customer customer;
BEGIN
    -- 1. Create customer
    INSERT INTO public.customer (
        uid, email, first_name, last_name, phone, salon_id, line_id, line_user_name, password_hash,
        _creation_time, updated_time, is_archive
    ) VALUES (
        gen_random_uuid(), p_email, p_first_name, p_last_name, p_phone, p_salon_id, p_line_id, p_line_user_name, p_password_hash,
        NOW(), NOW(), FALSE
    ) RETURNING uid INTO new_customer_uid; -- _id から uid に変更

    -- 2. Create customer_detail
    INSERT INTO public.customer_detail (
        uid, customer_uid, email, gender, birthday, age, notes, -- uid (PK) と customer_uid (FK) を追加
        _creation_time, updated_time, is_archive
    ) VALUES (
        gen_random_uuid(), new_customer_uid, p_detail_email, p_detail_gender, p_detail_birthday, p_detail_age, p_detail_notes,
        NOW(), NOW(), FALSE
    );

    -- 3. Create customer_points
    INSERT INTO public.customer_points (
        uid, customer_uid, salon_id, total_points, last_transaction_date_unix, -- uid (PK) と customer_uid (FK) を追加
        _creation_time, updated_time, is_archive
    ) VALUES (
        gen_random_uuid(), new_customer_uid, p_salon_id, p_initial_points, EXTRACT(EPOCH FROM NOW()),
        NOW(), NOW(), FALSE
    );

    -- Return the created customer record
    RETURN QUERY SELECT * FROM public.customer WHERE uid = new_customer_uid; -- _id から uid に変更
END;
$$;


ALTER FUNCTION "public"."create_customer_with_details_and_points"("p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_salon_id" "text", "p_line_id" "text", "p_line_user_name" "text", "p_password_hash" "text", "p_detail_email" "text", "p_detail_gender" "text", "p_detail_birthday" "date", "p_detail_age" integer, "p_detail_notes" "text", "p_initial_points" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_customer_with_details_and_points"("p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_salon_id" "text", "p_line_id" "text", "p_line_user_name" "text", "p_password_hash" "text", "p_detail_email" "text", "p_detail_gender" "text", "p_detail_birthday" "text", "p_detail_age" integer, "p_detail_notes" "text", "p_initial_points" integer) RETURNS SETOF "public"."customer"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."create_customer_with_details_and_points"("p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_salon_id" "text", "p_line_id" "text", "p_line_user_name" "text", "p_password_hash" "text", "p_detail_email" "text", "p_detail_gender" "text", "p_detail_birthday" "text", "p_detail_age" integer, "p_detail_notes" "text", "p_initial_points" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_customer_and_related_data"("p_customer_uid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
    BEGIN
        -- 関連テーブルから削除 (順番に注意)
        DELETE FROM customer_points WHERE customer_uid = p_customer_uid;
        DELETE FROM customer_detail WHERE customer_uid = p_customer_uid;
        -- メインテーブルから削除
        DELETE FROM customer WHERE uid = p_customer_uid;

        -- もし他にも関連するテーブルがあれば、ここに追加します。
    END;
    $$;


ALTER FUNCTION "public"."delete_customer_and_related_data"("p_customer_uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_modified_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_time = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_modified_column"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."carte" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "text" NOT NULL,
    "org_id" "text" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "skin_type" "text",
    "hair_type" "text",
    "allergy_history" "text",
    "medical_history" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_archive" boolean DEFAULT false NOT NULL,
    "sort_key" "text"
);


ALTER TABLE "public"."carte" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."carte_detail" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "text" NOT NULL,
    "org_id" "text" NOT NULL,
    "carte_id" "uuid" NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "before_hair_img_path" "text",
    "after_hair_img_path" "text",
    "menu_details_json" "jsonb",
    "used_products_json" "jsonb",
    "notes" "text",
    "customer_requests" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_archive" boolean DEFAULT false NOT NULL,
    "sort_key" "text"
);


ALTER TABLE "public"."carte_detail" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupon_transaction" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "text" NOT NULL,
    "org_id" "text" NOT NULL,
    "coupon_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "transaction_date_unix" bigint NOT NULL,
    "discount_amount" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_archive" boolean DEFAULT false NOT NULL,
    "sort_key" "text"
);


ALTER TABLE "public"."coupon_transaction" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_detail" (
    "uid" "uuid" NOT NULL,
    "customer_uid" "uuid" NOT NULL,
    "email" "text",
    "age" integer,
    "birthday" "date",
    "gender" "text",
    "notes" "text",
    "_creation_time" timestamp with time zone DEFAULT "now"(),
    "is_archive" boolean DEFAULT false,
    "updated_time" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "text" DEFAULT ''::"text" NOT NULL,
    "org_id" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sort_key" "text",
    "customer_id" "uuid"
);


ALTER TABLE "public"."customer_detail" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_points" (
    "uid" "uuid" NOT NULL,
    "customer_uid" "uuid" NOT NULL,
    "salon_id" "text",
    "total_points" integer,
    "last_transaction_date_unix" bigint,
    "_creation_time" timestamp with time zone DEFAULT "now"(),
    "is_archive" boolean DEFAULT false,
    "updated_time" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "text" DEFAULT ''::"text" NOT NULL,
    "org_id" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sort_key" "text",
    "customer_id" "uuid"
);


ALTER TABLE "public"."customer_points" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."point_task_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "text" NOT NULL,
    "org_id" "text" NOT NULL,
    "reservation_id" "uuid",
    "customer_id" "uuid" NOT NULL,
    "points" integer,
    "scheduled_for_unix" bigint,
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_archive" boolean DEFAULT false NOT NULL,
    "sort_key" "text"
);


ALTER TABLE "public"."point_task_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."point_transaction" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "text" NOT NULL,
    "org_id" "text" NOT NULL,
    "reservation_id" "uuid",
    "customer_id" "uuid" NOT NULL,
    "points" integer NOT NULL,
    "transaction_type" "text",
    "transaction_date_unix" bigint NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_archive" boolean DEFAULT false NOT NULL,
    "sort_key" "text"
);


ALTER TABLE "public"."point_transaction" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tracking_event" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "text" NOT NULL,
    "org_id" "text" NOT NULL,
    "session_id" "text" NOT NULL,
    "event_timestamp_unix" bigint NOT NULL,
    "event_type" "text" NOT NULL,
    "event_source" "text" NOT NULL,
    "page_url" "text",
    "page_title" "text",
    "target_element" "text",
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "utm_term" "text",
    "utm_content" "text",
    "custom_data_json" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_archive" boolean DEFAULT false NOT NULL,
    "sort_key" "text"
);


ALTER TABLE "public"."tracking_event" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tracking_summaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "text" NOT NULL,
    "org_id" "text" NOT NULL,
    "summary_date" "date" NOT NULL,
    "dimension_type" "text" NOT NULL,
    "dimension_value" "text" NOT NULL,
    "total_count" integer NOT NULL,
    "unique_user_count" integer,
    "conversion_count" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_archive" boolean DEFAULT false NOT NULL,
    "sort_key" "text"
);


ALTER TABLE "public"."tracking_summaries" OWNER TO "postgres";


ALTER TABLE ONLY "public"."carte_detail"
    ADD CONSTRAINT "carte_detail_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."carte"
    ADD CONSTRAINT "carte_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupon_transaction"
    ADD CONSTRAINT "coupon_transaction_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_detail"
    ADD CONSTRAINT "customer_detail_pkey" PRIMARY KEY ("uid");



ALTER TABLE ONLY "public"."customer"
    ADD CONSTRAINT "customer_pkey" PRIMARY KEY ("uid");



ALTER TABLE ONLY "public"."customer_points"
    ADD CONSTRAINT "customer_points_pkey" PRIMARY KEY ("uid");



ALTER TABLE ONLY "public"."point_task_queue"
    ADD CONSTRAINT "point_task_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."point_transaction"
    ADD CONSTRAINT "point_transaction_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tracking_event"
    ADD CONSTRAINT "tracking_event_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tracking_summaries"
    ADD CONSTRAINT "tracking_summaries_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_carte_customer" ON "public"."carte" USING "btree" ("customer_id");



CREATE INDEX "idx_carte_detail_carte" ON "public"."carte_detail" USING "btree" ("carte_id");



CREATE INDEX "idx_carte_detail_reservation" ON "public"."carte_detail" USING "btree" ("reservation_id");



CREATE INDEX "idx_carte_detail_staff" ON "public"."carte_detail" USING "btree" ("staff_id");



CREATE INDEX "idx_carte_detail_tenant_org" ON "public"."carte_detail" USING "btree" ("tenant_id", "org_id");



CREATE INDEX "idx_carte_tenant_org" ON "public"."carte" USING "btree" ("tenant_id", "org_id");



CREATE INDEX "idx_carte_tenant_org_customer" ON "public"."carte" USING "btree" ("tenant_id", "org_id", "customer_id");



CREATE INDEX "idx_coupon_transaction_coupon" ON "public"."coupon_transaction" USING "btree" ("coupon_id");



CREATE INDEX "idx_coupon_transaction_customer" ON "public"."coupon_transaction" USING "btree" ("customer_id");



CREATE INDEX "idx_coupon_transaction_date" ON "public"."coupon_transaction" USING "btree" ("transaction_date_unix");



CREATE INDEX "idx_coupon_transaction_reservation" ON "public"."coupon_transaction" USING "btree" ("reservation_id");



CREATE INDEX "idx_coupon_transaction_tenant_org" ON "public"."coupon_transaction" USING "btree" ("tenant_id", "org_id");



CREATE INDEX "idx_customer_detail_customer_uid" ON "public"."customer_detail" USING "btree" ("customer_uid");



CREATE INDEX "idx_customer_email" ON "public"."customer" USING "btree" ("email");



CREATE INDEX "idx_customer_line_id" ON "public"."customer" USING "btree" ("line_id");



CREATE INDEX "idx_customer_phone" ON "public"."customer" USING "btree" ("phone");



CREATE INDEX "idx_customer_points_customer_uid" ON "public"."customer_points" USING "btree" ("customer_uid");



CREATE INDEX "idx_customer_points_salon_id" ON "public"."customer_points" USING "btree" ("salon_id");



CREATE INDEX "idx_customer_salon_id" ON "public"."customer" USING "btree" ("salon_id");



CREATE INDEX "idx_customer_tags" ON "public"."customer" USING "gin" ("tags");



CREATE INDEX "idx_customer_tenant_org_archive" ON "public"."customer" USING "btree" ("tenant_id", "org_id", "is_archive");



CREATE INDEX "idx_customer_tenant_org_new" ON "public"."customer" USING "btree" ("tenant_id", "org_id");



CREATE INDEX "idx_point_task_queue_scheduled" ON "public"."point_task_queue" USING "btree" ("scheduled_for_unix");



CREATE INDEX "idx_point_task_queue_status" ON "public"."point_task_queue" USING "btree" ("status") WHERE ("status" IS NOT NULL);



CREATE INDEX "idx_point_task_queue_tenant_org" ON "public"."point_task_queue" USING "btree" ("tenant_id", "org_id");



CREATE INDEX "idx_point_transaction_customer" ON "public"."point_transaction" USING "btree" ("customer_id");



CREATE INDEX "idx_point_transaction_date" ON "public"."point_transaction" USING "btree" ("transaction_date_unix");



CREATE INDEX "idx_point_transaction_tenant_org" ON "public"."point_transaction" USING "btree" ("tenant_id", "org_id");



CREATE INDEX "idx_point_transaction_type" ON "public"."point_transaction" USING "btree" ("transaction_type") WHERE ("transaction_type" IS NOT NULL);



CREATE INDEX "idx_tracking_event_session" ON "public"."tracking_event" USING "btree" ("session_id");



CREATE INDEX "idx_tracking_event_source" ON "public"."tracking_event" USING "btree" ("event_source");



CREATE INDEX "idx_tracking_event_tenant_org" ON "public"."tracking_event" USING "btree" ("tenant_id", "org_id");



CREATE INDEX "idx_tracking_event_timestamp" ON "public"."tracking_event" USING "btree" ("event_timestamp_unix");



CREATE INDEX "idx_tracking_event_type" ON "public"."tracking_event" USING "btree" ("event_type");



CREATE INDEX "idx_tracking_event_utm_source" ON "public"."tracking_event" USING "btree" ("utm_source") WHERE ("utm_source" IS NOT NULL);



CREATE INDEX "idx_tracking_summaries_date" ON "public"."tracking_summaries" USING "btree" ("summary_date");



CREATE INDEX "idx_tracking_summaries_dimension" ON "public"."tracking_summaries" USING "btree" ("dimension_type", "dimension_value");



CREATE INDEX "idx_tracking_summaries_tenant_org" ON "public"."tracking_summaries" USING "btree" ("tenant_id", "org_id");



CREATE INDEX "idx_tracking_summaries_tenant_org_date" ON "public"."tracking_summaries" USING "btree" ("tenant_id", "org_id", "summary_date");



CREATE OR REPLACE TRIGGER "update_customer_detail_modtime" BEFORE UPDATE ON "public"."customer_detail" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_customer_modtime" BEFORE UPDATE ON "public"."customer" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_customer_points_modtime" BEFORE UPDATE ON "public"."customer_points" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



ALTER TABLE ONLY "public"."customer_detail"
    ADD CONSTRAINT "customer_detail_customer_uid_fkey" FOREIGN KEY ("customer_uid") REFERENCES "public"."customer"("uid") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_points"
    ADD CONSTRAINT "customer_points_customer_uid_fkey" FOREIGN KEY ("customer_uid") REFERENCES "public"."customer"("uid") ON DELETE CASCADE;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON TABLE "public"."customer" TO "anon";
GRANT ALL ON TABLE "public"."customer" TO "authenticated";
GRANT ALL ON TABLE "public"."customer" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_customer_with_details_and_points"("p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_salon_id" "text", "p_line_id" "text", "p_line_user_name" "text", "p_password_hash" "text", "p_detail_email" "text", "p_detail_gender" "text", "p_detail_birthday" "date", "p_detail_age" integer, "p_detail_notes" "text", "p_initial_points" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_customer_with_details_and_points"("p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_salon_id" "text", "p_line_id" "text", "p_line_user_name" "text", "p_password_hash" "text", "p_detail_email" "text", "p_detail_gender" "text", "p_detail_birthday" "date", "p_detail_age" integer, "p_detail_notes" "text", "p_initial_points" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_customer_with_details_and_points"("p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_salon_id" "text", "p_line_id" "text", "p_line_user_name" "text", "p_password_hash" "text", "p_detail_email" "text", "p_detail_gender" "text", "p_detail_birthday" "date", "p_detail_age" integer, "p_detail_notes" "text", "p_initial_points" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_customer_with_details_and_points"("p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_salon_id" "text", "p_line_id" "text", "p_line_user_name" "text", "p_password_hash" "text", "p_detail_email" "text", "p_detail_gender" "text", "p_detail_birthday" "text", "p_detail_age" integer, "p_detail_notes" "text", "p_initial_points" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_customer_with_details_and_points"("p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_salon_id" "text", "p_line_id" "text", "p_line_user_name" "text", "p_password_hash" "text", "p_detail_email" "text", "p_detail_gender" "text", "p_detail_birthday" "text", "p_detail_age" integer, "p_detail_notes" "text", "p_initial_points" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_customer_with_details_and_points"("p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_phone" "text", "p_salon_id" "text", "p_line_id" "text", "p_line_user_name" "text", "p_password_hash" "text", "p_detail_email" "text", "p_detail_gender" "text", "p_detail_birthday" "text", "p_detail_age" integer, "p_detail_notes" "text", "p_initial_points" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_customer_and_related_data"("p_customer_uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_customer_and_related_data"("p_customer_uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_customer_and_related_data"("p_customer_uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_btree_consistent"("internal", smallint, "anyelement", integer, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_btree_consistent"("internal", smallint, "anyelement", integer, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_btree_consistent"("internal", smallint, "anyelement", integer, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_btree_consistent"("internal", smallint, "anyelement", integer, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_anyenum"("anyenum", "anyenum", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_anyenum"("anyenum", "anyenum", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_anyenum"("anyenum", "anyenum", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_anyenum"("anyenum", "anyenum", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bit"(bit, bit, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bit"(bit, bit, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bit"(bit, bit, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bit"(bit, bit, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bool"(boolean, boolean, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bool"(boolean, boolean, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bool"(boolean, boolean, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bool"(boolean, boolean, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bpchar"(character, character, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bpchar"(character, character, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bpchar"(character, character, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bpchar"(character, character, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bytea"("bytea", "bytea", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bytea"("bytea", "bytea", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bytea"("bytea", "bytea", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bytea"("bytea", "bytea", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_char"("char", "char", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_char"("char", "char", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_char"("char", "char", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_char"("char", "char", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_cidr"("cidr", "cidr", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_cidr"("cidr", "cidr", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_cidr"("cidr", "cidr", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_cidr"("cidr", "cidr", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_date"("date", "date", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_date"("date", "date", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_date"("date", "date", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_date"("date", "date", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_float4"(real, real, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_float4"(real, real, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_float4"(real, real, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_float4"(real, real, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_float8"(double precision, double precision, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_float8"(double precision, double precision, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_float8"(double precision, double precision, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_float8"(double precision, double precision, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_inet"("inet", "inet", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_inet"("inet", "inet", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_inet"("inet", "inet", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_inet"("inet", "inet", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int2"(smallint, smallint, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int2"(smallint, smallint, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int2"(smallint, smallint, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int2"(smallint, smallint, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int4"(integer, integer, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int4"(integer, integer, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int4"(integer, integer, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int4"(integer, integer, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int8"(bigint, bigint, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int8"(bigint, bigint, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int8"(bigint, bigint, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int8"(bigint, bigint, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_interval"(interval, interval, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_interval"(interval, interval, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_interval"(interval, interval, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_interval"(interval, interval, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_macaddr"("macaddr", "macaddr", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_macaddr"("macaddr", "macaddr", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_macaddr"("macaddr", "macaddr", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_macaddr"("macaddr", "macaddr", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_macaddr8"("macaddr8", "macaddr8", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_macaddr8"("macaddr8", "macaddr8", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_macaddr8"("macaddr8", "macaddr8", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_macaddr8"("macaddr8", "macaddr8", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_money"("money", "money", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_money"("money", "money", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_money"("money", "money", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_money"("money", "money", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_name"("name", "name", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_name"("name", "name", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_name"("name", "name", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_name"("name", "name", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_numeric"(numeric, numeric, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_numeric"(numeric, numeric, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_numeric"(numeric, numeric, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_numeric"(numeric, numeric, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_oid"("oid", "oid", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_oid"("oid", "oid", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_oid"("oid", "oid", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_oid"("oid", "oid", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_text"("text", "text", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_text"("text", "text", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_text"("text", "text", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_text"("text", "text", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_time"(time without time zone, time without time zone, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_time"(time without time zone, time without time zone, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_time"(time without time zone, time without time zone, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_time"(time without time zone, time without time zone, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timestamp"(timestamp without time zone, timestamp without time zone, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timestamp"(timestamp without time zone, timestamp without time zone, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timestamp"(timestamp without time zone, timestamp without time zone, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timestamp"(timestamp without time zone, timestamp without time zone, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timestamptz"(timestamp with time zone, timestamp with time zone, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timestamptz"(timestamp with time zone, timestamp with time zone, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timestamptz"(timestamp with time zone, timestamp with time zone, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timestamptz"(timestamp with time zone, timestamp with time zone, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timetz"(time with time zone, time with time zone, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timetz"(time with time zone, time with time zone, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timetz"(time with time zone, time with time zone, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timetz"(time with time zone, time with time zone, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_uuid"("uuid", "uuid", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_uuid"("uuid", "uuid", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_uuid"("uuid", "uuid", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_uuid"("uuid", "uuid", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_varbit"(bit varying, bit varying, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_varbit"(bit varying, bit varying, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_varbit"(bit varying, bit varying, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_varbit"(bit varying, bit varying, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_enum_cmp"("anyenum", "anyenum") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_enum_cmp"("anyenum", "anyenum") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_enum_cmp"("anyenum", "anyenum") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_enum_cmp"("anyenum", "anyenum") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_anyenum"("anyenum", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_anyenum"("anyenum", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_anyenum"("anyenum", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_anyenum"("anyenum", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_bit"(bit, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bit"(bit, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bit"(bit, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bit"(bit, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_bool"(boolean, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bool"(boolean, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bool"(boolean, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bool"(boolean, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_bpchar"(character, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bpchar"(character, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bpchar"(character, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bpchar"(character, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_bytea"("bytea", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bytea"("bytea", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bytea"("bytea", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bytea"("bytea", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_char"("char", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_char"("char", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_char"("char", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_char"("char", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_cidr"("cidr", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_cidr"("cidr", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_cidr"("cidr", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_cidr"("cidr", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_date"("date", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_date"("date", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_date"("date", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_date"("date", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_float4"(real, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_float4"(real, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_float4"(real, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_float4"(real, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_float8"(double precision, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_float8"(double precision, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_float8"(double precision, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_float8"(double precision, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_inet"("inet", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_inet"("inet", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_inet"("inet", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_inet"("inet", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_int2"(smallint, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_int2"(smallint, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_int2"(smallint, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_int2"(smallint, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_int4"(integer, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_int4"(integer, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_int4"(integer, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_int4"(integer, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_int8"(bigint, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_int8"(bigint, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_int8"(bigint, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_int8"(bigint, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_interval"(interval, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_interval"(interval, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_interval"(interval, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_interval"(interval, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_macaddr"("macaddr", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_macaddr"("macaddr", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_macaddr"("macaddr", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_macaddr"("macaddr", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_macaddr8"("macaddr8", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_macaddr8"("macaddr8", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_macaddr8"("macaddr8", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_macaddr8"("macaddr8", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_money"("money", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_money"("money", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_money"("money", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_money"("money", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_name"("name", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_name"("name", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_name"("name", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_name"("name", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_numeric"(numeric, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_numeric"(numeric, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_numeric"(numeric, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_numeric"(numeric, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_oid"("oid", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_oid"("oid", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_oid"("oid", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_oid"("oid", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_text"("text", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_text"("text", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_text"("text", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_text"("text", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_time"(time without time zone, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_time"(time without time zone, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_time"(time without time zone, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_time"(time without time zone, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_timestamp"(timestamp without time zone, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_timestamp"(timestamp without time zone, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_timestamp"(timestamp without time zone, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_timestamp"(timestamp without time zone, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_timestamptz"(timestamp with time zone, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_timestamptz"(timestamp with time zone, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_timestamptz"(timestamp with time zone, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_timestamptz"(timestamp with time zone, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_timetz"(time with time zone, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_timetz"(time with time zone, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_timetz"(time with time zone, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_timetz"(time with time zone, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_uuid"("uuid", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_uuid"("uuid", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_uuid"("uuid", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_uuid"("uuid", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_varbit"(bit varying, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_varbit"(bit varying, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_varbit"(bit varying, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_varbit"(bit varying, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_anyenum"("anyenum", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_anyenum"("anyenum", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_anyenum"("anyenum", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_anyenum"("anyenum", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_bit"(bit, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bit"(bit, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bit"(bit, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bit"(bit, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_bool"(boolean, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bool"(boolean, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bool"(boolean, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bool"(boolean, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_bpchar"(character, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bpchar"(character, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bpchar"(character, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bpchar"(character, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_bytea"("bytea", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bytea"("bytea", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bytea"("bytea", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bytea"("bytea", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_char"("char", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_char"("char", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_char"("char", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_char"("char", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_cidr"("cidr", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_cidr"("cidr", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_cidr"("cidr", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_cidr"("cidr", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_date"("date", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_date"("date", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_date"("date", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_date"("date", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_float4"(real, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_float4"(real, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_float4"(real, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_float4"(real, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_float8"(double precision, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_float8"(double precision, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_float8"(double precision, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_float8"(double precision, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_inet"("inet", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_inet"("inet", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_inet"("inet", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_inet"("inet", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_int2"(smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_int2"(smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_int2"(smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_int2"(smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_int4"(integer, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_int4"(integer, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_int4"(integer, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_int4"(integer, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_int8"(bigint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_int8"(bigint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_int8"(bigint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_int8"(bigint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_interval"(interval, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_interval"(interval, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_interval"(interval, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_interval"(interval, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_macaddr"("macaddr", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_macaddr"("macaddr", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_macaddr"("macaddr", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_macaddr"("macaddr", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_macaddr8"("macaddr8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_macaddr8"("macaddr8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_macaddr8"("macaddr8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_macaddr8"("macaddr8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_money"("money", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_money"("money", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_money"("money", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_money"("money", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_name"("name", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_name"("name", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_name"("name", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_name"("name", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_numeric"(numeric, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_numeric"(numeric, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_numeric"(numeric, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_numeric"(numeric, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_oid"("oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_oid"("oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_oid"("oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_oid"("oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_text"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_text"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_text"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_text"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_time"(time without time zone, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_time"(time without time zone, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_time"(time without time zone, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_time"(time without time zone, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_timestamp"(timestamp without time zone, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_timestamp"(timestamp without time zone, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_timestamp"(timestamp without time zone, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_timestamp"(timestamp without time zone, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_timestamptz"(timestamp with time zone, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_timestamptz"(timestamp with time zone, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_timestamptz"(timestamp with time zone, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_timestamptz"(timestamp with time zone, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_timetz"(time with time zone, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_timetz"(time with time zone, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_timetz"(time with time zone, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_timetz"(time with time zone, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_uuid"("uuid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_uuid"("uuid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_uuid"("uuid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_uuid"("uuid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_varbit"(bit varying, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_varbit"(bit varying, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_varbit"(bit varying, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_varbit"(bit varying, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_numeric_cmp"(numeric, numeric) TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_numeric_cmp"(numeric, numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."gin_numeric_cmp"(numeric, numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_numeric_cmp"(numeric, numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."carte" TO "anon";
GRANT ALL ON TABLE "public"."carte" TO "authenticated";
GRANT ALL ON TABLE "public"."carte" TO "service_role";



GRANT ALL ON TABLE "public"."carte_detail" TO "anon";
GRANT ALL ON TABLE "public"."carte_detail" TO "authenticated";
GRANT ALL ON TABLE "public"."carte_detail" TO "service_role";



GRANT ALL ON TABLE "public"."coupon_transaction" TO "anon";
GRANT ALL ON TABLE "public"."coupon_transaction" TO "authenticated";
GRANT ALL ON TABLE "public"."coupon_transaction" TO "service_role";



GRANT ALL ON TABLE "public"."customer_detail" TO "anon";
GRANT ALL ON TABLE "public"."customer_detail" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_detail" TO "service_role";



GRANT ALL ON TABLE "public"."customer_points" TO "anon";
GRANT ALL ON TABLE "public"."customer_points" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_points" TO "service_role";



GRANT ALL ON TABLE "public"."point_task_queue" TO "anon";
GRANT ALL ON TABLE "public"."point_task_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."point_task_queue" TO "service_role";



GRANT ALL ON TABLE "public"."point_transaction" TO "anon";
GRANT ALL ON TABLE "public"."point_transaction" TO "authenticated";
GRANT ALL ON TABLE "public"."point_transaction" TO "service_role";



GRANT ALL ON TABLE "public"."tracking_event" TO "anon";
GRANT ALL ON TABLE "public"."tracking_event" TO "authenticated";
GRANT ALL ON TABLE "public"."tracking_event" TO "service_role";



GRANT ALL ON TABLE "public"."tracking_summaries" TO "anon";
GRANT ALL ON TABLE "public"."tracking_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."tracking_summaries" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
