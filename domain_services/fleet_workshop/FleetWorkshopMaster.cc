#include "FleetWorkshopInternal.h"

namespace business_desk::domain_services::fwm_internal {
namespace {

dto::BaseApiResponse okRecord(const Json::Value &record) {
  dto::BaseApiResponse r;
  r.result = record;
  r.success = true;
  return r;
}

std::string resolveEffectiveUnitSql() {
  return "SELECT id FROM core_accounting_units WHERE tenant_id=$1 AND is_deleted=false AND "
         "is_active=true ORDER BY created_at,id LIMIT 1";
}

drogon::Task<drogon::orm::Result>
runDashboardCount(DbClientPtr db, const std::vector<std::string> &args, const std::string &sql) {
  if (args.size() == 1)
    co_return co_await db->execSqlCoro(sql, args[0]);
  co_return co_await db->execSqlCoro(sql, args[0], args[1]);
}

drogon::Task<dto::BaseApiResponse>
dashboardSummary(DbClientPtr db, const utils::AuditIdentity &who, const std::string &unitId) {
  std::string unitFilter;
  std::vector<std::string> args{who.tenantId};
  if (!unitId.empty()) {
    if (!uuid(unitId))
      co_return fail("validation_error", "Invalid accountingUnitId filter.");
    unitFilter = " AND accounting_unit_id=$2::uuid";
    args.push_back(unitId);
  }
  const auto fleet = co_await runDashboardCount(
      db, args,
      "SELECT count(*) AS total,"
      "count(*) FILTER (WHERE status='active') AS active,"
      "count(*) FILTER (WHERE status='in_workshop') AS in_workshop,"
      "count(*) FILTER (WHERE condition='breakdown') AS breakdown,"
      "count(*) FILTER (WHERE is_heavy_machinery=true) AS heavy_machinery,"
      "count(*) FILTER (WHERE is_meter_stalled=true) AS stalled_meters "
      "FROM fwm_vehicles WHERE tenant_id=$1 AND is_deleted=false" +
          unitFilter);
  const auto jobs = co_await runDashboardCount(
      db, args,
      "SELECT count(*) FILTER (WHERE status IN('draft','open','in_progress','awaiting_parts')) AS open_jobs,"
      "count(*) FILTER (WHERE status='awaiting_parts') AS awaiting_parts,"
      "count(*) FILTER (WHERE status='completed' AND billing_scope='customer_billable') AS unbilled_customer_jobs,"
      "count(*) FILTER (WHERE is_major_project=true AND status NOT IN('closed','cancelled')) AS major_projects,"
      "COALESCE(sum(total_cost) FILTER (WHERE status NOT IN('cancelled')),0)::text AS job_cost_total,"
      "COALESCE(sum(billable_grand_total) FILTER (WHERE billing_scope='customer_billable' AND status NOT IN('cancelled')),0)::text AS billable_total "
      "FROM fwm_job_cards WHERE tenant_id=$1 AND is_deleted=false" +
          unitFilter);
  const auto scheds = co_await runDashboardCount(
      db, args,
      "SELECT count(*) FILTER (WHERE status IN('forecasted','scheduled')) AS scheduled_works,"
      "count(*) FILTER (WHERE status IN('forecasted','scheduled') AND schedule_date<=current_date+7) AS due_within_7d "
      "FROM fwm_maintenance_schedules WHERE tenant_id=$1 AND is_deleted=false" +
          unitFilter);
  const auto fuel = co_await runDashboardCount(
      db, args,
      "SELECT count(*) AS fuel_logs_count,"
      "count(*) FILTER (WHERE within_tolerance=false) AS fuel_alerts,"
      "COALESCE(sum(quantity_litres) FILTER (WHERE status='posted'),0)::text AS fuel_litres_posted,"
      "COALESCE(sum(total_cost) FILTER (WHERE status='posted'),0)::text AS fuel_cost_posted "
      "FROM fwm_fuel_logs WHERE tenant_id=$1 AND is_deleted=false" +
          unitFilter);
  const auto diary = co_await runDashboardCount(
      db, args,
      "SELECT count(*) FILTER (WHERE is_paid=false AND status<>'cancelled') AS unpaid_diary_count,"
      "COALESCE(sum(total_amount) FILTER (WHERE is_paid=false AND status<>'cancelled'),0)::text AS unpaid_diary_amount "
      "FROM fwm_diary_entries WHERE tenant_id=$1 AND is_deleted=false" +
          unitFilter);
  const auto links = co_await db->execSqlCoro(
      "SELECT target_module, handoff_status, count(*)::bigint AS cnt "
      "FROM fwm_cross_module_links WHERE tenant_id=$1 AND is_deleted=false "
      "GROUP BY target_module, handoff_status ORDER BY target_module, handoff_status",
      who.tenantId);
  Json::Value out;
  out["fleet"]["totalVehicles"] = Json::Int64(fleet[0]["total"].as<long long>());
  out["fleet"]["active"] = Json::Int64(fleet[0]["active"].as<long long>());
  out["fleet"]["inWorkshop"] = Json::Int64(fleet[0]["in_workshop"].as<long long>());
  out["fleet"]["breakdown"] = Json::Int64(fleet[0]["breakdown"].as<long long>());
  out["fleet"]["heavyMachinery"] = Json::Int64(fleet[0]["heavy_machinery"].as<long long>());
  out["fleet"]["stalledMeters"] = Json::Int64(fleet[0]["stalled_meters"].as<long long>());
  out["workshop"]["openJobs"] = Json::Int64(jobs[0]["open_jobs"].as<long long>());
  out["workshop"]["awaitingParts"] = Json::Int64(jobs[0]["awaiting_parts"].as<long long>());
  out["workshop"]["unbilledCustomerJobs"] = Json::Int64(jobs[0]["unbilled_customer_jobs"].as<long long>());
  out["workshop"]["majorProjects"] = Json::Int64(jobs[0]["major_projects"].as<long long>());
  out["workshop"]["jobCostTotal"] = jobs[0]["job_cost_total"].as<std::string>();
  out["workshop"]["billableTotal"] = jobs[0]["billable_total"].as<std::string>();
  out["schedules"]["scheduledWorks"] = Json::Int64(scheds[0]["scheduled_works"].as<long long>());
  out["schedules"]["dueWithin7Days"] = Json::Int64(scheds[0]["due_within_7d"].as<long long>());
  out["fuel"]["totalLogs"] = Json::Int64(fuel[0]["fuel_logs_count"].as<long long>());
  out["fuel"]["toleranceAlerts"] = Json::Int64(fuel[0]["fuel_alerts"].as<long long>());
  out["fuel"]["litresPosted"] = fuel[0]["fuel_litres_posted"].as<std::string>();
  out["fuel"]["costPosted"] = fuel[0]["fuel_cost_posted"].as<std::string>();
  out["diary"]["unpaidCount"] = Json::Int64(diary[0]["unpaid_diary_count"].as<long long>());
  out["diary"]["unpaidAmount"] = diary[0]["unpaid_diary_amount"].as<std::string>();
  out["crossModuleLinks"] = Json::arrayValue;
  for (const auto &row : links) {
    Json::Value x;
    x["targetModule"] = row["target_module"].as<std::string>();
    x["handoffStatus"] = row["handoff_status"].as<std::string>();
    x["count"] = Json::Int64(row["cnt"].as<long long>());
    out["crossModuleLinks"].append(x);
  }
  dto::BaseApiResponse r;
  r.result = out;
  r.success = true;
  co_return r;
}

drogon::Task<dto::BaseApiResponse>
glSettings(DbClientPtr db, const std::string &action, Json::Value body, const std::string &unitId,
           const utils::AuditIdentity &who, bool canWrite) {
  std::string unit = lower(trim(unitId));
  if (unit.empty() && body.isObject() && body["accountingUnitId"].isString())
    unit = lower(trim(body["accountingUnitId"].asString()));
  if (!uuid(unit)) {
    const auto def = co_await db->execSqlCoro(resolveEffectiveUnitSql(), who.tenantId);
    if (def.empty())
      co_return fail("not_found", "No active accounting unit found in this tenant.");
    unit = def[0]["id"].as<std::string>();
  }
  if (action == "options") {
    const auto accts = co_await db->execSqlCoro(
        "SELECT id, account_number, account_name FROM gl_accounts "
        "WHERE tenant_id=$1 AND accounting_unit_id=$2::uuid AND is_deleted=false AND status='active' "
        "ORDER BY account_number, id",
        who.tenantId, unit);
    const auto whs = co_await db->execSqlCoro(
        "SELECT id, code, name FROM inv_warehouses "
        "WHERE tenant_id=$1 AND accounting_unit_id=$2::uuid AND is_deleted=false AND is_active=true "
        "ORDER BY code, id",
        who.tenantId, unit);
    Json::Value out;
    out["accountingUnitId"] = unit;
    out["accounts"] = Json::arrayValue;
    for (const auto &row : accts) {
      Json::Value a;
      a["id"] = row["id"].as<std::string>();
      a["accountNumber"] = row["account_number"].as<std::string>();
      a["name"] = row["account_name"].as<std::string>();
      out["accounts"].append(a);
    }
    out["warehouses"] = Json::arrayValue;
    for (const auto &row : whs) {
      Json::Value w;
      w["id"] = row["id"].as<std::string>();
      w["code"] = row["code"].as<std::string>();
      w["name"] = row["name"].as<std::string>();
      out["warehouses"].append(w);
    }
    co_return okRecord(out);
  }
  const char *selectSql = R"(
SELECT jsonb_build_object(
 'id', s.id, 'version', s.version, 'accountingUnitId', s.accounting_unit_id,
 'defaultWarehouseId', s.default_warehouse_id, 'defaultWarehouseName', COALESCE(w.name,''),
 'repairsExpenseAccountId', s.repairs_expense_account_id,
 'fuelExpenseAccountId', s.fuel_expense_account_id,
 'lubricantsExpenseAccountId', s.lubricants_expense_account_id,
 'tyresExpenseAccountId', s.tyres_expense_account_id,
 'outsourcedRepairsExpenseAccountId', s.outsourced_repairs_expense_account_id,
 'electricalExpenseAccountId', s.electrical_expense_account_id,
 'internalLabourRecoveryAccountId', s.internal_labour_recovery_account_id,
 'workshopLabourRevenueAccountId', s.workshop_labour_revenue_account_id,
 'workshopPartsRevenueAccountId', s.workshop_parts_revenue_account_id,
 'workshopWipAccountId', s.workshop_wip_account_id,
 'fleetClearingApAccountId', s.fleet_clearing_ap_account_id,
 'fleetReceivableArAccountId', s.fleet_receivable_ar_account_id,
 'defaultLabourRate', s.default_labour_rate::text,
 'defaultTaxRate', s.default_tax_rate::text
)::text AS record
FROM fwm_gl_settings s
LEFT JOIN inv_warehouses w ON w.tenant_id=s.tenant_id AND w.id=s.default_warehouse_id AND w.is_deleted=false
WHERE s.tenant_id=$1 AND s.accounting_unit_id=$2::uuid AND s.is_deleted=false)";

  if (action == "get") {
    const auto rows = co_await db->execSqlCoro(selectSql, who.tenantId, unit);
    Json::Value out;
    if (!rows.empty())
      out = parse(rows[0]["record"].as<std::string>());
    else {
      out["accountingUnitId"] = unit;
      out["defaultLabourRate"] = "0";
      out["defaultTaxRate"] = "0";
    }
    out["canWrite"] = canWrite;
    co_return okRecord(out);
  }
  if (action != "upsert" && action != "update" && action != "create")
    co_return fail("validation_error", "Unsupported gl-settings action.");

  std::string err;
  static const std::set<std::string> allowed{
      "accountingUnitId",
      "defaultWarehouseId",
      "repairsExpenseAccountId",
      "fuelExpenseAccountId",
      "lubricantsExpenseAccountId",
      "tyresExpenseAccountId",
      "outsourcedRepairsExpenseAccountId",
      "electricalExpenseAccountId",
      "internalLabourRecoveryAccountId",
      "workshopLabourRevenueAccountId",
      "workshopPartsRevenueAccountId",
      "workshopWipAccountId",
      "fleetClearingApAccountId",
      "fleetReceivableArAccountId",
      "defaultLabourRate",
      "defaultTaxRate"};
  if (!allowedFields(body, allowed, err))
    co_return fail("validation_error", err);
  body["accountingUnitId"] = unit;
  for (const char *k : {"defaultWarehouseId", "repairsExpenseAccountId", "fuelExpenseAccountId",
                        "lubricantsExpenseAccountId", "tyresExpenseAccountId",
                        "outsourcedRepairsExpenseAccountId", "electricalExpenseAccountId",
                        "internalLabourRecoveryAccountId", "workshopLabourRevenueAccountId",
                        "workshopPartsRevenueAccountId", "workshopWipAccountId",
                        "fleetClearingApAccountId", "fleetReceivableArAccountId"}) {
    if (!validUuidOpt(body, k, err, false))
      co_return fail("validation_error", err);
  }
  if (!validDec(body, "defaultLabourRate", err, "0"))
    co_return fail("validation_error", err);
  const auto taxStr = decParam(body["defaultTaxRate"], "0");
  if (taxStr.empty() || !rate(taxStr))
    co_return fail("validation_error", "defaultTaxRate: fraction between 0 and 1 (6dp max).");
  body["defaultTaxRate"] = taxStr;

  const auto unitChk = co_await db->execSqlCoro(
      "SELECT 1 FROM core_accounting_units WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false "
      "AND is_active=true FOR UPDATE",
      who.tenantId, unit);
  if (unitChk.empty())
    co_return fail("not_found", "Active accounting unit not found.");

  co_await db->execSqlCoro(
      "INSERT INTO fwm_gl_settings(tenant_id,accounting_unit_id,default_warehouse_id,"
      "repairs_expense_account_id,fuel_expense_account_id,lubricants_expense_account_id,"
      "tyres_expense_account_id,outsourced_repairs_expense_account_id,electrical_expense_account_id,"
      "internal_labour_recovery_account_id,workshop_labour_revenue_account_id,"
      "workshop_parts_revenue_account_id,workshop_wip_account_id,fleet_clearing_ap_account_id,"
      "fleet_receivable_ar_account_id,default_labour_rate,default_tax_rate,created_by_user_id) "
      "SELECT $1::uuid,$2::uuid,($3::jsonb->>'defaultWarehouseId')::uuid,"
      "($3::jsonb->>'repairsExpenseAccountId')::uuid,($3::jsonb->>'fuelExpenseAccountId')::uuid,"
      "($3::jsonb->>'lubricantsExpenseAccountId')::uuid,($3::jsonb->>'tyresExpenseAccountId')::uuid,"
      "($3::jsonb->>'outsourcedRepairsExpenseAccountId')::uuid,"
      "($3::jsonb->>'electricalExpenseAccountId')::uuid,"
      "($3::jsonb->>'internalLabourRecoveryAccountId')::uuid,"
      "($3::jsonb->>'workshopLabourRevenueAccountId')::uuid,"
      "($3::jsonb->>'workshopPartsRevenueAccountId')::uuid,($3::jsonb->>'workshopWipAccountId')::uuid,"
      "($3::jsonb->>'fleetClearingApAccountId')::uuid,($3::jsonb->>'fleetReceivableArAccountId')::uuid,"
      "($3::jsonb->>'defaultLabourRate')::numeric,($3::jsonb->>'defaultTaxRate')::numeric,$4::uuid "
      "ON CONFLICT (tenant_id,accounting_unit_id) WHERE is_deleted=false DO UPDATE SET "
      "default_warehouse_id=EXCLUDED.default_warehouse_id,"
      "repairs_expense_account_id=EXCLUDED.repairs_expense_account_id,"
      "fuel_expense_account_id=EXCLUDED.fuel_expense_account_id,"
      "lubricants_expense_account_id=EXCLUDED.lubricants_expense_account_id,"
      "tyres_expense_account_id=EXCLUDED.tyres_expense_account_id,"
      "outsourced_repairs_expense_account_id=EXCLUDED.outsourced_repairs_expense_account_id,"
      "electrical_expense_account_id=EXCLUDED.electrical_expense_account_id,"
      "internal_labour_recovery_account_id=EXCLUDED.internal_labour_recovery_account_id,"
      "workshop_labour_revenue_account_id=EXCLUDED.workshop_labour_revenue_account_id,"
      "workshop_parts_revenue_account_id=EXCLUDED.workshop_parts_revenue_account_id,"
      "workshop_wip_account_id=EXCLUDED.workshop_wip_account_id,"
      "fleet_clearing_ap_account_id=EXCLUDED.fleet_clearing_ap_account_id,"
      "fleet_receivable_ar_account_id=EXCLUDED.fleet_receivable_ar_account_id,"
      "default_labour_rate=EXCLUDED.default_labour_rate,"
      "default_tax_rate=EXCLUDED.default_tax_rate,"
      "last_modified_at=now(),last_modified_by_user_id=$4::uuid,version=fwm_gl_settings.version+1",
      who.tenantId, unit, json(body), who.userId);
  const auto saved = co_await db->execSqlCoro(selectSql, who.tenantId, unit);
  auto out = parse(saved[0]["record"].as<std::string>());
  out["canWrite"] = canWrite;
  co_return okRecord(out);
}

drogon::Task<dto::BaseApiResponse>
fetchAssetGroup(DbClientPtr db, const utils::AuditIdentity &who, bool canWrite,
                const std::string &gid) {
  const auto head = co_await db->execSqlCoro(
      "SELECT jsonb_build_object('id',g.id,'version',g.version,'code',g.code,'model',g.model,"
      "'modelType',g.model_type,'assetClass',g.asset_class,'assetType',g.asset_type,"
      "'defaultTriggerMetric',g.default_trigger_metric,'serviceFrequency',g.service_frequency::text,"
      "'serviceDowntimeHours',g.service_downtime_hours::text,"
      "'majorServiceFrequency',g.major_service_frequency::text,"
      "'majorServiceDowntimeHours',g.major_service_downtime_hours::text,"
      "'tolerance',g.tolerance::text,'routineServiceDelay',g.routine_service_delay::text,"
      "'weekdayUtilization',g.weekday_utilization::text,'weekdayDays',g.weekday_days,"
      "'saturdayUtilization',g.saturday_utilization::text,'sundayUtilization',g.sunday_utilization::text,"
      "'description',g.description,'isActive',g.is_active)::text AS record "
      "FROM fwm_asset_groups g WHERE g.tenant_id=$1 AND g.id=$2::uuid AND g.is_deleted=false",
      who.tenantId, gid);
  if (head.empty())
    co_return fail("not_found", "Asset group not found.");
  auto out = parse(head[0]["record"].as<std::string>());
  const auto mats = co_await db->execSqlCoro(
      "SELECT jsonb_build_object('id',m.id,'serviceTier',m.service_tier,'itemId',m.item_id,"
      "'itemCode',i.item_code,'itemName',i.name,'uomId',m.uom_id,'uomCode',u.code,"
      "'quantity',m.quantity::text,'isLubricant',m.is_lubricant,'notes',m.notes)::text AS record "
      "FROM fwm_asset_group_materials m "
      "JOIN inv_items i ON i.tenant_id=m.tenant_id AND i.id=m.item_id AND i.is_deleted=false "
      "JOIN inv_units_of_measure u ON u.tenant_id=m.tenant_id AND u.id=m.uom_id AND u.is_deleted=false "
      "WHERE m.tenant_id=$1 AND m.asset_group_id=$2::uuid AND m.is_deleted=false "
      "ORDER BY m.service_tier, i.item_code",
      who.tenantId, gid);
  out["materials"] = Json::arrayValue;
  for (const auto &row : mats)
    out["materials"].append(parse(row["record"].as<std::string>()));
  const auto comps = co_await db->execSqlCoro(
      "SELECT jsonb_build_object('id',c.id,'componentType',c.component_type,'slotLabel',c.slot_label,"
      "'expectedLifeHours',c.expected_life_hours::text,'isRequired',c.is_required,'notes',c.notes)::text AS record "
      "FROM fwm_asset_group_components c WHERE c.tenant_id=$1 AND c.asset_group_id=$2::uuid "
      "AND c.is_deleted=false ORDER BY lower(c.component_type), lower(c.slot_label)",
      who.tenantId, gid);
  out["components"] = Json::arrayValue;
  for (const auto &row : comps)
    out["components"].append(parse(row["record"].as<std::string>()));
  out["canWrite"] = canWrite;
  co_return okRecord(out);
}

drogon::Task<dto::BaseApiResponse>
assetGroups(DbClientPtr db, const std::string &action, const std::string &id, Json::Value body,
            int page, int size, const std::string &query, const utils::AuditIdentity &who,
            bool canWrite) {
  if (action == "options") {
    const auto rows = co_await db->execSqlCoro(
        "SELECT id, code, model, model_type, asset_class, asset_type "
        "FROM fwm_asset_groups WHERE tenant_id=$1 AND is_deleted=false AND is_active=true "
        "ORDER BY lower(code), id",
        who.tenantId);
    Json::Value out;
    out["assetGroups"] = Json::arrayValue;
    for (const auto &row : rows) {
      Json::Value g;
      g["id"] = row["id"].as<std::string>();
      g["code"] = row["code"].as<std::string>();
      g["model"] = row["model"].as<std::string>();
      g["modelType"] = row["model_type"].as<std::string>();
      g["assetClass"] = row["asset_class"].as<std::string>();
      g["assetType"] = row["asset_type"].as<std::string>();
      out["assetGroups"].append(g);
    }
    co_return okRecord(out);
  }
  const std::string q = search(query);
  if (action == "list") {
    const auto cnt = co_await db->execSqlCoro(
        "SELECT count(*) AS total FROM fwm_asset_groups WHERE tenant_id=$1 AND is_deleted=false "
        "AND ($2='' OR strpos(lower(code||' '||model||' '||model_type),lower($2))>0)",
        who.tenantId, q);
    const auto rows = co_await db->execSqlCoro(
        "SELECT jsonb_build_object('id',g.id,'version',g.version,'code',g.code,'model',g.model,"
        "'modelType',g.model_type,'assetClass',g.asset_class,'assetType',g.asset_type,"
        "'defaultTriggerMetric',g.default_trigger_metric,'serviceFrequency',g.service_frequency::text,"
        "'serviceDowntimeHours',g.service_downtime_hours::text,"
        "'majorServiceFrequency',g.major_service_frequency::text,"
        "'majorServiceDowntimeHours',g.major_service_downtime_hours::text,"
        "'tolerance',g.tolerance::text,'routineServiceDelay',g.routine_service_delay::text,"
        "'weekdayUtilization',g.weekday_utilization::text,'weekdayDays',g.weekday_days,"
        "'saturdayUtilization',g.saturday_utilization::text,'sundayUtilization',g.sunday_utilization::text,"
        "'description',g.description,'isActive',g.is_active,"
        "'materialCount',(SELECT count(*) FROM fwm_asset_group_materials m WHERE m.tenant_id=g.tenant_id AND m.asset_group_id=g.id AND m.is_deleted=false),"
        "'componentCount',(SELECT count(*) FROM fwm_asset_group_components c WHERE c.tenant_id=g.tenant_id AND c.asset_group_id=g.id AND c.is_deleted=false)"
        ")::text AS record FROM fwm_asset_groups g WHERE g.tenant_id=$1 AND g.is_deleted=false "
        "AND ($2='' OR strpos(lower(g.code||' '||g.model||' '||g.model_type),lower($2))>0) "
        "ORDER BY lower(g.code), g.id LIMIT $3 OFFSET $4",
        who.tenantId, q, size, static_cast<long long>(page - 1) * size);
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
      co_return fail("validation_error", "Valid asset group UUID required.");
    co_return co_await fetchAssetGroup(db, who, canWrite, id);
  }
  if (action == "delete") {
    if (!uuid(id) || !body.isObject() || !body["version"].isInt() || body["version"].asInt() < 1)
      co_return fail("validation_error", "Asset group ID and current version required.");
    const auto ref = co_await db->execSqlCoro(
        "SELECT 1 FROM fwm_vehicles WHERE tenant_id=$1 AND asset_group_id=$2::uuid AND is_deleted=false LIMIT 1",
        who.tenantId, id);
    if (!ref.empty())
      co_return fail("conflict", "Asset group is assigned to live fleet vehicles.");
    const auto del = co_await db->execSqlCoro(
        "UPDATE fwm_asset_groups SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3::uuid,"
        "version=version+1 WHERE tenant_id=$1 AND id=$2::uuid AND version=$4 AND is_deleted=false RETURNING id",
        who.tenantId, id, who.userId, body["version"].asInt());
    if (del.empty())
      co_return fail("conflict", "Asset group not found or modified concurrently.");
    Json::Value res;
    res["id"] = id;
    res["isDeleted"] = true;
    co_return okRecord(res);
  }
  if (action == "materials.list") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid asset group UUID required.");
    const auto rows = co_await db->execSqlCoro(
        "SELECT jsonb_build_object('id',m.id,'serviceTier',m.service_tier,'itemId',m.item_id,"
        "'itemCode',i.item_code,'itemName',i.name,'uomId',m.uom_id,'uomCode',u.code,"
        "'quantity',m.quantity::text,'isLubricant',m.is_lubricant,'notes',m.notes)::text AS record "
        "FROM fwm_asset_group_materials m "
        "JOIN inv_items i ON i.tenant_id=m.tenant_id AND i.id=m.item_id AND i.is_deleted=false "
        "JOIN inv_units_of_measure u ON u.tenant_id=m.tenant_id AND u.id=m.uom_id AND u.is_deleted=false "
        "WHERE m.tenant_id=$1 AND m.asset_group_id=$2::uuid AND m.is_deleted=false "
        "ORDER BY m.service_tier, i.item_code",
        who.tenantId, id);
    dto::BaseApiResponse r;
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.result["canWrite"] = canWrite;
    r.success = true;
    co_return r;
  }
  if (action == "materials.replace") {
    if (!uuid(id) || !body.isObject() || !body["materials"].isArray())
      co_return fail("validation_error", "Asset group ID and materials array required.");
    const auto lock = co_await db->execSqlCoro(
        "SELECT id FROM fwm_asset_groups WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR UPDATE",
        who.tenantId, id);
    if (lock.empty())
      co_return fail("not_found", "Asset group not found.");
    std::string err;
    for (auto &m : body["materials"]) {
      if (!allowedFields(m, {"serviceTier", "itemId", "uomId", "quantity", "isLubricant", "notes"}, err) ||
          !validEnum(m, "serviceTier", {"minor_service", "major_service", "routine", "lubrication"}, err) ||
          !validUuidOpt(m, "itemId", err, true) || !validUuidOpt(m, "uomId", err, true) ||
          !validDec(m, "quantity", err, "1", true) || !validBool(m, "isLubricant", err, false) ||
          !validText(m, "notes", 500, err))
        co_return fail("validation_error", err);
    }
    co_await db->execSqlCoro(
        "UPDATE fwm_asset_group_materials SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3::uuid "
        "WHERE tenant_id=$1 AND asset_group_id=$2::uuid AND is_deleted=false",
        who.tenantId, id, who.userId);
    for (const auto &m : body["materials"]) {
      co_await db->execSqlCoro(
          "INSERT INTO fwm_asset_group_materials(tenant_id,asset_group_id,service_tier,item_id,"
          "uom_id,quantity,is_lubricant,notes,created_by_user_id) "
          "VALUES($1::uuid,$2::uuid,$3,$4::uuid,$5::uuid,($6::text)::numeric,$7,$8,$9::uuid)",
          who.tenantId, id, m["serviceTier"].asString(), m["itemId"].asString(), m["uomId"].asString(),
          m["quantity"].asString(), m["isLubricant"].asBool(), m["notes"].asString(), who.userId);
    }
    co_return co_await fetchAssetGroup(db, who, canWrite, id);
  }
  if (action == "components.list") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid asset group UUID required.");
    const auto rows = co_await db->execSqlCoro(
        "SELECT jsonb_build_object('id',c.id,'componentType',c.component_type,'slotLabel',c.slot_label,"
        "'expectedLifeHours',c.expected_life_hours::text,'isRequired',c.is_required,'notes',c.notes)::text AS record "
        "FROM fwm_asset_group_components c WHERE c.tenant_id=$1 AND c.asset_group_id=$2::uuid AND c.is_deleted=false "
        "ORDER BY c.component_type, c.slot_label",
        who.tenantId, id);
    dto::BaseApiResponse r;
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.result["canWrite"] = canWrite;
    r.success = true;
    co_return r;
  }
  if (action == "components.replace") {
    if (!uuid(id) || !body.isObject() || !body["components"].isArray())
      co_return fail("validation_error", "Asset group ID and components array required.");
    const auto lock = co_await db->execSqlCoro(
        "SELECT id FROM fwm_asset_groups WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR UPDATE",
        who.tenantId, id);
    if (lock.empty())
      co_return fail("not_found", "Asset group not found.");
    std::string err;
    for (auto &c : body["components"]) {
      if (!allowedFields(c, {"componentType", "slotLabel", "expectedLifeHours", "isRequired", "notes"}, err) ||
          !validText(c, "componentType", 60, err, true) || !validText(c, "slotLabel", 80, err) ||
          !validDec(c, "expectedLifeHours", err, "0") || !validBool(c, "isRequired", err, true) ||
          !validText(c, "notes", 500, err))
        co_return fail("validation_error", err);
    }
    co_await db->execSqlCoro(
        "UPDATE fwm_asset_group_components SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3::uuid "
        "WHERE tenant_id=$1 AND asset_group_id=$2::uuid AND is_deleted=false",
        who.tenantId, id, who.userId);
    for (const auto &c : body["components"]) {
      co_await db->execSqlCoro(
          "INSERT INTO fwm_asset_group_components(tenant_id,asset_group_id,component_type,slot_label,"
          "expected_life_hours,is_required,notes,created_by_user_id) "
          "VALUES($1::uuid,$2::uuid,$3,$4,($5::text)::numeric,$6,$7,$8::uuid)",
          who.tenantId, id, c["componentType"].asString(), c["slotLabel"].asString(),
          c["expectedLifeHours"].asString(), c["isRequired"].asBool(), c["notes"].asString(), who.userId);
    }
    co_return co_await fetchAssetGroup(db, who, canWrite, id);
  }
  if (action != "create" && action != "update")
    co_return fail("validation_error", "Unsupported asset-groups action.");
  const bool isUpdate = action == "update";
  if (isUpdate && !uuid(id))
    co_return fail("validation_error", "Valid asset group UUID required.");
  std::string err;
  std::set<std::string> allowed{
      "code", "model", "modelType", "assetClass", "assetType", "defaultTriggerMetric",
      "serviceFrequency", "serviceDowntimeHours", "majorServiceFrequency",
      "majorServiceDowntimeHours", "tolerance", "routineServiceDelay",
      "weekdayUtilization", "weekdayDays", "saturdayUtilization", "sundayUtilization",
      "description", "isActive"};
  if (isUpdate)
    allowed.insert("version");
  if (!allowedFields(body, allowed, err))
    co_return fail("validation_error", err);
  if (isUpdate && (!body["version"].isInt() || body["version"].asInt() < 1))
    co_return fail("validation_error", "A valid version is required.");
  if (!validText(body, "code", 40, err, true) || !validText(body, "model", 120, err, true) ||
      !validText(body, "modelType", 80, err) ||
      !validEnum(body, "assetClass",
                 {"heavy_equipment", "light_vehicle", "trailer", "stationary_plant", "mining_equipment", "other"},
                 err, "heavy_equipment") ||
      !validEnum(body, "assetType",
                 {"excavator", "dump_truck", "dozer", "grader", "wheel_loader", "forklift", "pickup",
                  "truck_head", "trailer", "crane", "service_van", "other"},
                 err, "dump_truck") ||
      !validEnum(body, "defaultTriggerMetric", {"hours", "kilometers", "miles", "tonnes", "dates"},
                 err, "hours") ||
      !validDec(body, "serviceFrequency", err, "250") ||
      !validDec(body, "serviceDowntimeHours", err, "4") ||
      !validDec(body, "majorServiceFrequency", err, "1000") ||
      !validDec(body, "majorServiceDowntimeHours", err, "12") ||
      !validDec(body, "tolerance", err, "25") ||
      !validDec(body, "routineServiceDelay", err, "0") ||
      !validDec(body, "weekdayUtilization", err, "10") ||
      !validDec(body, "saturdayUtilization", err, "8") ||
      !validDec(body, "sundayUtilization", err, "0") ||
      !validText(body, "description", 500, err) || !validBool(body, "isActive", err, true))
    co_return fail("validation_error", err);
  if (body["weekdayDays"].isNull())
    body["weekdayDays"] = 5;
  if (!body["weekdayDays"].isInt() || body["weekdayDays"].asInt() < 0 || body["weekdayDays"].asInt() > 5)
    co_return fail("validation_error", "weekdayDays must be between 0 and 5.");

  if (!isUpdate) {
    const auto saved = co_await db->execSqlCoro(
        "INSERT INTO fwm_asset_groups(tenant_id,code,model,model_type,asset_class,asset_type,"
        "default_trigger_metric,service_frequency,service_downtime_hours,major_service_frequency,"
        "major_service_downtime_hours,tolerance,routine_service_delay,weekday_utilization,"
        "weekday_days,saturday_utilization,sunday_utilization,description,is_active,created_by_user_id) "
        "SELECT $1::uuid,$2::jsonb->>'code',$2::jsonb->>'model',$2::jsonb->>'modelType',"
        "$2::jsonb->>'assetClass',$2::jsonb->>'assetType',$2::jsonb->>'defaultTriggerMetric',"
        "($2::jsonb->>'serviceFrequency')::numeric,($2::jsonb->>'serviceDowntimeHours')::numeric,"
        "($2::jsonb->>'majorServiceFrequency')::numeric,($2::jsonb->>'majorServiceDowntimeHours')::numeric,"
        "($2::jsonb->>'tolerance')::numeric,($2::jsonb->>'routineServiceDelay')::numeric,"
        "($2::jsonb->>'weekdayUtilization')::numeric,($2::jsonb->>'weekdayDays')::smallint,"
        "($2::jsonb->>'saturdayUtilization')::numeric,($2::jsonb->>'sundayUtilization')::numeric,"
        "$2::jsonb->>'description',($2::jsonb->>'isActive')::boolean,$3::uuid RETURNING id",
        who.tenantId, json(body), who.userId);
    co_return co_await fetchAssetGroup(db, who, canWrite, saved[0]["id"].as<std::string>());
  }
  const auto updated = co_await db->execSqlCoro(
      "UPDATE fwm_asset_groups SET code=$3::jsonb->>'code',model=$3::jsonb->>'model',"
      "model_type=$3::jsonb->>'modelType',asset_class=$3::jsonb->>'assetClass',"
      "asset_type=$3::jsonb->>'assetType',default_trigger_metric=$3::jsonb->>'defaultTriggerMetric',"
      "service_frequency=($3::jsonb->>'serviceFrequency')::numeric,"
      "service_downtime_hours=($3::jsonb->>'serviceDowntimeHours')::numeric,"
      "major_service_frequency=($3::jsonb->>'majorServiceFrequency')::numeric,"
      "major_service_downtime_hours=($3::jsonb->>'majorServiceDowntimeHours')::numeric,"
      "tolerance=($3::jsonb->>'tolerance')::numeric,"
      "routine_service_delay=($3::jsonb->>'routineServiceDelay')::numeric,"
      "weekday_utilization=($3::jsonb->>'weekdayUtilization')::numeric,"
      "weekday_days=($3::jsonb->>'weekdayDays')::smallint,"
      "saturday_utilization=($3::jsonb->>'saturdayUtilization')::numeric,"
      "sunday_utilization=($3::jsonb->>'sundayUtilization')::numeric,"
      "description=$3::jsonb->>'description',is_active=($3::jsonb->>'isActive')::boolean,"
      "last_modified_at=now(),last_modified_by_user_id=$4::uuid,version=version+1 "
      "WHERE tenant_id=$1 AND id=$2::uuid AND version=$5 AND is_deleted=false RETURNING id",
      who.tenantId, id, json(body), who.userId, body["version"].asInt());
  if (updated.empty())
    co_return fail("conflict", "Asset group not found or modified concurrently.");
  co_return co_await fetchAssetGroup(db, who, canWrite, id);
}

drogon::Task<dto::BaseApiResponse>
procedures(DbClientPtr db, const std::string &action, const std::string &id, Json::Value body,
           int page, int size, const std::string &query, const utils::AuditIdentity &who,
           bool canWrite) {
  const std::string q = search(query);
  const char *selectOne = R"(
SELECT jsonb_build_object('id',p.id,'version',p.version,'pcode',p.pcode,'description',p.description,
'procedureText',p.procedure_text,'checklistItems',p.checklist_items,'serviceCategory',p.service_category,
'estimatedHours',p.estimated_hours::text,'assetGroupId',p.asset_group_id,
'assetGroupCode',COALESCE(g.code,''),'status',p.status)::text AS record
FROM fwm_procedures p LEFT JOIN fwm_asset_groups g ON g.tenant_id=p.tenant_id AND g.id=p.asset_group_id AND g.is_deleted=false)";

  if (action == "list") {
    const auto cnt = co_await db->execSqlCoro(
        "SELECT count(*) AS total FROM fwm_procedures WHERE tenant_id=$1 AND is_deleted=false "
        "AND ($2='' OR strpos(lower(pcode||' '||description),lower($2))>0)",
        who.tenantId, q);
    const auto rows = co_await db->execSqlCoro(
        std::string(selectOne) +
            " WHERE p.tenant_id=$1 AND p.is_deleted=false "
            "AND ($2='' OR strpos(lower(p.pcode||' '||p.description),lower($2))>0) "
            "ORDER BY lower(p.pcode), p.id LIMIT $3 OFFSET $4",
        who.tenantId, q, size, static_cast<long long>(page - 1) * size);
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
      co_return fail("validation_error", "Valid procedure UUID required.");
    const auto rows = co_await db->execSqlCoro(
        std::string(selectOne) + " WHERE p.tenant_id=$1 AND p.id=$2::uuid AND p.is_deleted=false",
        who.tenantId, id);
    if (rows.empty())
      co_return fail("not_found", "Procedure not found.");
    auto out = parse(rows[0]["record"].as<std::string>());
    out["canWrite"] = canWrite;
    co_return okRecord(out);
  }
  if (action == "delete") {
    if (!uuid(id) || !body.isObject() || !body["version"].isInt() || body["version"].asInt() < 1)
      co_return fail("validation_error", "Procedure ID and version required.");
    const auto del = co_await db->execSqlCoro(
        "UPDATE fwm_procedures SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3::uuid,"
        "version=version+1 WHERE tenant_id=$1 AND id=$2::uuid AND version=$4 AND is_deleted=false RETURNING id",
        who.tenantId, id, who.userId, body["version"].asInt());
    if (del.empty())
      co_return fail("conflict", "Procedure not found or changed.");
    Json::Value res;
    res["id"] = id;
    res["isDeleted"] = true;
    co_return okRecord(res);
  }
  if (action != "create" && action != "update")
    co_return fail("validation_error", "Unsupported procedures action.");
  const bool isUpdate = action == "update";
  if (isUpdate && !uuid(id))
    co_return fail("validation_error", "Valid procedure UUID required.");
  std::string err;
  std::set<std::string> allowed{"pcode", "description", "procedureText", "checklistItems",
                                "serviceCategory", "estimatedHours", "assetGroupId", "status"};
  if (isUpdate)
    allowed.insert("version");
  if (!allowedFields(body, allowed, err))
    co_return fail("validation_error", err);
  if (isUpdate && (!body["version"].isInt() || body["version"].asInt() < 1))
    co_return fail("validation_error", "A valid version is required.");
  if (!validText(body, "pcode", 40, err, true) || !validText(body, "description", 300, err, true) ||
      !validText(body, "procedureText", 20000, err) ||
      !validEnum(body, "serviceCategory", {"service", "major_service", "repairs", "warranty", "inspection"},
                 err, "service") ||
      !validDec(body, "estimatedHours", err, "0") || !validUuidOpt(body, "assetGroupId", err) ||
      !validEnum(body, "status", {"active", "inactive"}, err, "active"))
    co_return fail("validation_error", err);
  if (body["checklistItems"].isNull())
    body["checklistItems"] = Json::arrayValue;
  if (!body["checklistItems"].isArray())
    co_return fail("validation_error", "checklistItems must be an array.");
  if (!isUpdate) {
    const auto saved = co_await db->execSqlCoro(
        "INSERT INTO fwm_procedures(tenant_id,pcode,description,procedure_text,checklist_items,"
        "service_category,estimated_hours,asset_group_id,status,created_by_user_id) "
        "SELECT $1::uuid,$2::jsonb->>'pcode',$2::jsonb->>'description',$2::jsonb->>'procedureText',"
        "$2::jsonb->'checklistItems',$2::jsonb->>'serviceCategory',($2::jsonb->>'estimatedHours')::numeric,"
        "($2::jsonb->>'assetGroupId')::uuid,$2::jsonb->>'status',$3::uuid RETURNING id",
        who.tenantId, json(body), who.userId);
    const auto rows = co_await db->execSqlCoro(
        std::string(selectOne) + " WHERE p.tenant_id=$1 AND p.id=$2::uuid AND p.is_deleted=false",
        who.tenantId, saved[0]["id"].as<std::string>());
    co_return okRecord(parse(rows[0]["record"].as<std::string>()));
  }
  const auto updated = co_await db->execSqlCoro(
      "UPDATE fwm_procedures SET pcode=$3::jsonb->>'pcode',description=$3::jsonb->>'description',"
      "procedure_text=$3::jsonb->>'procedureText',checklist_items=$3::jsonb->'checklistItems',"
      "service_category=$3::jsonb->>'serviceCategory',estimated_hours=($3::jsonb->>'estimatedHours')::numeric,"
      "asset_group_id=($3::jsonb->>'assetGroupId')::uuid,status=$3::jsonb->>'status',"
      "last_modified_at=now(),last_modified_by_user_id=$4::uuid,version=version+1 "
      "WHERE tenant_id=$1 AND id=$2::uuid AND version=$5 AND is_deleted=false RETURNING id",
      who.tenantId, id, json(body), who.userId, body["version"].asInt());
  if (updated.empty())
    co_return fail("conflict", "Procedure not found or modified concurrently.");
  const auto rows = co_await db->execSqlCoro(
      std::string(selectOne) + " WHERE p.tenant_id=$1 AND p.id=$2::uuid AND p.is_deleted=false",
      who.tenantId, id);
  co_return okRecord(parse(rows[0]["record"].as<std::string>()));
}

drogon::Task<dto::BaseApiResponse>
fetchVehicle(DbClientPtr db, const utils::AuditIdentity &who, bool canWrite,
             const std::string &vid) {
  const auto head = co_await db->execSqlCoro(
      "SELECT jsonb_build_object('id',v.id,'version',v.version,'accountingUnitId',v.accounting_unit_id,"
      "'assetNo',v.asset_no,'registrationNo',v.registration_no,'assetGroupId',v.asset_group_id,"
      "'ownershipType',v.ownership_type,'isMiningEquipment',v.is_mining_equipment,"
      "'isHeavyMachinery',v.is_heavy_machinery,'isTrailerUnit',v.is_trailer_unit,"
      "'coupledTrailerId',v.coupled_trailer_id,'departmentName',v.department_name,"
      "'maintenanceDepartmentName',v.maintenance_department_name,'costCenterId',v.cost_center_id,"
      "'logDate',v.log_date,'condition',v.condition,'status',v.status,'makeModel',v.make_model,"
      "'modelNo',v.model_no,'serialNo',v.serial_no,'chassisNo',v.chassis_no,'engineNo',v.engine_no,"
      "'manufactureDate',v.manufacture_date,'purchaseAmount',v.purchase_amount::text,"
      "'purchaseDate',v.purchase_date,'currencyId',v.currency_id,'dateInstalled',v.date_installed,"
      "'vendorSupplierId',v.vendor_supplier_id,'vendorName',v.vendor_name,'customerId',v.customer_id,"
      "'assignedEmployeeId',v.assigned_employee_id,'fixedAssetId',v.fixed_asset_id,"
      "'residualValue',v.residual_value::text,'usefulLifeMonths',v.useful_life_months,"
      "'depreciationMethod',v.depreciation_method,'accumulatedDepreciation',v.accumulated_depreciation::text,"
      "'weekdayUtilization',v.weekday_utilization::text,'weekdayDays',v.weekday_days,"
      "'saturdayUtilization',v.saturday_utilization::text,'sundayUtilization',v.sunday_utilization::text,"
      "'trackFuelConsumption',v.track_fuel_consumption,'idealConsumptionRate',v.ideal_consumption_rate::text,"
      "'consumptionUnit',v.consumption_unit,'toleranceBelowPct',v.tolerance_below_pct::text,"
      "'toleranceAbovePct',v.tolerance_above_pct::text,'useFuelLogForPm',v.use_fuel_log_for_pm,"
      "'primaryMeterUnit',v.primary_meter_unit,'currentMeterReading',v.current_meter_reading::text,"
      "'cumulativeMeterReading',v.cumulative_meter_reading::text,'isMeterStalled',v.is_meter_stalled,"
      "'stalledSinceDate',v.stalled_since_date,'lastMeterLogDate',v.last_meter_log_date,'notes',v.notes)::text AS record "
      "FROM fwm_vehicles v WHERE v.tenant_id=$1 AND v.id=$2::uuid AND v.is_deleted=false",
      who.tenantId, vid);
  if (head.empty())
    co_return fail("not_found", "Vehicle or fleet asset not found.");
  auto out = parse(head[0]["record"].as<std::string>());
  const auto trigs = co_await db->execSqlCoro(
      "SELECT jsonb_build_object('id',t.id,'triggerType',t.trigger_type,"
      "'serviceFrequency',t.service_frequency::text,'serviceDowntimeHours',t.service_downtime_hours::text,"
      "'majorServiceFrequency',t.major_service_frequency::text,"
      "'majorServiceDowntimeHours',t.major_service_downtime_hours::text,"
      "'serviceTolerance',t.service_tolerance::text,'routineServiceDelay',t.routine_service_delay::text,"
      "'lastServiceReading',t.last_service_reading::text,"
      "'lastMajorServiceReading',t.last_major_service_reading::text,"
      "'lastServiceDate',t.last_service_date,'lastMajorServiceDate',t.last_major_service_date,"
      "'isActive',t.is_active)::text AS record FROM fwm_pm_triggers t "
      "WHERE t.tenant_id=$1 AND t.vehicle_id=$2::uuid AND t.is_deleted=false ORDER BY t.trigger_type",
      who.tenantId, vid);
  out["pmTriggers"] = Json::arrayValue;
  for (const auto &row : trigs)
    out["pmTriggers"].append(parse(row["record"].as<std::string>()));
  out["canWrite"] = canWrite;
  co_return okRecord(out);
}

drogon::Task<dto::BaseApiResponse>
vehicles(DbClientPtr db, const std::string &action, const std::string &id, Json::Value body,
         int page, int size, const std::string &query, const std::string &unitId,
         const utils::AuditIdentity &who, bool canWrite) {
  if (action == "options") {
    const auto units = co_await db->execSqlCoro(
        "SELECT id, code, name, base_currency_id FROM core_accounting_units "
        "WHERE tenant_id=$1 AND is_deleted=false AND is_active=true ORDER BY code, id",
        who.tenantId);
    const auto groups = co_await db->execSqlCoro(
        "SELECT id, code, model, asset_class, asset_type FROM fwm_asset_groups "
        "WHERE tenant_id=$1 AND is_deleted=false AND is_active=true ORDER BY lower(code), id",
        who.tenantId);
    const auto centers = co_await db->execSqlCoro(
        "SELECT id, name FROM core_cost_centers WHERE tenant_id=$1 AND is_deleted=false ORDER BY lower(name)",
        who.tenantId);
    const auto emps = co_await db->execSqlCoro(
        "SELECT id, employee_identifier, concat_ws(' ',first_name,NULLIF(other_name,''),last_name) AS name "
        "FROM hr_employee_biodata WHERE tenant_id=$1 AND is_deleted=false ORDER BY lower(first_name), lower(last_name)",
        who.tenantId);
    const auto sups = co_await db->execSqlCoro(
        "SELECT id, account_number, name FROM core_suppliers WHERE tenant_id=$1 AND is_deleted=false ORDER BY lower(name)",
        who.tenantId);
    const auto custs = co_await db->execSqlCoro(
        "SELECT id, account_number, name FROM core_customers WHERE tenant_id=$1 AND is_deleted=false ORDER BY lower(name)",
        who.tenantId);
    const auto trailers = co_await db->execSqlCoro(
        "SELECT id, asset_no, registration_no FROM fwm_vehicles WHERE tenant_id=$1 AND is_deleted=false "
        "AND is_trailer_unit=true ORDER BY asset_no",
        who.tenantId);
    const auto currs = co_await db->execSqlCoro(
        "SELECT id, code, name FROM core_currencies WHERE is_deleted=false AND is_active=true ORDER BY code");
    Json::Value out;
    auto pushList = [](Json::Value &target, const drogon::orm::Result &rows,
                       const std::vector<std::pair<const char *, const char *>> &cols) {
      target = Json::arrayValue;
      for (const auto &row : rows) {
        Json::Value item;
        for (const auto &c : cols)
          item[c.first] = row[c.second].as<std::string>();
        target.append(item);
      }
    };
    pushList(out["accountingUnits"], units,
             {{"id", "id"}, {"code", "code"}, {"name", "name"}, {"baseCurrencyId", "base_currency_id"}});
    pushList(out["assetGroups"], groups,
             {{"id", "id"}, {"code", "code"}, {"model", "model"}, {"assetClass", "asset_class"}, {"assetType", "asset_type"}});
    pushList(out["costCenters"], centers, {{"id", "id"}, {"name", "name"}});
    pushList(out["employees"], emps, {{"id", "id"}, {"employeeIdentifier", "employee_identifier"}, {"name", "name"}});
    pushList(out["suppliers"], sups, {{"id", "id"}, {"accountNumber", "account_number"}, {"name", "name"}});
    pushList(out["customers"], custs, {{"id", "id"}, {"accountNumber", "account_number"}, {"name", "name"}});
    pushList(out["trailers"], trailers, {{"id", "id"}, {"assetNo", "asset_no"}, {"registrationNo", "registration_no"}});
    pushList(out["currencies"], currs, {{"id", "id"}, {"code", "code"}, {"name", "name"}});
    co_return okRecord(out);
  }
  if (action == "next-number") {
    std::string unit = lower(trim(unitId));
    if (!uuid(unit)) {
      const auto def = co_await db->execSqlCoro(resolveEffectiveUnitSql(), who.tenantId);
      if (def.empty())
        co_return fail("not_found", "Active accounting unit required.");
      unit = def[0]["id"].as<std::string>();
    }
    const auto row = co_await db->execSqlCoro(
        "SELECT COALESCE(prefix,'EQ') AS prefix, COALESCE(padding,4) AS padding, COALESCE(next_number,1) AS next_number "
        "FROM fwm_document_sequences WHERE tenant_id=$1 AND accounting_unit_id=$2::uuid AND document_type='asset_no'",
        who.tenantId, unit);
    std::string prefix = "EQ";
    int pad = 4;
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
    out["nextNumber"] = prefix + (prefix.empty() ? "" : "-") + s;
    co_return okRecord(out);
  }
  const std::string q = search(query);
  const std::string unit = lower(trim(unitId));
  const std::string unitScope = uuidOrEmpty(unit);
  if (action == "list") {
    const auto cnt = co_await db->execSqlCoro(
        "SELECT count(*) AS total FROM fwm_vehicles v WHERE v.tenant_id=$1 AND v.is_deleted=false "
        "AND ($2='' OR v.accounting_unit_id=$2::uuid) "
        "AND ($3='' OR strpos(lower(v.asset_no||' '||v.registration_no||' '||v.make_model),lower($3))>0)",
        who.tenantId, unitScope, q);
    const auto rows = co_await db->execSqlCoro(
        "SELECT jsonb_build_object('id',v.id,'version',v.version,'accountingUnitId',v.accounting_unit_id,"
        "'assetNo',v.asset_no,'registrationNo',v.registration_no,'assetGroupId',v.asset_group_id,"
        "'assetGroupCode',COALESCE(g.code,''),'assetClass',COALESCE(g.asset_class,''),"
        "'assetType',COALESCE(g.asset_type,''),'ownershipType',v.ownership_type,"
        "'isHeavyMachinery',v.is_heavy_machinery,'isMiningEquipment',v.is_mining_equipment,"
        "'isTrailerUnit',v.is_trailer_unit,'coupledTrailerId',v.coupled_trailer_id,"
        "'condition',v.condition,'status',v.status,'makeModel',v.make_model,'serialNo',v.serial_no,"
        "'primaryMeterUnit',v.primary_meter_unit,'currentMeterReading',v.current_meter_reading::text,"
        "'cumulativeMeterReading',v.cumulative_meter_reading::text,'isMeterStalled',v.is_meter_stalled,"
        "'idealConsumptionRate',v.ideal_consumption_rate::text,'consumptionUnit',v.consumption_unit,"
        "'purchaseAmount',v.purchase_amount::text,'purchaseDate',v.purchase_date,"
        "'fixedAssetId',v.fixed_asset_id,'customerId',v.customer_id,'customerName',COALESCE(cu.name,''),"
        "'assignedEmployeeId',v.assigned_employee_id,"
        "'assignedEmployeeName',COALESCE(concat_ws(' ',e.first_name,e.last_name),''),"
        "'costCenterId',v.cost_center_id,'costCenterName',COALESCE(cc.name,''))::text AS record "
        "FROM fwm_vehicles v "
        "LEFT JOIN fwm_asset_groups g ON g.tenant_id=v.tenant_id AND g.id=v.asset_group_id AND g.is_deleted=false "
        "LEFT JOIN core_customers cu ON cu.tenant_id=v.tenant_id AND cu.id=v.customer_id AND cu.is_deleted=false "
        "LEFT JOIN hr_employee_biodata e ON e.tenant_id=v.tenant_id AND e.id=v.assigned_employee_id AND e.is_deleted=false "
        "LEFT JOIN core_cost_centers cc ON cc.tenant_id=v.tenant_id AND cc.id=v.cost_center_id AND cc.is_deleted=false "
        "WHERE v.tenant_id=$1 AND v.is_deleted=false AND ($2='' OR v.accounting_unit_id=$2::uuid) "
        "AND ($3='' OR strpos(lower(v.asset_no||' '||v.registration_no||' '||v.make_model),lower($3))>0) "
        "ORDER BY v.asset_no, v.id LIMIT $4 OFFSET $5",
        who.tenantId, unitScope, q, size, static_cast<long long>(page - 1) * size);
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
      co_return fail("validation_error", "Valid vehicle UUID required.");
    co_return co_await fetchVehicle(db, who, canWrite, id);
  }
  if (action == "delete") {
    if (!uuid(id) || !body.isObject() || !body["version"].isInt() || body["version"].asInt() < 1)
      co_return fail("validation_error", "Vehicle ID and current version required.");
    const auto jobs = co_await db->execSqlCoro(
        "SELECT 1 FROM fwm_job_cards WHERE tenant_id=$1 AND vehicle_id=$2::uuid AND is_deleted=false LIMIT 1",
        who.tenantId, id);
    if (!jobs.empty())
      co_return fail("conflict", "Vehicle has workshop job cards; mark it inactive or decommissioned instead.");
    const auto del = co_await db->execSqlCoro(
        "UPDATE fwm_vehicles SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3::uuid,"
        "version=version+1 WHERE tenant_id=$1 AND id=$2::uuid AND version=$4 AND is_deleted=false RETURNING id",
        who.tenantId, id, who.userId, body["version"].asInt());
    if (del.empty())
      co_return fail("conflict", "Vehicle not found or modified concurrently.");
    Json::Value res;
    res["id"] = id;
    res["isDeleted"] = true;
    co_return okRecord(res);
  }
  if (action == "pm-triggers.list") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid vehicle UUID required.");
    const auto rows = co_await db->execSqlCoro(
        "SELECT jsonb_build_object('id',t.id,'triggerType',t.trigger_type,"
        "'serviceFrequency',t.service_frequency::text,'serviceDowntimeHours',t.service_downtime_hours::text,"
        "'majorServiceFrequency',t.major_service_frequency::text,'majorServiceDowntimeHours',t.major_service_downtime_hours::text,"
        "'serviceTolerance',t.service_tolerance::text,'routineServiceDelay',t.routine_service_delay::text,"
        "'lastServiceReading',t.last_service_reading::text,'lastMajorServiceReading',t.last_major_service_reading::text,"
        "'lastServiceDate',t.last_service_date,'lastMajorServiceDate',t.last_major_service_date,'isActive',t.is_active)::text AS record "
        "FROM fwm_pm_triggers t WHERE t.tenant_id=$1 AND t.vehicle_id=$2::uuid AND t.is_deleted=false "
        "ORDER BY t.trigger_type",
        who.tenantId, id);
    dto::BaseApiResponse r;
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.result["canWrite"] = canWrite;
    r.success = true;
    co_return r;
  }
  if (action == "pm-triggers.replace") {
    if (!uuid(id) || !body.isObject() || !body["pmTriggers"].isArray())
      co_return fail("validation_error", "Vehicle ID and pmTriggers array required.");
    const auto lock = co_await db->execSqlCoro(
        "SELECT id FROM fwm_vehicles WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR UPDATE",
        who.tenantId, id);
    if (lock.empty())
      co_return fail("not_found", "Vehicle not found.");
    std::string err;
    for (auto &t : body["pmTriggers"]) {
      if (!allowedFields(t, {"triggerType", "serviceFrequency", "serviceDowntimeHours",
                             "majorServiceFrequency", "majorServiceDowntimeHours",
                             "serviceTolerance", "routineServiceDelay", "lastServiceReading",
                             "lastMajorServiceReading", "lastServiceDate", "lastMajorServiceDate",
                             "isActive"},
                         err) ||
          !validEnum(t, "triggerType", {"hours", "kilometers", "miles", "tonnes", "dates"}, err) ||
          !validDec(t, "serviceFrequency", err, "250", true) ||
          !validDec(t, "serviceDowntimeHours", err, "4") ||
          !validDec(t, "majorServiceFrequency", err, "0") ||
          !validDec(t, "majorServiceDowntimeHours", err, "12") ||
          !validDec(t, "serviceTolerance", err, "0") ||
          !validDec(t, "routineServiceDelay", err, "0") ||
          !validDec(t, "lastServiceReading", err, "0") ||
          !validDec(t, "lastMajorServiceReading", err, "0") ||
          !validDate(t, "lastServiceDate", err, false) ||
          !validDate(t, "lastMajorServiceDate", err, false) ||
          !validBool(t, "isActive", err, true))
        co_return fail("validation_error", err);
    }
    co_await db->execSqlCoro(
        "UPDATE fwm_pm_triggers SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3::uuid "
        "WHERE tenant_id=$1 AND vehicle_id=$2::uuid AND is_deleted=false",
        who.tenantId, id, who.userId);
    for (const auto &t : body["pmTriggers"]) {
      co_await db->execSqlCoro(
          "INSERT INTO fwm_pm_triggers(tenant_id,vehicle_id,trigger_type,service_frequency,"
          "service_downtime_hours,major_service_frequency,major_service_downtime_hours,"
          "service_tolerance,routine_service_delay,last_service_reading,last_major_service_reading,"
          "last_service_date,last_major_service_date,is_active,created_by_user_id) "
          "SELECT $1::uuid,$2::uuid,$3::jsonb->>'triggerType',($3::jsonb->>'serviceFrequency')::numeric,"
          "($3::jsonb->>'serviceDowntimeHours')::numeric,($3::jsonb->>'majorServiceFrequency')::numeric,"
          "($3::jsonb->>'majorServiceDowntimeHours')::numeric,($3::jsonb->>'serviceTolerance')::numeric,"
          "($3::jsonb->>'routineServiceDelay')::numeric,($3::jsonb->>'lastServiceReading')::numeric,"
          "($3::jsonb->>'lastMajorServiceReading')::numeric,NULLIF($3::jsonb->>'lastServiceDate','')::date,"
          "NULLIF($3::jsonb->>'lastMajorServiceDate','')::date,($3::jsonb->>'isActive')::boolean,$4::uuid",
          who.tenantId, id, json(t), who.userId);
    }
    co_return co_await fetchVehicle(db, who, canWrite, id);
  }
  if (action == "handoff-fa" || action == "fa-handoff") {
    if (!uuid(id))
      co_return fail("validation_error", "Valid vehicle UUID required.");
    const auto veh = co_await db->execSqlCoro(
        "SELECT id, accounting_unit_id, asset_no, registration_no, ownership_type, make_model, serial_no, "
        "purchase_amount::text AS purchase_amount, purchase_date::text AS purchase_date, currency_id, "
        "date_installed::text AS date_installed, cost_center_id, fixed_asset_id, "
        "residual_value::text AS residual_value, useful_life_months, depreciation_method, "
        "accumulated_depreciation::text AS accumulated_depreciation, primary_meter_unit, "
        "cumulative_meter_reading::text AS cumulative_meter_reading "
        "FROM fwm_vehicles WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR UPDATE",
        who.tenantId, id);
    if (veh.empty())
      co_return fail("not_found", "Vehicle not found.");
    if (veh[0]["ownership_type"].as<std::string>() != "company_owned")
      co_return fail("conflict", "Only company-owned vehicles register in Fixed Assets.");
    std::string currencyId = optCol(veh[0], "currency_id");
    if (currencyId.empty())
      currencyId = co_await resolveUnitCurrency(db, who, veh[0]["accounting_unit_id"].as<std::string>());
    Json::Value payload;
    payload["vehicleId"] = id;
    payload["assetNo"] = veh[0]["asset_no"].as<std::string>();
    payload["registrationNo"] = veh[0]["registration_no"].as<std::string>();
    payload["makeModel"] = veh[0]["make_model"].as<std::string>();
    payload["serialNo"] = veh[0]["serial_no"].as<std::string>();
    payload["purchaseAmount"] = veh[0]["purchase_amount"].as<std::string>();
    payload["purchaseDate"] = optCol(veh[0], "purchase_date");
    payload["dateInstalled"] = optCol(veh[0], "date_installed");
    payload["costCenterId"] = optCol(veh[0], "cost_center_id");
    payload["residualValue"] = veh[0]["residual_value"].as<std::string>();
    payload["usefulLifeMonths"] = veh[0]["useful_life_months"].as<int>();
    payload["depreciationMethod"] = veh[0]["depreciation_method"].as<std::string>();
    payload["accumulatedDepreciation"] = veh[0]["accumulated_depreciation"].as<std::string>();
    payload["meterUnit"] = veh[0]["primary_meter_unit"].as<std::string>();
    payload["cumulativeMeterReading"] = veh[0]["cumulative_meter_reading"].as<std::string>();
    const auto linkId = co_await upsertCrossModuleLink(
        db, who, veh[0]["accounting_unit_id"].as<std::string>(), "vehicle", id, "fixed_assets",
        "vehicle_asset_sync", optCol(veh[0], "fixed_asset_id"),
        veh[0]["asset_no"].as<std::string>(), "staged", veh[0]["purchase_amount"].as<std::string>(),
        currencyId, "", payload, "fa_vehicle_" + id);
    Json::Value res;
    res["handoffLinkId"] = linkId;
    res["targetModule"] = "fixed_assets";
    res["handoffStatus"] = "staged";
    res["payload"] = payload;
    co_return okRecord(res);
  }
  if (action != "create" && action != "update")
    co_return fail("validation_error", "Unsupported vehicles action.");
  const bool isUpdate = action == "update";
  if (isUpdate && !uuid(id))
    co_return fail("validation_error", "Valid vehicle UUID required.");

  std::string err;
  std::set<std::string> allowed{
      "accountingUnitId", "assetNo", "registrationNo", "assetGroupId", "ownershipType",
      "isMiningEquipment", "isHeavyMachinery", "isTrailerUnit", "coupledTrailerId",
      "departmentName", "maintenanceDepartmentName", "costCenterId", "logDate", "condition",
      "status", "makeModel", "modelNo", "serialNo", "chassisNo", "engineNo", "manufactureDate",
      "purchaseAmount", "purchaseDate", "currencyId", "dateInstalled", "vendorSupplierId",
      "vendorName", "customerId", "assignedEmployeeId", "fixedAssetId", "residualValue",
      "usefulLifeMonths", "depreciationMethod", "accumulatedDepreciation", "weekdayUtilization",
      "weekdayDays", "saturdayUtilization", "sundayUtilization", "trackFuelConsumption",
      "idealConsumptionRate", "consumptionUnit", "toleranceBelowPct", "toleranceAbovePct",
      "useFuelLogForPm", "primaryMeterUnit", "currentMeterReading", "cumulativeMeterReading",
      "notes"};
  if (isUpdate)
    allowed.insert("version");
  if (!allowedFields(body, allowed, err))
    co_return fail("validation_error", err);
  if (isUpdate && (!body["version"].isInt() || body["version"].asInt() < 1))
    co_return fail("validation_error", "A valid version is required.");
  if (!validUuidOpt(body, "accountingUnitId", err, !isUpdate))
    co_return fail("validation_error", err);
  if (body["accountingUnitId"].isNull() && !unit.empty())
    body["accountingUnitId"] = unit;
  if (!validText(body, "assetNo", 40, err, true) ||
      !validText(body, "registrationNo", 40, err) ||
      !validUuidOpt(body, "assetGroupId", err) ||
      !validEnum(body, "ownershipType", {"company_owned", "hired_equipment", "customer_vehicle"},
                 err, "company_owned") ||
      !validBool(body, "isMiningEquipment", err, false) ||
      !validBool(body, "isHeavyMachinery", err, false) ||
      !validBool(body, "isTrailerUnit", err, false) ||
      !validUuidOpt(body, "coupledTrailerId", err) ||
      !validText(body, "departmentName", 120, err) ||
      !validText(body, "maintenanceDepartmentName", 120, err) ||
      !validUuidOpt(body, "costCenterId", err) || !validDate(body, "logDate", err) ||
      !validEnum(body, "condition", {"excellent", "good", "fair", "poor", "breakdown"}, err, "good") ||
      !validEnum(body, "status", {"active", "inactive", "in_workshop", "decommissioned", "disposed"},
                 err, "active") ||
      !validText(body, "makeModel", 120, err) || !validText(body, "modelNo", 80, err) ||
      !validText(body, "serialNo", 120, err) || !validText(body, "chassisNo", 120, err) ||
      !validText(body, "engineNo", 120, err) || !validDate(body, "manufactureDate", err) ||
      !validDec(body, "purchaseAmount", err, "0") || !validDate(body, "purchaseDate", err) ||
      !validUuidOpt(body, "currencyId", err) || !validDate(body, "dateInstalled", err) ||
      !validUuidOpt(body, "vendorSupplierId", err) || !validText(body, "vendorName", 160, err) ||
      !validUuidOpt(body, "customerId", err) || !validUuidOpt(body, "assignedEmployeeId", err) ||
      !validUuidOpt(body, "fixedAssetId", err) || !validDec(body, "residualValue", err, "0") ||
      !validEnum(body, "depreciationMethod",
                 {"none", "straight_line", "declining_balance", "units_of_production"}, err, "straight_line") ||
      !validDec(body, "accumulatedDepreciation", err, "0") ||
      !validDec(body, "weekdayUtilization", err, "10") ||
      !validDec(body, "saturdayUtilization", err, "8") ||
      !validDec(body, "sundayUtilization", err, "0") ||
      !validBool(body, "trackFuelConsumption", err, true) ||
      !validDec(body, "idealConsumptionRate", err, "0") ||
      !validEnum(body, "consumptionUnit", {"litres_per_hour", "litres_per_100km", "km_per_litre"},
                 err, "litres_per_hour") ||
      !validDec(body, "toleranceBelowPct", err, "10") ||
      !validDec(body, "toleranceAbovePct", err, "10") ||
      !validBool(body, "useFuelLogForPm", err, false) ||
      !validEnum(body, "primaryMeterUnit", {"hours", "kilometers", "miles", "tonnes"}, err, "hours") ||
      !validDec(body, "currentMeterReading", err, "0") ||
      !validDec(body, "cumulativeMeterReading", err, body["currentMeterReading"].asString()) ||
      !validText(body, "notes", 1000, err))
    co_return fail("validation_error", err);
  if (body["usefulLifeMonths"].isNull())
    body["usefulLifeMonths"] = 0;
  if (!body["usefulLifeMonths"].isInt() || body["usefulLifeMonths"].asInt() < 0 ||
      body["usefulLifeMonths"].asInt() > 1200)
    co_return fail("validation_error", "usefulLifeMonths must be between 0 and 1200.");
  if (body["weekdayDays"].isNull())
    body["weekdayDays"] = 5;
  if (!body["weekdayDays"].isInt() || body["weekdayDays"].asInt() < 0 || body["weekdayDays"].asInt() > 5)
    co_return fail("validation_error", "weekdayDays must be between 0 and 5.");

  if (!isUpdate) {
    if (body["accountingUnitId"].isNull())
      co_return fail("validation_error", "accountingUnitId is required.");
    const auto saved = co_await db->execSqlCoro(
        "INSERT INTO fwm_vehicles(tenant_id,accounting_unit_id,asset_no,registration_no,asset_group_id,"
        "ownership_type,is_mining_equipment,is_heavy_machinery,is_trailer_unit,coupled_trailer_id,"
        "department_name,maintenance_department_name,cost_center_id,log_date,condition,status,"
        "make_model,model_no,serial_no,chassis_no,engine_no,manufacture_date,purchase_amount,"
        "purchase_date,currency_id,date_installed,vendor_supplier_id,vendor_name,customer_id,"
        "assigned_employee_id,fixed_asset_id,residual_value,useful_life_months,depreciation_method,"
        "accumulated_depreciation,weekday_utilization,weekday_days,saturday_utilization,sunday_utilization,"
        "track_fuel_consumption,ideal_consumption_rate,consumption_unit,tolerance_below_pct,"
        "tolerance_above_pct,use_fuel_log_for_pm,primary_meter_unit,current_meter_reading,"
        "cumulative_meter_reading,notes,created_by_user_id) "
        "SELECT $1::uuid,p.accounting_unit_id,p.asset_no,p.registration_no,p.asset_group_id,"
        "p.ownership_type,p.is_mining_equipment,p.is_heavy_machinery,p.is_trailer_unit,p.coupled_trailer_id,"
        "p.department_name,p.maintenance_department_name,p.cost_center_id,p.log_date,p.condition,p.status,"
        "p.make_model,p.model_no,p.serial_no,p.chassis_no,p.engine_no,p.manufacture_date,p.purchase_amount,"
        "p.purchase_date,p.currency_id,p.date_installed,p.vendor_supplier_id,p.vendor_name,p.customer_id,"
        "p.assigned_employee_id,p.fixed_asset_id,p.residual_value,p.useful_life_months,p.depreciation_method,"
        "p.accumulated_depreciation,p.weekday_utilization,p.weekday_days,p.saturday_utilization,p.sunday_utilization,"
        "p.track_fuel_consumption,p.ideal_consumption_rate,p.consumption_unit,p.tolerance_below_pct,"
        "p.tolerance_above_pct,p.use_fuel_log_for_pm,p.primary_meter_unit,p.current_meter_reading,"
        "p.cumulative_meter_reading,p.notes,$2::uuid "
        "FROM jsonb_populate_record(NULL::fwm_vehicles,jsonb_build_object("
        "'accounting_unit_id',($3::jsonb->>'accountingUnitId')::uuid,'asset_no',$3::jsonb->>'assetNo',"
        "'registration_no',$3::jsonb->>'registrationNo','asset_group_id',($3::jsonb->>'assetGroupId')::uuid,"
        "'ownership_type',$3::jsonb->>'ownershipType','is_mining_equipment',($3::jsonb->>'isMiningEquipment')::boolean,"
        "'is_heavy_machinery',($3::jsonb->>'isHeavyMachinery')::boolean,'is_trailer_unit',($3::jsonb->>'isTrailerUnit')::boolean,"
        "'coupled_trailer_id',($3::jsonb->>'coupledTrailerId')::uuid,'department_name',$3::jsonb->>'departmentName',"
        "'maintenance_department_name',$3::jsonb->>'maintenanceDepartmentName','cost_center_id',($3::jsonb->>'costCenterId')::uuid,"
        "'log_date',NULLIF($3::jsonb->>'logDate','')::date,'condition',$3::jsonb->>'condition','status',$3::jsonb->>'status',"
        "'make_model',$3::jsonb->>'makeModel','model_no',$3::jsonb->>'modelNo','serial_no',$3::jsonb->>'serialNo',"
        "'chassis_no',$3::jsonb->>'chassisNo','engine_no',$3::jsonb->>'engineNo',"
        "'manufacture_date',NULLIF($3::jsonb->>'manufactureDate','')::date,"
        "'purchase_amount',($3::jsonb->>'purchaseAmount')::numeric,'purchase_date',NULLIF($3::jsonb->>'purchaseDate','')::date,"
        "'currency_id',($3::jsonb->>'currencyId')::uuid,'date_installed',NULLIF($3::jsonb->>'dateInstalled','')::date,"
        "'vendor_supplier_id',($3::jsonb->>'vendorSupplierId')::uuid,'vendor_name',$3::jsonb->>'vendorName',"
        "'customer_id',($3::jsonb->>'customerId')::uuid,'assigned_employee_id',($3::jsonb->>'assignedEmployeeId')::uuid,"
        "'fixed_asset_id',($3::jsonb->>'fixedAssetId')::uuid,'residual_value',($3::jsonb->>'residualValue')::numeric,"
        "'useful_life_months',($3::jsonb->>'usefulLifeMonths')::integer,'depreciation_method',$3::jsonb->>'depreciationMethod',"
        "'accumulated_depreciation',($3::jsonb->>'accumulatedDepreciation')::numeric,"
        "'weekday_utilization',($3::jsonb->>'weekdayUtilization')::numeric,'weekday_days',($3::jsonb->>'weekdayDays')::smallint,"
        "'saturday_utilization',($3::jsonb->>'saturdayUtilization')::numeric,'sunday_utilization',($3::jsonb->>'sundayUtilization')::numeric,"
        "'track_fuel_consumption',($3::jsonb->>'trackFuelConsumption')::boolean,'ideal_consumption_rate',($3::jsonb->>'idealConsumptionRate')::numeric,"
        "'consumption_unit',$3::jsonb->>'consumptionUnit','tolerance_below_pct',($3::jsonb->>'toleranceBelowPct')::numeric,"
        "'tolerance_above_pct',($3::jsonb->>'toleranceAbovePct')::numeric,'use_fuel_log_for_pm',($3::jsonb->>'useFuelLogForPm')::boolean,"
        "'primary_meter_unit',$3::jsonb->>'primaryMeterUnit','current_meter_reading',($3::jsonb->>'currentMeterReading')::numeric,"
        "'cumulative_meter_reading',($3::jsonb->>'cumulativeMeterReading')::numeric,'notes',$3::jsonb->>'notes')) p RETURNING id",
        who.tenantId, who.userId, json(body));
    const std::string newId = saved[0]["id"].as<std::string>();
    // Seed default PM trigger from asset group if provided.
    if (!body["assetGroupId"].isNull()) {
      co_await db->execSqlCoro(
          "INSERT INTO fwm_pm_triggers(tenant_id,vehicle_id,trigger_type,service_frequency,"
          "service_downtime_hours,major_service_frequency,major_service_downtime_hours,"
          "service_tolerance,routine_service_delay,created_by_user_id) "
          "SELECT $1::uuid,$2::uuid,default_trigger_metric,GREATEST(service_frequency,1),"
          "service_downtime_hours,major_service_frequency,major_service_downtime_hours,"
          "tolerance,routine_service_delay,$4::uuid FROM fwm_asset_groups "
          "WHERE tenant_id=$1 AND id=$3::uuid AND is_deleted=false AND service_frequency>0",
          who.tenantId, newId, body["assetGroupId"].asString(), who.userId);
    }
    co_return co_await fetchVehicle(db, who, canWrite, newId);
  }

  const auto updated = co_await db->execSqlCoro(
      "UPDATE fwm_vehicles SET asset_no=$3::jsonb->>'assetNo',registration_no=$3::jsonb->>'registrationNo',"
      "asset_group_id=($3::jsonb->>'assetGroupId')::uuid,ownership_type=$3::jsonb->>'ownershipType',"
      "is_mining_equipment=($3::jsonb->>'isMiningEquipment')::boolean,"
      "is_heavy_machinery=($3::jsonb->>'isHeavyMachinery')::boolean,"
      "is_trailer_unit=($3::jsonb->>'isTrailerUnit')::boolean,"
      "coupled_trailer_id=($3::jsonb->>'coupledTrailerId')::uuid,"
      "department_name=$3::jsonb->>'departmentName',maintenance_department_name=$3::jsonb->>'maintenanceDepartmentName',"
      "cost_center_id=($3::jsonb->>'costCenterId')::uuid,log_date=NULLIF($3::jsonb->>'logDate','')::date,"
      "condition=$3::jsonb->>'condition',status=$3::jsonb->>'status',make_model=$3::jsonb->>'makeModel',"
      "model_no=$3::jsonb->>'modelNo',serial_no=$3::jsonb->>'serialNo',chassis_no=$3::jsonb->>'chassisNo',"
      "engine_no=$3::jsonb->>'engineNo',manufacture_date=NULLIF($3::jsonb->>'manufactureDate','')::date,"
      "purchase_amount=($3::jsonb->>'purchaseAmount')::numeric,purchase_date=NULLIF($3::jsonb->>'purchaseDate','')::date,"
      "currency_id=($3::jsonb->>'currencyId')::uuid,date_installed=NULLIF($3::jsonb->>'dateInstalled','')::date,"
      "vendor_supplier_id=($3::jsonb->>'vendorSupplierId')::uuid,vendor_name=$3::jsonb->>'vendorName',"
      "customer_id=($3::jsonb->>'customerId')::uuid,assigned_employee_id=($3::jsonb->>'assignedEmployeeId')::uuid,"
      "fixed_asset_id=($3::jsonb->>'fixedAssetId')::uuid,residual_value=($3::jsonb->>'residualValue')::numeric,"
      "useful_life_months=($3::jsonb->>'usefulLifeMonths')::integer,depreciation_method=$3::jsonb->>'depreciationMethod',"
      "accumulated_depreciation=($3::jsonb->>'accumulatedDepreciation')::numeric,"
      "weekday_utilization=($3::jsonb->>'weekdayUtilization')::numeric,weekday_days=($3::jsonb->>'weekdayDays')::smallint,"
      "saturday_utilization=($3::jsonb->>'saturdayUtilization')::numeric,sunday_utilization=($3::jsonb->>'sundayUtilization')::numeric,"
      "track_fuel_consumption=($3::jsonb->>'trackFuelConsumption')::boolean,"
      "ideal_consumption_rate=($3::jsonb->>'idealConsumptionRate')::numeric,"
      "consumption_unit=$3::jsonb->>'consumptionUnit',tolerance_below_pct=($3::jsonb->>'toleranceBelowPct')::numeric,"
      "tolerance_above_pct=($3::jsonb->>'toleranceAbovePct')::numeric,"
      "use_fuel_log_for_pm=($3::jsonb->>'useFuelLogForPm')::boolean,"
      "primary_meter_unit=$3::jsonb->>'primaryMeterUnit',current_meter_reading=($3::jsonb->>'currentMeterReading')::numeric,"
      "cumulative_meter_reading=($3::jsonb->>'cumulativeMeterReading')::numeric,notes=$3::jsonb->>'notes',"
      "last_modified_at=now(),last_modified_by_user_id=$4::uuid,version=version+1 "
      "WHERE tenant_id=$1 AND id=$2::uuid AND version=$5 AND is_deleted=false RETURNING id",
      who.tenantId, id, json(body), who.userId, body["version"].asInt());
  if (updated.empty())
    co_return fail("conflict", "Vehicle not found or modified concurrently.");
  co_return co_await fetchVehicle(db, who, canWrite, id);
}

drogon::Task<dto::BaseApiResponse>
employees(DbClientPtr db, const std::string &action, const std::string &id, Json::Value body,
          int page, int size, const std::string &query, const utils::AuditIdentity &who,
          bool canWrite) {
  const std::string q = search(query);
  const char *selectSql = R"(
SELECT jsonb_build_object(
 'id', w.id, 'version', w.version, 'employeeId', w.employee_id,
 'employeeIdentifier', e.employee_identifier,
 'employeeName', concat_ws(' ',e.first_name,NULLIF(e.other_name,''),e.last_name),
 'email', COALESCE(e.email,''), 'phone', COALESCE(e.phone_no,''),
 'tradeRole', w.trade_role, 'skillLevel', w.skill_level,
 'hourlyCostRate', w.hourly_cost_rate::text, 'hourlyChargeRate', w.hourly_charge_rate::text,
 'currencyId', w.currency_id, 'bayAssignment', w.bay_assignment,
 'certifications', w.certifications, 'isActive', w.is_active, 'notes', w.notes
)::text AS record
FROM fwm_workshop_employees w
JOIN hr_employee_biodata e ON e.tenant_id=w.tenant_id AND e.id=w.employee_id AND e.is_deleted=false)";

  if (action == "options") {
    const auto emps = co_await db->execSqlCoro(
        "SELECT id, employee_identifier, concat_ws(' ',first_name,NULLIF(other_name,''),last_name) AS name "
        "FROM hr_employee_biodata WHERE tenant_id=$1 AND is_deleted=false ORDER BY lower(first_name), lower(last_name)",
        who.tenantId);
    Json::Value out;
    out["hrEmployees"] = Json::arrayValue;
    for (const auto &row : emps) {
      Json::Value e;
      e["id"] = row["id"].as<std::string>();
      e["employeeIdentifier"] = row["employee_identifier"].as<std::string>();
      e["name"] = row["name"].as<std::string>();
      out["hrEmployees"].append(e);
    }
    co_return okRecord(out);
  }
  if (action == "list") {
    const auto cnt = co_await db->execSqlCoro(
        "SELECT count(*) AS total FROM fwm_workshop_employees w "
        "JOIN hr_employee_biodata e ON e.tenant_id=w.tenant_id AND e.id=w.employee_id AND e.is_deleted=false "
        "WHERE w.tenant_id=$1 AND w.is_deleted=false "
        "AND ($2='' OR strpos(lower(e.first_name||' '||e.last_name||' '||e.employee_identifier||' '||w.trade_role),lower($2))>0)",
        who.tenantId, q);
    const auto rows = co_await db->execSqlCoro(
        std::string(selectSql) +
            " WHERE w.tenant_id=$1 AND w.is_deleted=false "
            "AND ($2='' OR strpos(lower(e.first_name||' '||e.last_name||' '||e.employee_identifier||' '||w.trade_role),lower($2))>0) "
            "ORDER BY lower(e.first_name), lower(e.last_name), w.id LIMIT $3 OFFSET $4",
        who.tenantId, q, size, static_cast<long long>(page - 1) * size);
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
      co_return fail("validation_error", "Valid workshop employee UUID required.");
    const auto rows = co_await db->execSqlCoro(
        std::string(selectSql) + " WHERE w.tenant_id=$1 AND w.id=$2::uuid AND w.is_deleted=false",
        who.tenantId, id);
    if (rows.empty())
      co_return fail("not_found", "Workshop employee not found.");
    auto out = parse(rows[0]["record"].as<std::string>());
    out["canWrite"] = canWrite;
    co_return okRecord(out);
  }
  if (action == "delete") {
    if (!uuid(id) || !body.isObject() || !body["version"].isInt() || body["version"].asInt() < 1)
      co_return fail("validation_error", "ID and current version required.");
    const auto del = co_await db->execSqlCoro(
        "UPDATE fwm_workshop_employees SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3::uuid,"
        "version=version+1 WHERE tenant_id=$1 AND id=$2::uuid AND version=$4 AND is_deleted=false RETURNING id",
        who.tenantId, id, who.userId, body["version"].asInt());
    if (del.empty())
      co_return fail("conflict", "Workshop employee not found or modified concurrently.");
    Json::Value res;
    res["id"] = id;
    res["isDeleted"] = true;
    co_return okRecord(res);
  }
  if (action != "create" && action != "update")
    co_return fail("validation_error", "Unsupported employees action.");
  const bool isUpdate = action == "update";
  if (isUpdate && !uuid(id))
    co_return fail("validation_error", "Valid workshop employee UUID required.");
  std::string err;
  std::set<std::string> allowed{"employeeId", "tradeRole", "skillLevel", "hourlyCostRate",
                                "hourlyChargeRate", "currencyId", "bayAssignment",
                                "certifications", "isActive", "notes"};
  if (isUpdate)
    allowed.insert("version");
  if (!allowedFields(body, allowed, err))
    co_return fail("validation_error", err);
  if (isUpdate && (!body["version"].isInt() || body["version"].asInt() < 1))
    co_return fail("validation_error", "A valid version is required.");
  if (!validUuidOpt(body, "employeeId", err, !isUpdate) ||
      !validEnum(body, "tradeRole",
                 {"mechanic", "electrician", "welder", "auto_body", "tyre_technician",
                  "panel_beater", "machinist", "supervisor", "driver", "apprentice"},
                 err, "mechanic") ||
      !validEnum(body, "skillLevel", {"apprentice", "junior", "journeyman", "senior", "master"},
                 err, "journeyman") ||
      !validDec(body, "hourlyCostRate", err, "0") ||
      !validDec(body, "hourlyChargeRate", err, "0") ||
      !validUuidOpt(body, "currencyId", err) ||
      !validText(body, "bayAssignment", 60, err) ||
      !validBool(body, "isActive", err, true) || !validText(body, "notes", 500, err))
    co_return fail("validation_error", err);
  if (body["certifications"].isNull())
    body["certifications"] = Json::arrayValue;
  if (!body["certifications"].isArray())
    co_return fail("validation_error", "certifications must be an array.");

  if (!isUpdate) {
    const auto hrCheck = co_await db->execSqlCoro(
        "SELECT id FROM hr_employee_biodata WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR SHARE",
        who.tenantId, body["employeeId"].asString());
    if (hrCheck.empty())
      co_return fail("not_found", "HR employee record not found in this tenant.");
    const auto saved = co_await db->execSqlCoro(
        "INSERT INTO fwm_workshop_employees(tenant_id,employee_id,trade_role,skill_level,"
        "hourly_cost_rate,hourly_charge_rate,currency_id,bay_assignment,certifications,"
        "is_active,notes,created_by_user_id) "
        "SELECT $1::uuid,($2::jsonb->>'employeeId')::uuid,$2::jsonb->>'tradeRole',"
        "$2::jsonb->>'skillLevel',($2::jsonb->>'hourlyCostRate')::numeric,"
        "($2::jsonb->>'hourlyChargeRate')::numeric,($2::jsonb->>'currencyId')::uuid,"
        "$2::jsonb->>'bayAssignment',$2::jsonb->'certifications',($2::jsonb->>'isActive')::boolean,"
        "$2::jsonb->>'notes',$3::uuid RETURNING id",
        who.tenantId, json(body), who.userId);
    const auto rows = co_await db->execSqlCoro(
        std::string(selectSql) + " WHERE w.tenant_id=$1 AND w.id=$2::uuid AND w.is_deleted=false",
        who.tenantId, saved[0]["id"].as<std::string>());
    co_return okRecord(parse(rows[0]["record"].as<std::string>()));
  }
  const auto updated = co_await db->execSqlCoro(
      "UPDATE fwm_workshop_employees SET trade_role=$3::jsonb->>'tradeRole',"
      "skill_level=$3::jsonb->>'skillLevel',hourly_cost_rate=($3::jsonb->>'hourlyCostRate')::numeric,"
      "hourly_charge_rate=($3::jsonb->>'hourlyChargeRate')::numeric,"
      "currency_id=($3::jsonb->>'currencyId')::uuid,bay_assignment=$3::jsonb->>'bayAssignment',"
      "certifications=$3::jsonb->'certifications',is_active=($3::jsonb->>'isActive')::boolean,"
      "notes=$3::jsonb->>'notes',last_modified_at=now(),last_modified_by_user_id=$4::uuid,version=version+1 "
      "WHERE tenant_id=$1 AND id=$2::uuid AND version=$5 AND is_deleted=false RETURNING id",
      who.tenantId, id, json(body), who.userId, body["version"].asInt());
  if (updated.empty())
    co_return fail("conflict", "Workshop employee not found or modified concurrently.");
  const auto rows = co_await db->execSqlCoro(
      std::string(selectSql) + " WHERE w.tenant_id=$1 AND w.id=$2::uuid AND w.is_deleted=false",
      who.tenantId, id);
  co_return okRecord(parse(rows[0]["record"].as<std::string>()));
}

} // namespace

drogon::Task<dto::BaseApiResponse>
handleMasterOps(DbClientPtr db, const std::string &resource, const std::string &action,
                const std::string &id, Json::Value body, int page, int size,
                const std::string &query, const std::string &unitId,
                const utils::AuditIdentity &who, bool, bool canWrite) {
  if (resource == "dashboard" && action == "summary")
    co_return co_await dashboardSummary(db, who, unitId);
  if (resource == "gl-settings")
    co_return co_await glSettings(db, action, std::move(body), unitId, who, canWrite);
  if (resource == "asset-groups")
    co_return co_await assetGroups(db, action, id, std::move(body), page, size, query, who, canWrite);
  if (resource == "procedures")
    co_return co_await procedures(db, action, id, std::move(body), page, size, query, who, canWrite);
  if (resource == "vehicles")
    co_return co_await vehicles(db, action, id, std::move(body), page, size, query, unitId, who, canWrite);
  if (resource == "employees")
    co_return co_await employees(db, action, id, std::move(body), page, size, query, who, canWrite);
  co_return fail("validation_error", "Unknown Fleet & Workshop master operation.");
}

} // namespace business_desk::domain_services::fwm_internal
