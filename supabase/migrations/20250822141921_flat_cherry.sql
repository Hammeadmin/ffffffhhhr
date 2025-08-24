/*
# ROT Deduction System Implementation

1. Database Schema Updates
   - Add ROT fields to customers, quotes, orders, and invoices tables
   - Add quote acceptance tokens for public portal
   - Add ROT validation and calculation functions

2. ROT Fields Added
   - include_rot (boolean, default true)
   - rot_personnummer (text, nullable)
   - rot_organisationsnummer (text, nullable)
   - rot_fastighetsbeteckning (text, nullable)
   - rot_amount (decimal, calculated)

3. Security
   - Secure token generation for quote acceptance
   - Public access policies for quote acceptance portal
   - ROT data validation functions
*/

-- Add ROT fields to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'include_rot'
  ) THEN
    ALTER TABLE customers ADD COLUMN include_rot boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'rot_personnummer'
  ) THEN
    ALTER TABLE customers ADD COLUMN rot_personnummer text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'rot_organisationsnummer'
  ) THEN
    ALTER TABLE customers ADD COLUMN rot_organisationsnummer text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'rot_fastighetsbeteckning'
  ) THEN
    ALTER TABLE customers ADD COLUMN rot_fastighetsbeteckning text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'rot_amount'
  ) THEN
    ALTER TABLE customers ADD COLUMN rot_amount numeric(12,2) DEFAULT 0;
  END IF;
END $$;

-- Add ROT fields to quotes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'include_rot'
  ) THEN
    ALTER TABLE quotes ADD COLUMN include_rot boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'rot_personnummer'
  ) THEN
    ALTER TABLE quotes ADD COLUMN rot_personnummer text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'rot_organisationsnummer'
  ) THEN
    ALTER TABLE quotes ADD COLUMN rot_organisationsnummer text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'rot_fastighetsbeteckning'
  ) THEN
    ALTER TABLE quotes ADD COLUMN rot_fastighetsbeteckning text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'rot_amount'
  ) THEN
    ALTER TABLE quotes ADD COLUMN rot_amount numeric(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'acceptance_token'
  ) THEN
    ALTER TABLE quotes ADD COLUMN acceptance_token text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'token_expires_at'
  ) THEN
    ALTER TABLE quotes ADD COLUMN token_expires_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE quotes ADD COLUMN accepted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'accepted_by_ip'
  ) THEN
    ALTER TABLE quotes ADD COLUMN accepted_by_ip text;
  END IF;
END $$;

-- Add ROT fields to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'include_rot'
  ) THEN
    ALTER TABLE orders ADD COLUMN include_rot boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'rot_personnummer'
  ) THEN
    ALTER TABLE orders ADD COLUMN rot_personnummer text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'rot_organisationsnummer'
  ) THEN
    ALTER TABLE orders ADD COLUMN rot_organisationsnummer text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'rot_fastighetsbeteckning'
  ) THEN
    ALTER TABLE orders ADD COLUMN rot_fastighetsbeteckning text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'rot_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN rot_amount numeric(12,2) DEFAULT 0;
  END IF;
END $$;

-- Add ROT fields to invoices table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'include_rot'
  ) THEN
    ALTER TABLE invoices ADD COLUMN include_rot boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'rot_personnummer'
  ) THEN
    ALTER TABLE invoices ADD COLUMN rot_personnummer text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'rot_organisationsnummer'
  ) THEN
    ALTER TABLE invoices ADD COLUMN rot_organisationsnummer text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'rot_fastighetsbeteckning'
  ) THEN
    ALTER TABLE invoices ADD COLUMN rot_fastighetsbeteckning text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'rot_amount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN rot_amount numeric(12,2) DEFAULT 0;
  END IF;
END $$;

-- Create function to validate Swedish personal number (personnummer)
CREATE OR REPLACE FUNCTION validate_swedish_personnummer(personnummer text)
RETURNS boolean AS $$
BEGIN
  -- Remove any non-digit characters except hyphen
  personnummer := regexp_replace(personnummer, '[^0-9-]', '', 'g');
  
  -- Check format: YYYYMMDD-XXXX or YYMMDD-XXXX
  IF NOT (personnummer ~ '^[0-9]{8}-[0-9]{4}$' OR personnummer ~ '^[0-9]{6}-[0-9]{4}$') THEN
    RETURN false;
  END IF;
  
  -- Basic length validation (more complex validation would be done in application)
  RETURN length(replace(personnummer, '-', '')) IN (10, 12);
END;
$$ LANGUAGE plpgsql;

-- Create function to validate Swedish organization number (organisationsnummer)
CREATE OR REPLACE FUNCTION validate_swedish_organisationsnummer(orgnummer text)
RETURNS boolean AS $$
BEGIN
  -- Remove any non-digit characters except hyphen
  orgnummer := regexp_replace(orgnummer, '[^0-9-]', '', 'g');
  
  -- Check format: XXXXXX-XXXX
  IF NOT orgnummer ~ '^[0-9]{6}-[0-9]{4}$' THEN
    RETURN false;
  END IF;
  
  -- Basic validation (more complex Luhn algorithm would be done in application)
  RETURN length(replace(orgnummer, '-', '')) = 10;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate ROT amount
CREATE OR REPLACE FUNCTION calculate_rot_amount(
  total_amount numeric,
  labor_percentage numeric DEFAULT 0.7,
  rot_percentage numeric DEFAULT 0.5,
  max_rot_per_person numeric DEFAULT 50000
)
RETURNS numeric AS $$
DECLARE
  labor_cost numeric;
  rot_deduction numeric;
BEGIN
  -- Calculate labor cost (default 70% of total)
  labor_cost := total_amount * labor_percentage;
  
  -- Calculate ROT deduction (50% of labor cost)
  rot_deduction := labor_cost * rot_percentage;
  
  -- Apply maximum limit per person per year
  IF rot_deduction > max_rot_per_person THEN
    rot_deduction := max_rot_per_person;
  END IF;
  
  RETURN ROUND(rot_deduction, 2);
END;
$$ LANGUAGE plpgsql;

-- Create function to generate secure acceptance token
CREATE OR REPLACE FUNCTION generate_acceptance_token()
RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate ROT amount on quotes
CREATE OR REPLACE FUNCTION update_quote_rot_amount()
RETURNS trigger AS $$
BEGIN
  IF NEW.include_rot = true AND NEW.total_amount > 0 THEN
    NEW.rot_amount := calculate_rot_amount(NEW.total_amount);
  ELSE
    NEW.rot_amount := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to quotes table
DROP TRIGGER IF EXISTS trigger_update_quote_rot_amount ON quotes;
CREATE TRIGGER trigger_update_quote_rot_amount
  BEFORE INSERT OR UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_rot_amount();

-- Create trigger to auto-calculate ROT amount on orders
CREATE OR REPLACE FUNCTION update_order_rot_amount()
RETURNS trigger AS $$
BEGIN
  IF NEW.include_rot = true AND NEW.value > 0 THEN
    NEW.rot_amount := calculate_rot_amount(NEW.value);
  ELSE
    NEW.rot_amount := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to orders table
DROP TRIGGER IF EXISTS trigger_update_order_rot_amount ON orders;
CREATE TRIGGER trigger_update_order_rot_amount
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_rot_amount();

-- Create trigger to auto-calculate ROT amount on invoices
CREATE OR REPLACE FUNCTION update_invoice_rot_amount()
RETURNS trigger AS $$
BEGIN
  IF NEW.include_rot = true AND NEW.amount > 0 THEN
    NEW.rot_amount := calculate_rot_amount(NEW.amount);
  ELSE
    NEW.rot_amount := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to invoices table
DROP TRIGGER IF EXISTS trigger_update_invoice_rot_amount ON invoices;
CREATE TRIGGER trigger_update_invoice_rot_amount
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_rot_amount();

-- Create public access policy for quote acceptance
CREATE POLICY "Public can view quotes with valid token"
  ON quotes
  FOR SELECT
  TO anon
  USING (
    acceptance_token IS NOT NULL 
    AND token_expires_at > now()
  );

-- Create public access policy for quote acceptance updates
CREATE POLICY "Public can accept quotes with valid token"
  ON quotes
  FOR UPDATE
  TO anon
  USING (
    acceptance_token IS NOT NULL 
    AND token_expires_at > now()
    AND status = 'sent'
  )
  WITH CHECK (
    acceptance_token IS NOT NULL 
    AND token_expires_at > now()
    AND status = 'accepted'
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_acceptance_token ON quotes(acceptance_token) WHERE acceptance_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_token_expires ON quotes(token_expires_at) WHERE token_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_rot_personnummer ON customers(rot_personnummer) WHERE rot_personnummer IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_rot_amount ON quotes(rot_amount) WHERE rot_amount > 0;

-- Add constraints for ROT data validation
ALTER TABLE customers ADD CONSTRAINT check_rot_personnummer_format 
  CHECK (rot_personnummer IS NULL OR validate_swedish_personnummer(rot_personnummer));

ALTER TABLE customers ADD CONSTRAINT check_rot_organisationsnummer_format 
  CHECK (rot_organisationsnummer IS NULL OR validate_swedish_organisationsnummer(rot_organisationsnummer));

ALTER TABLE quotes ADD CONSTRAINT check_rot_personnummer_format 
  CHECK (rot_personnummer IS NULL OR validate_swedish_personnummer(rot_personnummer));

ALTER TABLE quotes ADD CONSTRAINT check_rot_organisationsnummer_format 
  CHECK (rot_organisationsnummer IS NULL OR validate_swedish_organisationsnummer(rot_organisationsnummer));

ALTER TABLE orders ADD CONSTRAINT check_rot_personnummer_format 
  CHECK (rot_personnummer IS NULL OR validate_swedish_personnummer(rot_personnummer));

ALTER TABLE orders ADD CONSTRAINT check_rot_organisationsnummer_format 
  CHECK (rot_organisationsnummer IS NULL OR validate_swedish_organisationsnummer(rot_organisationsnummer));

ALTER TABLE invoices ADD CONSTRAINT check_rot_personnummer_format 
  CHECK (rot_personnummer IS NULL OR validate_swedish_personnummer(rot_personnummer));

ALTER TABLE invoices ADD CONSTRAINT check_rot_organisationsnummer_format 
  CHECK (rot_organisationsnummer IS NULL OR validate_swedish_organisationsnummer(rot_organisationsnummer));

-- Add constraint to ensure only one ROT identifier per record
ALTER TABLE customers ADD CONSTRAINT check_rot_single_identifier 
  CHECK (
    (rot_personnummer IS NOT NULL AND rot_organisationsnummer IS NULL) OR
    (rot_personnummer IS NULL AND rot_organisationsnummer IS NOT NULL) OR
    (rot_personnummer IS NULL AND rot_organisationsnummer IS NULL)
  );

ALTER TABLE quotes ADD CONSTRAINT check_rot_single_identifier 
  CHECK (
    (rot_personnummer IS NOT NULL AND rot_organisationsnummer IS NULL) OR
    (rot_personnummer IS NULL AND rot_organisationsnummer IS NOT NULL) OR
    (rot_personnummer IS NULL AND rot_organisationsnummer IS NULL)
  );

ALTER TABLE orders ADD CONSTRAINT check_rot_single_identifier 
  CHECK (
    (rot_personnummer IS NOT NULL AND rot_organisationsnummer IS NULL) OR
    (rot_personnummer IS NULL AND rot_organisationsnummer IS NOT NULL) OR
    (rot_personnummer IS NULL AND rot_organisationsnummer IS NULL)
  );

ALTER TABLE invoices ADD CONSTRAINT check_rot_single_identifier 
  CHECK (
    (rot_personnummer IS NOT NULL AND rot_organisationsnummer IS NULL) OR
    (rot_personnummer IS NULL AND rot_organisationsnummer IS NOT NULL) OR
    (rot_personnummer IS NULL AND rot_organisationsnummer IS NULL)
  );

-- Create function to generate and set acceptance token for quote
CREATE OR REPLACE FUNCTION set_quote_acceptance_token(quote_id uuid, expires_in_days integer DEFAULT 30)
RETURNS text AS $$
DECLARE
  token text;
BEGIN
  token := generate_acceptance_token();
  
  UPDATE quotes 
  SET 
    acceptance_token = token,
    token_expires_at = now() + (expires_in_days || ' days')::interval
  WHERE id = quote_id;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to accept quote with ROT information
CREATE OR REPLACE FUNCTION accept_quote_with_rot(
  token text,
  rot_type text, -- 'person' or 'company'
  rot_identifier text, -- personnummer or organisationsnummer
  fastighetsbeteckning text,
  client_ip text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  quote_record quotes%ROWTYPE;
  order_id uuid;
  result json;
BEGIN
  -- Find and validate quote
  SELECT * INTO quote_record
  FROM quotes
  WHERE acceptance_token = token
    AND token_expires_at > now()
    AND status = 'sent';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ogiltig eller utgången token'
    );
  END IF;
  
  -- Validate ROT identifier format
  IF rot_type = 'person' AND NOT validate_swedish_personnummer(rot_identifier) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ogiltigt personnummer format'
    );
  END IF;
  
  IF rot_type = 'company' AND NOT validate_swedish_organisationsnummer(rot_identifier) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ogiltigt organisationsnummer format'
    );
  END IF;
  
  -- Update quote with acceptance and ROT information
  UPDATE quotes
  SET 
    status = 'accepted',
    accepted_at = now(),
    accepted_by_ip = client_ip,
    rot_personnummer = CASE WHEN rot_type = 'person' THEN rot_identifier ELSE NULL END,
    rot_organisationsnummer = CASE WHEN rot_type = 'company' THEN rot_identifier ELSE NULL END,
    rot_fastighetsbeteckning = fastighetsbeteckning,
    rot_amount = CASE WHEN quote_record.include_rot THEN calculate_rot_amount(quote_record.total_amount) ELSE 0 END
  WHERE id = quote_record.id;
  
  -- Create order from accepted quote
  INSERT INTO orders (
    organisation_id,
    customer_id,
    title,
    description,
    value,
    status,
    source,
    job_description,
    job_type,
    include_rot,
    rot_personnummer,
    rot_organisationsnummer,
    rot_fastighetsbeteckning,
    rot_amount
  )
  VALUES (
    quote_record.organisation_id,
    quote_record.customer_id,
    quote_record.title,
    quote_record.description,
    quote_record.total_amount,
    'öppen_order',
    'Accepterad offert',
    quote_record.description,
    'allmänt',
    quote_record.include_rot,
    CASE WHEN rot_type = 'person' THEN rot_identifier ELSE NULL END,
    CASE WHEN rot_type = 'company' THEN rot_identifier ELSE NULL END,
    fastighetsbeteckning,
    CASE WHEN quote_record.include_rot THEN calculate_rot_amount(quote_record.total_amount) ELSE 0 END
  )
  RETURNING id INTO order_id;
  
  -- Link quote to order
  UPDATE quotes SET order_id = order_id WHERE id = quote_record.id;
  
  RETURN json_build_object(
    'success', true,
    'quote_id', quote_record.id,
    'order_id', order_id,
    'rot_amount', CASE WHEN quote_record.include_rot THEN calculate_rot_amount(quote_record.total_amount) ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for ROT reporting
CREATE OR REPLACE VIEW rot_report AS
SELECT 
  i.id,
  i.invoice_number,
  i.amount,
  i.rot_amount,
  i.rot_personnummer,
  i.rot_organisationsnummer,
  i.rot_fastighetsbeteckning,
  c.name as customer_name,
  c.address,
  c.postal_code,
  c.city,
  i.created_at,
  EXTRACT(YEAR FROM i.created_at) as tax_year
FROM invoices i
LEFT JOIN customers c ON i.customer_id = c.id
WHERE i.include_rot = true 
  AND i.rot_amount > 0
  AND (i.rot_personnummer IS NOT NULL OR i.rot_organisationsnummer IS NOT NULL);

-- Grant access to the ROT report view
GRANT SELECT ON rot_report TO authenticated;

