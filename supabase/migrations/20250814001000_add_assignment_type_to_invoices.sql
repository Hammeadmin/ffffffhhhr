-- Add the missing assignment_type column to the invoices table.
-- This column is crucial for determining whether an invoice is assigned to an individual or a team.

-- 1. Add the assignment_type column
-- It references the "assignment_type" ENUM that already exists in your database.
ALTER TABLE public.invoices
ADD COLUMN assignment_type public.assignment_type;

-- 2. Add a comment for clarity
COMMENT ON COLUMN public.invoices.assignment_type IS 'Specifies whether the invoice is assigned to an individual user or a team.';

-- 3. (Optional but Recommended) Update existing invoices to have a default value
-- This will prevent issues with old invoices that don't have an assignment type.
UPDATE public.invoices
SET assignment_type = 'individual'
WHERE assignment_type IS NULL;
