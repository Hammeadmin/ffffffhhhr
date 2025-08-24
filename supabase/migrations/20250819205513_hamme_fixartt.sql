/*
  # Create Quote Templates Table

  1. New Tables
    - `quote_templates`
      - `id` (uuid, primary key)
      - `organisation_id` (uuid, foreign key to organisations)
      - `name` (text, not null)
      - `description` (text, optional)
      - `default_line_items` (jsonb array of line item objects)
      - `settings` (jsonb for template-specific configs)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `quote_templates` table
    - Add policies for organization-based access

  3. Default Templates
    - Insert common Swedish service templates
*/

-- Create quote_templates table
CREATE TABLE IF NOT EXISTS quote_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  default_line_items jsonb DEFAULT '[]'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view templates for their organization"
  ON quote_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = quote_templates.organisation_id
      AND up.id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create templates for their organization"
  ON quote_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = quote_templates.organisation_id
      AND up.id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update templates for their organization"
  ON quote_templates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = quote_templates.organisation_id
      AND up.id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = quote_templates.organisation_id
      AND up.id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete templates for their organization"
  ON quote_templates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = quote_templates.organisation_id
      AND up.id = (SELECT auth.uid())
    )
  );

-- Create indexes
CREATE INDEX idx_quote_templates_organisation_id ON quote_templates(organisation_id);
CREATE INDEX idx_quote_templates_name ON quote_templates(name);

/*
  # Enhance Quote Line Items for Product Library

  1. Table Modifications
    - Add `name` column for library items
    - Add `unit` enum column for measurement units
    - Add `category` column for organization
    - Add `is_library_item` boolean flag
    - Update existing constraints and indexes

  2. Security
    - Update existing RLS policies to handle library items
    - Add policies for library item management

  3. Default Categories and Units
    - Create enum for common Swedish measurement units
    - Add sample library items for common services
*/

-- Create unit enum for Swedish measurement units
/*
  # Enhance Quote Line Items for Product Library

  1. Table Modifications
    - Add `name` column for library items
    - Add `unit` enum column for measurement units
    - Add `category` column for organization
    - Add `is_library_item` boolean flag
    - Update existing constraints and indexes

  2. Security
    - Update existing RLS policies to handle library items
    - Add policies for library item management

  3. Default Categories and Units
    - Create enum for common Swedish measurement units
    - Add sample library items for common services
*/

-- Create unit enum for Swedish measurement units
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'measurement_unit') THEN
    CREATE TYPE measurement_unit AS ENUM ('st', 'kvm', 'tim', 'löpm', 'kg', 'liter', 'meter');
  END IF;
END $$;

-- Ensure extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add new columns to quote_line_items table
DO $$
BEGIN
  -- Add name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_line_items' AND column_name = 'name'
  ) THEN
    ALTER TABLE quote_line_items ADD COLUMN name text;
  END IF;

  -- Add unit column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_line_items' AND column_name = 'unit'
  ) THEN
    ALTER TABLE quote_line_items ADD COLUMN unit measurement_unit DEFAULT 'st';
  END IF;

  -- Add category column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_line_items' AND column_name = 'category'
  ) THEN
    ALTER TABLE quote_line_items ADD COLUMN category text;
  END IF;

  -- Add is_library_item column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_line_items' AND column_name = 'is_library_item'
  ) THEN
    ALTER TABLE quote_line_items ADD COLUMN is_library_item boolean DEFAULT false NOT NULL;
  END IF;

  -- Add organisation_id for library items
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_line_items' AND column_name = 'organisation_id'
  ) THEN
    ALTER TABLE quote_line_items ADD COLUMN organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update constraints for library items
-- Library items must have name and organisation_id, quote items must have quote_id
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'quote_line_items' AND constraint_name = 'check_library_or_quote_item'
  ) THEN
    ALTER TABLE quote_line_items DROP CONSTRAINT check_library_or_quote_item;
  END IF;

  -- Add new constraint
  ALTER TABLE quote_line_items ADD CONSTRAINT check_library_or_quote_item
    CHECK (
      (is_library_item = true AND name IS NOT NULL AND organisation_id IS NOT NULL AND quote_id IS NULL) OR
      (is_library_item = false AND quote_id IS NOT NULL)
    );
END $$;

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_quote_line_items_library ON quote_line_items(organisation_id, is_library_item) WHERE is_library_item = true;
CREATE INDEX IF NOT EXISTS idx_quote_line_items_category ON quote_line_items(category) WHERE is_library_item = true;
CREATE INDEX IF NOT EXISTS idx_quote_line_items_name ON quote_line_items(name) WHERE is_library_item = true;

-- Enable Row Level Security
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for library items
CREATE POLICY "Users can manage library items for their organization"
  ON quote_line_items
  FOR ALL
  TO authenticated
  USING (
    (is_library_item = true AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = quote_line_items.organisation_id
      AND up.id = (SELECT auth.uid())
    )) OR
    (is_library_item = false AND EXISTS (
      SELECT 1 FROM quotes q
      JOIN user_profiles up ON up.organisation_id = q.organisation_id
      WHERE q.id = quote_line_items.quote_id
      AND up.id = (SELECT auth.uid())
    ))
  )
  WITH CHECK (
    (is_library_item = true AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.organisation_id = quote_line_items.organisation_id
      AND up.id = (SELECT auth.uid())
    )) OR
    (is_library_item = false AND EXISTS (
      SELECT 1 FROM quotes q
      JOIN user_profiles up ON up.organisation_id = q.organisation_id
      WHERE q.id = quote_line_items.quote_id
      AND up.id = (SELECT auth.uid())
    ))
  );

-- Optional: Add a sample library item creation function for convenience
CREATE OR REPLACE FUNCTION create_library_item(
  p_name text,
  p_unit measurement_unit,
  p_category text,
  p_organisation_id uuid,
  p_quantity numeric,
  p_price numeric
) RETURNS uuid AS $$
DECLARE
  v_library_item_id uuid;
BEGIN
  INSERT INTO quote_line_items (
    name, 
    unit, 
    category, 
    organisation_id, 
    is_library_item, 
    quantity, 
    price
  ) VALUES (
    p_name, 
    p_unit, 
    p_category, 
    p_organisation_id, 
    true, 
    p_quantity, 
    p_price
  ) RETURNING id INTO v_library_item_id;
  
  RETURN v_library_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke execute permissions from public
REVOKE ALL ON FUNCTION create_library_item(text, measurement_unit, text, uuid, numeric, numeric) FROM PUBLIC;

