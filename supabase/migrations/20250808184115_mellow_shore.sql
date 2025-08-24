/*
  # Add Calendar Event Fields

  1. New Columns
    - Add `description` field for event details
    - Add `location` field for meeting places
    
  2. Security
    - No changes to existing RLS policies needed
*/

DO $$
BEGIN
  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_events' AND column_name = 'description'
  ) THEN
    ALTER TABLE calendar_events ADD COLUMN description text;
  END IF;

  -- Add location column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_events' AND column_name = 'location'
  ) THEN
    ALTER TABLE calendar_events ADD COLUMN location text;
  END IF;
END $$;