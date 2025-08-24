/*
  # Update Quote Templates with Content Structure

  1. Database Changes
    - Replace `default_line_items` with `content_structure` in quote_templates table
    - Add sort_order column for template ordering
    - Update existing templates to use new structure

  2. Content Structure Format
    - Array of content blocks with type and content
    - Supports header, text_block, line_items_table, footer types
    - Flexible structure for custom quote layouts
*/

-- Add new columns to quote_templates table
DO $$
BEGIN
  -- Add content_structure column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_templates' AND column_name = 'content_structure'
  ) THEN
    ALTER TABLE quote_templates ADD COLUMN content_structure jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Add sort_order column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_templates' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE quote_templates ADD COLUMN sort_order integer DEFAULT 0;
  END IF;
END $$;

-- Migrate existing default_line_items to content_structure
UPDATE quote_templates 
SET content_structure = jsonb_build_array(
  jsonb_build_object(
    'type', 'header',
    'content', name
  ),
  jsonb_build_object(
    'type', 'text_block',
    'content', COALESCE(description, 'Beskrivning av offerten')
  ),
  jsonb_build_object(
    'type', 'line_items_table',
    'content', default_line_items
  ),
  jsonb_build_object(
    'type', 'footer',
    'content', 'Tack för förtroendet! Vi ser fram emot att arbeta med er.'
  )
)
WHERE content_structure = '[]'::jsonb AND default_line_items IS NOT NULL;

-- Set sort_order based on creation order
UPDATE quote_templates 
SET sort_order = subquery.row_number - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY organisation_id ORDER BY created_at) as row_number
  FROM quote_templates
) AS subquery
WHERE quote_templates.id = subquery.id AND sort_order = 0;

-- Add index for sort_order
CREATE INDEX IF NOT EXISTS idx_quote_templates_sort_order 
ON quote_templates(organisation_id, sort_order);