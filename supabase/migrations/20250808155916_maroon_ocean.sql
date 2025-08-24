/*
  # Add Lead Notes and Activity Tracking

  1. New Tables
    - `lead_notes`
      - `id` (uuid, primary key)
      - `lead_id` (uuid, foreign key to leads)
      - `user_id` (uuid, foreign key to user_profiles)
      - `content` (text, note content)
      - `created_at` (timestamp)
    - `lead_activities`
      - `id` (uuid, primary key)
      - `lead_id` (uuid, foreign key to leads)
      - `user_id` (uuid, foreign key to user_profiles)
      - `activity_type` (text, type of activity)
      - `description` (text, activity description)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for organization-based access
*/

-- Create lead_notes table
CREATE TABLE IF NOT EXISTS lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create lead_activities table
CREATE TABLE IF NOT EXISTS lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON lead_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at DESC);

-- RLS Policies for lead_notes
CREATE POLICY "Users can view notes for leads in their organization"
  ON lead_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN user_profiles up ON up.organisation_id = l.organisation_id
      WHERE l.id = lead_notes.lead_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can create notes for leads in their organization"
  ON lead_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN user_profiles up ON up.organisation_id = l.organisation_id
      WHERE l.id = lead_notes.lead_id
      AND up.id = auth.uid()
      AND lead_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notes"
  ON lead_notes
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notes"
  ON lead_notes
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for lead_activities
CREATE POLICY "Users can view activities for leads in their organization"
  ON lead_activities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN user_profiles up ON up.organisation_id = l.organisation_id
      WHERE l.id = lead_activities.lead_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "System can create activities"
  ON lead_activities
  FOR INSERT
  WITH CHECK (true);