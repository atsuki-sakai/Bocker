-- Add staff_name column to carte_detail table
ALTER TABLE carte_detail
ADD COLUMN IF NOT EXISTS staff_name text;

-- Add comment to describe the column
COMMENT ON COLUMN carte_detail.staff_name IS 'Name of the staff member who performed the service';