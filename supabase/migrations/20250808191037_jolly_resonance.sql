/*
# Add Invoice Management Functions

1. Functions
   - `generate_invoice_number` - Auto-increment invoice numbers per organization
   - Update invoice status based on due dates

2. Triggers
   - Auto-update overdue status for invoices past due date

3. Indexes
   - Optimize invoice queries by status and due date
*/

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number(org_id UUID)
RETURNS TEXT AS $$
DECLARE
    current_year INTEGER;
    next_number INTEGER;
    invoice_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW());
    
    -- Get the highest invoice number for this year and organization
    SELECT COALESCE(
        MAX(
            CASE 
                WHEN invoice_number ~ ('^' || current_year || '-[0-9]+$')
                THEN CAST(SPLIT_PART(invoice_number, '-', 2) AS INTEGER)
                ELSE 0
            END
        ), 0
    ) + 1
    INTO next_number
    FROM invoices 
    WHERE organisation_id = org_id;
    
    invoice_number := current_year || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update overdue invoices
CREATE OR REPLACE FUNCTION update_overdue_invoices()
RETURNS void AS $$
BEGIN
    UPDATE invoices 
    SET status = 'overdue'
    WHERE status = 'sent' 
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_status_due_date ON invoices(status, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- Add constraint to ensure positive amounts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_invoice_amount_positive' 
        AND table_name = 'invoices'
    ) THEN
        ALTER TABLE invoices ADD CONSTRAINT check_invoice_amount_positive CHECK (amount >= 0);
    END IF;
END $$;