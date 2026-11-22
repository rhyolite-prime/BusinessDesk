BEGIN;
DELETE FROM core_system_numbers WHERE module_id = 1 AND lower(key) = 'gl-receipt-voucher-id';
COMMIT;
