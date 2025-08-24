-- fix_rot_report_view

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
  EXTRACT(YEAR FROM i.created_at) as tax_year,
  i.organisation_id
FROM invoices i
LEFT JOIN customers c ON i.customer_id = c.id
WHERE i.include_rot = true 
  AND i.rot_amount > 0
  AND (i.rot_personnummer IS NOT NULL OR i.rot_organisationsnummer IS NOT NULL);

-- Grant access to the ROT report view
GRANT SELECT ON rot_report TO authenticated;