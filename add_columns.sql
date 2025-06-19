-- staff_name列が存在しない場合のみ追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'carte_detail' 
        AND column_name = 'staff_name'
    ) THEN
        ALTER TABLE carte_detail ADD COLUMN staff_name text;
        COMMENT ON COLUMN carte_detail.staff_name IS 'Name of the staff member who performed the service';
    END IF;
END $$;

-- service_start_time列が存在しない場合のみ追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'carte_detail' 
        AND column_name = 'service_start_time'
    ) THEN
        ALTER TABLE carte_detail ADD COLUMN service_start_time timestamptz;
        COMMENT ON COLUMN carte_detail.service_start_time IS 'Start time of the service/treatment';
    END IF;
END $$;