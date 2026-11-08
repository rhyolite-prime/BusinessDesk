-- Rollback for 033_procurement_orders.sql. Destroys every purchase order and
-- quotation. Back up first and stop application writes: procurement history is
-- not recoverable afterwards.
BEGIN;
DELETE FROM core_tenant_reset_registry WHERE table_name IN
 ('scm_purchase_order_lines','scm_purchase_orders','scm_purchase_quotation_lines','scm_purchase_quotations');
DROP TRIGGER protect_scm_purchase_order_line ON scm_purchase_order_lines;
DROP FUNCTION protect_scm_purchase_order_line();
DROP TRIGGER check_scm_purchase_order_line ON scm_purchase_order_lines;
DROP FUNCTION check_scm_purchase_order_line();
DROP INDEX ix_scm_purchase_order_lines_requisition;
DROP INDEX ix_scm_purchase_order_lines_open;
DROP INDEX ix_scm_purchase_order_lines_item;
DROP INDEX ix_scm_purchase_order_lines_document;
DROP TABLE scm_purchase_order_lines;
DROP TRIGGER protect_scm_purchase_order ON scm_purchase_orders;
DROP FUNCTION protect_scm_purchase_order();
DROP TRIGGER check_scm_purchase_order_transition ON scm_purchase_orders;
DROP FUNCTION check_scm_purchase_order_transition();
DROP TRIGGER check_scm_purchase_order_scope ON scm_purchase_orders;
DROP FUNCTION check_scm_purchase_order_scope();
DROP INDEX ix_scm_purchase_orders_open;
DROP INDEX ix_scm_purchase_orders_status;
DROP INDEX ix_scm_purchase_orders_supplier;
DROP INDEX ix_scm_purchase_orders_scope;
DROP INDEX uq_scm_purchase_orders_request;
DROP INDEX uq_scm_purchase_orders_number;
DROP TABLE scm_purchase_orders;
DROP TRIGGER protect_scm_quotation_line ON scm_purchase_quotation_lines;
DROP FUNCTION protect_scm_quotation_line();
DROP INDEX ix_scm_quotation_lines_item;
DROP INDEX ix_scm_quotation_lines_document;
DROP TABLE scm_purchase_quotation_lines;
DROP TRIGGER protect_scm_quotation ON scm_purchase_quotations;
DROP FUNCTION protect_scm_quotation();
DROP TRIGGER check_scm_quotation_transition ON scm_purchase_quotations;
DROP FUNCTION check_scm_quotation_transition();
DROP TRIGGER check_scm_quotation_scope ON scm_purchase_quotations;
DROP FUNCTION check_scm_quotation_scope();
DROP INDEX ix_scm_quotations_status;
DROP INDEX ix_scm_quotations_supplier;
DROP INDEX ix_scm_quotations_scope;
DROP INDEX uq_scm_quotations_request;
DROP INDEX uq_scm_quotations_number;
DROP TABLE scm_purchase_quotations;
COMMIT;
