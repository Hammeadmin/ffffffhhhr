/*
  # Enhance Jobs Table for Comprehensive Job Tracking

  1. New Columns
    - Add job_number for auto-generated JOBB-YYYY-XXX format
    - Add priority field (Hög/Normal/Låg)
    - Add deadline date field
    - Add progress percentage field

  2. Database Function
    - Create generate_job_number function for auto-numbering

  3. Indexes
    - Add performance indexes for common queries

  4. Constraints
    - Ensure job numbers are unique per organization
*/

-- Add new columns to jobs table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'job_number'
  ) THEN
    ALTER TABLE jobs ADD COLUMN job_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'priority'
  ) THEN
    ALTER TABLE jobs ADD COLUMN priority text DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'deadline'
  ) THEN
    ALTER TABLE jobs ADD COLUMN deadline date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'progress'
  ) THEN
    ALTER TABLE jobs ADD COLUMN progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);
  END IF;
END $$;

-- Create unique constraint for job numbers per organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unique_job_number_per_org'
  ) THEN
    ALTER TABLE jobs ADD CONSTRAINT unique_job_number_per_org UNIQUE (organisation_id, job_number);
  END IF;
END $$;

-- Create function to generate job numbers
CREATE OR REPLACE FUNCTION generate_job_number(org_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  current_year text;
  next_number integer;
  job_number text;
BEGIN
  -- Get current year
  current_year := EXTRACT(YEAR FROM NOW())::text;
  
  -- Find the highest existing job number for this year and organization
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN job_number ~ ('^JOBB-' || current_year || '-[0-9]+$')
        THEN CAST(SUBSTRING(job_number FROM '[0-9]+$') AS integer)
        ELSE 0
      END
    ), 0
  ) + 1
  INTO next_number
  FROM jobs
  WHERE organisation_id = org_id
    AND job_number IS NOT NULL;
  
  -- Format the job number with zero padding
  job_number := 'JOBB-' || current_year || '-' || LPAD(next_number::text, 3, '0');
  
  RETURN job_number;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority);
CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON jobs(deadline);
CREATE INDEX IF NOT EXISTS idx_jobs_progress ON jobs(progress);
CREATE INDEX IF NOT EXISTS idx_jobs_job_number ON jobs(job_number);

-- Create job activities table for tracking status changes
CREATE TABLE IF NOT EXISTS job_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  description text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for job activities
CREATE INDEX IF NOT EXISTS idx_job_activities_job_id ON job_activities(job_id);
CREATE INDEX IF NOT EXISTS idx_job_activities_created_at ON job_activities(created_at DESC);

-- Enable RLS on job activities
ALTER TABLE job_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for job activities
CREATE POLICY "Users can view job activities for their organization" ON job_activities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN user_profiles up ON up.organisation_id = j.organisation_id
      WHERE j.id = job_activities.job_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can create job activities for their organization" ON job_activities
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN user_profiles up ON up.organisation_id = j.organisation_id
      WHERE j.id = job_activities.job_id AND up.id = auth.uid()
    )
  );