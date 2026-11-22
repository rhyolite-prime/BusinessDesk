BEGIN;

-- Host template for Customer Receipt Voucher numbering under General Ledger (module_id = 1)
INSERT INTO core_system_numbers (
    tenant_id,
    source_template_id,
    module_id,
    item_name,
    key,
    prefix,
    suffix,
    format_pattern,
    padding,
    last_no,
    created_by_user_id
)
SELECT
    NULL,
    NULL,
    1,
    'Receipt Voucher',
    'gl-receipt-voucher-id',
    'CRV-',
    '',
    '{PREFIX}{NO}{SUFFIX}',
    4,
    0,
    u.id
FROM users u
WHERE u.is_host_admin_user = true
ORDER BY u.created_at ASC
LIMIT 1
ON CONFLICT DO NOTHING;

-- Propagate template to live tenants who do not yet have gl-receipt-voucher-id configured
INSERT INTO core_system_numbers (
    tenant_id,
    source_template_id,
    module_id,
    item_name,
    key,
    prefix,
    suffix,
    format_pattern,
    padding,
    last_no,
    created_by_user_id
)
SELECT
    t.id,
    tmpl.id,
    tmpl.module_id,
    tmpl.item_name,
    tmpl.key,
    tmpl.prefix,
    tmpl.suffix,
    tmpl.format_pattern,
    tmpl.padding,
    tmpl.last_no,
    COALESCE(
        (SELECT u.id FROM users u WHERE u.tenant_id = t.id AND u.is_tenant_admin_user = true ORDER BY u.created_at ASC LIMIT 1),
        tmpl.created_by_user_id
    )
FROM tenants t
CROSS JOIN core_system_numbers tmpl
WHERE tmpl.tenant_id IS NULL
  AND tmpl.module_id = 1
  AND lower(tmpl.key) = 'gl-receipt-voucher-id'
  AND tmpl.is_deleted = false
  AND t.is_deleted = false
  AND NOT EXISTS (
      SELECT 1 FROM core_system_numbers existing
      WHERE existing.tenant_id = t.id
        AND existing.module_id = 1
        AND lower(existing.key) = 'gl-receipt-voucher-id'
        AND existing.is_deleted = false
  )
ON CONFLICT DO NOTHING;

COMMIT;
