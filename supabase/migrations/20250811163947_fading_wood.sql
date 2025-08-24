/*
# Enhanced Invoice Management with Team Integration and Email System

1. New Tables
   - `invoice_emails` - Track email communications for invoices
   - `team_job_participation` - Track team member participation in jobs

2. Enhanced Tables
   - Add team assignment fields to invoices
   - Add job details from orders
   - Add email tracking fields

3. Security
   - Enable RLS on all new tables
   - Add policies for organization-level access
   - Ensure proper team member access controls
*/

-- Add new columns to invoices table
DO $$
BEGIN
  -- Add assigned_team_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'assigned_team_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN assigned_team_id uuid REFERENCES teams(id) ON DELETE SET NULL;
  END IF;

  -- Add assigned_user_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'assigned_user_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN assigned_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add job_description column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'job_description'
  ) THEN
    ALTER TABLE invoices ADD COLUMN job_description text;
  END IF;

  -- Add job_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'job_type'
  ) THEN
    ALTER TABLE invoices ADD COLUMN job_type job_type DEFAULT 'allmänt';
  END IF;

  -- Add team_members_involved column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'team_members_involved'
  ) THEN
    ALTER TABLE invoices ADD COLUMN team_members_involved jsonb;
  END IF;

  -- Add work_summary column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'work_summary'
  ) THEN
    ALTER TABLE invoices ADD COLUMN work_summary text;
  END IF;

  -- Add email_sent column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'email_sent'
  ) THEN
    ALTER TABLE invoices ADD COLUMN email_sent boolean DEFAULT false;
  END IF;

  -- Add email_sent_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'email_sent_at'
  ) THEN
    ALTER TABLE invoices ADD COLUMN email_sent_at timestamptz;
  END IF;

  -- Add email_recipient column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'email_recipient'
  ) THEN
    ALTER TABLE invoices ADD COLUMN email_recipient text;
  END IF;
END $$;

-- Create invoice_emails table
CREATE TABLE IF NOT EXISTS invoice_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  email_body text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'failed')),
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create team_job_participation table
CREATE TABLE IF NOT EXISTS team_job_participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  hours_worked numeric(5,2) NOT NULL DEFAULT 0,
  role_in_job text NOT NULL,
  commission_percentage numeric(5,2) DEFAULT 0,
  work_description text,
  quality_rating integer CHECK (quality_rating >= 1 AND quality_rating <= 5),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_emails_invoice_id ON invoice_emails(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_emails_organisation_id ON invoice_emails(organisation_id);
CREATE INDEX IF NOT EXISTS idx_invoice_emails_status ON invoice_emails(status);
CREATE INDEX IF NOT EXISTS idx_invoice_emails_sent_at ON invoice_emails(sent_at);

CREATE INDEX IF NOT EXISTS idx_team_job_participation_invoice_id ON team_job_participation(invoice_id);
CREATE INDEX IF NOT EXISTS idx_team_job_participation_organisation_id ON team_job_participation(organisation_id);
CREATE INDEX IF NOT EXISTS idx_team_job_participation_user_id ON team_job_participation(user_id);

CREATE INDEX IF NOT EXISTS idx_invoices_assigned_team_id ON invoices(assigned_team_id);
CREATE INDEX IF NOT EXISTS idx_invoices_assigned_user_id ON invoices(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job_type ON invoices(job_type);
CREATE INDEX IF NOT EXISTS idx_invoices_email_sent ON invoices(email_sent);

-- Enable RLS on new tables
ALTER TABLE invoice_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_job_participation ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoice_emails
CREATE POLICY "Users can view invoice emails for their organization"
  ON invoice_emails
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = invoice_emails.organisation_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can create invoice emails for their organization"
  ON invoice_emails
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = invoice_emails.organisation_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can update invoice emails for their organization"
  ON invoice_emails
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = invoice_emails.organisation_id
      AND up.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = invoice_emails.organisation_id
      AND up.id = auth.uid()
    )
  );

-- RLS policies for team_job_participation
CREATE POLICY "Users can view team job participation for their organization"
  ON team_job_participation
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = team_job_participation.organisation_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Admins and team leaders can manage team job participation"
  ON team_job_participation
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = team_job_participation.organisation_id
      AND up.id = auth.uid()
      AND (
        up.role = 'admin'
        OR EXISTS (
          SELECT 1 FROM teams t
          WHERE t.organisation_id = up.organisation_id
          AND t.team_leader_id = up.id
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = team_job_participation.organisation_id
      AND up.id = auth.uid()
      AND (
        up.role = 'admin'
        OR EXISTS (
          SELECT 1 FROM teams t
          WHERE t.organisation_id = up.organisation_id
          AND t.team_leader_id = up.id
        )
      )
    )
  );

-- Function to automatically populate invoice team/job data from orders
CREATE OR REPLACE FUNCTION populate_invoice_from_order()
RETURNS TRIGGER AS $$
BEGIN
  -- If order_id is provided, copy team and job data from the order
  IF NEW.order_id IS NOT NULL THEN
    UPDATE invoices SET
      assigned_team_id = COALESCE(NEW.assigned_team_id, (
        SELECT assigned_to_team_id FROM orders WHERE id = NEW.order_id
      )),
      assigned_user_id = COALESCE(NEW.assigned_user_id, (
        SELECT assigned_to_user_id FROM orders WHERE id = NEW.order_id
      )),
      job_description = COALESCE(NEW.job_description, (
        SELECT job_description FROM orders WHERE id = NEW.order_id
      )),
      job_type = COALESCE(NEW.job_type, (
        SELECT job_type FROM orders WHERE id = NEW.order_id
      ))
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic population
DROP TRIGGER IF EXISTS trigger_populate_invoice_from_order ON invoices;
CREATE TRIGGER trigger_populate_invoice_from_order
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION populate_invoice_from_order();