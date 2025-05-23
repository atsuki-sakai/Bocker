    CREATE OR REPLACE FUNCTION delete_customer_and_related_data(p_customer_uid UUID)
    RETURNS VOID
    LANGUAGE plpgsql
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