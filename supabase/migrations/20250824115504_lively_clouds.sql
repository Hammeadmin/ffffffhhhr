/*
  # Create time logs table for worker time tracking

  1. New Tables
    - `time_logs`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to orders)
      - `user_id` (uuid, foreign key to user_profiles)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz, nullable)
      - `break_duration` (integer, minutes)
      - `notes` (text, nullable)
      - `is_approved` (boolean, default false)
      - `hourly_rate` (numeric)
      - `total_amount` (numeric, calculated)
      - `location_lat` (numeric, nullable)
      - `location_lng` (numeric, nullable)
      - `photo_urls` (jsonb, array of photo URLs)
      - `materials_used` (jsonb, array of materials)
      - `travel_time_minutes` (integer, default 0)
      - `work_type` (text, type of work performed)
      - `weather_conditions` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `time_logs` table
    - Add policies for workers to manage their own time logs
    - Add policies for admins and team leaders to view/approve time logs

  3. Indexes
    - Index on user_id for fast worker queries
    - Index on order_id for order-based reporting
    - Index on start_time for date range queries
    - Index on is_approved for approval workflows
*/

CREATE TABLE IF NOT EXISTS time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  break_duration integer DEFAULT 0,
  notes text,
  is_approved boolean DEFAULT false,
  hourly_rate numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) DEFAULT 0,
  location_lat numeric(10,6),
  location_lng numeric(10,6),
  photo_urls jsonb DEFAULT '[]'::jsonb,
  materials_used jsonb DEFAULT '[]'::jsonb,
  travel_time_minutes integer DEFAULT 0,
  work_type text,
  weather_conditions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_logs_user_id ON time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_order_id ON time_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_start_time ON time_logs(start_time);
CREATE INDEX IF NOT EXISTS idx_time_logs_is_approved ON time_logs(is_approved);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_date ON time_logs(user_id, start_time);

-- RLS Policies
CREATE POLICY "Workers can manage their own time logs"
  ON time_logs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins and team leaders can view all time logs in their organization"
  ON time_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.organisation_id = (
        SELECT up2.organisation_id 
        FROM user_profiles up2 
        WHERE up2.id = time_logs.user_id
      )
      AND (
        up.role = 'admin'
        OR (
          up.role = 'sales' 
          AND EXISTS (
            SELECT 1 FROM teams t
            WHERE t.team_leader_id = up.id
            AND EXISTS (
              SELECT 1 FROM team_members tm
              WHERE tm.team_id = t.id
              AND tm.user_id = time_logs.user_id
              AND tm.is_active = true
            )
          )
        )
      )
    )
  );

CREATE POLICY "Admins and team leaders can approve time logs"
  ON time_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.organisation_id = (
        SELECT up2.organisation_id 
        FROM user_profiles up2 
        WHERE up2.id = time_logs.user_id
      )
      AND (
        up.role = 'admin'
        OR (
          up.role = 'sales' 
          AND EXISTS (
            SELECT 1 FROM teams t
            WHERE t.team_leader_id = up.id
            AND EXISTS (
              SELECT 1 FROM team_members tm
              WHERE tm.team_id = t.id
              AND tm.user_id = time_logs.user_id
              AND tm.is_active = true
            )
          )
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.organisation_id = (
        SELECT up2.organisation_id 
        FROM user_profiles up2 
        WHERE up2.id = time_logs.user_id
      )
      AND (
        up.role = 'admin'
        OR (
          up.role = 'sales' 
          AND EXISTS (
            SELECT 1 FROM teams t
            WHERE t.team_leader_id = up.id
            AND EXISTS (
              SELECT 1 FROM team_members tm
              WHERE tm.team_id = t.id
              AND tm.user_id = time_logs.user_id
              AND tm.is_active = true
            )
          )
        )
      )
    )
  );

-- Function to calculate total amount when time log is updated
CREATE OR REPLACE FUNCTION calculate_time_log_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if we have both start and end time
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    -- Calculate total minutes worked (excluding breaks)
    NEW.total_amount := (
      EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60 - COALESCE(NEW.break_duration, 0)
    ) / 60 * NEW.hourly_rate;
  ELSE
    NEW.total_amount := 0;
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate amount
CREATE TRIGGER trigger_calculate_time_log_amount
  BEFORE INSERT OR UPDATE ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_log_amount();

-- Add hourly_rate to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'hourly_rate'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN hourly_rate numeric(10,2) DEFAULT 650;
  END IF;
END $$;