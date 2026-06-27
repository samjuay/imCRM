-- ImCRM Production-Ready Default Seed Script
-- Contains only universal/default configurations and metadata

-- Seed default corporate Lead Sources
-- In compliance with multi-tenant design, company_id is set to NULL for universal access.
-- Features ON CONFLICT handlers for safe, repetitive executions on production deployments.

INSERT INTO lead_sources (id, company_id, name, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000010', NULL, 'Builder Website', TRUE),
  ('00000000-0000-0000-0000-000000000020', NULL, 'Referral', TRUE),
  ('00000000-0000-0000-0000-000000000030', NULL, 'Cold Call', TRUE),
  ('00000000-0000-0000-0000-000000000040', NULL, 'Portal', TRUE),
  ('00000000-0000-0000-0000-000000000050', NULL, 'Social Media', TRUE),
  ('00000000-0000-0000-0000-000000000060', NULL, 'Walk-in', TRUE),
  ('00000000-0000-0000-0000-000000000070', NULL, 'Other', TRUE)
ON CONFLICT (id) DO UPDATE SET
  company_id = EXCLUDED.company_id,
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active;
