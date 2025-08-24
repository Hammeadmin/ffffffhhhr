/*
  # Create quote line items table and update quotes table

  1. New Tables
    - `quote_line_items`
      - `id` (uuid, primary key)
      - `quote_id` (uuid, foreign key to quotes)
      - `description` (text)
      - `quantity` (numeric)
      - `unit_price` (numeric)
      - `total` (numeric)
      - `sort_order` (integer)
      - `created_at` (timestamp)

  2. Updates to quotes table
    - Add `quote_number` column
    - Add `subtotal` column
    - Add `vat_amount` column

  3. Security
    - Enable RLS on `quote_line_items` table
    - Add policies for authenticated users to manage line items based on organization access
*/

-- Add missing columns to quotes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'quote_number'
  ) THEN
    ALTER TABLE quotes ADD COLUMN quote_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE quotes ADD COLUMN subtotal numeric(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'vat_amount'
  ) THEN
    ALTER TABLE quotes ADD COLUMN vat_amount numeric(12,2) DEFAULT 0;
  END IF;
END $$;

-- Create quote_line_items table
CREATE TABLE IF NOT EXISTS quote_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

-- Create policies for quote_line_items
CREATE POLICY "Users can read quote line items for their organization"
  ON quote_line_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM quotes q
      JOIN user_profiles up ON up.organisation_id = q.organisation_id
      WHERE q.id = quote_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert quote line items for their organization"
  ON quote_line_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM quotes q
      JOIN user_profiles up ON up.organisation_id = q.organisation_id
      WHERE q.id = quote_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can update quote line items for their organization"
  ON quote_line_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM quotes q
      JOIN user_profiles up ON up.organisation_id = q.organisation_id
      WHERE q.id = quote_id AND up.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM quotes q
      JOIN user_profiles up ON up.organisation_id = q.organisation_id
      WHERE q.id = quote_id AND up.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete quote line items for their organization"
  ON quote_line_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM quotes q
      JOIN user_profiles up ON up.organisation_id = q.organisation_id
      WHERE q.id = quote_id AND up.id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote_id ON quote_line_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_sort_order ON quote_line_items(quote_id, sort_order);

-- Add unique constraint for quote numbers per organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'quotes' AND constraint_name = 'unique_quote_number_per_org'
  ) THEN
    ALTER TABLE quotes ADD CONSTRAINT unique_quote_number_per_org UNIQUE (organisation_id, quote_number);
  END IF;
END $$;