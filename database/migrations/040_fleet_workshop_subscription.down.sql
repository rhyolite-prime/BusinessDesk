-- Stop rather than silently discard agreed commercial terms for the module.
BEGIN;
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM tenants WHERE has_subscribed_to_fleet_workshop_management=true AND is_deleted=false) THEN
  RAISE EXCEPTION 'Cannot roll back the Fleet & Workshop Management subscription columns while tenants are subscribed; disable the module and record the terms elsewhere first';
 END IF;
END $$;
ALTER TABLE tenants
  DROP COLUMN has_subscribed_to_fleet_workshop_management,
  DROP COLUMN fleet_workshop_management_subscription_start_date,
  DROP COLUMN fleet_workshop_management_subscription_end_date,
  DROP COLUMN fleet_workshop_management_subscription_fee,
  DROP COLUMN fleet_workshop_management_billing_cycle,
  DROP COLUMN fleet_workshop_management_next_renewal_date;
COMMIT;
