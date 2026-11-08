-- Rollback for 032_procurement_requisitions.sql. Destroys every purchase
-- requisition and the shared procurement event audit. Back up first and stop
-- application writes: procurement history is not recoverable afterwards.
BEGIN;
DELETE FROM core_tenant_reset_registry WHERE table_name IN
 ('scm_purchase_requisition_lines','scm_purchase_requisitions','scm_procurement_events','scm_document_sequences');
DROP TRIGGER protect_scm_requisition_line ON scm_purchase_requisition_lines;
DROP FUNCTION protect_scm_requisition_line();
DROP TRIGGER check_scm_requisition_line ON scm_purchase_requisition_lines;
DROP FUNCTION check_scm_requisition_line();
DROP INDEX ix_scm_requisition_lines_open;
DROP INDEX ix_scm_requisition_lines_item;
DROP INDEX ix_scm_requisition_lines_document;
DROP TABLE scm_purchase_requisition_lines;
DROP TRIGGER protect_scm_requisition ON scm_purchase_requisitions;
DROP FUNCTION protect_scm_requisition();
DROP TRIGGER check_scm_requisition_transition ON scm_purchase_requisitions;
DROP FUNCTION check_scm_requisition_transition();
DROP TRIGGER check_scm_requisition_scope ON scm_purchase_requisitions;
DROP FUNCTION check_scm_requisition_scope();
DROP INDEX ix_scm_requisitions_status;
DROP INDEX ix_scm_requisitions_scope;
DROP INDEX uq_scm_requisitions_request;
DROP INDEX uq_scm_requisitions_number;
DROP TABLE scm_purchase_requisitions;
DROP TRIGGER protect_scm_procurement_event_delete ON scm_procurement_events;
DROP TRIGGER protect_scm_procurement_event_update ON scm_procurement_events;
DROP FUNCTION protect_scm_procurement_event();
DROP INDEX ix_scm_procurement_events_scope;
DROP TABLE scm_procurement_events;
DROP TABLE scm_document_sequences;
COMMIT;
