-- Create the generate_quote_number function
CREATE OR REPLACE FUNCTION public.generate_quote_number(org_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    current_year text;
    next_seq_val int;
    quote_num text;
BEGIN
    current_year := to_char(now(), 'YYYY');

    -- Find the maximum existing sequence number for the current year and organization
    -- and increment it. COALESCE handles the case where no quotes exist yet.
    SELECT COALESCE(MAX(SUBSTRING(quote_number FROM '[0-9]+$')::int), 0) + 1
    INTO next_seq_val
    FROM public.quotes
    WHERE organisation_id = org_id
      AND quote_number LIKE 'OFF-' || current_year || '-%';

    -- Format the quote number with leading zeros for the sequence part
    quote_num := 'OFF-' || current_year || '-' || LPAD(next_seq_val::text, 3, '0');

    RETURN quote_num;
END;
$$;