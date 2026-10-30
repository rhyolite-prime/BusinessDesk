BEGIN;
CREATE TABLE core_tenant_preferences (
 tenant_id uuid PRIMARY KEY REFERENCES tenants(id),
 settings jsonb NOT NULL,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false
);
CREATE TABLE core_tenant_preference_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 created_by_user_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 previous_settings jsonb, settings jsonb NOT NULL, version integer NOT NULL,
 is_deleted boolean NOT NULL DEFAULT false
);
CREATE TABLE core_tenant_reset_registry (
 table_name text PRIMARY KEY CHECK(table_name ~ '^[a-z_][a-z0-9_]*$')
 CHECK(table_name NOT IN ('tenants','users','roles','user_groups','core_company_profiles','core_currencies') AND NOT starts_with(table_name,'auth_') AND NOT starts_with(table_name,'core_tenant_')),
 module text NOT NULL, reset_group text NOT NULL DEFAULT ''
);
CREATE TABLE core_tenant_reset_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 created_by_user_id uuid NOT NULL REFERENCES users(id), requested_tables text[], snapshot jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes',
 used_at timestamptz, is_deleted boolean NOT NULL DEFAULT false
);
CREATE TABLE core_tenant_reset_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 created_by_user_id uuid NOT NULL REFERENCES users(id), plan_id uuid REFERENCES core_tenant_reset_plans(id),
 status text NOT NULL CHECK(status IN ('completed','failed')),
 reason text NOT NULL, details jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 is_deleted boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX uq_tenant_reset_completion ON core_tenant_reset_events(plan_id) WHERE status='completed';
CREATE TABLE core_tenant_reset_auth_limits (
 tenant_id uuid NOT NULL REFERENCES tenants(id), user_id uuid NOT NULL REFERENCES users(id),
 window_start timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 1,
 PRIMARY KEY(tenant_id,user_id)
);
INSERT INTO core_tenant_reset_registry(table_name,module,reset_group) VALUES
 ('core_accounting_units','Configuration',''),
 ('core_banks','Configuration',''),
 ('core_bank_branches','Configuration',''),
 ('core_cost_centers','Configuration',''),
 ('core_currency_rates','Configuration',''),
 ('core_system_numbers','Configuration',''),
 ('gl_account_balances','Ledger transactions and cash','financial'),
 ('gl_account_controls','Ledger setup',''),
 ('gl_account_groups','Ledger setup',''),
 ('gl_accounting_period_events','Ledger setup',''),
 ('gl_accounting_periods','Ledger setup',''),
 ('gl_accounts','Ledger setup',''),
 ('gl_activity_audit_events','Ledger transactions and cash','financial'),
 ('gl_approval_events','Ledger transactions and cash','financial'),
 ('gl_approval_policies','Ledger setup',''),
 ('gl_bank_accounts','Ledger setup',''),
 ('gl_bank_reconciliation_lines','Ledger transactions and cash','financial'),
 ('gl_bank_reconciliations','Ledger transactions and cash','financial'),
 ('gl_budget_composite_lines','Budgets',''),
 ('gl_budget_composites','Budgets',''),
 ('gl_budget_details','Budgets',''),
 ('gl_budgets','Budgets',''),
 ('gl_cash_receipt_lines','Ledger transactions and cash','financial'),
 ('gl_cash_receipts','Ledger transactions and cash','financial'),
 ('gl_default_accounts','Ledger setup',''),
 ('gl_deleted_journals','Ledger transactions and cash','financial'),
 ('gl_fx_revaluation_lines','Ledger transactions and cash','financial'),
 ('gl_fx_revaluation_runs','Ledger transactions and cash','financial'),
 ('gl_import_batches','Ledger transactions and cash','financial'),
 ('gl_import_rows','Ledger transactions and cash','financial'),
 ('gl_imprest_categories','Ledger transactions and cash','financial'),
 ('gl_imprest_refunds','Ledger transactions and cash','financial'),
 ('gl_imprest_retirement_lines','Ledger transactions and cash','financial'),
 ('gl_imprest_retirements','Ledger transactions and cash','financial'),
 ('gl_imprest_write_offs','Ledger transactions and cash','financial'),
 ('gl_imprests','Ledger transactions and cash','financial'),
 ('gl_journal_batch_sequences','Ledger transactions and cash','financial'),
 ('gl_journal_batches','Ledger transactions and cash','financial'),
 ('gl_journal_history','Ledger transactions and cash','financial'),
 ('gl_journal_lines','Ledger transactions and cash','financial'),
 ('gl_payment_voucher_lines','Ledger transactions and cash','financial'),
 ('gl_payment_voucher_retentions','Ledger transactions and cash','financial'),
 ('gl_payment_vouchers','Ledger transactions and cash','financial'),
 ('gl_petty_cash_recipients','Ledger transactions and cash','financial'),
 ('gl_petty_cash_transaction_lines','Ledger transactions and cash','financial'),
 ('gl_petty_cash_transactions','Ledger transactions and cash','financial');

-- SECURITY INVOKER: no elevation, no arbitrary client SQL identifiers, no TRUNCATE.
-- The application supplies tenant identity from verified JWT attributes only.
CREATE FUNCTION tenant_reset_snapshot(p_tenant uuid,p_requested text[]) RETURNS jsonb
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE
 s text := current_schema(); selected text[]; remaining text[]; ordered text[] := '{}';
 previous integer := -1; t text; child text; parent text; joins text; bad boolean;
 n bigint; hash text; items jsonb := '[]'; blocked jsonb := '[]'; edge record; unknown_tables text[];
BEGIN
 IF p_tenant IS NULL THEN RAISE EXCEPTION 'Tenant required'; END IF;
 -- Only explicitly reviewed business tables can ever be reset. Unknown tenant
 -- tables block whole-tenant resets rather than being silently ignored.
 SELECT array_agg(c.relname ORDER BY c.relname) INTO unknown_tables
 FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
 WHERE ns.nspname=s AND c.relkind IN ('r','p')
 AND EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='tenant_id' AND NOT a.attisdropped)
 AND c.relname NOT IN (SELECT table_name FROM core_tenant_reset_registry)
 AND c.relname NOT IN ('tenants','users','roles','user_groups','core_company_profiles')
 AND NOT starts_with(c.relname,'auth_') AND NOT starts_with(c.relname,'core_tenant_');
 IF p_requested IS NULL AND cardinality(unknown_tables)>0 THEN
  blocked := blocked || jsonb_build_array('Unreviewed tenant tables: '||array_to_string(unknown_tables,', '));
 END IF;
 IF p_requested IS NOT NULL AND (cardinality(p_requested)=0 OR EXISTS(
  SELECT 1 FROM unnest(p_requested) x WHERE x IS NULL OR NOT EXISTS(
   SELECT 1 FROM core_tenant_reset_registry r WHERE r.table_name=x AND to_regclass(format('%I.%I',s,x)) IS NOT NULL))) THEN
  RETURN jsonb_build_object('blocked',jsonb_build_array('Choose installed, reviewed business tables.'),'items','[]'::jsonb);
 END IF;
 -- Locks are ordered and bounded by application lock/statement timeouts. Lock
 -- all installed registry tables to stabilize FK closure and cross-tenant guards.
 FOR t IN SELECT table_name FROM core_tenant_reset_registry WHERE to_regclass(format('%I.%I',s,table_name)) IS NOT NULL ORDER BY table_name LOOP
  EXECUTE format('LOCK TABLE %I.%I IN SHARE ROW EXCLUSIVE MODE',s,t);
 END LOOP;
 SELECT array_agg(table_name ORDER BY table_name) INTO selected FROM core_tenant_reset_registry
 WHERE to_regclass(format('%I.%I',s,table_name)) IS NOT NULL AND (p_requested IS NULL OR table_name=ANY(p_requested));
 selected := COALESCE(selected,'{}');
 WHILE cardinality(selected)<>previous LOOP
  previous := cardinality(selected);
  SELECT COALESCE(array_agg(DISTINCT name ORDER BY name),'{}'::text[]) INTO selected FROM (
   SELECT unnest(selected) AS name
   UNION SELECT r.table_name FROM core_tenant_reset_registry r
   WHERE to_regclass(format('%I.%I',s,r.table_name)) IS NOT NULL AND (
    (r.reset_group<>'' AND r.reset_group IN (SELECT reset_group FROM core_tenant_reset_registry WHERE table_name=ANY(selected)))
    OR ('core_cost_centers'=ANY(selected) AND starts_with(r.table_name,'gl_'))
    OR EXISTS(SELECT 1 FROM pg_constraint fk WHERE fk.contype='f'
      AND fk.conrelid=to_regclass(format('%I.%I',s,r.table_name))
      AND fk.confrelid IN (SELECT to_regclass(format('%I.%I',s,x)) FROM unnest(selected) x)))
  ) expanded;
 END LOOP;
 FOR t IN SELECT unnest(selected) LOOP
  IF EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(format('%I.%I',s,t)) AND (relkind<>'r' OR relispartition OR relrowsecurity))
   OR EXISTS(SELECT 1 FROM pg_inherits WHERE inhrelid=to_regclass(format('%I.%I',s,t)) OR inhparent=to_regclass(format('%I.%I',s,t)))
   OR NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass(format('%I.%I',s,t)) AND attname='tenant_id' AND atttypid='uuid'::regtype AND NOT attisdropped)
   OR EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass(format('%I.%I',s,t)) AND NOT tgisinternal AND (tgtype::integer & 8)>0) THEN
    blocked := blocked || jsonb_build_array('Unsupported table policy or delete trigger: '||t);
  END IF;
 END LOOP;
 IF jsonb_array_length(blocked)>0 THEN RETURN jsonb_build_object('blocked',blocked,'items','[]'::jsonb); END IF;
 -- Never permit a FK cascade/SET NULL/default to touch another tenant. Every
 -- inbound child must be selected and tenant-aware, including archived rows.
 FOR edge IN SELECT fk.oid,fk.conrelid,fk.confrelid,fk.conkey,fk.confkey,n.nspname,c.relname
  FROM pg_constraint fk JOIN pg_class c ON c.oid=fk.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE fk.contype='f' AND fk.confrelid IN (SELECT to_regclass(format('%I.%I',s,x)) FROM unnest(selected) x)
 LOOP
  child := edge.relname;
  IF edge.nspname<>s OR NOT child=ANY(selected) THEN
   blocked := blocked || jsonb_build_array('Protected or unreviewed dependent table: '||edge.nspname||'.'||child);
  ELSE
   SELECT string_agg(format('c.%I = p.%I',ca.attname,pa.attname),' AND ' ORDER BY k.i) INTO joins
   FROM generate_subscripts(edge.conkey,1) k(i)
   JOIN pg_attribute ca ON ca.attrelid=edge.conrelid AND ca.attnum=edge.conkey[k.i]
   JOIN pg_attribute pa ON pa.attrelid=edge.confrelid AND pa.attnum=edge.confkey[k.i];
   SELECT relname INTO parent FROM pg_class WHERE oid=edge.confrelid;
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I c JOIN %I.%I p ON %s WHERE p.tenant_id=$1 AND c.tenant_id IS DISTINCT FROM $1)',s,child,s,parent,joins) INTO bad USING p_tenant;
   IF bad THEN blocked := blocked || jsonb_build_array('Cross-tenant reference blocks reset: '||child); END IF;
  END IF;
 END LOOP;
 remaining := selected;
 WHILE cardinality(remaining)>0 LOOP
  SELECT x INTO t FROM unnest(remaining) x WHERE NOT EXISTS(
   SELECT 1 FROM pg_constraint fk WHERE fk.contype='f'
    AND fk.confrelid=to_regclass(format('%I.%I',s,x)) AND fk.conrelid<>fk.confrelid
    AND fk.conrelid IN (SELECT to_regclass(format('%I.%I',s,y)) FROM unnest(remaining) y)) ORDER BY x LIMIT 1;
  IF t IS NULL THEN
   blocked := blocked || jsonb_build_array('Cyclic table dependencies require operator review.'); EXIT;
  END IF;
  ordered := array_append(ordered,t); remaining := array_remove(remaining,t);
 END LOOP;
 IF jsonb_array_length(blocked)>0 THEN RETURN jsonb_build_object('blocked',blocked,'items','[]'::jsonb); END IF;
 FOREACH t IN ARRAY selected LOOP
  EXECUTE format('SELECT count(*) FROM ONLY %I.%I WHERE tenant_id=$1',s,t) INTO n USING p_tenant;
  IF n>100000 THEN RETURN jsonb_build_object('blocked',jsonb_build_array('More than 100000 rows in '||t||'; use an operator-assisted reset.'),'items','[]'::jsonb); END IF;
  EXECUTE format('SELECT encode(sha256(convert_to(COALESCE(string_agg(h,'''' ORDER BY h),''''),''UTF8'')),''hex'') FROM (SELECT encode(sha256(convert_to(row(d.*)::text,''UTF8'')),''hex'') h FROM ONLY %I.%I d WHERE tenant_id=$1) hashes',s,t) INTO hash USING p_tenant;
  items := items || jsonb_build_array(jsonb_build_object('table',t,'module',(SELECT module FROM core_tenant_reset_registry WHERE table_name=t),'rows',n,'fingerprint',hash));
 END LOOP;
 RETURN jsonb_build_object('blocked',blocked,'items',items,'deleteOrder',to_jsonb(ordered),'allTenant',p_requested IS NULL);
END $$;
CREATE FUNCTION tenant_reset_apply(p_tenant uuid,p_actor uuid,p_plan uuid,p_reason text) RETURNS jsonb
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE plan core_tenant_reset_plans%ROWTYPE; fresh jsonb; t text; n bigint; expected bigint; total bigint:=0;
BEGIN
 SELECT * INTO plan FROM core_tenant_reset_plans WHERE id=p_plan AND tenant_id=p_tenant
 AND created_by_user_id=p_actor AND is_deleted=false AND used_at IS NULL AND expires_at>clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('error','Plan expired, already used or unavailable. Preview again.'); END IF;
 fresh := tenant_reset_snapshot(p_tenant,plan.requested_tables);
 IF jsonb_array_length(fresh->'blocked')>0 OR fresh<>plan.snapshot THEN
  RETURN jsonb_build_object('error','Business data or dependencies changed. Preview again before resetting.');
 END IF;
 FOR t IN SELECT jsonb_array_elements_text(fresh->'deleteOrder') LOOP
  SELECT (x->>'rows')::bigint INTO expected FROM jsonb_array_elements(fresh->'items') x WHERE x->>'table'=t;
  -- Deliberate, audited exception: reset includes archived BUSINESS records.
  EXECUTE format('DELETE FROM ONLY %I.%I WHERE tenant_id=$1',current_schema(),t) USING p_tenant;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>expected THEN RAISE EXCEPTION 'Reset row counts changed'; END IF;
  total := total+n;
 END LOOP;
 UPDATE core_tenant_reset_plans SET used_at=clock_timestamp() WHERE id=p_plan AND tenant_id=p_tenant AND is_deleted=false;
 INSERT INTO core_tenant_reset_events(tenant_id,created_by_user_id,plan_id,status,reason,details)
 VALUES(p_tenant,p_actor,p_plan,'completed',p_reason,fresh);
 RETURN jsonb_build_object('deletedRows',total,'items',fresh->'items','planId',p_plan);
END $$;
COMMIT;
