/*
  # Create unified Orders system

  1. New Tables
    - `orders` table combining leads and jobs functionality
      - `id` (uuid, primary key)
      - `organisation_id` (uuid, foreign key to organisations)
      - `customer_id` (uuid, foreign key to customers)
      - `title` (text, not null)
      - `description` (text, nullable)
      - `value` (decimal, nullable)
      - `assigned_to_user_id` (uuid, foreign key to user_profiles, nullable)
      - `status` (enum: öppen_order, bokad_bekräftad, avbokad_kund, ej_slutfört, redo_fakturera)
      - `source` (text, nullable)
      - `created_at` (timestampz, default now())

  2. Security
    - Enable RLS on `orders` table
    - Add policies for authenticated users to manage orders in their organization

  3. Migration
    - Migrate existing leads and jobs data to orders table
    - Update related tables to reference orders instead of leads/jobs where appropriate
*/

-- Create order status enum
CREATE TYPE order_status AS ENUM (
  'öppen_order',
  'bokad_bekräftad', 
  'avbokad_kund',
  'ej_slutfört',
  'redo_fakturera'
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  value numeric(12,2),
  assigned_to_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'öppen_order',
  source text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_organisation_id ON orders(organisation_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON orders(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- RLS Policies
CREATE POLICY "Users can view orders for their organization"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = orders.organisation_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can create orders for their organization"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = orders.organisation_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can update orders for their organization"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = orders.organisation_id
      AND up.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = orders.organisation_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete orders for their organization"
  ON orders
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = orders.organisation_id
      AND up.id = auth.uid()
    )
  );

-- Create order activities table for tracking changes
CREATE TABLE IF NOT EXISTS order_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  description text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on order activities
ALTER TABLE order_activities ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_activities_order_id ON order_activities(order_id);
CREATE INDEX IF NOT EXISTS idx_order_activities_created_at ON order_activities(created_at DESC);

-- RLS Policies for order activities
CREATE POLICY "Users can view order activities for their organization"
  ON order_activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN user_profiles up ON up.organisation_id = o.organisation_id
      WHERE o.id = order_activities.order_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can create order activities for their organization"
  ON order_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN user_profiles up ON up.organisation_id = o.organisation_id
      WHERE o.id = order_activities.order_id
      AND up.id = auth.uid()
    )
  );

-- Create order notes table
CREATE TABLE IF NOT EXISTS order_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on order notes
ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_notes_order_id ON order_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_order_notes_created_at ON order_notes(created_at DESC);

-- RLS Policies for order notes
CREATE POLICY "Users can view notes for orders in their organization"
  ON order_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN user_profiles up ON up.organisation_id = o.organisation_id
      WHERE o.id = order_notes.order_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can create notes for orders in their organization"
  ON order_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN user_profiles up ON up.organisation_id = o.organisation_id
      WHERE o.id = order_notes.order_id
      AND up.id = auth.uid()
      AND order_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notes"
  ON order_notes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notes"
  ON order_notes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Data migration from leads to orders
INSERT INTO orders (
  id,
  organisation_id,
  customer_id,
  title,
  description,
  value,
  assigned_to_user_id,
  status,
  source,
  created_at
)
SELECT 
  id,
  organisation_id,
  customer_id,
  title,
  description,
  estimated_value,
  assigned_to_user_id,
  CASE 
    WHEN status = 'new' THEN 'öppen_order'::order_status
    WHEN status = 'contacted' THEN 'öppen_order'::order_status
    WHEN status = 'qualified' THEN 'bokad_bekräftad'::order_status
    WHEN status = 'won' THEN 'redo_fakturera'::order_status
    WHEN status = 'lost' THEN 'avbokad_kund'::order_status
    ELSE 'öppen_order'::order_status
  END,
  source,
  created_at
FROM leads
WHERE NOT EXISTS (
  SELECT 1 FROM orders WHERE orders.id = leads.id
);

-- Data migration from jobs to orders (only if not already migrated from leads)
INSERT INTO orders (
  organisation_id,
  customer_id,
  title,
  description,
  value,
  assigned_to_user_id,
  status,
  source,
  created_at
)
SELECT 
  organisation_id,
  customer_id,
  title,
  description,
  value,
  assigned_to_user_id,
  CASE 
    WHEN status = 'pending' THEN 'öppen_order'::order_status
    WHEN status = 'in_progress' THEN 'bokad_bekräftad'::order_status
    WHEN status = 'completed' THEN 'redo_fakturera'::order_status
    WHEN status = 'invoiced' THEN 'redo_fakturera'::order_status
    ELSE 'öppen_order'::order_status
  END,
  'Migrerat från jobb',
  created_at
FROM jobs
WHERE NOT EXISTS (
  SELECT 1 FROM orders WHERE orders.organisation_id = jobs.organisation_id AND orders.title = jobs.title
);

-- Migrate lead notes to order notes
INSERT INTO order_notes (order_id, user_id, content, created_at)
SELECT lead_id, user_id, content, created_at
FROM lead_notes
WHERE EXISTS (SELECT 1 FROM orders WHERE orders.id = lead_notes.lead_id)
AND NOT EXISTS (
  SELECT 1 FROM order_notes 
  WHERE order_notes.order_id = lead_notes.lead_id 
  AND order_notes.user_id = lead_notes.user_id 
  AND order_notes.content = lead_notes.content
);

-- Migrate lead activities to order activities
INSERT INTO order_activities (order_id, user_id, activity_type, description, created_at)
SELECT lead_id, user_id, activity_type, description, created_at
FROM lead_activities
WHERE EXISTS (SELECT 1 FROM orders WHERE orders.id = lead_activities.lead_id)
AND NOT EXISTS (
  SELECT 1 FROM order_activities 
  WHERE order_activities.order_id = lead_activities.lead_id 
  AND order_activities.user_id = lead_activities.user_id 
  AND order_activities.description = lead_activities.description
);

-- Migrate job activities to order activities
INSERT INTO order_activities (order_id, user_id, activity_type, description, old_value, new_value, created_at)
SELECT 
  o.id,
  ja.user_id,
  ja.activity_type,
  ja.description,
  ja.old_value,
  ja.new_value,
  ja.created_at
FROM job_activities ja
JOIN jobs j ON j.id = ja.job_id
JOIN orders o ON o.organisation_id = j.organisation_id AND o.title = j.title
WHERE NOT EXISTS (
  SELECT 1 FROM order_activities oa
  WHERE oa.order_id = o.id 
  AND oa.user_id = ja.user_id 
  AND oa.description = ja.description
  AND oa.created_at = ja.created_at
);

-- Update calendar events to reference orders instead of leads/jobs
DO $$
BEGIN
  -- Add order_id column to calendar_events if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_events' AND column_name = 'related_order_id'
  ) THEN
    ALTER TABLE calendar_events ADD COLUMN related_order_id uuid REFERENCES orders(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_calendar_events_order_id ON calendar_events(related_order_id);
  END IF;
END $$;

-- Update calendar events to link to orders
UPDATE calendar_events 
SET related_order_id = related_lead_id
WHERE related_lead_id IS NOT NULL 
AND EXISTS (SELECT 1 FROM orders WHERE orders.id = related_lead_id);

UPDATE calendar_events 
SET related_order_id = o.id
FROM orders o
JOIN jobs j ON j.organisation_id = o.organisation_id AND j.title = o.title
WHERE calendar_events.related_job_id = j.id
AND calendar_events.related_order_id IS NULL;

-- Update quotes to reference orders instead of leads
DO $$
BEGIN
  -- Add order_id column to quotes if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE quotes ADD COLUMN order_id uuid REFERENCES orders(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_quotes_order_id ON quotes(order_id);
  END IF;
END $$;

-- Link existing quotes to orders
UPDATE quotes 
SET order_id = lead_id
WHERE lead_id IS NOT NULL 
AND EXISTS (SELECT 1 FROM orders WHERE orders.id = quotes.lead_id);

-- Update invoices to reference orders
DO $$
BEGIN
  -- Add order_id column to invoices if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN order_id uuid REFERENCES orders(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
  END IF;
END $$;

-- Link existing invoices to orders through jobs
UPDATE invoices 
SET order_id = o.id
FROM orders o
JOIN jobs j ON j.organisation_id = o.organisation_id AND j.title = o.title
WHERE invoices.job_id = j.id
AND invoices.order_id IS NULL;

-- Create function to automatically create order from accepted quote
CREATE OR REPLACE FUNCTION create_order_from_quote()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create order if quote status changed to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    INSERT INTO orders (
      organisation_id,
      customer_id,
      title,
      description,
      value,
      status,
      source,
      created_at
    ) VALUES (
      NEW.organisation_id,
      NEW.customer_id,
      NEW.title,
      NEW.description,
      NEW.total_amount,
      'öppen_order',
      'Accepterad offert',
      now()
    );
    
    -- Update quote to reference the new order
    UPDATE quotes 
    SET order_id = (
      SELECT id FROM orders 
      WHERE organisation_id = NEW.organisation_id 
      AND customer_id = NEW.customer_id 
      AND title = NEW.title 
      ORDER BY created_at DESC 
      LIMIT 1
    )
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic order creation
DROP TRIGGER IF EXISTS trigger_create_order_from_quote ON quotes;
CREATE TRIGGER trigger_create_order_from_quote
  AFTER UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION create_order_from_quote();