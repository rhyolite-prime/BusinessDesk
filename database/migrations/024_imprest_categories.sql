BEGIN;
ALTER TABLE gl_imprest_categories ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0);
ALTER TABLE gl_imprest_categories DROP CONSTRAINT uq_gl_imprest_categories_tenant_unit_name;
CREATE UNIQUE INDEX uq_imprest_category_live_name ON gl_imprest_categories(tenant_id,accounting_unit_id,lower(btrim(name))) WHERE is_deleted=false;
-- Lock the referenced live category against concurrent soft deletion, and enforce
-- tenant/unit scope for all future references without rewriting imported history.
CREATE FUNCTION check_live_imprest_category() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NOT NEW.is_deleted AND NEW.imprest_category_id IS NOT NULL THEN
  PERFORM id FROM gl_imprest_categories WHERE id=NEW.imprest_category_id AND tenant_id=NEW.tenant_id AND accounting_unit_id=NEW.accounting_unit_id AND is_deleted=false FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose a live imprest category in this tenant and unit' USING ERRCODE='23503'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_live_imprest_category BEFORE INSERT OR UPDATE OF imprest_category_id,tenant_id,accounting_unit_id,is_deleted ON gl_imprests FOR EACH ROW EXECUTE FUNCTION check_live_imprest_category();
CREATE TRIGGER check_live_imprest_category BEFORE INSERT OR UPDATE OF imprest_category_id,tenant_id,accounting_unit_id,is_deleted ON gl_default_accounts FOR EACH ROW EXECUTE FUNCTION check_live_imprest_category();
COMMIT;
