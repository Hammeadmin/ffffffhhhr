/*
# Add sort_order column to quote_templates

1. Schema Changes
   - Add `sort_order` column to `quote_templates` table
   - Set default values for existing templates
   - Add index for efficient ordering

2. Data Migration
   - Update existing templates with sequential sort_order values
   - Ensure proper ordering for future templates

3. Security
   - No RLS changes needed (existing policies apply)
*/

-- Add sort_order column to quote_templates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_templates' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE quote_templates ADD COLUMN sort_order integer DEFAULT 0;
  END IF;
END $$;

-- Update existing templates with sequential sort_order values
UPDATE quote_templates 
SET sort_order = subquery.row_number 
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY organisation_id ORDER BY created_at) as row_number
  FROM quote_templates
  WHERE sort_order = 0 OR sort_order IS NULL
) AS subquery
WHERE quote_templates.id = subquery.id;

-- Create index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_quote_templates_sort_order 
ON quote_templates(organisation_id, sort_order);

-- Add constraint to ensure sort_order is not negative
ALTER TABLE quote_templates 
ADD CONSTRAINT check_sort_order_positive 
CHECK (sort_order >= 0);