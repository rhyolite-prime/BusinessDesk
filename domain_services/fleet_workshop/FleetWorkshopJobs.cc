#include "FleetWorkshopInternal.h"
#include "FleetWorkshopService.h"
#include "domain_services/gl/JournalService.h"
#include "domain_services/inventory/InventoryService.h"
#include "domain_services/supply_chain/SupplyChainService.h"
#include "utils/TransactionUtil.h"
#include <map>

namespace business_desk::domain_services::fwm_internal {
namespace {

dto::BaseApiResponse okRecord(const Json::Value &record) {
  dto::BaseApiResponse r;
  r.result = record;
  r.success = true;
  return r;
}

drogon::Task<void> addJobEvent(DbClientPtr tx, const utils::AuditIdentity &who,
                               const std::string &unitId, const std::string &jobId,
                               const std::string &action, const std::string &prev,
                               const std::string &next, const std::string &reason) {
  co_await tx->execSqlCoro(
      "INSERT INTO fwm_job_card_events(tenant_id,tenant_unit_id,job_card_id,action,"
      "previous_status,new_status,reason,version,created_by_user_id) "
      "SELECT $1::uuid,$2::uuid,$3::uuid,$4,NULLIF($5,''),$6,$7,"
      "COALESCE((SELECT max(version) FROM fwm_job_card_events WHERE tenant_id=$1 AND job_card_id=$3::uuid),0)+1,"
      "$8::uuid",
      who.tenantId, unitId, jobId, action, prev, next, reason, who.userId);
  co_return;
}

drogon::Task<void> recomputeJobTotals(DbClientPtr tx, const utils::AuditIdentity &who,
                                      const std::string &jobId) {
  const auto sums = co_await tx->execSqlCoro(
      "SELECT "
      "COALESCE(sum(line_cost) FILTER (WHERE line_type IN('spare_part','tyre','consumable')),0)::text AS parts_cost,"
      "COALESCE(sum(line_cost) FILTER (WHERE line_type='internal_labour'),0)::text AS line_labour_cost,"
      "COALESCE(sum(line_cost) FILTER (WHERE line_type IN('outsourced_repair','electrical_service','other')),0)::text AS out_cost,"
      "COALESCE(sum(line_cost) FILTER (WHERE line_type='lubricant'),0)::text AS lub_cost,"
      "COALESCE(sum(line_billable_amount) FILTER (WHERE is_billable=true AND line_type IN('spare_part','tyre','consumable','lubricant')),0)::text AS bill_parts,"
      "COALESCE(sum(line_billable_amount) FILTER (WHERE is_billable=true AND line_type='internal_labour'),0)::text AS bill_labour,"
      "COALESCE(sum(line_billable_amount) FILTER (WHERE is_billable=true AND line_type IN('outsourced_repair','electrical_service','other')),0)::text AS bill_other "
      "FROM fwm_job_card_lines WHERE tenant_id=$1 AND job_card_id=$2::uuid AND is_deleted=false",
      who.tenantId, jobId);
  const auto assignSums = co_await tx->execSqlCoro(
      "SELECT COALESCE(sum(round(hours_worked*hourly_cost_rate,6)),0)::text AS assign_cost,"
      "COALESCE(sum(round(hours_worked*hourly_bill_rate,6)),0)::text AS assign_bill "
      "FROM fwm_job_card_assignments WHERE tenant_id=$1 AND job_card_id=$2::uuid AND is_deleted=false",
      who.tenantId, jobId);

  const long long parts = dec6(sums[0]["parts_cost"].as<std::string>());
  const long long labour =
      dec6(sums[0]["line_labour_cost"].as<std::string>()) +
      dec6(assignSums[0]["assign_cost"].as<std::string>());
  const long long outsourced = dec6(sums[0]["out_cost"].as<std::string>());
  const long long lubs = dec6(sums[0]["lub_cost"].as<std::string>());
  const long long totalCost = parts + labour + outsourced + lubs;

  const auto jobInfo = co_await tx->execSqlCoro(
      "SELECT j.accounting_unit_id, j.billing_scope, COALESCE(s.default_tax_rate,0)::text AS tax_rate "
      "FROM fwm_job_cards j LEFT JOIN fwm_gl_settings s ON s.tenant_id=j.tenant_id "
      "AND s.accounting_unit_id=j.accounting_unit_id AND s.is_deleted=false "
      "WHERE j.tenant_id=$1 AND j.id=$2::uuid",
      who.tenantId, jobId);
  const bool customerBillable =
      !jobInfo.empty() && jobInfo[0]["billing_scope"].as<std::string>() == "customer_billable";
  const long long billParts = dec6(sums[0]["bill_parts"].as<std::string>());
  const long long billLabour =
      dec6(sums[0]["bill_labour"].as<std::string>()) +
      (customerBillable ? dec6(assignSums[0]["assign_bill"].as<std::string>()) : 0);
  const long long billOther = dec6(sums[0]["bill_other"].as<std::string>());
  const long long billSub = billParts + billLabour + billOther;
  long long taxTotal = 0;
  if (!jobInfo.empty() && billSub > 0) {
    const long double rateVal = std::stold(jobInfo[0]["tax_rate"].as<std::string>());
    taxTotal = static_cast<long long>(std::llround(static_cast<long double>(billSub) * rateVal));
  }
  const long long billGrand = billSub + taxTotal;

  co_await tx->execSqlCoro(
      "UPDATE fwm_job_cards SET parts_cost_total=($3::text)::numeric,"
      "internal_labour_cost_total=($4::text)::numeric,outsourced_cost_total=($5::text)::numeric,"
      "lubricants_cost_total=($6::text)::numeric,total_cost=($7::text)::numeric,"
      "billable_parts_total=($8::text)::numeric,billable_labour_total=($9::text)::numeric,"
      "billable_other_total=($10::text)::numeric,tax_total=($11::text)::numeric,"
      "billable_grand_total=($12::text)::numeric,last_modified_at=now(),"
      "last_modified_by_user_id=$13::uuid WHERE tenant_id=$1 AND id=$2::uuid",
      who.tenantId, jobId, dec6str(parts), dec6str(labour), dec6str(outsourced), dec6str(lubs),
      dec6str(totalCost), dec6str(billParts), dec6str(billLabour), dec6str(billOther),
      dec6str(taxTotal), dec6str(billGrand), who.userId);
  co_return;
}

drogon::Task<dto::BaseApiResponse>
fetchJobCard(DbClientPtr db, const utils::AuditIdentity &who, const std::string &id, bool canWrite) {
  const auto head = co_await db->execSqlCoro(
      "SELECT jsonb_build_object("
      "'id', j.id, 'version', j.version, 'accountingUnitId', j.accounting_unit_id, "
      "'jobNumber', j.job_number, 'vehicleId', j.vehicle_id, "
      "'assetNo', v.asset_no, 'registrationNo', v.registration_no, 'makeModel', v.make_model, "
      "'coupledTrailerId', j.coupled_trailer_id, "
      "'trailerRegistrationNo', COALESCE(tr.registration_no,''), "
      "'jobType', j.job_type, 'billingScope', j.billing_scope, 'customerId', j.customer_id, "
      "'customerName', COALESCE(cu.name,''), 'costCenterId', j.cost_center_id, "
      "'costCenterName', COALESCE(cc.name,''), 'scheduleId', j.schedule_id, "
      "'procedureId', j.procedure_id, 'warehouseId', j.warehouse_id, 'currencyId', j.currency_id, "
      "'currencyCode', cr.code, 'exchangeRate', j.exchange_rate::text, 'openedDate', j.opened_date, "
      "'scheduledStartAt', j.scheduled_start_at, 'actualStartAt', j.actual_start_at, "
      "'targetCompletionAt', j.target_completion_at, 'completedAt', j.completed_at, "
      "'closedAt', j.closed_at, 'meterReadingIn', j.meter_reading_in::text, "
      "'meterReadingOut', j.meter_reading_out::text, 'downtimeHours', j.downtime_hours::text, "
      "'locationSite', j.location_site, 'reportedFault', j.reported_fault, "
      "'diagnosis', j.diagnosis, 'workPerformed', j.work_performed, 'priority', j.priority, "
      "'isMajorProject', j.is_major_project, 'status', j.status, 'paymentStatus', j.payment_status, "
      "'partsCostTotal', j.parts_cost_total::text, "
      "'internalLabourCostTotal', j.internal_labour_cost_total::text, "
      "'outsourcedCostTotal', j.outsourced_cost_total::text, "
      "'lubricantsCostTotal', j.lubricants_cost_total::text, 'totalCost', j.total_cost::text, "
      "'billablePartsTotal', j.billable_parts_total::text, "
      "'billableLabourTotal', j.billable_labour_total::text, "
      "'billableOtherTotal', j.billable_other_total::text, 'taxTotal', j.tax_total::text, "
      "'billableGrandTotal', j.billable_grand_total::text, "
      "'invIssueDocumentId', j.inv_issue_document_id, "
      "'glCostJournalBatchId', j.gl_cost_journal_batch_id, "
      "'glRevenueJournalBatchId', j.gl_revenue_journal_batch_id, "
      "'arInvoiceId', j.ar_invoice_id, 'posOrderId', j.pos_order_id, 'projectId', j.project_id"
      ")::text AS record "
      "FROM fwm_job_cards j "
      "JOIN fwm_vehicles v ON v.tenant_id=j.tenant_id AND v.id=j.vehicle_id AND v.is_deleted=false "
      "LEFT JOIN fwm_vehicles tr ON tr.tenant_id=j.tenant_id AND tr.id=j.coupled_trailer_id AND tr.is_deleted=false "
      "LEFT JOIN core_customers cu ON cu.tenant_id=j.tenant_id AND cu.id=j.customer_id AND cu.is_deleted=false "
      "LEFT JOIN core_cost_centers cc ON cc.tenant_id=j.tenant_id AND cc.id=j.cost_center_id AND cc.is_deleted=false "
      "JOIN core_currencies cr ON cr.id=j.currency_id "
      "WHERE j.tenant_id=$1 AND j.id=$2::uuid AND j.is_deleted=false",
      who.tenantId, id);
  if (head.empty())
    co_return fail("not_found", "Job card not found.");
  auto out = parse(head[0]["record"].as<std::string>());

  const auto lines = co_await db->execSqlCoro(
      "SELECT jsonb_build_object('id',l.id,'lineNumber',l.line_number,'lineType',l.line_type,"
      "'sourceType',l.source_type,'description',l.description,'positionOrSide',l.position_or_side,"
      "'invItemId',l.inv_item_id,'itemCode',COALESCE(i.item_code,''),'uomId',l.uom_id,"
      "'warehouseId',l.warehouse_id,'invStockDocumentId',l.inv_stock_document_id,"
      "'supplierId',l.supplier_id,'supplierName',COALESCE(sp.name,''),"
      "'apInvoiceId',l.ap_invoice_id,'employeeId',l.employee_id,'tyreId',l.tyre_id,"
      "'majorComponentId',l.major_component_id,'glExpenseAccountId',l.gl_expense_account_id,"
      "'glRevenueAccountId',l.gl_revenue_account_id,'quantity',l.quantity::text,"
      "'unitCost',l.unit_cost::text,'lineCost',l.line_cost::text,'unitPrice',l.unit_price::text,"
      "'lineBillableAmount',l.line_billable_amount::text,'isBillable',l.is_billable,"
      "'isPaid',l.is_paid,'stockIssued',l.stock_issued,'locationNote',l.location_note,"
      "'entryDate',l.entry_date)::text AS record FROM fwm_job_card_lines l "
      "LEFT JOIN inv_items i ON i.tenant_id=l.tenant_id AND i.id=l.inv_item_id AND i.is_deleted=false "
      "LEFT JOIN core_suppliers sp ON sp.tenant_id=l.tenant_id AND sp.id=l.supplier_id AND sp.is_deleted=false "
      "WHERE l.tenant_id=$1 AND l.job_card_id=$2::uuid AND l.is_deleted=false ORDER BY l.line_number, l.id",
      who.tenantId, id);
  out["lines"] = Json::arrayValue;
  for (const auto &row : lines)
    out["lines"].append(parse(row["record"].as<std::string>()));

  const auto assigns = co_await db->execSqlCoro(
      "SELECT jsonb_build_object('id',a.id,'employeeId',a.employee_id,"
      "'employeeName',concat_ws(' ',e.first_name,e.last_name),'roleOnJob',a.role_on_job,"
      "'hoursEstimated',a.hours_estimated::text,'hoursWorked',a.hours_worked::text,"
      "'hourlyCostRate',a.hourly_cost_rate::text,'hourlyBillRate',a.hourly_bill_rate::text,"
      "'workNotes',a.work_notes)::text AS record FROM fwm_job_card_assignments a "
      "JOIN hr_employee_biodata e ON e.tenant_id=a.tenant_id AND e.id=a.employee_id AND e.is_deleted=false "
      "WHERE a.tenant_id=$1 AND a.job_card_id=$2::uuid AND a.is_deleted=false ORDER BY a.assigned_at",
      who.tenantId, id);
  out["assignments"] = Json::arrayValue;
  for (const auto &row : assigns)
    out["assignments"].append(parse(row["record"].as<std::string>()));

  const auto miles = co_await db->execSqlCoro(
      "SELECT jsonb_build_object('id',m.id,'version',m.version,'milestoneCode',m.milestone_code,"
      "'title',m.title,'phase',m.phase,'ownerEmployeeId',m.owner_employee_id,"
      "'ownerName',COALESCE(concat_ws(' ',e.first_name,e.last_name),''),"
      "'plannedStartDate',m.planned_start_date,'plannedEndDate',m.planned_end_date,"
      "'actualStartDate',m.actual_start_date,'actualEndDate',m.actual_end_date,"
      "'progressPct',m.progress_pct,'status',m.status,'dependsOnMilestoneId',m.depends_on_milestone_id,"
      "'deliverables',m.deliverables,'blockerNotes',m.blocker_notes,'sortOrder',m.sort_order)::text AS record "
      "FROM fwm_job_milestones m LEFT JOIN hr_employee_biodata e ON e.tenant_id=m.tenant_id "
      "AND e.id=m.owner_employee_id AND e.is_deleted=false "
      "WHERE m.tenant_id=$1 AND m.job_card_id=$2::uuid AND m.is_deleted=false ORDER BY m.sort_order, m.id",
      who.tenantId, id);
  out["milestones"] = Json::arrayValue;
  for (const auto &row : miles)
    out["milestones"].append(parse(row["record"].as<std::string>()));

  const auto events = co_await db->execSqlCoro(
      "SELECT jsonb_build_object('id',ev.id,'action',ev.action,'previousStatus',ev.previous_status,"
      "'newStatus',ev.new_status,'reason',ev.reason,'version',ev.version,'createdAt',ev.created_at)::text AS record "
      "FROM fwm_job_card_events ev WHERE ev.tenant_id=$1 AND ev.job_card_id=$2::uuid AND ev.is_deleted=false "
      "ORDER BY ev.version",
      who.tenantId, id);
  out["history"] = Json::arrayValue;
  for (const auto &row : events)
    out["history"].append(parse(row["record"].as<std::string>()));

  const auto links = co_await db->execSqlCoro(
      "SELECT jsonb_build_object('id',l.id,'targetModule',l.target_module,'linkKind',l.link_kind,"
      "'targetEntityId',l.target_entity_id,'targetReference',l.target_reference,"
      "'handoffStatus',l.handoff_status,'amount',l.amount::text,'journalBatchId',l.journal_batch_id)::text AS record "
      "FROM fwm_cross_module_links l WHERE l.tenant_id=$1 AND l.source_entity_type='job_card' "
      "AND l.source_entity_id=$2::uuid AND l.is_deleted=false ORDER BY l.created_at DESC",
      who.tenantId, id);
  out["crossModuleLinks"] = Json::arrayValue;
  for (const auto &row : links)
    out["crossModuleLinks"].append(parse(row["record"].as<std::string>()));

  out["canWrite"] = canWrite;
  co_return okRecord(out);
}

drogon::Task<dto::BaseApiResponse>
jobCards(DbClientPtr db, const std::string &action, const std::string &id, const std::string &subId,
         Json::Value body, int page, int size, const std::string &query, const std::string &unitId,
         const utils::AuditIdentity &who, bool canWrite) {
  const std::string unit = lower(trim(unitId));
  const std::string unitScope = uuidOrEmpty(unit);
  if (action == "list") {
    const std::string q = search(query);
    const std::string status = body.isObject() && body["status"].isString() ? trim(body["status"].asString()) : "";
    const auto cnt = co_await db->execSqlCoro(
        "SELECT count(*) AS total FROM fwm_job_cards j "
        "JOIN fwm_vehicles v ON v.tenant_id=j.tenant_id AND v.id=j.vehicle_id AND v.is_deleted=false "
        "WHERE j.tenant_id=$1 AND j.is_deleted=false AND ($2='' OR j.accounting_unit_id=$2::uuid) "
        "AND ($3='' OR j.status=$3) "
        "AND ($4='' OR strpos(lower(j.job_number||' '||v.asset_no||' '||v.registration_no||' '||j.reported_fault),lower($4))>0)",
        who.tenantId, unitScope, status, q);
    const auto rows = co_await db->execSqlCoro(
        "SELECT jsonb_build_object('id',j.id,'version',j.version,'accountingUnitId',j.accounting_unit_id,"
        "'jobNumber',j.job_number,'vehicleId',j.vehicle_id,'assetNo',v.asset_no,"
        "'registrationNo',v.registration_no,'jobType',j.job_type,'billingScope',j.billing_scope,"
        "'customerId',j.customer_id,'customerName',COALESCE(cu.name,''),"
        "'openedDate',j.opened_date,'priority',j.priority,'isMajorProject',j.is_major_project,"
        "'status',j.status,'paymentStatus',j.payment_status,'totalCost',j.total_cost::text,"
        "'billableGrandTotal',j.billable_grand_total::text,'locationSite',j.location_site)::text AS record "
        "FROM fwm_job_cards j "
        "JOIN fwm_vehicles v ON v.tenant_id=j.tenant_id AND v.id=j.vehicle_id AND v.is_deleted=false "
        "LEFT JOIN core_customers cu ON cu.tenant_id=j.tenant_id AND cu.id=j.customer_id AND cu.is_deleted=false "
        "WHERE j.tenant_id=$1 AND j.is_deleted=false AND ($2='' OR j.accounting_unit_id=$2::uuid) "
        "AND ($3='' OR j.status=$3) "
        "AND ($4='' OR strpos(lower(j.job_number||' '||v.asset_no||' '||v.registration_no||' '||j.reported_fault),lower($4))>0) "
        "ORDER BY j.opened_date DESC, j.created_at DESC LIMIT $5 OFFSET $6",
        who.tenantId, unitScope, status, q, size,
        static_cast<long long>(page - 1) * size);
    dto::BaseApiResponse r;
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.result["totalCount"] = Json::Int64(cnt[0]["total"].as<long long>());
    r.result["canWrite"] = canWrite;
    r.success = true;
    co_return r;
  }
  if (action == "get") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid job card UUID required.");
    co_return co_await fetchJobCard(db, who, id, canWrite);
  }
  if (action == "next-number") {
    if (!uuid(unit))
      co_return fail("validation_error", "accountingUnitId is required.");
    const auto row = co_await db->execSqlCoro(
        "SELECT COALESCE(prefix,'JOB') AS prefix, COALESCE(padding,5) AS padding, COALESCE(next_number,1) AS next_number "
        "FROM fwm_document_sequences WHERE tenant_id=$1 AND accounting_unit_id=$2::uuid AND document_type='job_card'",
        who.tenantId, unit);
    std::string prefix = "JOB";
    int pad = 5;
    long long num = 1;
    if (!row.empty()) {
      prefix = row[0]["prefix"].as<std::string>();
      pad = row[0]["padding"].as<int>();
      num = row[0]["next_number"].as<long long>();
    }
    std::string s = std::to_string(num);
    if (static_cast<int>(s.size()) < pad)
      s = std::string(static_cast<size_t>(pad - static_cast<int>(s.size())), '0') + s;
    Json::Value out;
    out["nextNumber"] = prefix + "-" + s;
    co_return okRecord(out);
  }
  if (action == "delete") {
    if (!uuid(id) || !body.isObject() || !body["version"].isInt() || body["version"].asInt() < 1)
      co_return fail("validation_error", "ID and version required.");
    const auto del = co_await db->execSqlCoro(
        "UPDATE fwm_job_cards SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3::uuid,"
        "version=version+1 WHERE tenant_id=$1 AND id=$2::uuid AND status='draft' AND version=$4 "
        "AND is_deleted=false RETURNING id",
        who.tenantId, id, who.userId, body["version"].asInt());
    if (del.empty())
      co_return fail("conflict", "Only draft job cards at current version can be deleted.");
    Json::Value res;
    res["id"] = id;
    res["isDeleted"] = true;
    co_return okRecord(res);
  }
  if (action == "lines.list") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid job card UUID required.");
    const auto rows = co_await db->execSqlCoro(
        "SELECT jsonb_build_object('id',l.id,'version',l.version,'lineNumber',l.line_number,"
        "'lineType',l.line_type,'sourceType',l.source_type,'description',l.description,"
        "'positionOrSide',l.position_or_side,'invItemId',l.inv_item_id,'uomId',l.uom_id,"
        "'warehouseId',l.warehouse_id,'supplierId',l.supplier_id,'apInvoiceId',l.ap_invoice_id,"
        "'employeeId',l.employee_id,'tyreId',l.tyre_id,'majorComponentId',l.major_component_id,"
        "'quantity',l.quantity::text,'unitCost',l.unit_cost::text,'lineCost',l.line_cost::text,"
        "'unitPrice',l.unit_price::text,'lineBillableAmount',l.line_billable_amount::text,"
        "'isBillable',l.is_billable,'isPaid',l.is_paid,'stockIssued',l.stock_issued,"
        "'locationNote',l.location_note,'entryDate',l.entry_date)::text AS record "
        "FROM fwm_job_card_lines l WHERE l.tenant_id=$1 AND l.job_card_id=$2::uuid AND l.is_deleted=false "
        "ORDER BY l.line_number, l.id",
        who.tenantId, id);
    dto::BaseApiResponse r;
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.result["canWrite"] = canWrite;
    r.success = true;
    co_return r;
  }
  if (action == "lines.add" || action == "lines.update") {
    if (!uuid(id) || (action == "lines.update" && !uuid(subId)))
      co_return fail("validation_error", "Valid job card UUID" + std::string(action == "lines.update" ? " and line UUID" : "") + " required.");
    const auto head = co_await db->execSqlCoro(
        "SELECT status FROM fwm_job_cards WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR UPDATE",
        who.tenantId, id);
    if (head.empty())
      co_return fail("not_found", "Job card not found.");
    const std::string st = head[0]["status"].as<std::string>();
    if (st == "closed" || st == "cancelled")
      co_return fail("conflict", "Cannot modify lines on closed or cancelled job cards.");
    std::string err;
    std::set<std::string> allowed{"lineType", "sourceType", "description", "positionOrSide", "invItemId",
                                  "uomId", "warehouseId", "supplierId", "apInvoiceId", "employeeId",
                                  "tyreId", "majorComponentId", "glExpenseAccountId",
                                  "glRevenueAccountId", "quantity", "unitCost", "unitPrice",
                                  "isBillable", "isPaid", "locationNote", "entryDate"};
    if (action == "lines.update")
      allowed.insert("version");
    if (!allowedFields(body, allowed, err) ||
        !validEnum(body, "lineType",
                   {"spare_part", "tyre", "lubricant", "internal_labour", "outsourced_repair",
                    "electrical_service", "consumable", "other"},
                   err) ||
        !validEnum(body, "sourceType",
                   {"inventory_issue", "direct_purchase_ap", "workshop_labour", "petty_cash", "manual"},
                   err, "manual") ||
        !validText(body, "description", 500, err, true) ||
        !validText(body, "positionOrSide", 80, err) ||
        !validUuidOpt(body, "invItemId", err) || !validUuidOpt(body, "uomId", err) ||
        !validUuidOpt(body, "warehouseId", err) || !validUuidOpt(body, "supplierId", err) ||
        !validUuidOpt(body, "apInvoiceId", err) || !validUuidOpt(body, "employeeId", err) ||
        !validUuidOpt(body, "tyreId", err) || !validUuidOpt(body, "majorComponentId", err) ||
        !validUuidOpt(body, "glExpenseAccountId", err) ||
        !validUuidOpt(body, "glRevenueAccountId", err) ||
        !validDec(body, "quantity", err, "1", true) ||
        !validDec(body, "unitCost", err, "0") ||
        !validDec(body, "unitPrice", err, "0") ||
        !validBool(body, "isBillable", err, false) ||
        !validBool(body, "isPaid", err, false) ||
        !validText(body, "locationNote", 120, err) ||
        !validDate(body, "entryDate", err, false))
      co_return fail("validation_error", err);

    const std::string lineCost = mulDec6(body["quantity"].asString(), body["unitCost"].asString());
    const std::string lineBill =
        body["isBillable"].asBool()
            ? mulDec6(body["quantity"].asString(), body["unitPrice"].asString())
            : "0";
    if (action == "lines.add") {
      co_await db->execSqlCoro(
          "INSERT INTO fwm_job_card_lines(tenant_id,job_card_id,line_number,line_type,source_type,"
          "description,position_or_side,inv_item_id,uom_id,warehouse_id,supplier_id,ap_invoice_id,"
          "employee_id,tyre_id,major_component_id,gl_expense_account_id,gl_revenue_account_id,"
          "quantity,unit_cost,line_cost,unit_price,line_billable_amount,is_billable,is_paid,"
          "location_note,entry_date,created_by_user_id) "
          "SELECT $1::uuid,$2::uuid,COALESCE((SELECT max(line_number) FROM fwm_job_card_lines WHERE tenant_id=$1 AND job_card_id=$2::uuid),0)+1,"
          "$3,$4,$5,$6,NULLIF($7,'')::uuid,NULLIF($8,'')::uuid,NULLIF($9,'')::uuid,"
          "NULLIF($10,'')::uuid,NULLIF($11,'')::uuid,NULLIF($12,'')::uuid,NULLIF($13,'')::uuid,"
          "NULLIF($14,'')::uuid,NULLIF($15,'')::uuid,NULLIF($16,'')::uuid,($17::text)::numeric,"
          "($18::text)::numeric,($19::text)::numeric,($20::text)::numeric,($21::text)::numeric,"
          "$22,$23,$24,COALESCE(NULLIF($25,'')::date,CURRENT_DATE),$26::uuid",
          who.tenantId, id, body["lineType"].asString(), body["sourceType"].asString(),
          body["description"].asString(), body["positionOrSide"].asString(),
          optStr(body, "invItemId"), optStr(body, "uomId"), optStr(body, "warehouseId"),
          optStr(body, "supplierId"), optStr(body, "apInvoiceId"), optStr(body, "employeeId"),
          optStr(body, "tyreId"), optStr(body, "majorComponentId"),
          optStr(body, "glExpenseAccountId"), optStr(body, "glRevenueAccountId"),
          body["quantity"].asString(), body["unitCost"].asString(), lineCost,
          body["unitPrice"].asString(), lineBill, body["isBillable"].asBool(),
          body["isPaid"].asBool(), body["locationNote"].asString(),
          optStr(body, "entryDate"), who.userId);
    } else {
      if (!body["version"].isInt() || body["version"].asInt() < 1)
        co_return fail("validation_error", "version is required.");
      const auto upd = co_await db->execSqlCoro(
          "UPDATE fwm_job_card_lines SET line_type=$4,source_type=$5,description=$6,position_or_side=$7,"
          "inv_item_id=NULLIF($8,'')::uuid,uom_id=NULLIF($9,'')::uuid,warehouse_id=NULLIF($10,'')::uuid,"
          "supplier_id=NULLIF($11,'')::uuid,ap_invoice_id=NULLIF($12,'')::uuid,employee_id=NULLIF($13,'')::uuid,"
          "tyre_id=NULLIF($14,'')::uuid,major_component_id=NULLIF($15,'')::uuid,"
          "gl_expense_account_id=NULLIF($16,'')::uuid,gl_revenue_account_id=NULLIF($17,'')::uuid,"
          "quantity=($18::text)::numeric,unit_cost=($19::text)::numeric,line_cost=($20::text)::numeric,"
          "unit_price=($21::text)::numeric,line_billable_amount=($22::text)::numeric,"
          "is_billable=$23,is_paid=$24,location_note=$25,entry_date=COALESCE(NULLIF($26,'')::date,entry_date),"
          "last_modified_at=now(),last_modified_by_user_id=$27::uuid,version=version+1 "
          "WHERE tenant_id=$1 AND job_card_id=$2::uuid AND id=$3::uuid AND stock_issued=false AND version=$28 AND is_deleted=false RETURNING id",
          who.tenantId, id, subId, body["lineType"].asString(), body["sourceType"].asString(),
          body["description"].asString(), body["positionOrSide"].asString(),
          optStr(body, "invItemId"), optStr(body, "uomId"), optStr(body, "warehouseId"),
          optStr(body, "supplierId"), optStr(body, "apInvoiceId"), optStr(body, "employeeId"),
          optStr(body, "tyreId"), optStr(body, "majorComponentId"),
          optStr(body, "glExpenseAccountId"), optStr(body, "glRevenueAccountId"),
          body["quantity"].asString(), body["unitCost"].asString(), lineCost,
          body["unitPrice"].asString(), lineBill, body["isBillable"].asBool(),
          body["isPaid"].asBool(), body["locationNote"].asString(),
          optStr(body, "entryDate"), who.userId,
          body["version"].asInt());
      if (upd.empty())
        co_return fail("conflict", "Job line not found, already issued from Inventory, or modified concurrently.");
    }
    co_await recomputeJobTotals(db, who, id);
    co_return co_await fetchJobCard(db, who, id, canWrite);
  }
  if (action == "lines.delete") {
    if (!uuid(id) || !uuid(subId))
      co_return fail("validation_error", "Valid job card UUID and line UUID required.");
    const auto del = co_await db->execSqlCoro(
        "UPDATE fwm_job_card_lines SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$4::uuid,"
        "version=version+1 WHERE tenant_id=$1 AND job_card_id=$2::uuid AND id=$3::uuid "
        "AND stock_issued=false AND is_deleted=false RETURNING id",
        who.tenantId, id, subId, who.userId);
    if (del.empty())
      co_return fail("conflict", "Job line not found or already issued from Inventory.");
    co_await recomputeJobTotals(db, who, id);
    co_return co_await fetchJobCard(db, who, id, canWrite);
  }
  if (action == "assignments.list") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid job card UUID required.");
    const auto rows = co_await db->execSqlCoro(
        "SELECT jsonb_build_object('id',a.id,'employeeId',a.employee_id,'roleOnJob',a.role_on_job,"
        "'hoursEstimated',a.hours_estimated::text,'hoursWorked',a.hours_worked::text,"
        "'hourlyCostRate',a.hourly_cost_rate::text,'hourlyBillRate',a.hourly_bill_rate::text,"
        "'workNotes',a.work_notes)::text AS record "
        "FROM fwm_job_card_assignments a WHERE a.tenant_id=$1 AND a.job_card_id=$2::uuid AND a.is_deleted=false "
        "ORDER BY a.created_at, a.id",
        who.tenantId, id);
    dto::BaseApiResponse r;
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.result["canWrite"] = canWrite;
    r.success = true;
    co_return r;
  }
  if (action == "assignments.replace") {
    if (!uuid(id) || !body.isObject() || !body["assignments"].isArray())
      co_return fail("validation_error", "Job card ID and assignments array required.");
    const auto lock = co_await db->execSqlCoro(
        "SELECT id FROM fwm_job_cards WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR UPDATE",
        who.tenantId, id);
    if (lock.empty())
      co_return fail("not_found", "Job card not found.");
    std::string err;
    for (auto &a : body["assignments"]) {
      if (!allowedFields(a, {"employeeId", "roleOnJob", "hoursEstimated", "hoursWorked",
                             "hourlyCostRate", "hourlyBillRate", "workNotes"},
                         err) ||
          !validUuidOpt(a, "employeeId", err, true) ||
          !validEnum(a, "roleOnJob",
                     {"lead_mechanic", "mechanic", "electrician", "welder", "tyre_technician",
                      "supervisor", "helper"},
                     err, "mechanic") ||
          !validDec(a, "hoursEstimated", err, "0") ||
          !validDec(a, "hoursWorked", err, "0") ||
          !validDec(a, "hourlyCostRate", err, "0") ||
          !validDec(a, "hourlyBillRate", err, "0") ||
          !validText(a, "workNotes", 500, err))
        co_return fail("validation_error", err);
    }
    co_await db->execSqlCoro(
        "UPDATE fwm_job_card_assignments SET is_deleted=true,last_modified_at=now(),"
        "last_modified_by_user_id=$3::uuid WHERE tenant_id=$1 AND job_card_id=$2::uuid AND is_deleted=false",
        who.tenantId, id, who.userId);
    for (auto &a : body["assignments"]) {
      // Fall back to workshop employee's configured HR rate if omitted/zero.
      if (dec6(a["hourlyCostRate"].asString()) == 0 || dec6(a["hourlyBillRate"].asString()) == 0) {
        const auto empRate = co_await db->execSqlCoro(
            "SELECT hourly_cost_rate::text AS cr, hourly_charge_rate::text AS br "
            "FROM fwm_workshop_employees WHERE tenant_id=$1 AND employee_id=$2::uuid AND is_deleted=false",
            who.tenantId, a["employeeId"].asString());
        if (!empRate.empty()) {
          if (dec6(a["hourlyCostRate"].asString()) == 0)
            a["hourlyCostRate"] = empRate[0]["cr"].as<std::string>();
          if (dec6(a["hourlyBillRate"].asString()) == 0)
            a["hourlyBillRate"] = empRate[0]["br"].as<std::string>();
        }
      }
      co_await db->execSqlCoro(
          "INSERT INTO fwm_job_card_assignments(tenant_id,job_card_id,employee_id,role_on_job,"
          "hours_estimated,hours_worked,hourly_cost_rate,hourly_bill_rate,work_notes,created_by_user_id) "
          "VALUES($1::uuid,$2::uuid,$3::uuid,$4,($5::text)::numeric,($6::text)::numeric,"
          "($7::text)::numeric,($8::text)::numeric,$9,$10::uuid)",
          who.tenantId, id, a["employeeId"].asString(), a["roleOnJob"].asString(),
          a["hoursEstimated"].asString(), a["hoursWorked"].asString(),
          a["hourlyCostRate"].asString(), a["hourlyBillRate"].asString(),
          a["workNotes"].asString(), who.userId);
    }
    co_await recomputeJobTotals(db, who, id);
    co_return co_await fetchJobCard(db, who, id, canWrite);
  }
  if (action == "milestones.list") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid job card UUID required.");
    const auto rows = co_await db->execSqlCoro(
        "SELECT jsonb_build_object('id',m.id,'version',m.version,'milestoneCode',m.milestone_code,"
        "'title',m.title,'phase',m.phase,'ownerEmployeeId',m.owner_employee_id,"
        "'plannedStartDate',m.planned_start_date,'plannedEndDate',m.planned_end_date,"
        "'actualStartDate',m.actual_start_date,'actualEndDate',m.actual_end_date,"
        "'progressPct',m.progress_pct,'status',m.status,'deliverables',m.deliverables,"
        "'blockerNotes',m.blocker_notes,'sortOrder',m.sort_order)::text AS record "
        "FROM fwm_job_milestones m WHERE m.tenant_id=$1 AND m.job_card_id=$2::uuid AND m.is_deleted=false "
        "ORDER BY m.sort_order, m.id",
        who.tenantId, id);
    dto::BaseApiResponse r;
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.result["canWrite"] = canWrite;
    r.success = true;
    co_return r;
  }
  if (action == "milestones.create" || action == "milestones.update") {
    if (!uuid(id) || (action == "milestones.update" && !uuid(subId)))
      co_return fail("validation_error", "Valid job card and milestone UUIDs required.");
    std::string err;
    std::set<std::string> allowed{"milestoneCode", "title", "phase", "ownerEmployeeId",
                                  "plannedStartDate", "plannedEndDate", "actualStartDate",
                                  "actualEndDate", "progressPct", "status", "dependsOnMilestoneId",
                                  "deliverables", "blockerNotes", "sortOrder"};
    if (action == "milestones.update")
      allowed.insert("version");
    if (!allowedFields(body, allowed, err) ||
        !validText(body, "milestoneCode", 30, err) ||
        !validText(body, "title", 180, err, true) ||
        !validText(body, "phase", 60, err, false, "execution") ||
        !validUuidOpt(body, "ownerEmployeeId", err) ||
        !validDate(body, "plannedStartDate", err) ||
        !validDate(body, "plannedEndDate", err) ||
        !validDate(body, "actualStartDate", err) ||
        !validDate(body, "actualEndDate", err) ||
        !validEnum(body, "status", {"pending", "in_progress", "blocked", "completed", "cancelled"},
                   err, "pending") ||
        !validUuidOpt(body, "dependsOnMilestoneId", err) ||
        !validText(body, "deliverables", 500, err) ||
        !validText(body, "blockerNotes", 500, err))
      co_return fail("validation_error", err);
    if (body["progressPct"].isNull())
      body["progressPct"] = 0;
    if (!body["progressPct"].isInt() || body["progressPct"].asInt() < 0 ||
        body["progressPct"].asInt() > 100)
      co_return fail("validation_error", "progressPct must be 0..100.");
    if (body["sortOrder"].isNull())
      body["sortOrder"] = 1;
    if (!body["sortOrder"].isInt() || body["sortOrder"].asInt() < 1)
      co_return fail("validation_error", "sortOrder must be >= 1.");

    if (action == "milestones.create") {
      co_await db->execSqlCoro(
          "INSERT INTO fwm_job_milestones(tenant_id,job_card_id,milestone_code,title,phase,"
          "owner_employee_id,planned_start_date,planned_end_date,actual_start_date,actual_end_date,"
          "progress_pct,status,depends_on_milestone_id,deliverables,blocker_notes,sort_order,created_by_user_id) "
          "VALUES($1::uuid,$2::uuid,$3,$4,$5,NULLIF($6,'')::uuid,NULLIF($7,'')::date,"
          "NULLIF($8,'')::date,NULLIF($9,'')::date,NULLIF($10,'')::date,$11,$12,"
          "NULLIF($13,'')::uuid,$14,$15,$16,$17::uuid)",
          who.tenantId, id, body["milestoneCode"].asString(), body["title"].asString(),
          body["phase"].asString(),
          optStr(body, "ownerEmployeeId"), optStr(body, "plannedStartDate"),
          optStr(body, "plannedEndDate"), optStr(body, "actualStartDate"),
          optStr(body, "actualEndDate"),
          body["progressPct"].asInt(), body["status"].asString(),
          optStr(body, "dependsOnMilestoneId"),
          body["deliverables"].asString(), body["blockerNotes"].asString(),
          body["sortOrder"].asInt(), who.userId);
      co_await db->execSqlCoro(
          "UPDATE fwm_job_cards SET is_major_project=true,last_modified_at=now(),last_modified_by_user_id=$3::uuid "
          "WHERE tenant_id=$1 AND id=$2::uuid",
          who.tenantId, id, who.userId);
    } else {
      if (!body["version"].isInt() || body["version"].asInt() < 1)
        co_return fail("validation_error", "version is required.");
      const auto upd = co_await db->execSqlCoro(
          "UPDATE fwm_job_milestones SET milestone_code=$4,title=$5,phase=$6,"
          "owner_employee_id=NULLIF($7,'')::uuid,planned_start_date=NULLIF($8,'')::date,"
          "planned_end_date=NULLIF($9,'')::date,actual_start_date=NULLIF($10,'')::date,"
          "actual_end_date=NULLIF($11,'')::date,progress_pct=$12,status=$13,"
          "depends_on_milestone_id=NULLIF($14,'')::uuid,deliverables=$15,blocker_notes=$16,"
          "sort_order=$17,last_modified_at=now(),last_modified_by_user_id=$18::uuid,version=version+1 "
          "WHERE tenant_id=$1 AND job_card_id=$2::uuid AND id=$3::uuid AND version=$19 AND is_deleted=false RETURNING id",
          who.tenantId, id, subId, body["milestoneCode"].asString(), body["title"].asString(),
          body["phase"].asString(),
          optStr(body, "ownerEmployeeId"), optStr(body, "plannedStartDate"),
          optStr(body, "plannedEndDate"), optStr(body, "actualStartDate"),
          optStr(body, "actualEndDate"),
          body["progressPct"].asInt(), body["status"].asString(),
          optStr(body, "dependsOnMilestoneId"),
          body["deliverables"].asString(), body["blockerNotes"].asString(),
          body["sortOrder"].asInt(), who.userId, body["version"].asInt());
      if (upd.empty())
        co_return fail("conflict", "Milestone not found or modified concurrently.");
    }
    co_return co_await fetchJobCard(db, who, id, canWrite);
  }
  if (action == "milestones.delete") {
    if (!uuid(id) || !uuid(subId) || !body.isObject() || !body["version"].isInt() || body["version"].asInt() < 1)
      co_return fail("validation_error", "Job card UUID, milestone UUID, and version required.");
    const auto del = co_await db->execSqlCoro(
        "UPDATE fwm_job_milestones SET is_deleted=true,last_modified_at=now(),last_modified_by_user_id=$4::uuid,"
        "version=version+1 WHERE tenant_id=$1 AND job_card_id=$2::uuid AND id=$3::uuid "
        "AND version=$5 AND is_deleted=false RETURNING id",
        who.tenantId, id, subId, who.userId, body["version"].asInt());
    if (del.empty())
      co_return fail("conflict", "Milestone not found or modified concurrently.");
    co_return co_await fetchJobCard(db, who, id, canWrite);
  }
  if (action == "issue-parts") {
    // Cross-Module Inventory Integration: atomically post stock issue document
    // via InventoryService::postStockDocument in the caller's transaction.
    if (!uuid(id))
      co_return fail("validation_error", "Valid job card UUID required.");
    const auto job = co_await db->execSqlCoro(
        "SELECT j.accounting_unit_id, j.job_number, j.billing_scope, j.customer_id, j.cost_center_id, "
        "j.warehouse_id, j.opened_date::text AS odate, j.currency_id, j.status, "
        "s.default_warehouse_id, v.asset_no "
        "FROM fwm_job_cards j JOIN fwm_vehicles v ON v.tenant_id=j.tenant_id AND v.id=j.vehicle_id "
        "LEFT JOIN fwm_gl_settings s ON s.tenant_id=j.tenant_id AND s.accounting_unit_id=j.accounting_unit_id AND s.is_deleted=false "
        "WHERE j.tenant_id=$1 AND j.id=$2::uuid AND j.is_deleted=false FOR UPDATE OF j",
        who.tenantId, id);
    if (job.empty())
      co_return fail("not_found", "Job card not found.");
    const std::string jStatus = job[0]["status"].as<std::string>();
    if (jStatus == "cancelled" || jStatus == "closed")
      co_return fail("conflict", "Cannot issue stock on a closed or cancelled job card.");
    std::string whId =
        body.isObject() && body["warehouseId"].isString() && uuid(body["warehouseId"].asString())
            ? lower(body["warehouseId"].asString())
            : (job[0]["warehouse_id"].isNull() ? job[0]["default_warehouse_id"].as<std::string>()
                                               : job[0]["warehouse_id"].as<std::string>());
    if (whId.empty())
      co_return fail("validation_error", "Select a warehouse or configure defaultWarehouseId on GL settings.");
    const std::string docDate =
        body.isObject() && body["documentDate"].isString() && date(body["documentDate"].asString())
            ? body["documentDate"].asString()
            : job[0]["odate"].as<std::string>();

    const auto lines = co_await db->execSqlCoro(
        "SELECT l.id, l.inv_item_id, COALESCE(l.uom_id, i.base_uom_id) AS uom_id, "
        "l.quantity::text AS qty, l.unit_cost::text AS uc, l.description "
        "FROM fwm_job_card_lines l JOIN inv_items i ON i.tenant_id=l.tenant_id AND i.id=l.inv_item_id "
        "WHERE l.tenant_id=$1 AND l.job_card_id=$2::uuid AND l.is_deleted=false AND l.stock_issued=false "
        "AND l.inv_item_id IS NOT NULL ORDER BY l.line_number FOR UPDATE OF l",
        who.tenantId, id);
    if (lines.empty())
      co_return fail("conflict", "No unissued Inventory-linked parts or lubricants on this job card.");

    Json::Value stockPayload;
    stockPayload["accountingUnitId"] = job[0]["accounting_unit_id"].as<std::string>();
    stockPayload["documentType"] = "issue";
    const bool customerIssue = job[0]["billing_scope"].as<std::string>() == "customer_billable" &&
                               !job[0]["customer_id"].isNull();
    stockPayload["movementReason"] = customerIssue ? "sales_issue" : "internal_use";
    if (customerIssue)
      stockPayload["customerId"] = job[0]["customer_id"].as<std::string>();
    if (!job[0]["cost_center_id"].isNull())
      stockPayload["costCenterId"] = job[0]["cost_center_id"].as<std::string>();
    stockPayload["documentDate"] = docDate;
    stockPayload["sourceWarehouseId"] = whId;
    stockPayload["referenceNumber"] = job[0]["job_number"].as<std::string>();
    stockPayload["notes"] = "Workshop parts issue for " + job[0]["asset_no"].as<std::string>();
    stockPayload["lines"] = Json::arrayValue;

    std::vector<std::string> lineIds;
    for (const auto &l : lines) {
      lineIds.push_back(l["id"].as<std::string>());
      Json::Value sl;
      sl["itemId"] = l["inv_item_id"].as<std::string>();
      sl["uomId"] = l["uom_id"].as<std::string>();
      sl["quantity"] = l["qty"].as<std::string>();
      sl["unitCost"] = l["uc"].as<std::string>();
      sl["batchCode"] = "";
      sl["description"] = l["description"].as<std::string>();
      sl["serialNumbers"] = Json::arrayValue;
      stockPayload["lines"].append(sl);
    }
    const auto posted = co_await InventoryService::postStockDocument(db, stockPayload, who);
    if (!posted.success)
      co_return posted;
    const std::string docId = posted.result["documentId"].asString();
    const std::string docNum = posted.result["documentNumber"].asString();
    const std::string jBatchId =
        posted.result["journalBatchId"].isNull() ? "" : posted.result["journalBatchId"].asString();
    for (const auto &lid : lineIds) {
      co_await db->execSqlCoro(
          "UPDATE fwm_job_card_lines SET stock_issued=true,inv_stock_document_id=$3::uuid,"
          "warehouse_id=$4::uuid,last_modified_at=now(),last_modified_by_user_id=$5::uuid "
          "WHERE tenant_id=$1 AND id=$2::uuid",
          who.tenantId, lid, docId, whId, who.userId);
    }
    co_await db->execSqlCoro(
        "UPDATE fwm_job_cards SET inv_issue_document_id=COALESCE(inv_issue_document_id,$3::uuid),"
        "last_modified_at=now(),last_modified_by_user_id=$4::uuid,version=version+1 "
        "WHERE tenant_id=$1 AND id=$2::uuid",
        who.tenantId, id, docId, who.userId);
    co_await upsertCrossModuleLink(
        db, who, job[0]["accounting_unit_id"].as<std::string>(), "job_card", id, "inventory",
        "job_parts_issue", docId, docNum, "posted", posted.result["totalValue"].asString(),
        optCol(job[0], "currency_id"), jBatchId, stockPayload, "inv_job_" + docId);
    co_await addJobEvent(db, who, job[0]["accounting_unit_id"].as<std::string>(), id,
                         "parts_issued", jStatus, jStatus, "Issued stock document " + docNum);
    co_return co_await fetchJobCard(db, who, id, canWrite);
  }
  if (action == "requisitions") {
    // Cross-Module Supply Chain Integration: raise SCM Purchase Requisition inside same TX.
    if (!uuid(id))
      co_return fail("validation_error", "Valid job card UUID required.");
    const auto job = co_await db->execSqlCoro(
        "SELECT j.accounting_unit_id, j.job_number, j.opened_date::text AS odate, j.cost_center_id, "
        "j.warehouse_id, j.priority, j.currency_id, j.status, v.asset_no "
        "FROM fwm_job_cards j JOIN fwm_vehicles v ON v.tenant_id=j.tenant_id AND v.id=j.vehicle_id "
        "WHERE j.tenant_id=$1 AND j.id=$2::uuid AND j.is_deleted=false FOR SHARE OF j",
        who.tenantId, id);
    if (job.empty())
      co_return fail("not_found", "Job card not found.");

    Json::Value reqPayload;
    reqPayload["accountingUnitId"] = job[0]["accounting_unit_id"].as<std::string>();
    reqPayload["requestDate"] =
        body.isObject() && body["requestDate"].isString() && date(body["requestDate"].asString())
            ? body["requestDate"].asString()
            : job[0]["odate"].as<std::string>();
    if (body.isObject() && body["requiredByDate"].isString() && date(body["requiredByDate"].asString()))
      reqPayload["requiredByDate"] = body["requiredByDate"].asString();
    const std::string pri = job[0]["priority"].as<std::string>();
    reqPayload["priority"] = pri == "critical" ? "urgent" : pri;
    if (!job[0]["cost_center_id"].isNull())
      reqPayload["costCenterId"] = job[0]["cost_center_id"].as<std::string>();
    if (!job[0]["warehouse_id"].isNull())
      reqPayload["warehouseId"] = job[0]["warehouse_id"].as<std::string>();
    reqPayload["purpose"] = "Job Card " + job[0]["job_number"].as<std::string>() +
                            " (" + job[0]["asset_no"].as<std::string>() + ") parts procurement";
    if (body.isObject() && body["lines"].isArray() && !body["lines"].empty()) {
      reqPayload["lines"] = body["lines"];
    } else {
      const auto lines = co_await db->execSqlCoro(
          "SELECT l.inv_item_id, COALESCE(l.uom_id,i.base_uom_id) AS uom_id, "
          "l.quantity::text AS qty, l.unit_cost::text AS uc, l.description, l.supplier_id "
          "FROM fwm_job_card_lines l JOIN inv_items i ON i.tenant_id=l.tenant_id AND i.id=l.inv_item_id "
          "WHERE l.tenant_id=$1 AND l.job_card_id=$2::uuid AND l.is_deleted=false AND l.stock_issued=false "
          "AND l.inv_item_id IS NOT NULL ORDER BY l.line_number",
          who.tenantId, id);
      if (lines.empty())
        co_return fail("validation_error", "Provide requisition lines or add Inventory items to the job card.");
      reqPayload["lines"] = Json::arrayValue;
      for (const auto &l : lines) {
        Json::Value rl;
        rl["itemId"] = l["inv_item_id"].as<std::string>();
        rl["uomId"] = l["uom_id"].as<std::string>();
        rl["quantity"] = l["qty"].as<std::string>();
        rl["estimatedUnitCost"] = l["uc"].as<std::string>();
        rl["description"] = l["description"].as<std::string>();
        if (!l["supplier_id"].isNull())
          rl["suggestedSupplierId"] = l["supplier_id"].as<std::string>();
        reqPayload["lines"].append(rl);
      }
    }
    const auto createdReq = co_await SupplyChainService::createRequisition(db, reqPayload, who);
    if (!createdReq.success)
      co_return createdReq;
    const std::string reqId = createdReq.result["id"].asString();
    const std::string reqNum = createdReq.result["requisitionNumber"].asString();
    co_await upsertCrossModuleLink(
        db, who, job[0]["accounting_unit_id"].as<std::string>(), "job_card", id, "supply_chain",
        "job_parts_requisition", reqId, reqNum, "posted",
        createdReq.result["estimatedTotal"].asString(), optCol(job[0], "currency_id"), "",
        reqPayload, "scm_job_" + reqId);
    co_await addJobEvent(db, who, job[0]["accounting_unit_id"].as<std::string>(), id,
                         "requisition_raised", job[0]["status"].as<std::string>(),
                         job[0]["status"].as<std::string>(), "Raised requisition " + reqNum);
    co_return co_await fetchJobCard(db, who, id, canWrite);
  }
  if (action == "post-gl") {
    // Cross-Module General Ledger Integration: balanced double-entry journal
    // posted atomically via JournalService::createAndPost.
    if (!uuid(id))
      co_return fail("validation_error", "Valid job card UUID required.");
    std::string err;
    if (!allowedFields(body, {"mode", "periodId", "batchDate", "debitAccountId", "creditAccountId"}, err) ||
        !validEnum(body, "mode", {"cost_recognition", "revenue_recognition"}, err, "cost_recognition") ||
        !validUuidOpt(body, "periodId", err, false) ||
        !validDate(body, "batchDate", err, false) ||
        !validUuidOpt(body, "debitAccountId", err, false) ||
        !validUuidOpt(body, "creditAccountId", err, false))
      co_return fail("validation_error", err);

    const auto job = co_await db->execSqlCoro(
        "SELECT j.accounting_unit_id, j.job_number, j.opened_date::text AS odate, j.cost_center_id, "
        "j.currency_id, j.status, j.billing_scope, j.total_cost::text AS total_cost, "
        "j.internal_labour_cost_total::text AS labour_cost, j.outsourced_cost_total::text AS out_cost, "
        "j.parts_cost_total::text AS parts_cost, j.lubricants_cost_total::text AS lub_cost, "
        "j.billable_parts_total::text AS bill_parts, j.billable_labour_total::text AS bill_labour, "
        "j.billable_other_total::text AS bill_other, j.tax_total::text AS tax_total, "
        "j.billable_grand_total::text AS bill_grand, v.asset_no "
        "FROM fwm_job_cards j JOIN fwm_vehicles v ON v.tenant_id=j.tenant_id AND v.id=j.vehicle_id "
        "WHERE j.tenant_id=$1 AND j.id=$2::uuid AND j.is_deleted=false FOR UPDATE OF j",
        who.tenantId, id);
    if (job.empty())
      co_return fail("not_found", "Job card not found.");
    const std::string effUnit = job[0]["accounting_unit_id"].as<std::string>();
    const std::string batchDate =
        body["batchDate"].isNull() ? job[0]["odate"].as<std::string>() : body["batchDate"].asString();
    std::string periodId = body["periodId"].isNull() ? "" : body["periodId"].asString();
    if (periodId.empty()) {
      const auto pRow = co_await db->execSqlCoro(
          "SELECT id FROM gl_accounting_periods WHERE tenant_id=$1 AND accounting_unit_id=$2::uuid "
          "AND is_deleted=false AND status='open' AND $3::date BETWEEN period_start_date AND period_end_date "
          "ORDER BY period DESC LIMIT 1",
          who.tenantId, effUnit, batchDate);
      if (pRow.empty())
        co_return fail("conflict", "No open accounting period covers this job card date.");
      periodId = pRow[0]["id"].as<std::string>();
    }

    const auto fwmGl = co_await db->execSqlCoro(
        "SELECT repairs_expense_account_id, internal_labour_recovery_account_id, "
        "workshop_labour_revenue_account_id, workshop_parts_revenue_account_id, "
        "fleet_clearing_ap_account_id, fleet_receivable_ar_account_id "
        "FROM fwm_gl_settings WHERE tenant_id=$1 AND accounting_unit_id=$2::uuid AND is_deleted=false",
        who.tenantId, effUnit);
    const auto glDef = co_await db->execSqlCoro(
        "SELECT accounts_payable_account_id, accounts_receivable_account_id, "
        "sales_revenue_account_id, vat_received_account_id "
        "FROM gl_default_accounts WHERE tenant_id=$1 AND accounting_unit_id=$2::uuid AND is_deleted=false",
        who.tenantId, effUnit);
    const std::string currId = co_await resolveUnitCurrency(db, who, effUnit);

    const std::string mode = body["mode"].asString();
    Json::Value jLines(Json::arrayValue);
    std::string amountStr;
    if (mode == "cost_recognition") {
      // Non-stock workshop costs: internal labour + outsourced + unstocked repairs.
      const long long amt = dec6(job[0]["labour_cost"].as<std::string>()) +
                            dec6(job[0]["out_cost"].as<std::string>());
      if (amt <= 0)
        co_return fail("conflict",
                       "No non-stock labour or outsourced workshop costs to post (Inventory issues post their own stock GL).");
      amountStr = dec6str(amt);
      const std::string drAcct =
          !body["debitAccountId"].isNull() ? body["debitAccountId"].asString()
          : (!fwmGl.empty() && !fwmGl[0]["repairs_expense_account_id"].isNull())
              ? fwmGl[0]["repairs_expense_account_id"].as<std::string>()
              : "";
      const std::string crAcct =
          !body["creditAccountId"].isNull() ? body["creditAccountId"].asString()
          : (!fwmGl.empty() && !fwmGl[0]["internal_labour_recovery_account_id"].isNull())
              ? fwmGl[0]["internal_labour_recovery_account_id"].as<std::string>()
              : ((!fwmGl.empty() && !fwmGl[0]["fleet_clearing_ap_account_id"].isNull())
                     ? fwmGl[0]["fleet_clearing_ap_account_id"].as<std::string>()
                     : ((!glDef.empty() && !glDef[0]["accounts_payable_account_id"].isNull())
                            ? glDef[0]["accounts_payable_account_id"].as<std::string>()
                            : ""));
      if (drAcct.empty() || crAcct.empty())
        co_return fail("validation_error", "Configure Fleet GL settings or supply debitAccountId and creditAccountId.");
      Json::Value dr, cr;
      dr["accountId"] = drAcct;
      dr["currencyId"] = currId;
      dr["exchangeRate"] = "1";
      dr["debit"] = amountStr;
      dr["credit"] = "0";
      dr["description"] = "Workshop cost " + job[0]["job_number"].as<std::string>() + " " +
                          job[0]["asset_no"].as<std::string>();
      dr["referenceNumber"] = job[0]["job_number"].as<std::string>();
      dr["transactionDate"] = batchDate;
      if (!job[0]["cost_center_id"].isNull())
        dr["costCenterId"] = job[0]["cost_center_id"].as<std::string>();
      cr = dr;
      cr["accountId"] = crAcct;
      cr["debit"] = "0";
      cr["credit"] = amountStr;
      jLines.append(dr);
      jLines.append(cr);
    } else {
      const long long grand = dec6(job[0]["bill_grand"].as<std::string>());
      if (grand <= 0)
        co_return fail("conflict", "Job card has no billable customer amount to post.");
      amountStr = dec6str(grand);
      const std::string arAcct =
          !body["debitAccountId"].isNull() ? body["debitAccountId"].asString()
          : (!fwmGl.empty() && !fwmGl[0]["fleet_receivable_ar_account_id"].isNull())
              ? fwmGl[0]["fleet_receivable_ar_account_id"].as<std::string>()
              : ((!glDef.empty() && !glDef[0]["accounts_receivable_account_id"].isNull())
                     ? glDef[0]["accounts_receivable_account_id"].as<std::string>()
                     : "");
      const std::string revLab =
          !body["creditAccountId"].isNull() ? body["creditAccountId"].asString()
          : (!fwmGl.empty() && !fwmGl[0]["workshop_labour_revenue_account_id"].isNull())
              ? fwmGl[0]["workshop_labour_revenue_account_id"].as<std::string>()
              : ((!glDef.empty() && !glDef[0]["sales_revenue_account_id"].isNull())
                     ? glDef[0]["sales_revenue_account_id"].as<std::string>()
                     : "");
      const std::string revParts =
          (!fwmGl.empty() && !fwmGl[0]["workshop_parts_revenue_account_id"].isNull())
              ? fwmGl[0]["workshop_parts_revenue_account_id"].as<std::string>()
              : revLab;
      const std::string vatAcct =
          (!glDef.empty() && !glDef[0]["vat_received_account_id"].isNull())
              ? glDef[0]["vat_received_account_id"].as<std::string>()
              : revLab;
      if (arAcct.empty() || revLab.empty())
        co_return fail("validation_error", "Configure AR & workshop revenue accounts before posting revenue.");
      Json::Value dr;
      dr["accountId"] = arAcct;
      dr["currencyId"] = currId;
      dr["exchangeRate"] = "1";
      dr["debit"] = amountStr;
      dr["credit"] = "0";
      dr["description"] = "Repair billing " + job[0]["job_number"].as<std::string>() + " " +
                          job[0]["asset_no"].as<std::string>();
      dr["referenceNumber"] = job[0]["job_number"].as<std::string>();
      dr["transactionDate"] = batchDate;
      if (!job[0]["cost_center_id"].isNull())
        dr["costCenterId"] = job[0]["cost_center_id"].as<std::string>();
      jLines.append(dr);
      const auto addCr = [&](const std::string &acct, const std::string &val, const std::string &lbl) {
        if (dec6(val) <= 0)
          return;
        Json::Value cr = dr;
        cr["accountId"] = acct;
        cr["debit"] = "0";
        cr["credit"] = val;
        cr["description"] = lbl + " " + job[0]["job_number"].as<std::string>();
        jLines.append(cr);
      };
      addCr(revParts, job[0]["bill_parts"].as<std::string>(), "Parts revenue");
      addCr(revLab,
            dec6str(dec6(job[0]["bill_labour"].as<std::string>()) +
                    dec6(job[0]["bill_other"].as<std::string>())),
            "Labour & service revenue");
      addCr(vatAcct, job[0]["tax_total"].as<std::string>(), "Output VAT");
    }
    Json::Value jPayload;
    jPayload["accountingUnitId"] = effUnit;
    jPayload["batchDate"] = batchDate;
    jPayload["description"] = "FWM " + mode + " " + job[0]["job_number"].as<std::string>();
    jPayload["periodId"] = periodId;
    jPayload["isMultiCurrency"] = false;
    jPayload["lines"] = jLines;
    const auto posted = co_await JournalService::createAndPost(db, jPayload, who);
    if (!posted.success)
      co_return posted;
    const std::string batchId = posted.result["id"].asString();
    const std::string batchNum = posted.result["batchNumber"].asString();
    if (mode == "cost_recognition") {
      co_await db->execSqlCoro(
          "UPDATE fwm_job_cards SET gl_cost_journal_batch_id=$3::uuid,last_modified_at=now(),"
          "last_modified_by_user_id=$4::uuid,version=version+1 WHERE tenant_id=$1 AND id=$2::uuid",
          who.tenantId, id, batchId, who.userId);
    } else {
      co_await db->execSqlCoro(
          "UPDATE fwm_job_cards SET gl_revenue_journal_batch_id=$3::uuid,last_modified_at=now(),"
          "last_modified_by_user_id=$4::uuid,version=version+1 WHERE tenant_id=$1 AND id=$2::uuid",
          who.tenantId, id, batchId, who.userId);
    }
    co_await upsertCrossModuleLink(
        db, who, effUnit, "job_card", id, "gl", "job_" + mode, batchId, batchNum, "posted",
        amountStr, currId, batchId, jPayload, "gl_job_" + mode + "_" + id);
    co_await addJobEvent(db, who, effUnit, id, "gl_posted", job[0]["status"].as<std::string>(),
                         job[0]["status"].as<std::string>(), "Posted GL batch " + batchNum);
    co_return co_await fetchJobCard(db, who, id, canWrite);
  }
  if (action == "handoff") {
    // Stage typed cross-module handoffs for AP, AR, Point of Sale, or Project Management.
    if (!uuid(id))
      co_return fail("validation_error", "Valid job card UUID required.");
    std::string err;
    if (!allowedFields(body, {"targetModule", "notes"}, err) ||
        !validEnum(body, "targetModule", {"ap", "ar", "point_of_sale", "project_management"}, err) ||
        !validText(body, "notes", 500, err))
      co_return fail("validation_error", err);
    const std::string target = body["targetModule"].asString();
    const auto full = co_await fetchJobCard(db, who, id, canWrite);
    if (!full.success)
      co_return full;
    const auto &job = full.result;
    const std::string effUnit = job["accountingUnitId"].asString();
    const std::string currId = job["currencyId"].asString();

    if (target == "ap") {
      // Group supplier/outsourced/electrical/parts AP lines per supplierId.
      std::map<std::string, Json::Value> bySupplier;
      for (const auto &l : job["lines"]) {
        const std::string lt = l["lineType"].asString();
        const std::string st = l["sourceType"].asString();
        if (st == "direct_purchase_ap" || lt == "outsourced_repair" || lt == "electrical_service") {
          const std::string sup =
              l["supplierId"].isNull() ? "unassigned" : l["supplierId"].asString();
          if (!bySupplier.count(sup)) {
            Json::Value bill;
            bill["jobCardId"] = id;
            bill["jobNumber"] = job["jobNumber"];
            bill["vehicleRegistrationNo"] = job["registrationNo"];
            bill["supplierId"] = l["supplierId"];
            bill["supplierName"] = l["supplierName"];
            bill["billDate"] = job["openedDate"];
            bill["lines"] = Json::arrayValue;
            bySupplier[sup] = bill;
          }
          bySupplier[sup]["lines"].append(l);
        }
      }
      if (bySupplier.empty())
        co_return fail("conflict", "No outsourced, electrical, or AP direct-purchase lines on this job card.");
      Json::Value staged(Json::arrayValue);
      for (const auto &[sup, payload] : bySupplier) {
        long long total = 0;
        for (const auto &l : payload["lines"])
          total += dec6(l["lineCost"].asString());
        const auto lid = co_await upsertCrossModuleLink(
            db, who, effUnit, "job_card", id, "ap", "outsourced_service_bill", "",
            job["jobNumber"].asString() + "-" + sup.substr(0, 8), "staged", dec6str(total),
            currId, "", payload, "ap_" + id + "_" + sup);
        Json::Value s;
        s["handoffLinkId"] = lid;
        s["supplierId"] = payload["supplierId"];
        s["amount"] = dec6str(total);
        staged.append(s);
      }
      co_await addJobEvent(db, who, effUnit, id, "handoff_created", job["status"].asString(),
                           job["status"].asString(), "Staged AP supplier bill handoff");
      Json::Value res;
      res["targetModule"] = "ap";
      res["stagedBills"] = staged;
      co_return okRecord(res);
    }
    if (target == "ar") {
      if (job["billingScope"].asString() != "customer_billable" || job["customerId"].isNull())
        co_return fail("conflict", "Only customer-billable job cards with a customerId hand off to AR.");
      Json::Value payload;
      payload["jobCardId"] = id;
      payload["jobNumber"] = job["jobNumber"];
      payload["customerId"] = job["customerId"];
      payload["customerName"] = job["customerName"];
      payload["vehicleAssetNo"] = job["assetNo"];
      payload["vehicleRegistrationNo"] = job["registrationNo"];
      payload["invoiceDate"] = job["openedDate"];
      payload["partsTotal"] = job["billablePartsTotal"];
      payload["labourTotal"] = job["billableLabourTotal"];
      payload["otherTotal"] = job["billableOtherTotal"];
      payload["taxTotal"] = job["taxTotal"];
      payload["grandTotal"] = job["billableGrandTotal"];
      payload["lines"] = job["lines"];
      const auto lid = co_await upsertCrossModuleLink(
          db, who, effUnit, "job_card", id, "ar", "customer_repair_invoice", "",
          job["jobNumber"].asString(), "staged", job["billableGrandTotal"].asString(), currId, "",
          payload, "ar_" + id);
      co_await db->execSqlCoro(
          "UPDATE fwm_job_cards SET status='invoiced',"
          "payment_status=CASE WHEN payment_status='not_applicable' THEN 'unpaid' ELSE payment_status END,"
          "last_modified_at=now(),last_modified_by_user_id=$3::uuid,version=version+1 "
          "WHERE tenant_id=$1 AND id=$2::uuid",
          who.tenantId, id, who.userId);
      co_await addJobEvent(db, who, effUnit, id, "invoiced", job["status"].asString(), "invoiced",
                           "Staged AR customer invoice handoff");
      Json::Value res;
      res["handoffLinkId"] = lid;
      res["targetModule"] = "ar";
      res["payload"] = payload;
      co_return okRecord(res);
    }
    if (target == "point_of_sale") {
      Json::Value payload;
      payload["jobCardId"] = id;
      payload["jobNumber"] = job["jobNumber"];
      payload["customerId"] = job["customerId"];
      payload["vehicleRegistrationNo"] = job["registrationNo"];
      payload["amountDue"] = dec6(job["billableGrandTotal"].asString()) > 0
                                 ? job["billableGrandTotal"]
                                 : job["totalCost"];
      payload["currencyCode"] = job["currencyCode"];
      payload["receiptPrinterFormat"] = "ESC_POS_80MM";
      payload["lineItems"] = job["lines"];
      const auto lid = co_await upsertCrossModuleLink(
          db, who, effUnit, "job_card", id, "point_of_sale", "pos_repair_checkout", "",
          job["jobNumber"].asString(), "staged", payload["amountDue"].asString(), currId, "",
          payload, "pos_" + id);
      co_await addJobEvent(db, who, effUnit, id, "handoff_created", job["status"].asString(),
                           job["status"].asString(), "Staged POS counter checkout & thermal receipt");
      Json::Value res;
      res["handoffLinkId"] = lid;
      res["targetModule"] = "point_of_sale";
      res["payload"] = payload;
      co_return okRecord(res);
    }
    // project_management
    Json::Value payload;
    payload["jobCardId"] = id;
    payload["jobNumber"] = job["jobNumber"];
    payload["projectTitle"] =
        job["assetNo"].asString() + " (" + job["registrationNo"].asString() + ") Major Repair";
    payload["scheduledStartAt"] = job["scheduledStartAt"];
    payload["targetCompletionAt"] = job["targetCompletionAt"];
    payload["assignments"] = job["assignments"];
    payload["milestones"] = job["milestones"];
    payload["budgetedCost"] = job["totalCost"];
    const auto lid = co_await upsertCrossModuleLink(
        db, who, effUnit, "job_card", id, "project_management", "major_repair_project", "",
        job["jobNumber"].asString(), "staged", job["totalCost"].asString(), currId, "", payload,
        "pm_" + id);
    co_await db->execSqlCoro(
        "UPDATE fwm_job_cards SET is_major_project=true,last_modified_at=now(),last_modified_by_user_id=$3::uuid "
        "WHERE tenant_id=$1 AND id=$2::uuid",
        who.tenantId, id, who.userId);
    co_await addJobEvent(db, who, effUnit, id, "handoff_created", job["status"].asString(),
                         job["status"].asString(), "Staged Project Management handoff");
    Json::Value res;
    res["handoffLinkId"] = lid;
    res["targetModule"] = "project_management";
    res["payload"] = payload;
    co_return okRecord(res);
  }
  if (action == "transition") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid job card UUID required.");
    std::string err;
    if (!allowedFields(body, {"action", "version", "meterReadingOut", "downtimeHours", "diagnosis",
                              "workPerformed", "reason"},
                       err) ||
        !validEnum(body, "action",
                   {"open", "start", "await_parts", "complete", "close", "cancel", "mark_paid"},
                   err) ||
        !validDec(body, "meterReadingOut", err, "0") ||
        !validDec(body, "downtimeHours", err, "0") ||
        !validText(body, "diagnosis", 1000, err) ||
        !validText(body, "workPerformed", 2000, err) ||
        !validText(body, "reason", 500, err))
      co_return fail("validation_error", err);
    if (!body["version"].isInt() || body["version"].asInt() < 1)
      co_return fail("validation_error", "Current version is required.");

    const auto head = co_await db->execSqlCoro(
        "SELECT accounting_unit_id, status, vehicle_id, schedule_id, job_type, version "
        "FROM fwm_job_cards WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR UPDATE",
        who.tenantId, id);
    if (head.empty())
      co_return fail("not_found", "Job card not found.");
    if (head[0]["version"].as<int>() != body["version"].asInt())
      co_return fail("conflict", "Job card modified concurrently.");

    const std::string cur = head[0]["status"].as<std::string>();
    const std::string act = body["action"].asString();
    const std::string effUnit = head[0]["accounting_unit_id"].as<std::string>();
    const std::string vid = head[0]["vehicle_id"].as<std::string>();

    if (act == "mark_paid") {
      co_await db->execSqlCoro(
          "UPDATE fwm_job_cards SET payment_status='paid',last_modified_at=now(),"
          "last_modified_by_user_id=$3::uuid,version=version+1 WHERE tenant_id=$1 AND id=$2::uuid",
          who.tenantId, id, who.userId);
      co_await db->execSqlCoro(
          "UPDATE fwm_job_card_lines SET is_paid=true WHERE tenant_id=$1 AND job_card_id=$2::uuid AND is_deleted=false",
          who.tenantId, id);
      co_await addJobEvent(db, who, effUnit, id, "paid", cur, cur, body["reason"].asString());
      co_return co_await fetchJobCard(db, who, id, canWrite);
    }

    std::string next = cur;
    std::string evAction;
    if (act == "open" && cur == "draft") {
      next = "open";
      evAction = "opened";
    } else if (act == "start" && (cur == "draft" || cur == "open" || cur == "awaiting_parts")) {
      next = "in_progress";
      evAction = "started";
    } else if (act == "await_parts" && (cur == "open" || cur == "in_progress")) {
      next = "awaiting_parts";
      evAction = "awaiting_parts";
    } else if (act == "complete" && (cur == "open" || cur == "in_progress" || cur == "awaiting_parts")) {
      next = "completed";
      evAction = "completed";
    } else if (act == "close" && (cur == "completed" || cur == "invoiced")) {
      next = "closed";
      evAction = "closed";
    } else if (act == "cancel" && cur != "closed" && cur != "cancelled") {
      if (body["reason"].asString().empty())
        co_return fail("validation_error", "Cancellations require a reason.");
      next = "cancelled";
      evAction = "cancelled";
    } else {
      co_return fail("conflict", "Invalid job card transition from " + cur + " via " + act + ".");
    }

    co_await db->execSqlCoro(
        "UPDATE fwm_job_cards SET status=$3,"
        "actual_start_at=CASE WHEN $3='in_progress' AND actual_start_at IS NULL THEN now() ELSE actual_start_at END,"
        "completed_at=CASE WHEN $3='completed' THEN now() ELSE completed_at END,"
        "closed_at=CASE WHEN $3='closed' THEN now() ELSE closed_at END,"
        "cancelled_at=CASE WHEN $3='cancelled' THEN now() ELSE cancelled_at END,"
        "cancelled_by_user_id=CASE WHEN $3='cancelled' THEN $4::uuid ELSE cancelled_by_user_id END,"
        "cancel_reason=CASE WHEN $3='cancelled' THEN $5 ELSE cancel_reason END,"
        "meter_reading_out=CASE WHEN ($6::text)::numeric>0 THEN ($6::text)::numeric ELSE meter_reading_out END,"
        "downtime_hours=CASE WHEN ($7::text)::numeric>0 THEN ($7::text)::numeric ELSE downtime_hours END,"
        "diagnosis=CASE WHEN $8<>'' THEN $8 ELSE diagnosis END,"
        "work_performed=CASE WHEN $9<>'' THEN $9 ELSE work_performed END,"
        "last_modified_at=now(),last_modified_by_user_id=$4::uuid,version=version+1 "
        "WHERE tenant_id=$1 AND id=$2::uuid",
        who.tenantId, id, next, who.userId, body["reason"].asString(),
        body["meterReadingOut"].asString(), body["downtimeHours"].asString(),
        body["diagnosis"].asString(), body["workPerformed"].asString());

    if (next == "open" || next == "in_progress") {
      co_await db->execSqlCoro(
          "UPDATE fwm_vehicles SET status='in_workshop',last_modified_at=now(),last_modified_by_user_id=$3::uuid "
          "WHERE tenant_id=$1 AND id=$2::uuid AND status='active'",
          who.tenantId, vid, who.userId);
    } else if (next == "completed" || next == "closed" || next == "cancelled") {
      co_await db->execSqlCoro(
          "UPDATE fwm_vehicles SET status='active',condition=CASE WHEN $3 IN('completed','closed') AND condition='breakdown' THEN 'good' ELSE condition END,"
          "last_modified_at=now(),last_modified_by_user_id=$4::uuid "
          "WHERE tenant_id=$1 AND id=$2::uuid AND status='in_workshop'",
          who.tenantId, vid, next, who.userId);
      if (next == "completed") {
        if (!head[0]["schedule_id"].isNull()) {
          co_await db->execSqlCoro(
              "UPDATE fwm_maintenance_schedules SET status='completed',last_modified_at=now(),last_modified_by_user_id=$3::uuid "
              "WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false",
              who.tenantId, head[0]["schedule_id"].as<std::string>(), who.userId);
        }
        const std::string jType = head[0]["job_type"].as<std::string>();
        if (jType == "preventive_service" || jType == "major_service") {
          co_await db->execSqlCoro(
              "UPDATE fwm_pm_triggers SET "
              "last_service_reading=CASE WHEN ($3::text)::numeric>0 THEN ($3::text)::numeric ELSE (SELECT current_meter_reading FROM fwm_vehicles WHERE tenant_id=$1 AND id=$2::uuid) END,"
              "last_service_date=CURRENT_DATE,"
              "last_major_service_reading=CASE WHEN $4='major_service' THEN CASE WHEN ($3::text)::numeric>0 THEN ($3::text)::numeric ELSE (SELECT current_meter_reading FROM fwm_vehicles WHERE tenant_id=$1 AND id=$2::uuid) END ELSE last_major_service_reading END,"
              "last_major_service_date=CASE WHEN $4='major_service' THEN CURRENT_DATE ELSE last_major_service_date END,"
              "last_modified_at=now(),last_modified_by_user_id=$5::uuid "
              "WHERE tenant_id=$1 AND vehicle_id=$2::uuid AND is_deleted=false AND is_active=true",
              who.tenantId, vid, body["meterReadingOut"].asString(), jType, who.userId);
        }
      }
    }
    co_await addJobEvent(db, who, effUnit, id, evAction, cur, next, body["reason"].asString());
    co_return co_await fetchJobCard(db, who, id, canWrite);
  }
  if (action != "create" && action != "update")
    co_return fail("validation_error", "Unsupported job-cards action.");
  const bool isUpdate = action == "update";
  if (isUpdate && !uuid(id))
    co_return fail("validation_error", "Valid job card UUID required.");

  std::string err;
  std::set<std::string> allowed{
      "accountingUnitId", "vehicleId", "coupledTrailerId", "jobType", "billingScope",
      "customerId", "costCenterId", "scheduleId", "procedureId", "warehouseId", "currencyId",
      "openedDate", "meterReadingIn", "downtimeHours", "locationSite", "reportedFault",
      "diagnosis", "workPerformed", "priority", "isMajorProject", "paymentStatus", "requestId"};
  if (isUpdate)
    allowed.insert("version");
  if (!allowedFields(body, allowed, err))
    co_return fail("validation_error", err);
  if (isUpdate && (!body["version"].isInt() || body["version"].asInt() < 1))
    co_return fail("validation_error", "A valid version is required.");
  if (!validUuidOpt(body, "accountingUnitId", err, false) ||
      !validUuidOpt(body, "vehicleId", err, !isUpdate) ||
      !validUuidOpt(body, "coupledTrailerId", err) ||
      !validEnum(body, "jobType",
                 {"preventive_service", "major_service", "corrective_repair", "breakdown",
                  "electrical", "tyre_service", "component_overhaul", "bodywork", "major_project"},
                 err, "corrective_repair") ||
      !validEnum(body, "billingScope",
                 {"internal_fleet", "customer_billable", "warranty", "hired_equipment"}, err,
                 "internal_fleet") ||
      !validUuidOpt(body, "customerId", err) || !validUuidOpt(body, "costCenterId", err) ||
      !validUuidOpt(body, "scheduleId", err) || !validUuidOpt(body, "procedureId", err) ||
      !validUuidOpt(body, "warehouseId", err) || !validUuidOpt(body, "currencyId", err) ||
      !validDate(body, "openedDate", err, true) || !validDec(body, "meterReadingIn", err, "0") ||
      !validDec(body, "downtimeHours", err, "0") ||
      !validText(body, "locationSite", 120, err, false, "Main Workshop") ||
      !validText(body, "reportedFault", 1000, err) || !validText(body, "diagnosis", 1000, err) ||
      !validText(body, "workPerformed", 2000, err) ||
      !validEnum(body, "priority", {"low", "normal", "high", "critical"}, err, "normal") ||
      !validBool(body, "isMajorProject", err, false) ||
      !validEnum(body, "paymentStatus", {"not_applicable", "unpaid", "partially_paid", "paid"},
                 err, "not_applicable") ||
      !validUuidOpt(body, "requestId", err))
    co_return fail("validation_error", err);
  if (body["billingScope"].asString() == "customer_billable" && body["customerId"].isNull())
    co_return fail("validation_error", "customerId is required when billingScope is customer_billable.");

  if (!isUpdate) {
    const auto veh = co_await db->execSqlCoro(
        "SELECT accounting_unit_id, cost_center_id, coupled_trailer_id, current_meter_reading::text AS mr "
        "FROM fwm_vehicles WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR SHARE",
        who.tenantId, body["vehicleId"].asString());
    if (veh.empty())
      co_return fail("not_found", "Vehicle not found.");
    const std::string effUnit = body["accountingUnitId"].isNull()
                                    ? veh[0]["accounting_unit_id"].as<std::string>()
                                    : body["accountingUnitId"].asString();
    std::string currId = body["currencyId"].isNull() ? "" : body["currencyId"].asString();
    if (currId.empty())
      currId = co_await resolveUnitCurrency(db, who, effUnit);
    const std::string ccId = body["costCenterId"].isNull() && !veh[0]["cost_center_id"].isNull()
                                 ? veh[0]["cost_center_id"].as<std::string>()
                                 : (body["costCenterId"].isNull() ? "" : body["costCenterId"].asString());
    const std::string trId = body["coupledTrailerId"].isNull() && !veh[0]["coupled_trailer_id"].isNull()
                                 ? veh[0]["coupled_trailer_id"].as<std::string>()
                                 : (body["coupledTrailerId"].isNull() ? "" : body["coupledTrailerId"].asString());
    const std::string mrIn = dec6(body["meterReadingIn"].asString()) > 0
                                 ? body["meterReadingIn"].asString()
                                 : veh[0]["mr"].as<std::string>();
    const std::string jobNum = co_await nextNumber(db, who, effUnit, "job_card", "JOB");
    const auto saved = co_await db->execSqlCoro(
        "INSERT INTO fwm_job_cards(tenant_id,accounting_unit_id,job_number,vehicle_id,"
        "coupled_trailer_id,job_type,billing_scope,customer_id,cost_center_id,schedule_id,"
        "procedure_id,warehouse_id,currency_id,opened_date,meter_reading_in,downtime_hours,"
        "location_site,reported_fault,diagnosis,work_performed,priority,is_major_project,"
        "payment_status,request_key,created_by_user_id) "
        "VALUES($1::uuid,$2::uuid,$3,$4::uuid,NULLIF($5,'')::uuid,$6,$7,NULLIF($8,'')::uuid,"
        "NULLIF($9,'')::uuid,NULLIF($10,'')::uuid,NULLIF($11,'')::uuid,NULLIF($12,'')::uuid,"
        "$13::uuid,$14::date,($15::text)::numeric,($16::text)::numeric,$17,$18,$19,$20,$21,$22,$23,"
        "NULLIF($24,'')::uuid,$25::uuid) RETURNING id",
        who.tenantId, effUnit, jobNum, body["vehicleId"].asString(), trId,
        body["jobType"].asString(), body["billingScope"].asString(),
        optStr(body, "customerId"), ccId,
        optStr(body, "scheduleId"), optStr(body, "procedureId"), optStr(body, "warehouseId"),
        currId, body["openedDate"].asString(), mrIn, body["downtimeHours"].asString(),
        body["locationSite"].asString(), body["reportedFault"].asString(),
        body["diagnosis"].asString(), body["workPerformed"].asString(),
        body["priority"].asString(), body["isMajorProject"].asBool(),
        body["paymentStatus"].asString(), optStr(body, "requestId"), who.userId);
    const std::string jobId = saved[0]["id"].as<std::string>();
    co_await addJobEvent(db, who, effUnit, jobId, "created", "", "draft", "");
    co_return co_await fetchJobCard(db, who, jobId, canWrite);
  }
  const auto updated = co_await db->execSqlCoro(
      "UPDATE fwm_job_cards SET coupled_trailer_id=NULLIF($3,'')::uuid,job_type=$4,billing_scope=$5,"
      "customer_id=NULLIF($6,'')::uuid,cost_center_id=NULLIF($7,'')::uuid,warehouse_id=NULLIF($8,'')::uuid,"
      "opened_date=$9::date,meter_reading_in=($10::text)::numeric,downtime_hours=($11::text)::numeric,"
      "location_site=$12,reported_fault=$13,diagnosis=$14,work_performed=$15,priority=$16,"
      "is_major_project=$17,payment_status=$18,last_modified_at=now(),last_modified_by_user_id=$19::uuid,"
      "version=version+1 WHERE tenant_id=$1 AND id=$2::uuid AND status NOT IN('closed','cancelled') "
      "AND version=$20 AND is_deleted=false RETURNING id",
      who.tenantId, id, optStr(body, "coupledTrailerId"),
      body["jobType"].asString(), body["billingScope"].asString(),
      optStr(body, "customerId"), optStr(body, "costCenterId"), optStr(body, "warehouseId"),
      body["openedDate"].asString(), body["meterReadingIn"].asString(),
      body["downtimeHours"].asString(), body["locationSite"].asString(),
      body["reportedFault"].asString(), body["diagnosis"].asString(),
      body["workPerformed"].asString(), body["priority"].asString(),
      body["isMajorProject"].asBool(), body["paymentStatus"].asString(), who.userId,
      body["version"].asInt());
  if (updated.empty())
    co_return fail("conflict", "Job card not found, locked, or modified concurrently.");
  co_return co_await fetchJobCard(db, who, id, canWrite);
}

drogon::Task<dto::BaseApiResponse>
fetchDiaryEntry(DbClientPtr db, const utils::AuditIdentity &who, bool canWrite,
                const char *selectOne, const std::string &did) {
  const auto rows = co_await db->execSqlCoro(
      std::string(selectOne) + " WHERE d.tenant_id=$1 AND d.id=$2::uuid AND d.is_deleted=false",
      who.tenantId, did);
  if (rows.empty())
    co_return fail("not_found", "Diary entry not found.");
  auto out = parse(rows[0]["record"].as<std::string>());
  const auto allocs = co_await db->execSqlCoro(
      "SELECT jsonb_build_object('id',a.id,'vehicleId',a.vehicle_id,'assetNo',v.asset_no,"
      "'registrationNo',v.registration_no,'allocatedQuantity',a.allocated_quantity::text,"
      "'allocatedAmount',a.allocated_amount::text,'linkedJobCardId',a.linked_job_card_id,"
      "'notes',a.notes)::text AS record FROM fwm_diary_entry_allocations a "
      "JOIN fwm_vehicles v ON v.tenant_id=a.tenant_id AND v.id=a.vehicle_id "
      "WHERE a.tenant_id=$1 AND a.diary_entry_id=$2::uuid AND a.is_deleted=false ORDER BY v.asset_no",
      who.tenantId, did);
  out["allocations"] = Json::arrayValue;
  for (const auto &row : allocs)
    out["allocations"].append(parse(row["record"].as<std::string>()));
  out["canWrite"] = canWrite;
  co_return okRecord(out);
}

drogon::Task<dto::BaseApiResponse>
diaryEntries(DbClientPtr db, const std::string &action, const std::string &id, Json::Value body,
             int page, int size, const std::string &query, const std::string &unitId,
             const utils::AuditIdentity &who, bool canWrite) {
  const std::string unit = lower(trim(unitId));
  const std::string unitScope = uuidOrEmpty(unit);
  const char *selectOne = R"(
SELECT jsonb_build_object(
 'id', d.id, 'version', d.version, 'accountingUnitId', d.accounting_unit_id,
 'entryNumber', d.entry_number, 'entryDate', d.entry_date, 'vehicleId', d.vehicle_id,
 'assetNo', COALESCE(v.asset_no,''), 'registrationNo', COALESCE(NULLIF(v.registration_no,''),d.registration_no_snapshot),
 'entryCategory', d.entry_category, 'description', d.description,
 'positionOrSide', d.position_or_side, 'locationOrVendor', d.location_or_vendor,
 'supplierId', d.supplier_id, 'invItemId', d.inv_item_id, 'employeeId', d.employee_id,
 'quantity', d.quantity::text, 'unitAmount', d.unit_amount::text, 'totalAmount', d.total_amount::text,
 'currencyId', d.currency_id, 'isPaid', d.is_paid, 'paidAt', d.paid_at,
 'paymentReference', d.payment_reference, 'linkedJobCardId', d.linked_job_card_id,
 'linkedJobLineId', d.linked_job_line_id, 'status', d.status, 'notes', d.notes
)::text AS record
FROM fwm_diary_entries d
LEFT JOIN fwm_vehicles v ON v.tenant_id=d.tenant_id AND v.id=d.vehicle_id AND v.is_deleted=false)";

  if (action == "list") {
    const std::string q = search(query);
    const std::string paidParam =
        body.isObject() && body["isPaid"].isString() ? trim(body["isPaid"].asString()) : "";
    const auto cnt = co_await db->execSqlCoro(
        "SELECT count(*) AS total FROM fwm_diary_entries d "
        "WHERE d.tenant_id=$1 AND d.is_deleted=false AND ($2='' OR d.accounting_unit_id=$2::uuid) "
        "AND ($3='' OR d.is_paid=($3='true')) "
        "AND ($4='' OR strpos(lower(d.entry_number||' '||d.registration_no_snapshot||' '||d.description||' '||d.location_or_vendor),lower($4))>0)",
        who.tenantId, unitScope, paidParam, q);
    const auto rows = co_await db->execSqlCoro(
        std::string(selectOne) +
            " WHERE d.tenant_id=$1 AND d.is_deleted=false AND ($2='' OR d.accounting_unit_id=$2::uuid) "
            "AND ($3='' OR d.is_paid=($3='true')) "
            "AND ($4='' OR strpos(lower(d.entry_number||' '||d.registration_no_snapshot||' '||d.description||' '||d.location_or_vendor),lower($4))>0) "
            "ORDER BY d.entry_date DESC, d.created_at DESC LIMIT $5 OFFSET $6",
        who.tenantId, unitScope, paidParam, q, size,
        static_cast<long long>(page - 1) * size);
    dto::BaseApiResponse r;
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.result["totalCount"] = Json::Int64(cnt[0]["total"].as<long long>());
    r.result["canWrite"] = canWrite;
    r.success = true;
    co_return r;
  }
  if (action == "get") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid diary entry UUID required.");
    co_return co_await fetchDiaryEntry(db, who, canWrite, selectOne, id);
  }
  if (action == "next-number") {
    if (!uuid(unit))
      co_return fail("validation_error", "accountingUnitId is required.");
    const auto row = co_await db->execSqlCoro(
        "SELECT COALESCE(prefix,'DRY') AS prefix, COALESCE(padding,5) AS padding, COALESCE(next_number,1) AS next_number "
        "FROM fwm_document_sequences WHERE tenant_id=$1 AND accounting_unit_id=$2::uuid AND document_type='diary_entry'",
        who.tenantId, unit);
    std::string prefix = "DRY";
    int pad = 5;
    long long num = 1;
    if (!row.empty()) {
      prefix = row[0]["prefix"].as<std::string>();
      pad = row[0]["padding"].as<int>();
      num = row[0]["next_number"].as<long long>();
    }
    std::string s = std::to_string(num);
    if (static_cast<int>(s.size()) < pad)
      s = std::string(static_cast<size_t>(pad - static_cast<int>(s.size())), '0') + s;
    Json::Value out;
    out["nextNumber"] = prefix + "-" + s;
    co_return okRecord(out);
  }
  if (action == "delete") {
    if (!uuid(id) || !body.isObject() || !body["version"].isInt() || body["version"].asInt() < 1)
      co_return fail("validation_error", "ID and version required.");
    const auto del = co_await db->execSqlCoro(
        "UPDATE fwm_diary_entries SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3::uuid,"
        "version=version+1 WHERE tenant_id=$1 AND id=$2::uuid AND status='logged' AND version=$4 "
        "AND is_deleted=false RETURNING id",
        who.tenantId, id, who.userId, body["version"].asInt());
    if (del.empty())
      co_return fail("conflict", "Only logged unpromoted diary entries at current version can be deleted.");
    Json::Value res;
    res["id"] = id;
    res["isDeleted"] = true;
    co_return okRecord(res);
  }
  if (action == "mark-paid") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid diary entry UUID required.");
    std::string err;
    if (!allowedFields(body, {"paymentReference", "version"}, err) ||
        !validText(body, "paymentReference", 80, err))
      co_return fail("validation_error", err);
    const auto upd = co_await db->execSqlCoro(
        "UPDATE fwm_diary_entries SET is_paid=true,paid_at=now(),payment_reference=$3,"
        "last_modified_at=now(),last_modified_by_user_id=$4::uuid,version=version+1 "
        "WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false RETURNING id",
        who.tenantId, id, body["paymentReference"].asString(), who.userId);
    if (upd.empty())
      co_return fail("not_found", "Diary entry not found.");
    co_return co_await fetchDiaryEntry(db, who, canWrite, selectOne, id);
  }
  if (action == "allocate") {
    // Split multi-vehicle purchase (e.g. 4 tyres split across GT 6499-24 & GT 6291-24).
    if (!uuid(id) || !body.isObject() || !body["allocations"].isArray() ||
        body["allocations"].empty())
      co_return fail("validation_error", "Diary entry ID and non-empty allocations array required.");
    const auto head = co_await db->execSqlCoro(
        "SELECT total_amount::text AS total, status FROM fwm_diary_entries "
        "WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR UPDATE",
        who.tenantId, id);
    if (head.empty())
      co_return fail("not_found", "Diary entry not found.");
    if (head[0]["status"].as<std::string>() == "promoted_to_job")
      co_return fail("conflict", "Diary entry is already promoted to job card(s).");
    std::string err;
    long long allocSum = 0;
    for (auto &a : body["allocations"]) {
      if (!allowedFields(a, {"vehicleId", "allocatedQuantity", "allocatedAmount", "notes"}, err) ||
          !validUuidOpt(a, "vehicleId", err, true) ||
          !validDec(a, "allocatedQuantity", err, "1", true) ||
          !validDec(a, "allocatedAmount", err, "0") || !validText(a, "notes", 300, err))
        co_return fail("validation_error", err);
      allocSum += dec6(a["allocatedAmount"].asString());
    }
    if (allocSum != dec6(head[0]["total"].as<std::string>()))
      co_return fail("validation_error",
                     "Sum of allocatedAmount values must exactly match the diary entry totalAmount.");
    co_await db->execSqlCoro(
        "UPDATE fwm_diary_entry_allocations SET is_deleted=true "
        "WHERE tenant_id=$1 AND diary_entry_id=$2::uuid AND is_deleted=false",
        who.tenantId, id);
    for (const auto &a : body["allocations"]) {
      co_await db->execSqlCoro(
          "INSERT INTO fwm_diary_entry_allocations(tenant_id,diary_entry_id,vehicle_id,"
          "allocated_quantity,allocated_amount,notes,created_by_user_id) "
          "VALUES($1::uuid,$2::uuid,$3::uuid,($4::text)::numeric,($5::text)::numeric,$6,$7::uuid)",
          who.tenantId, id, a["vehicleId"].asString(), a["allocatedQuantity"].asString(),
          a["allocatedAmount"].asString(), a["notes"].asString(), who.userId);
    }
    co_await db->execSqlCoro(
        "UPDATE fwm_diary_entries SET status='allocated',last_modified_at=now(),"
        "last_modified_by_user_id=$3::uuid,version=version+1 WHERE tenant_id=$1 AND id=$2::uuid",
        who.tenantId, id, who.userId);
    co_return co_await fetchDiaryEntry(db, who, canWrite, selectOne, id);
  }
  if (action == "promote") {
    // Promote diary entry (or each of its multi-vehicle allocations) into Job Card(s).
    if (!uuid(id))
      co_return fail("validation_error", "Valid diary entry UUID required.");
    const auto d = co_await db->execSqlCoro(
        "SELECT accounting_unit_id, entry_number, entry_date::text AS edate, vehicle_id, "
        "entry_category, description, position_or_side, location_or_vendor, supplier_id, "
        "inv_item_id, employee_id, quantity::text AS qty, unit_amount::text AS ua, "
        "total_amount::text AS tot, currency_id, is_paid, status "
        "FROM fwm_diary_entries WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR UPDATE",
        who.tenantId, id);
    if (d.empty())
      co_return fail("not_found", "Diary entry not found.");
    if (d[0]["status"].as<std::string>() == "promoted_to_job" ||
        d[0]["status"].as<std::string>() == "cancelled")
      co_return fail("conflict", "Diary entry cannot be promoted from its current status.");

    const std::string cat = d[0]["entry_category"].as<std::string>();
    const std::string lineType = cat == "workmanship"        ? "internal_labour"
                                 : cat == "electrical"       ? "electrical_service"
                                 : cat == "tyres"            ? "tyre"
                                 : cat == "oil_change"       ? "lubricant"
                                 : cat == "outsourced_repair" ? "outsourced_repair"
                                                             : "spare_part";
    const std::string jobType = cat == "electrical"         ? "electrical"
                                : cat == "tyres"            ? "tyre_service"
                                : cat == "oil_change"       ? "preventive_service"
                                                            : "corrective_repair";
    const std::string srcType = !d[0]["supplier_id"].isNull() ? "direct_purchase_ap"
                                : !d[0]["inv_item_id"].isNull() ? "inventory_issue"
                                : !d[0]["employee_id"].isNull() ? "workshop_labour"
                                                                : "manual";
    const std::string effUnit = d[0]["accounting_unit_id"].as<std::string>();
    const std::string currId = d[0]["currency_id"].as<std::string>();

    struct Target {
      std::string allocId, vehicleId, qty, amt;
    };
    std::vector<Target> targets;
    const auto allocs = co_await db->execSqlCoro(
        "SELECT id, vehicle_id, allocated_quantity::text AS qty, allocated_amount::text AS amt "
        "FROM fwm_diary_entry_allocations WHERE tenant_id=$1 AND diary_entry_id=$2::uuid AND is_deleted=false",
        who.tenantId, id);
    if (!allocs.empty()) {
      for (const auto &a : allocs)
        targets.push_back({a["id"].as<std::string>(), a["vehicle_id"].as<std::string>(),
                           a["qty"].as<std::string>(), a["amt"].as<std::string>()});
    } else if (!d[0]["vehicle_id"].isNull()) {
      targets.push_back({"", d[0]["vehicle_id"].as<std::string>(), d[0]["qty"].as<std::string>(),
                         d[0]["tot"].as<std::string>()});
    } else {
      co_return fail("conflict", "Assign a vehicleId or create vehicle allocations before promoting.");
    }

    Json::Value promotedJobs(Json::arrayValue);
    std::string primaryJobId, primaryLineId;
    for (const auto &t : targets) {
      std::string jobId =
          body.isObject() && body["jobCardId"].isString() && targets.size() == 1 &&
                  uuid(body["jobCardId"].asString())
              ? lower(body["jobCardId"].asString())
              : "";
      if (jobId.empty()) {
        const std::string jobNum = co_await nextNumber(db, who, effUnit, "job_card", "JOB");
        const std::string locSite =
            d[0]["location_or_vendor"].as<std::string>().empty()
                ? std::string("Main Workshop")
                : d[0]["location_or_vendor"].as<std::string>();
        const std::string payStatus = d[0]["is_paid"].as<bool>() ? "paid" : "unpaid";
        const auto jc = co_await db->execSqlCoro(
            "INSERT INTO fwm_job_cards(tenant_id,accounting_unit_id,job_number,vehicle_id,job_type,"
            "billing_scope,currency_id,opened_date,location_site,reported_fault,status,"
            "payment_status,created_by_user_id) "
            "VALUES($1::uuid,$2::uuid,$3,$4::uuid,$5,'internal_fleet',$6::uuid,$7::date,$8,$9,"
            "'open',$10,$11::uuid) RETURNING id",
            who.tenantId, effUnit, jobNum, t.vehicleId, jobType, currId,
            d[0]["edate"].as<std::string>(), locSite, d[0]["description"].as<std::string>(),
            payStatus, who.userId);
        jobId = jc[0]["id"].as<std::string>();
        co_await addJobEvent(db, who, effUnit, jobId, "created", "", "open",
                             "Promoted from diary entry " + d[0]["entry_number"].as<std::string>());
      }
      const long long qScaled = dec6(t.qty);
      const long long aScaled = dec6(t.amt);
      const std::string unitCost =
          qScaled > 0 ? dec6str((aScaled * SCALE) / qScaled) : t.amt;
      const auto jl = co_await db->execSqlCoro(
          "INSERT INTO fwm_job_card_lines(tenant_id,job_card_id,line_number,line_type,source_type,"
          "description,position_or_side,inv_item_id,supplier_id,employee_id,quantity,unit_cost,"
          "line_cost,is_paid,location_note,entry_date,created_by_user_id) "
          "SELECT $1::uuid,$2::uuid,COALESCE((SELECT max(line_number) FROM fwm_job_card_lines WHERE tenant_id=$1 AND job_card_id=$2::uuid),0)+1,"
          "$3,$4,$5,$6,NULLIF($7,'')::uuid,NULLIF($8,'')::uuid,NULLIF($9,'')::uuid,"
          "($10::text)::numeric,($11::text)::numeric,($12::text)::numeric,$13,$14,$15::date,$16::uuid "
          "RETURNING id",
          who.tenantId, jobId, lineType, srcType, d[0]["description"].as<std::string>(),
          d[0]["position_or_side"].as<std::string>(),
          optCol(d[0], "inv_item_id"), optCol(d[0], "supplier_id"), optCol(d[0], "employee_id"),
          t.qty, unitCost, t.amt, d[0]["is_paid"].as<bool>(),
          d[0]["location_or_vendor"].as<std::string>(), d[0]["edate"].as<std::string>(), who.userId);
      const std::string lineId = jl[0]["id"].as<std::string>();
      co_await recomputeJobTotals(db, who, jobId);
      if (primaryJobId.empty()) {
        primaryJobId = jobId;
        primaryLineId = lineId;
      }
      if (!t.allocId.empty()) {
        co_await db->execSqlCoro(
            "UPDATE fwm_diary_entry_allocations SET linked_job_card_id=$3::uuid,"
            "linked_job_line_id=$4::uuid WHERE tenant_id=$1 AND id=$2::uuid",
            who.tenantId, t.allocId, jobId, lineId);
      }
      promotedJobs.append(jobId);
    }
    co_await db->execSqlCoro(
        "UPDATE fwm_diary_entries SET status='promoted_to_job',linked_job_card_id=$3::uuid,"
        "linked_job_line_id=$4::uuid,last_modified_at=now(),last_modified_by_user_id=$5::uuid,"
        "version=version+1 WHERE tenant_id=$1 AND id=$2::uuid",
        who.tenantId, id, primaryJobId, primaryLineId, who.userId);
    auto res = co_await fetchDiaryEntry(db, who, canWrite, selectOne, id);
    res.result["promotedJobCardIds"] = promotedJobs;
    co_return res;
  }
  if (action != "create" && action != "update")
    co_return fail("validation_error", "Unsupported diary-entries action.");
  const bool isUpdate = action == "update";
  if (isUpdate && !uuid(id))
    co_return fail("validation_error", "Valid diary entry UUID required.");
  std::string err;
  std::set<std::string> allowed{
      "accountingUnitId", "entryDate", "vehicleId", "registrationNoSnapshot", "entryCategory",
      "description", "positionOrSide", "locationOrVendor", "supplierId", "invItemId",
      "employeeId", "quantity", "unitAmount", "totalAmount", "currencyId", "isPaid",
      "paymentReference", "notes"};
  if (isUpdate)
    allowed.insert("version");
  if (!allowedFields(body, allowed, err) ||
      !validUuidOpt(body, "accountingUnitId", err, !isUpdate) ||
      !validDate(body, "entryDate", err, true) || !validUuidOpt(body, "vehicleId", err) ||
      !validText(body, "registrationNoSnapshot", 60, err) ||
      !validEnum(body, "entryCategory",
                 {"parts", "workmanship", "electrical", "tyres", "oil_change", "outsourced_repair",
                  "other"},
                 err, "parts") ||
      !validText(body, "description", 500, err, true) ||
      !validText(body, "positionOrSide", 80, err) ||
      !validText(body, "locationOrVendor", 160, err) ||
      !validUuidOpt(body, "supplierId", err) || !validUuidOpt(body, "invItemId", err) ||
      !validUuidOpt(body, "employeeId", err) || !validDec(body, "quantity", err, "1", true) ||
      !validDec(body, "unitAmount", err, "0") || !validDec(body, "totalAmount", err, "0") ||
      !validUuidOpt(body, "currencyId", err) || !validBool(body, "isPaid", err, false) ||
      !validText(body, "paymentReference", 80, err) || !validText(body, "notes", 500, err))
    co_return fail("validation_error", err);
  if (isUpdate && (!body["version"].isInt() || body["version"].asInt() < 1))
    co_return fail("validation_error", "A valid version is required.");
  if (dec6(body["totalAmount"].asString()) == 0 && dec6(body["unitAmount"].asString()) > 0)
    body["totalAmount"] = mulDec6(body["quantity"].asString(), body["unitAmount"].asString());

  if (!isUpdate) {
    const std::string effUnit = body["accountingUnitId"].asString();
    std::string currId = body["currencyId"].isNull() ? "" : body["currencyId"].asString();
    if (currId.empty())
      currId = co_await resolveUnitCurrency(db, who, effUnit);
    const std::string num = co_await nextNumber(db, who, effUnit, "diary_entry", "DRY");
    const auto saved = co_await db->execSqlCoro(
        "INSERT INTO fwm_diary_entries(tenant_id,accounting_unit_id,entry_number,entry_date,"
        "vehicle_id,registration_no_snapshot,entry_category,description,position_or_side,"
        "location_or_vendor,supplier_id,inv_item_id,employee_id,quantity,unit_amount,total_amount,"
        "currency_id,is_paid,paid_at,payment_reference,notes,created_by_user_id) "
        "VALUES($1::uuid,$2::uuid,$3,$4::date,NULLIF($5,'')::uuid,$6,$7,$8,$9,$10,"
        "NULLIF($11,'')::uuid,NULLIF($12,'')::uuid,NULLIF($13,'')::uuid,($14::text)::numeric,"
        "($15::text)::numeric,($16::text)::numeric,$17::uuid,$18,CASE WHEN $18 THEN now() ELSE NULL END,"
        "$19,$20,$21::uuid) RETURNING id",
        who.tenantId, effUnit, num, body["entryDate"].asString(),
        optStr(body, "vehicleId"),
        body["registrationNoSnapshot"].asString(), body["entryCategory"].asString(),
        body["description"].asString(), body["positionOrSide"].asString(),
        body["locationOrVendor"].asString(),
        optStr(body, "supplierId"), optStr(body, "invItemId"), optStr(body, "employeeId"),
        body["quantity"].asString(), body["unitAmount"].asString(), body["totalAmount"].asString(),
        currId, body["isPaid"].asBool(), body["paymentReference"].asString(),
        body["notes"].asString(), who.userId);
    co_return co_await fetchDiaryEntry(db, who, canWrite, selectOne, saved[0]["id"].as<std::string>());
  }
  const auto updated = co_await db->execSqlCoro(
      "UPDATE fwm_diary_entries SET entry_date=$3::date,vehicle_id=NULLIF($4,'')::uuid,"
      "registration_no_snapshot=$5,entry_category=$6,description=$7,position_or_side=$8,"
      "location_or_vendor=$9,supplier_id=NULLIF($10,'')::uuid,inv_item_id=NULLIF($11,'')::uuid,"
      "employee_id=NULLIF($12,'')::uuid,quantity=($13::text)::numeric,unit_amount=($14::text)::numeric,"
      "total_amount=($15::text)::numeric,is_paid=$16,payment_reference=$17,notes=$18,"
      "last_modified_at=now(),last_modified_by_user_id=$19::uuid,version=version+1 "
      "WHERE tenant_id=$1 AND id=$2::uuid AND status='logged' AND version=$20 AND is_deleted=false RETURNING id",
      who.tenantId, id, body["entryDate"].asString(),
      optStr(body, "vehicleId"),
      body["registrationNoSnapshot"].asString(), body["entryCategory"].asString(),
      body["description"].asString(), body["positionOrSide"].asString(),
      body["locationOrVendor"].asString(),
      optStr(body, "supplierId"), optStr(body, "invItemId"), optStr(body, "employeeId"),
      body["quantity"].asString(), body["unitAmount"].asString(), body["totalAmount"].asString(),
      body["isPaid"].asBool(), body["paymentReference"].asString(), body["notes"].asString(),
      who.userId, body["version"].asInt());
  if (updated.empty())
    co_return fail("conflict", "Diary entry not found, promoted, or modified concurrently.");
  co_return co_await fetchDiaryEntry(db, who, canWrite, selectOne, id);
}

drogon::Task<dto::BaseApiResponse>
moduleLinksList(DbClientPtr db, Json::Value body, int page, int size, const utils::AuditIdentity &who,
                bool canWrite) {
  const std::string targetMod =
      body.isObject() && body["targetModule"].isString() ? trim(body["targetModule"].asString()) : "";
  const std::string status =
      body.isObject() && body["handoffStatus"].isString() ? trim(body["handoffStatus"].asString()) : "";
  const std::string srcId =
      body.isObject() && body["sourceEntityId"].isString() && uuid(body["sourceEntityId"].asString())
          ? lower(body["sourceEntityId"].asString())
          : "";
  const auto cnt = co_await db->execSqlCoro(
      "SELECT count(*) AS total FROM fwm_cross_module_links WHERE tenant_id=$1 AND is_deleted=false "
      "AND ($2='' OR target_module=$2) AND ($3='' OR handoff_status=$3) AND ($4='' OR source_entity_id=$4::uuid)",
      who.tenantId, targetMod, status, srcId);
  const auto rows = co_await db->execSqlCoro(
      "SELECT jsonb_build_object('id',id,'accountingUnitId',accounting_unit_id,"
      "'sourceEntityType',source_entity_type,'sourceEntityId',source_entity_id,"
      "'targetModule',target_module,'linkKind',link_kind,'targetEntityId',target_entity_id,"
      "'targetReference',target_reference,'handoffStatus',handoff_status,'amount',amount::text,"
      "'currencyId',currency_id,'journalBatchId',journal_batch_id,'payload',payload,"
      "'createdAt',created_at,'postedAt',posted_at)::text AS record "
      "FROM fwm_cross_module_links WHERE tenant_id=$1 AND is_deleted=false "
      "AND ($2='' OR target_module=$2) AND ($3='' OR handoff_status=$3) AND ($4='' OR source_entity_id=$4::uuid) "
      "ORDER BY created_at DESC LIMIT $5 OFFSET $6",
      who.tenantId, targetMod, status, srcId, size, static_cast<long long>(page - 1) * size);
  dto::BaseApiResponse r;
  r.result["data"] = Json::arrayValue;
  for (const auto &row : rows)
    r.result["data"].append(parse(row["record"].as<std::string>()));
  r.result["totalCount"] = Json::Int64(cnt[0]["total"].as<long long>());
  r.result["canWrite"] = canWrite;
  r.success = true;
  co_return r;
}

drogon::Task<dto::BaseApiResponse>
reportsRun(DbClientPtr db, Json::Value body, const utils::AuditIdentity &who) {
  // Implements Mcguan Reports' 6 tabs (Forecast, Fuel & Lubs, Jobs, Tyres,
  // Major Components, Others) with Exchange Rate conversion & equipment filters.
  const std::string tab =
      body.isObject() && body["tab"].isString() && !trim(body["tab"].asString()).empty()
          ? trim(body["tab"].asString())
          : "jobs";
  const std::string vid =
      body.isObject() && body["vehicleId"].isString() && uuid(body["vehicleId"].asString())
          ? lower(body["vehicleId"].asString())
          : "";
  const std::string gid =
      body.isObject() && body["assetGroupId"].isString() && uuid(body["assetGroupId"].asString())
          ? lower(body["assetGroupId"].asString())
          : "";
  const std::string df =
      body.isObject() && body["dateFrom"].isString() && date(body["dateFrom"].asString())
          ? body["dateFrom"].asString()
          : "";
  const std::string dt =
      body.isObject() && body["dateTo"].isString() && date(body["dateTo"].asString())
          ? body["dateTo"].asString()
          : "";
  std::string fxRate = "1";
  if (body.isObject() && !body["exchangeRate"].isNull()) {
    const auto rStr = decParam(body["exchangeRate"], "1");
    if (!rStr.empty() && decimal(rStr) && dec6(rStr) > 0)
      fxRate = rStr;
  }

  Json::Value out;
  out["tab"] = tab;
  out["exchangeRate"] = fxRate;
  out["rows"] = Json::arrayValue;

  if (tab == "forecast") {
    const auto rows = co_await db->execSqlCoro(
        "SELECT jsonb_build_object('scheduleId',s.id,'scheduleNumber',s.schedule_number,"
        "'assetNo',v.asset_no,'registrationNo',v.registration_no,'model',COALESCE(g.model,''),"
        "'serviceType',s.service_type,'scheduleDate',s.schedule_date,"
        "'modifiedServiceDate',s.modified_service_date,'triggerReading',s.trigger_reading::text,"
        "'projectedEngineRun',s.projected_engine_run::text,'downtimeHours',s.estimated_downtime_hours::text,"
        "'status',s.status,"
        "'estimatedMaterialCost',round(COALESCE((SELECT sum(m.quantity*i.average_unit_cost) "
        "FROM fwm_asset_group_materials m JOIN inv_items i ON i.tenant_id=m.tenant_id AND i.id=m.item_id "
        "WHERE m.tenant_id=s.tenant_id AND m.asset_group_id=v.asset_group_id "
        "AND m.service_tier=(CASE WHEN s.service_type='Major Service' THEN 'major_service' ELSE 'minor_service' END) "
        "AND m.is_deleted=false),0)*($6::text)::numeric,6)::text)::text AS record "
        "FROM fwm_maintenance_schedules s "
        "JOIN fwm_vehicles v ON v.tenant_id=s.tenant_id AND v.id=s.vehicle_id "
        "LEFT JOIN fwm_asset_groups g ON g.tenant_id=v.tenant_id AND g.id=v.asset_group_id "
        "WHERE s.tenant_id=$1 AND s.is_deleted=false AND ($2='' OR s.vehicle_id=$2::uuid) "
        "AND ($3='' OR v.asset_group_id=$3::uuid) "
        "AND ($4='' OR s.schedule_date>=$4::date) AND ($5='' OR s.schedule_date<=$5::date) "
        "ORDER BY s.schedule_date, v.asset_no",
        who.tenantId, vid, gid, df, dt, fxRate);
    for (const auto &row : rows)
      out["rows"].append(parse(row["record"].as<std::string>()));
  } else if (tab == "fuel_lubs") {
    const auto rows = co_await db->execSqlCoro(
        "SELECT jsonb_build_object('vehicleId',v.id,'assetNo',v.asset_no,'registrationNo',v.registration_no,"
        "'fuelEvents',count(DISTINCT f.id),'totalLitres',COALESCE(sum(f.quantity_litres),0)::text,"
        "'fuelCostConverted',round(COALESCE(sum(f.total_cost),0)*($6::text)::numeric,6)::text,"
        "'outOfToleranceCount',count(f.id) FILTER (WHERE f.within_tolerance=false),"
        "'oilChangesCount',(SELECT count(*) FROM fwm_lubricant_logs l WHERE l.tenant_id=v.tenant_id "
        "AND l.vehicle_id=v.id AND l.is_deleted=false AND l.is_oil_change=true),"
        "'lubricantsCostConverted',round(COALESCE((SELECT sum(l.total_cost) FROM fwm_lubricant_logs l "
        "WHERE l.tenant_id=v.tenant_id AND l.vehicle_id=v.id AND l.is_deleted=false),0)*($6::text)::numeric,6)::text"
        ")::text AS record FROM fwm_vehicles v "
        "LEFT JOIN fwm_fuel_logs f ON f.tenant_id=v.tenant_id AND f.vehicle_id=v.id AND f.is_deleted=false "
        "AND ($4='' OR f.log_date>=$4::date) AND ($5='' OR f.log_date<=$5::date) "
        "WHERE v.tenant_id=$1 AND v.is_deleted=false AND ($2='' OR v.id=$2::uuid) "
        "AND ($3='' OR v.asset_group_id=$3::uuid) GROUP BY v.id ORDER BY v.asset_no",
        who.tenantId, vid, gid, df, dt, fxRate);
    for (const auto &row : rows)
      out["rows"].append(parse(row["record"].as<std::string>()));
  } else if (tab == "jobs") {
    const auto rows = co_await db->execSqlCoro(
        "SELECT jsonb_build_object('jobCardId',j.id,'jobNumber',j.job_number,'openedDate',j.opened_date,"
        "'assetNo',v.asset_no,'registrationNo',v.registration_no,'jobType',j.job_type,"
        "'billingScope',j.billing_scope,'status',j.status,'paymentStatus',j.payment_status,"
        "'partsCostConverted',round(j.parts_cost_total*($6::text)::numeric,6)::text,"
        "'labourCostConverted',round(j.internal_labour_cost_total*($6::text)::numeric,6)::text,"
        "'outsourcedCostConverted',round(j.outsourced_cost_total*($6::text)::numeric,6)::text,"
        "'lubricantsCostConverted',round(j.lubricants_cost_total*($6::text)::numeric,6)::text,"
        "'totalCostConverted',round(j.total_cost*($6::text)::numeric,6)::text,"
        "'billableTotalConverted',round(j.billable_grand_total*($6::text)::numeric,6)::text)::text AS record "
        "FROM fwm_job_cards j JOIN fwm_vehicles v ON v.tenant_id=j.tenant_id AND v.id=j.vehicle_id "
        "WHERE j.tenant_id=$1 AND j.is_deleted=false AND ($2='' OR j.vehicle_id=$2::uuid) "
        "AND ($3='' OR v.asset_group_id=$3::uuid) AND ($4='' OR j.opened_date>=$4::date) "
        "AND ($5='' OR j.opened_date<=$5::date) ORDER BY j.opened_date DESC, j.job_number DESC",
        who.tenantId, vid, gid, df, dt, fxRate);
    for (const auto &row : rows)
      out["rows"].append(parse(row["record"].as<std::string>()));
  } else if (tab == "tyres") {
    const auto rows = co_await db->execSqlCoro(
        "SELECT jsonb_build_object('tyreId',t.id,'serialNo',t.serial_no,'brand',t.brand,"
        "'sizeSpec',t.size_spec,'status',t.status,'assetNo',COALESCE(v.asset_no,''),"
        "'registrationNo',COALESCE(v.registration_no,''),'axlePosition',t.axle_position,"
        "'treadDepthMm',t.current_tread_depth_mm::text,'accumulatedUsage',t.accumulated_meter_usage::text,"
        "'purchaseCostConverted',round(t.purchase_cost*($3::text)::numeric,6)::text,"
        "'purchaseLocation',t.purchase_location)::text AS record "
        "FROM fwm_tyres t LEFT JOIN fwm_vehicles v ON v.tenant_id=t.tenant_id AND v.id=t.current_vehicle_id "
        "WHERE t.tenant_id=$1 AND t.is_deleted=false AND ($2='' OR t.current_vehicle_id=$2::uuid) "
        "ORDER BY t.status, lower(t.serial_no)",
        who.tenantId, vid, fxRate);
    for (const auto &row : rows)
      out["rows"].append(parse(row["record"].as<std::string>()));
  } else if (tab == "major_components") {
    const auto rows = co_await db->execSqlCoro(
        "SELECT jsonb_build_object('componentId',c.id,'componentCode',c.component_code,"
        "'serialNo',c.serial_no,'componentType',c.component_type,'condition',c.condition,"
        "'status',c.status,'assetNo',COALESCE(v.asset_no,''),'mountedDate',c.mounted_date,"
        "'mountedCumOdo',c.mounted_cum_odo::text,'estimatedLifeHours',c.estimated_life_hours::text,"
        "'accumulatedHours',c.accumulated_hours::text,"
        "'repairCostConverted',round(c.cumulative_repair_cost*($3::text)::numeric,6)::text)::text AS record "
        "FROM fwm_major_components c LEFT JOIN fwm_vehicles v ON v.tenant_id=c.tenant_id AND v.id=c.current_vehicle_id "
        "WHERE c.tenant_id=$1 AND c.is_deleted=false AND ($2='' OR c.current_vehicle_id=$2::uuid) "
        "ORDER BY c.component_type, c.component_code",
        who.tenantId, vid, fxRate);
    for (const auto &row : rows)
      out["rows"].append(parse(row["record"].as<std::string>()));
  } else if (tab == "others") {
    const auto rows = co_await db->execSqlCoro(
        "SELECT jsonb_build_object('vehicleId',v.id,'assetNo',v.asset_no,'registrationNo',v.registration_no,"
        "'makeModel',v.make_model,'ownershipType',v.ownership_type,'status',v.status,"
        "'condition',v.condition,'primaryMeterUnit',v.primary_meter_unit,"
        "'currentMeterReading',v.current_meter_reading::text,"
        "'cumulativeMeterReading',v.cumulative_meter_reading::text,"
        "'isMeterStalled',v.is_meter_stalled,'stalledSinceDate',v.stalled_since_date)::text AS record "
        "FROM fwm_vehicles v WHERE v.tenant_id=$1 AND v.is_deleted=false "
        "AND ($2='' OR v.id=$2::uuid) AND ($3='' OR v.asset_group_id=$3::uuid) ORDER BY v.asset_no",
        who.tenantId, vid, gid);
    for (const auto &row : rows)
      out["rows"].append(parse(row["record"].as<std::string>()));
  } else {
    co_return fail("validation_error",
                   "Report tab must be forecast, fuel_lubs, jobs, tyres, major_components, or others.");
  }
  co_return okRecord(out);
}

} // namespace

drogon::Task<dto::BaseApiResponse>
handleJobAndReportOps(DbClientPtr db, const std::string &resource, const std::string &action,
                      const std::string &id, const std::string &subId, Json::Value body,
                      int page, int size, const std::string &query, const std::string &unitId,
                      const utils::AuditIdentity &who, bool, bool canWrite) {
  if (resource == "job-cards")
    co_return co_await jobCards(db, action, id, subId, std::move(body), page, size, query, unitId,
                                who, canWrite);
  if (resource == "diary-entries")
    co_return co_await diaryEntries(db, action, id, std::move(body), page, size, query, unitId,
                                    who, canWrite);
  if (resource == "module-links" && action == "list")
    co_return co_await moduleLinksList(db, std::move(body), page, size, who, canWrite);
  if (resource == "reports" && action == "run")
    co_return co_await reportsRun(db, std::move(body), who);
  co_return fail("validation_error", "Unknown Fleet & Workshop job/report operation.");
}

} // namespace business_desk::domain_services::fwm_internal

namespace business_desk::domain_services {

drogon::Task<dto::BaseApiResponse>
FleetWorkshopService::execute(std::string op, std::string id, std::string subId, Json::Value body,
                              int page, int size, std::string query, std::string unitId,
                              utils::AuditIdentity who) {
  using namespace fwm_internal;
  if (!uuid(who.tenantId) || !uuid(who.userId))
    co_return fail("unauthorized", "A signed-in tenant user is required.");
  const auto dot = op.find('.');
  if (dot == std::string::npos || dot == 0 || dot + 1 >= op.size())
    co_return fail("validation_error", "Operation must have <resource>.<action> form.");
  const std::string resource = op.substr(0, dot);
  const std::string action = op.substr(dot + 1);
  if (page < 1)
    page = 1;
  if (size < 1 || size > 100)
    size = 20;

  static const std::set<std::string> readActions{
      "list", "get", "options", "next-number", "summary", "run",
      "milestones.list", "lines.list", "assignments.list", "materials.list",
      "components.list", "pm-triggers.list"};
  const bool write = !readActions.count(action);

  static const std::set<std::string> masterResources{"dashboard", "gl-settings", "asset-groups",
                                                     "procedures", "vehicles", "employees"};
  static const std::set<std::string> opsResources{"meter-changes", "stalled-meters", "meter-readings",
                                                  "fuel-logs", "fuel-tolerances", "lubricant-logs",
                                                  "major-components", "tyres", "schedules"};
  static const std::set<std::string> jobResources{"job-cards", "diary-entries", "module-links",
                                                  "reports"};

  const bool isMaster =
      masterResources.count(resource) && !(resource == "vehicles" && action == "resolve-stalled-meter");
  const bool isOps = opsResources.count(resource) ||
                     (resource == "vehicles" && action == "resolve-stalled-meter");
  const bool isJobs = jobResources.count(resource);
  if (!isMaster && !isOps && !isJobs)
    co_return fail("validation_error", "Unknown Fleet & Workshop resource: " + resource);

  try {
    auto db = drogon::app().getDbClient();
    static const std::vector<std::string> requiredTables{
        "fwm_document_sequences", "fwm_asset_groups", "fwm_vehicles",
        "fwm_job_cards", "fwm_diary_entries", "fwm_cross_module_links"};
    if (!(co_await schemaReady(db, requiredTables)))
      co_return fail("schema_not_ready",
                     "Fleet & Workshop Management schema upgrade required. Apply 041_fleet_workshop_management.sql.");

    bool canWrite = false;
    if (!write) {
      const auto authz = co_await authorize(db, who, false, canWrite);
      if (!authz.success)
        co_return authz;
      if (isMaster)
        co_return co_await handleMasterOps(db, resource, action, id, std::move(body), page, size,
                                           query, unitId, who, false, canWrite);
      if (isOps)
        co_return co_await handleOperationsOps(db, resource, action, id, std::move(body), page,
                                               size, query, unitId, who, false, canWrite);
      co_return co_await handleJobAndReportOps(db, resource, action, id, subId, std::move(body),
                                               page, size, query, unitId, who, false, canWrite);
    }

    auto tx = co_await db->newTransactionCoro();
    dto::BaseApiResponse result;
    try {
      const auto authz = co_await authorize(tx, who, true, canWrite);
      if (!authz.success) {
        result = authz;
      } else if (isMaster) {
        result = co_await handleMasterOps(tx, resource, action, id, std::move(body), page, size,
                                          query, unitId, who, true, canWrite);
      } else if (isOps) {
        result = co_await handleOperationsOps(tx, resource, action, id, std::move(body), page,
                                              size, query, unitId, who, true, canWrite);
      } else {
        result = co_await handleJobAndReportOps(tx, resource, action, id, subId, std::move(body),
                                                page, size, query, unitId, who, true, canWrite);
      }
    } catch (...) {
      tx->rollback();
      throw;
    }
    if (!result.success) {
      tx->rollback();
      co_return result;
    }
    if (!(co_await utils::CommitTransaction{std::move(tx)}))
      co_return fail("database_error", "Unable to commit Fleet & Workshop changes.");
    co_return result;
  } catch (const drogon::orm::UniqueViolation &) {
    co_return fail("conflict", "A unique fleet code, registration, or document number already exists.");
  } catch (const drogon::orm::Failure &e) {
    const auto msg = knownFwmMessage(e.what() ? e.what() : "");
    if (!msg.empty())
      co_return fail("conflict", msg);
    co_return fail("database_error",
                   "Fleet & Workshop database error. Verify referenced records and migration 041.");
  } catch (const std::exception &) {
    co_return fail("database_error",
                   "Fleet & Workshop service unavailable. Verify migration 041 is installed.");
  }
}

} // namespace business_desk::domain_services
