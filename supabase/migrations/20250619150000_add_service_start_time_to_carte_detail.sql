-- Add service_start_time column to carte_detail table
ALTER TABLE carte_detail
ADD COLUMN IF NOT EXISTS service_start_time timestamptz;

-- Add comment to describe the column
COMMENT ON COLUMN carte_detail.service_start_time IS 'Start time of the service/treatment';