/*
  # Create Teams Management System

  1. New Tables
    - `teams`
      - `id` (uuid, primary key)
      - `organisation_id` (uuid, foreign key)
      - `name` (text, not null)
      - `description` (text)
      - `specialty` (enum)
      - `team_leader_id` (uuid, foreign key)
      - `is_active` (boolean, default true)
      - `hourly_rate` (decimal, nullable)
      - `created_at` (timestampz)
    
    - `team_members`
      - `id` (uuid, primary key)
      - `organisation_id` (uuid, foreign key)
      - `team_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `role_in_team` (enum)
      - `joined_date` (date)
      - `is_active` (boolean, default true)

  2. Enhanced Orders Table
    - Add team assignment fields
    - Add job type and description fields
    - Maintain backward compatibility

  3. Security
    - Enable RLS on all new tables
    - Add policies for team data access
    - Organization-level isolation
*/

-- Create specialty enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_specialty') THEN
    CREATE TYPE team_specialty AS ENUM (
      'fönsterputsning',
      'taktvätt', 
      'fasadtvätt',
      'allmänt',
      'övrigt'
    );
  END IF;
END $$;

-- Create team role enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_role') THEN
    CREATE TYPE team_role AS ENUM (
      'ledare',
      'senior',
      'medarbetare',
      'lärling'
    );
  END IF;
END $$;

-- Create assignment type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_type') THEN
    CREATE TYPE assignment_type AS ENUM (
      'individual',
      'team'
    );
  END IF;
END $$;

-- Create job type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type') THEN
    CREATE TYPE job_type AS ENUM (
      'fönsterputsning',
      'taktvätt',
      'fasadtvätt',
      'allmänt'
    );
  END IF;
END $$;

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  specialty team_specialty NOT NULL,
  team_leader_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  hourly_rate decimal(10,2),
  created_at timestamptz DEFAULT now()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  role_in_team team_role DEFAULT 'medarbetare',
  joined_date date DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to orders table
DO $$
BEGIN
  -- Add assigned_to_team_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'assigned_to_team_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN assigned_to_team_id uuid REFERENCES teams(id) ON DELETE SET NULL;
  END IF;

  -- Add assignment_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'assignment_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN assignment_type assignment_type DEFAULT 'individual';
  END IF;

  -- Add job_description column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'job_description'
  ) THEN
    ALTER TABLE orders ADD COLUMN job_description text;
  END IF;

  -- Add job_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'job_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN job_type job_type DEFAULT 'allmänt';
  END IF;

  -- Add estimated_hours column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'estimated_hours'
  ) THEN
    ALTER TABLE orders ADD COLUMN estimated_hours decimal(5,2);
  END IF;

  -- Add complexity_level column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'complexity_level'
  ) THEN
    ALTER TABLE orders ADD COLUMN complexity_level integer CHECK (complexity_level >= 1 AND complexity_level <= 5);
  END IF;
END $$;

-- Create indexes for teams
CREATE INDEX IF NOT EXISTS idx_teams_organisation_id ON teams(organisation_id);
CREATE INDEX IF NOT EXISTS idx_teams_specialty ON teams(specialty);
CREATE INDEX IF NOT EXISTS idx_teams_leader ON teams(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active);

-- Create indexes for team_members
CREATE INDEX IF NOT EXISTS idx_team_members_organisation_id ON team_members(organisation_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(is_active);

-- Create indexes for enhanced orders
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to_team ON orders(assigned_to_team_id);
CREATE INDEX IF NOT EXISTS idx_orders_assignment_type ON orders(assignment_type);
CREATE INDEX IF NOT EXISTS idx_orders_job_type ON orders(job_type);

-- Enable RLS on teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Users can view teams in their organization"
  ON teams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = teams.organisation_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage teams"
  ON teams
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = teams.organisation_id
      AND up.id = auth.uid()
      AND up.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = teams.organisation_id
      AND up.id = auth.uid()
      AND up.role = 'admin'
    )
  );

-- Enable RLS on team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Team members policies
CREATE POLICY "Users can view team members in their organization"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = team_members.organisation_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Admins and team leaders can manage team members"
  ON team_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = team_members.organisation_id
      AND up.id = auth.uid()
      AND (
        up.role = 'admin' OR
        EXISTS (
          SELECT 1 FROM teams t
          WHERE t.id = team_members.team_id
          AND t.team_leader_id = up.id
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = team_members.organisation_id
      AND up.id = auth.uid()
      AND (
        up.role = 'admin' OR
        EXISTS (
          SELECT 1 FROM teams t
          WHERE t.id = team_members.team_id
          AND t.team_leader_id = up.id
        )
      )
    )
  );

-- Add constraint to ensure unique team membership per user per team
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unique_user_team_membership'
  ) THEN
    ALTER TABLE team_members 
    ADD CONSTRAINT unique_user_team_membership 
    UNIQUE (team_id, user_id);
  END IF;
END $$;

-- Add constraint to ensure team leader is a member of the team
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_team_leader_is_member'
  ) THEN
    -- This will be enforced at application level for now
    -- as it requires complex checking
  END IF;
END $$;