\n\n-- Add credit note fields to invoices table\nDO $$\nBEGIN\n  -- Add is_credit_note column\n  IF NOT EXISTS (\n    SELECT 1 FROM information_schema.columns\n    WHERE table_name = 'invoices' AND column_name = 'is_credit_note'\n  ) THEN\n    ALTER TABLE invoices ADD COLUMN is_credit_note boolean DEFAULT false
\n  END IF
\n\n  -- Add original_invoice_id column\n  IF NOT EXISTS (\n    SELECT 1 FROM information_schema.columns\n    WHERE table_name = 'invoices' AND column_name = 'original_invoice_id'\n  ) THEN\n    ALTER TABLE invoices ADD COLUMN original_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL
\n  END IF
\n\n  -- Add credit_reason column\n  IF NOT EXISTS (\n    SELECT 1 FROM information_schema.columns\n    WHERE table_name = 'invoices' AND column_name = 'credit_reason'\n  ) THEN\n    ALTER TABLE invoices ADD COLUMN credit_reason text
\n  END IF
\n\n  -- Add credit_note_number column for sequential numbering\n  IF NOT EXISTS (\n    SELECT 1 FROM information_schema.columns\n    WHERE table_name = 'invoices' AND column_name = 'credit_note_number'\n  ) THEN\n    ALTER TABLE invoices ADD COLUMN credit_note_number text
\n  END IF
\n\n  -- Add credited_amount column to track partial credits\n  IF NOT EXISTS (\n    SELECT 1 FROM information_schema.columns\n    WHERE table_name = 'invoices' AND column_name = 'credited_amount'\n  ) THEN\n    ALTER TABLE invoices ADD COLUMN credited_amount numeric(12,2) DEFAULT 0
\n  END IF
\n\n  -- Add net_amount column (amount - credited_amount)\n  IF NOT EXISTS (\n    SELECT 1 FROM information_schema.columns\n    WHERE table_name = 'invoices' AND column_name = 'net_amount'\n  ) THEN\n    ALTER TABLE invoices ADD COLUMN net_amount numeric(12,2)
\n  END IF
\nEND $$
\n\n-- Create indexes for better performance\nCREATE INDEX IF NOT EXISTS idx_invoices_is_credit_note ON invoices(is_credit_note)
\nCREATE INDEX IF NOT EXISTS idx_invoices_original_invoice_id ON invoices(original_invoice_id)
\nCREATE INDEX IF NOT EXISTS idx_invoices_credit_note_number ON invoices(credit_note_number) WHERE is_credit_note = true
\n\n-- Create unique constraint for credit note numbers per organization\nCREATE UNIQUE INDEX IF NOT EXISTS unique_credit_note_number_per_org \nON invoices(organisation_id, credit_note_number) \nWHERE is_credit_note = true AND credit_note_number IS NOT NULL
\n\n-- Add check constraints\nDO $$\nBEGIN\n  -- Ensure credit notes have original invoice reference\n  IF NOT EXISTS (\n    SELECT 1 FROM information_schema.check_constraints \n    WHERE constraint_name = 'check_credit_note_has_original'\n  ) THEN\n    ALTER TABLE invoices ADD CONSTRAINT check_credit_note_has_original \n    CHECK (\n      (is_credit_note = false) OR \n      (is_credit_note = true AND original_invoice_id IS NOT NULL)\n    )
\n  END IF
\n\n  -- Ensure credit notes have negative amounts\n  IF NOT EXISTS (\n    SELECT 1 FROM information_schema.check_constraints \n    WHERE constraint_name = 'check_credit_note_negative_amount'\n  ) THEN\n    ALTER TABLE invoices ADD CONSTRAINT check_credit_note_negative_amount \n    CHECK (\n      (is_credit_note = false AND amount >= 0) OR \n      (is_credit_note = true AND amount <= 0)\n    )
\n  END IF
\n\n  -- Ensure credited amount is not negative\n  IF NOT EXISTS (\n    SELECT 1 FROM information_schema.check_constraints \n    WHERE constraint_name = 'check_credited_amount_positive'\n  ) THEN\n    ALTER TABLE invoices ADD CONSTRAINT check_credited_amount_positive \n    CHECK (credited_amount >= 0)
\n  END IF
\nEND $$
\n\n-- Create credit_notes view for easier querying\nCREATE OR REPLACE VIEW credit_notes AS\nSELECT \n  cn.*,\n  oi.invoice_number as original_invoice_number,\n  oi.amount as original_amount,\n  oi.created_at as original_invoice_date,\n  c.name as customer_name,\n  c.email as customer_email\nFROM invoices cn\nLEFT JOIN invoices oi ON cn.original_invoice_id = oi.id\nLEFT JOIN customers c ON cn.customer_id = c.id\nWHERE cn.is_credit_note = true
\n\n-- Function to update net amounts when credits are applied\nCREATE OR REPLACE FUNCTION update_invoice_net_amounts()\nRETURNS TRIGGER AS $$\nBEGIN\n  -- Update the original invoice's credited amount and net amount\n  IF NEW.is_credit_note = true AND NEW.original_invoice_id IS NOT NULL THEN\n    UPDATE invoices \n    SET \n      credited_amount = COALESCE(credited_amount, 0) + ABS(NEW.amount),\n      net_amount = amount - (COALESCE(credited_amount, 0) + ABS(NEW.amount))\n    WHERE id = NEW.original_invoice_id
\n  END IF
\n  \n  -- Calculate net amount for the credit note itself\n  NEW.net_amount = NEW.amount - COALESCE(NEW.credited_amount, 0)
\n  \n  RETURN NEW
\nEND
\n$$ LANGUAGE plpgsql
\n\n-- Create trigger for automatic net amount calculation\nDROP TRIGGER IF EXISTS trigger_update_net_amounts ON invoices
\nCREATE TRIGGER trigger_update_net_amounts\n  BEFORE INSERT OR UPDATE ON invoices\n  FOR EACH ROW\n  EXECUTE FUNCTION update_invoice_net_amounts()
\n\n-- Function to generate credit note numbers\nCREATE OR REPLACE FUNCTION generate_credit_note_number(org_id uuid)\nRETURNS text AS $$\nDECLARE\n  current_year text
\n  next_number integer
\n  credit_note_number text
\nBEGIN\n  current_year := EXTRACT(year FROM CURRENT_DATE)::text
\n  \n  -- Get the next number for this year and organization\n  SELECT COALESCE(MAX(\n    CASE \n      WHEN credit_note_number ~ ('^KN-' || current_year || '-\\d+$') \n      THEN CAST(SUBSTRING(credit_note_number FROM '\\d+$') AS integer)\n      ELSE 0 \n    END\n  ), 0) + 1\n  INTO next_number\n  FROM invoices \n  WHERE organisation_id = org_id \n    AND is_credit_note = true \n    AND credit_note_number IS NOT NULL
\n  \n  credit_note_number := 'KN-' || current_year || '-' || LPAD(next_number::text, 3, '0')
\n  \n  RETURN credit_note_number
\nEND
\n$$ LANGUAGE plpgsql
\n\n-- Update existing invoices to have net_amount calculated\nUPDATE invoices \nSET net_amount = amount - COALESCE(credited_amount, 0)\nWHERE net_amount IS NULL
\n\n-- Add comment to explain the credit note system\nCOMMENT ON COLUMN invoices.is_credit_note IS 'Indicates if this invoice is actually a credit note'
\nCOMMENT ON COLUMN invoices.original_invoice_id IS 'Reference to the original invoice being credited'
\nCOMMENT ON COLUMN invoices.credit_reason IS 'Reason for issuing the credit note'
\nCOMMENT ON COLUMN invoices.credit_note_number IS 'Sequential credit note number (KN-YYYY-###)'
\nCOMMENT ON COLUMN invoices.credited_amount IS 'Total amount credited against this invoice'
\nCOMMENT ON COLUMN invoices.net_amount IS 'Net amount after credits (amount - credited_amount)'
