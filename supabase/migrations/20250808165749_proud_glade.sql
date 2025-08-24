/*
  # Fix generate_job_number function - resolve ambiguous column reference

  This migration fixes the ambiguous column reference error in the generate_job_number function
  by properly qualifying all column references with table aliases.
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.generate_job_number(uuid);

-- Create the corrected generate_job_number function
CREATE OR REPLACE FUNCTION public.generate_job_number(org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_year integer;
    max_sequence integer;
    new_sequence integer;
    new_job_number text;
BEGIN
    -- Get current year
    current_year := EXTRACT(YEAR FROM NOW());
    
    -- Find the highest sequence number for this organization and year
    SELECT COALESCE(
        MAX(
            CASE 
                WHEN j.job_number ~ ('^JOBB-' || current_year::text || '-[0-9]{3}$')
                THEN CAST(RIGHT(j.job_number, 3) AS integer)
                ELSE 0
            END
        ), 
        0
    ) INTO max_sequence
    FROM jobs j
    WHERE j.organisation_id = org_id
    AND j.job_number IS NOT NULL;
    
    -- Increment sequence
    new_sequence := max_sequence + 1;
    
    -- Format the new job number
    new_job_number := 'JOBB-' || current_year::text || '-' || LPAD(new_sequence::text, 3, '0');
    
    RETURN new_job_number;
END;
$$;