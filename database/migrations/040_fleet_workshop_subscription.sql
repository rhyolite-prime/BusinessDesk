-- Fleet & Workshop Management is a new tenant subscription group. The fourteen
-- legacy groups on `tenants` predate these migrations and stay untouched; this
-- adds the fifteenth group in the same shape so the account service can price,
-- date-bound and gate the module. Existing tenants start unsubscribed: the host
-- enables and prices it per account, exactly like every other module.
BEGIN;
ALTER TABLE tenants
  ADD COLUMN has_subscribed_to_fleet_workshop_management boolean NOT NULL DEFAULT false,
  ADD COLUMN fleet_workshop_management_subscription_start_date timestamp,
  ADD COLUMN fleet_workshop_management_subscription_end_date timestamp,
  ADD COLUMN fleet_workshop_management_subscription_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN fleet_workshop_management_billing_cycle varchar(50),
  ADD COLUMN fleet_workshop_management_next_renewal_date timestamp;
COMMIT;
