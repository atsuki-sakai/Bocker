ALTER TABLE reservation
  ADD CONSTRAINT menus_is_array_of_object_chk
  CHECK (
    jsonb_typeof(menus) = 'array' AND
    NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(menus) AS elem
      WHERE jsonb_typeof(elem) <> 'object'
    )
  );