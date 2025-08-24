/*
  # Create Communications Table

  1. New Tables
    - `communications`
      - `id` (uuid, primary key)
      - `organisation_id` (uuid, foreign key to organisations)
      - `order_id` (uuid, foreign key to orders)
      - `type` (enum: 'email', 'sms')
      - `recipient` (text, email or phone number)
      - `subject` (text, for emails)
      - `content` (text, message content)
      - `status` (enum: 'draft', 'sent', 'delivered', 'read', 'failed')
      - `sent_at` (timestamp)
      - `delivered_at` (timestamp)
      - `read_at` (timestamp)
      - `created_by_user_id` (uuid, foreign key to user_profiles)
      - `created_at` (timestamp)
      - `error_message` (text, for failed sends)

  2. Security
    - Enable RLS on `communications` table
    - Add policies for organization-based access
*/

-- Create enum for communication types
CREATE TYPE communication_type AS ENUM ('email', 'sms');

-- Create enum for communication status
CREATE TYPE communication_status AS ENUM ('draft', 'sent', 'delivered', 'read', 'failed');

-- Create communications table
CREATE TABLE IF NOT EXISTS communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type communication_type NOT NULL,
  recipient text NOT NULL,
  subject text,
  content text NOT NULL,
  status communication_status DEFAULT 'draft',
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  error_message text
);

-- Create indexes for better performance
CREATE INDEX idx_communications_organisation_id ON communications(organisation_id);
CREATE INDEX idx_communications_order_id ON communications(order_id);
CREATE INDEX idx_communications_type ON communications(type);
CREATE INDEX idx_communications_status ON communications(status);
CREATE INDEX idx_communications_created_at ON communications(created_at DESC);
CREATE INDEX idx_communications_sent_at ON communications(sent_at DESC);

-- Enable RLS
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view communications for their organization"
  ON communications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = communications.organisation_id
      AND up.id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create communications for their organization"
  ON communications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = communications.organisation_id
      AND up.id = (SELECT auth.uid())
      AND communications.created_by_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update their own communications"
  ON communications
  FOR UPDATE
  TO authenticated
  USING (created_by_user_id = (SELECT auth.uid()))
  WITH CHECK (created_by_user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own communications"
  ON communications
  FOR DELETE
  TO authenticated
  USING (created_by_user_id = (SELECT auth.uid()));