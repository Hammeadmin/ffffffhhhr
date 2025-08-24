-- Create the invoice_line_items table
CREATE TABLE public.invoice_line_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL,
    description text NOT NULL,
    quantity numeric(10, 2) NOT NULL DEFAULT 1,
    unit_price numeric(10, 2) NOT NULL DEFAULT 0,
    total numeric(10, 2) NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT invoice_line_items_pkey PRIMARY KEY (id),
    CONSTRAINT invoice_line_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.invoice_line_items IS 'Stores individual line items for each invoice as a historical record.';

-- Enable Row Level Security (RLS)
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Create policies for invoice_line_items
-- This policy ensures users can only access line items belonging to invoices within their own organization.
CREATE POLICY "Allow users to manage line items for their org invoices"
ON public.invoice_line_items
FOR ALL
USING (
    (
        SELECT organisation_id
        FROM invoices
        WHERE id = invoice_id
    ) = (
        SELECT organisation_id
        FROM user_profiles
        WHERE id = auth.uid()
    )
);
