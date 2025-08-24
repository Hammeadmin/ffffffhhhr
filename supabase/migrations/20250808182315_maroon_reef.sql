/*
# Create Reminder Logs Table

1. New Table
   - `reminder_logs` table to track sent reminders
   - Prevents duplicate reminders from being sent
   - Provides audit trail of all reminder activity

2. Columns
   - Links to quotes, invoices, and organizations
   - Tracks reminder type and timing
   - Records email delivery status
   - Timestamps for audit purposes

3. Security
   - RLS enabled for organization-based access
   - Indexes for efficient querying
   - Constraints to ensure data integrity
*/

-- Create reminder_logs table
CREATE TABLE IF NOT EXISTS reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('quote_followup', 'invoice_payment')),
  days_offset integer NOT NULL,
  email_sent boolean DEFAULT false,
  email_error text,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_reminder_logs_organisation_id ON reminder_logs(organisation_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_quote_id ON reminder_logs(quote_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_invoice_id ON reminder_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_type_days ON reminder_logs(reminder_type, days_offset);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent_at ON reminder_logs(sent_at);

-- Add constraint to ensure either quote_id or invoice_id is set, but not both
ALTER TABLE reminder_logs ADD CONSTRAINT check_reminder_target 
  CHECK (
    (quote_id IS NOT NULL AND invoice_id IS NULL) OR 
    (quote_id IS NULL AND invoice_id IS NOT NULL)
  );

-- Add unique constraint to prevent duplicate reminders
CREATE UNIQUE INDEX IF NOT EXISTS unique_quote_reminder 
  ON reminder_logs(quote_id, reminder_type, days_offset) 
  WHERE quote_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_invoice_reminder 
  ON reminder_logs(invoice_id, reminder_type, days_offset) 
  WHERE invoice_id IS NOT NULL;

-- Enable RLS
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view reminder logs for their organization"
  ON reminder_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.organisation_id = reminder_logs.organisation_id 
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "System can insert reminder logs"
  ON reminder_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "System can update reminder logs"
  ON reminder_logs
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE reminder_logs IS 'Tracks sent email reminders for quotes and invoices to prevent duplicates and provide audit trail';