// Offline service + controller regression suite for Fleet & Workshop Management
// linked against production FleetWorkshop{Controller,Master,Operations,Jobs},
// SupplyChainService, InventoryService/InventoryStock, and JournalService.
#include "controllers/FleetWorkshopController.h"
#include "domain_services/fleet_workshop/FleetWorkshopService.h"
#include "domain_services/permissions/PermissionService.h"
#include <cassert>
#include <cmath>
#include <cstdio>
#include <iostream>
#include <set>
#include <string>
#include <unordered_set>
#include <vector>

using business_desk::domain_services::FleetWorkshopService;
using business_desk::domain_services::PermissionService;
using business_desk::utils::AuditIdentity;

static std::unordered_set<std::string> permissions;

namespace business_desk::domain_services {
drogon::Task<std::unordered_set<std::string>>
PermissionService::getUserPermissions(const std::string &) {
  co_return permissions;
}
} // namespace business_desk::domain_services

namespace {
Json::Value rowObj(std::initializer_list<std::pair<const char *, Json::Value>> fields) {
  Json::Value v(Json::objectValue);
  for (const auto &kv : fields)
    v[kv.first] = kv.second;
  return v;
}

std::string jsonStr(const Json::Value &v) {
  return Json::writeString(Json::StreamWriterBuilder{}, v);
}

drogon::HttpRequestPtr makeReq(drogon::HttpMethod m, const std::string &tenantId,
                               const std::string &userId, const Json::Value *body = nullptr,
                               std::map<std::string, std::string> params = {}) {
  auto req = std::make_shared<drogon::HttpRequest>();
  req->method = m;
  if (!tenantId.empty())
    req->attributes()->insert("tenantId", tenantId);
  if (!userId.empty())
    req->attributes()->insert("tenantUserId", userId);
  if (body)
    req->json = std::make_shared<Json::Value>(*body);
  req->parameters = std::move(params);
  return req;
}
} // namespace

int main() {
  const std::string tenant = "10000000-0000-4000-8000-000000000001";
  const std::string actor = "20000000-0000-4000-8000-000000000001";
  const std::string unit = "30000000-0000-4000-8000-000000000001";
  const std::string curr = "40000000-0000-4000-8000-000000000001";
  const std::string grpId = "50000000-0000-4000-8000-000000000001";
  const std::string vehId = "60000000-0000-4000-8000-000000000001";
  const std::string trailerId = "60000000-0000-4000-8000-000000000002";
  const std::string whId = "70000000-0000-4000-8000-000000000001";
  const std::string itemId = "80000000-0000-4000-8000-000000000001";
  const std::string uomId = "81000000-0000-4000-8000-000000000001";
  const std::string fuelId = "90000000-0000-4000-8000-000000000001";
  const std::string compId = "91000000-0000-4000-8000-000000000001";
  const std::string tyreId = "92000000-0000-4000-8000-000000000001";
  const std::string schId = "93000000-0000-4000-8000-000000000001";
  const std::string jobId = "94000000-0000-4000-8000-000000000001";
  const std::string lineId = "95000000-0000-4000-8000-000000000001";
  const std::string mileId = "96000000-0000-4000-8000-000000000001";
  const std::string diaryId = "97000000-0000-4000-8000-000000000001";
  const std::string empId = "98000000-0000-4000-8000-000000000001";
  const std::string custId = "99000000-0000-4000-8000-000000000001";
  const std::string acctExp = "a1000000-0000-4000-8000-000000000001";
  const std::string acctRec = "a2000000-0000-4000-8000-000000000001";
  const std::string acctCogs = "a3000000-0000-4000-8000-000000000001";
  const std::string acctInv = "a4000000-0000-4000-8000-000000000001";
  const std::string periodId = "b1000000-0000-4000-8000-000000000001";
  const std::string invDocId = "c1000000-0000-4000-8000-000000000001";
  const std::string mirrorDocId = "c1000000-0000-4000-8000-000000000002";
  const std::string reqId = "d1000000-0000-4000-8000-000000000001";
  const std::string batchId = "e1000000-0000-4000-8000-000000000001";
  const std::string linkId = "f1000000-0000-4000-8000-000000000001";

  AuditIdentity who{tenant, actor};
  bool schemaOk = true;
  bool isAdmin = false;
  bool actorLive = true;
  std::string fuelStatus = "draft";
  std::string fuelWithinTolerance = "true";
  std::string fuelActualRate = "0";
  std::string fuelVariancePct = "0";
  std::string jobStatus = "draft";
  std::string jobBillingScope = "internal_fleet";
  std::string jobIsProject = "false";
  std::string compStatus = "unassigned";
  std::string tyreStatus = "in_stock";
  std::string invDocStatus = "draft";
  std::string mirrorDocStatus = "draft";
  int invDocVersion = 1;
  int mirrorDocVersion = 1;
  bool invStockPosted = false;
  bool invStockReversed = false;
  bool scmReqCreated = false;
  bool glBatchPosted = false;
  std::string glStatus = "draft";
  std::set<std::string> handoffsCreated;
  std::vector<std::string> sqlLog;

  auto db = drogon::app().getDbClient();
  db->execute = [&](const std::string &sql,
                    const std::vector<Json::Value> &args) -> drogon::TestResult {
    sqlLog.push_back(sql);

    if (sql.find("to_regclass($1) IS NOT NULL AS ok") != std::string::npos) {
      return {{rowObj({{"ok", schemaOk}})}};
    }
    if (sql.find("pg_attribute WHERE attrelid=to_regclass('gl_journal_batches')") !=
        std::string::npos) {
      return {{rowObj({{"ready", true}})}};
    }
    if (sql.find("SELECT u.is_tenant_admin_user FROM users u") != std::string::npos) {
      if (!actorLive)
        return {};
      return {{rowObj({{"is_tenant_admin_user", isAdmin}})}};
    }
    if (sql.find("SELECT id,base_currency_id FROM core_accounting_units") != std::string::npos ||
        sql.find("SELECT id, code, name, base_currency_id FROM core_accounting_units") != std::string::npos) {
      return {{rowObj({{"id", unit}, {"code", "HQ"}, {"name", "Head Office"}, {"base_currency_id", curr}})}};
    }
    if (sql.find("SELECT id FROM core_accounting_units") != std::string::npos) {
      return {{rowObj({{"id", unit}})}};
    }
    if (sql.find("SELECT 1 FROM core_accounting_units") != std::string::npos ||
        sql.find("SELECT 1 AS ok FROM core_accounting_units") != std::string::npos) {
      return {{rowObj({{"ok", 1}})}};
    }
    if (sql.find("SELECT base_currency_id FROM core_accounting_units") != std::string::npos ||
        sql.find("SELECT u.base_currency_id FROM core_accounting_units u") != std::string::npos) {
      return {{rowObj({{"base_currency_id", curr}})}};
    }
    if (sql.find("SELECT p.default_currency_id FROM core_company_profiles") != std::string::npos) {
      return {{rowObj({{"default_currency_id", curr}})}};
    }
    if (sql.find("INSERT INTO fwm_document_sequences") != std::string::npos) {
      return {{rowObj({{"issued", 1}, {"prefix", args[3].asString()}, {"padding", 5}})}};
    }
    if (sql.find("INSERT INTO scm_document_sequences") != std::string::npos) {
      return {{rowObj({{"prefix", "REQ"}, {"padding", 5}, {"next_number", 1}, {"number", "REQ-00001"}})}};
    }
    if (sql.find("INSERT INTO inv_document_sequences") != std::string::npos) {
      return {{rowObj({{"number", "ISS-00001"}, {"prefix", "ISS"}, {"padding", 5}, {"next_number", 1}})}};
    }
    if (sql.find("SELECT * FROM core_system_numbers") != std::string::npos ||
        sql.find("UPDATE core_system_numbers") != std::string::npos) {
      return {{rowObj({{"id", linkId},
                       {"prefix", "JV-"},
                       {"suffix", ""},
                       {"format_pattern", "{PREFIX}{NO}"},
                       {"padding", 5},
                       {"last_no", 10}})}};
    }
    // Dashboard aggregations & generic list counts
    if (sql.find("FROM fwm_vehicles WHERE tenant_id=$1") != std::string::npos &&
        sql.find("AS active") != std::string::npos) {
      return {{rowObj({{"total", 4},
                       {"active", 3},
                       {"in_workshop", 1},
                       {"breakdown", 0},
                       {"heavy_machinery", 2},
                       {"stalled_meters", 1}})}};
    }
    if (sql.find("FROM fwm_maintenance_schedules WHERE tenant_id=$1") != std::string::npos &&
        sql.find("AS scheduled_works") != std::string::npos) {
      return {{rowObj({{"scheduled_works", 2}, {"due_within_7d", 1}})}};
    }
    if (sql.find("FROM fwm_job_cards WHERE tenant_id=$1") != std::string::npos &&
        sql.find("AS open_jobs") != std::string::npos) {
      return {{rowObj({{"open_jobs", 2},
                       {"awaiting_parts", 1},
                       {"unbilled_customer_jobs", 1},
                       {"major_projects", 1},
                       {"job_cost_total", "1250.000000"},
                       {"billable_total", "2100.000000"}})}};
    }
    if (sql.find("FROM fwm_diary_entries WHERE tenant_id=$1") != std::string::npos &&
        sql.find("AS unpaid_diary_count") != std::string::npos) {
      return {{rowObj({{"unpaid_diary_count", 1}, {"unpaid_diary_amount", "500.000000"}})}};
    }
    if (sql.find("FROM fwm_fuel_logs WHERE tenant_id=$1") != std::string::npos &&
        sql.find("AS fuel_logs_count") != std::string::npos) {
      return {{rowObj({{"fuel_logs_count", 2},
                       {"fuel_alerts", 1},
                       {"fuel_litres_posted", "120.000000"},
                       {"fuel_cost_posted", "1500.000000"}})}};
    }
    if (sql.find("SELECT count(*) AS total") != std::string::npos) {
      return {{rowObj({{"total", 1}})}};
    }

    // GL settings
    if (sql.find("INSERT INTO fwm_gl_settings") != std::string::npos) {
      return {};
    }
    if (sql.find("FROM fwm_gl_settings s") != std::string::npos) {
      Json::Value rec = rowObj({{"id", linkId},
                                {"version", 1},
                                {"accountingUnitId", unit},
                                {"defaultWarehouseId", whId},
                                {"repairsExpenseAccountId", acctExp},
                                {"fuelExpenseAccountId", acctExp},
                                {"defaultLabourRate", "50.000000"},
                                {"defaultTaxRate", "0.150000"}});
      return {{rowObj({{"record", jsonStr(rec)}})}};
    }
    if (sql.find("FROM fwm_gl_settings WHERE") != std::string::npos) {
      return {{rowObj({{"repairs_expense_account_id", acctExp},
                       {"fuel_expense_account_id", acctExp},
                       {"internal_labour_recovery_account_id", acctInv},
                       {"workshop_labour_revenue_account_id", acctInv},
                       {"workshop_parts_revenue_account_id", acctInv},
                       {"fleet_clearing_ap_account_id", acctExp},
                       {"fleet_receivable_ar_account_id", acctRec},
                       {"default_warehouse_id", whId},
                       {"default_labour_rate", "50.000000"},
                       {"default_tax_rate", "0.150000"}})}};
    }
    if (sql.find("FROM gl_default_accounts") != std::string::npos) {
      return {{rowObj({{"accounts_payable_account_id", acctExp},
                       {"accounts_receivable_account_id", acctRec},
                       {"sales_revenue_account_id", acctInv},
                       {"vat_received_account_id", acctInv},
                       {"inventory_asset_account_id", acctInv},
                       {"inventory_account_id", acctInv},
                       {"stock_purchases_account_id", acctExp},
                       {"goods_in_transit_account_id", acctExp},
                       {"cogs_account_id", acctCogs}})}};
    }

    // Asset groups + materials + components
    if (sql.find("INSERT INTO fwm_asset_groups") != std::string::npos) {
      return {{rowObj({{"id", grpId}})}};
    }
    if (sql.find("FROM fwm_asset_groups g WHERE") != std::string::npos) {
      Json::Value rec = rowObj({{"id", grpId},
                                {"version", 1},
                                {"code", "CAT-320D"},
                                {"model", "Caterpillar 320D Excavator"},
                                {"assetClass", "heavy_machinery"}});
      return {{rowObj({{"record", jsonStr(rec)}})}};
    }
    if (sql.find("SELECT id FROM fwm_asset_groups") != std::string::npos) {
      return {{rowObj({{"id", grpId}})}};
    }
    if (sql.find("FROM fwm_asset_group_materials m") != std::string::npos &&
        sql.find("jsonb_build_object") != std::string::npos) {
      Json::Value rec = rowObj({{"id", lineId},
                                {"serviceTier", "minor_service"},
                                {"itemId", itemId},
                                {"itemCode", "OIL-15W40"},
                                {"itemName", "15W40 Engine Oil"},
                                {"uomId", uomId},
                                {"uomCode", "LTR"},
                                {"quantity", "20.000000"}});
      return {{rowObj({{"record", jsonStr(rec)}})}};
    }
    if (sql.find("FROM fwm_asset_group_materials m") != std::string::npos) {
      return {{rowObj({{"item_id", itemId},
                       {"uom_id", uomId},
                       {"qty", "20.000000"},
                       {"name", "15W40 Engine Oil"},
                       {"uc", "15.000000"}})}};
    }
    if (sql.find("FROM fwm_asset_group_components c") != std::string::npos) {
      return {{rowObj({{"record", jsonStr(rowObj({{"id", compId}, {"componentType", "Engine"}}))}})}};
    }

    // Vehicles + PM triggers + FA handoff
    if (sql.find("SELECT id FROM fwm_vehicles WHERE tenant_id=$1 AND id=$2::uuid") !=
        std::string::npos) {
      return {{rowObj({{"id", vehId}})}};
    }
    if (sql.find("SELECT id, accounting_unit_id, asset_no, registration_no, ownership_type") !=
        std::string::npos) {
      return {{rowObj({{"id", vehId},
                       {"accounting_unit_id", unit},
                       {"asset_no", "EQ-0001"},
                       {"registration_no", "GC 913-21"},
                       {"ownership_type", args[1].asString() == trailerId ? "hired_equipment"
                                                                          : "company_owned"},
                       {"make_model", "HOWO Tipping Truck"},
                       {"serial_no", "SN-001"},
                       {"purchase_amount", "250000.000000"},
                       {"purchase_date", "2024-01-10"},
                       {"currency_id", curr},
                       {"date_installed", "2024-01-15"},
                       {"cost_center_id", Json::Value()},
                       {"fixed_asset_id", Json::Value()},
                       {"residual_value", "25000.000000"},
                       {"useful_life_months", 60},
                       {"depreciation_method", "straight_line"},
                       {"accumulated_depreciation", "0.000000"},
                       {"primary_meter_unit", "kilometers"},
                       {"cumulative_meter_reading", "45000.000000"}})}};
    }
    if (sql.find("SELECT current_meter_reading::text AS cur, cumulative_meter_reading::text AS cum") !=
        std::string::npos) {
      return {{rowObj({{"cur", "10000.000000"},
                       {"cum", "45000.000000"},
                       {"primary_meter_unit", "kilometers"}})}};
    }
    if (sql.find("SELECT accounting_unit_id, current_meter_reading::text AS cur") !=
        std::string::npos) {
      return {{rowObj({{"accounting_unit_id", unit},
                       {"cur", "10000.000000"},
                       {"track_fuel_consumption", true},
                       {"ideal", "25.000000"},
                       {"consumption_unit", "litres_per_100km"},
                       {"tol_lo", "15.000000"},
                       {"tol_hi", "15.000000"}})}};
    }
    if (sql.find("SELECT accounting_unit_id, cost_center_id, coupled_trailer_id, current_meter_reading::text AS mr") !=
        std::string::npos) {
      return {{rowObj({{"accounting_unit_id", unit},
                       {"cost_center_id", Json::Value()},
                       {"coupled_trailer_id", Json::Value()},
                       {"mr", "10200.000000"}})}};
    }
    if (sql.find("SELECT accounting_unit_id FROM fwm_vehicles") != std::string::npos) {
      return {{rowObj({{"accounting_unit_id", unit}})}};
    }
    if (sql.find("INSERT INTO fwm_vehicles") != std::string::npos) {
      return {{rowObj({{"id", vehId}})}};
    }
    if (sql.find("FROM fwm_vehicles v") != std::string::npos &&
        sql.find("jsonb_build_object") != std::string::npos) {
      return {{rowObj({{"record", jsonStr(rowObj({{"id", vehId},
                                                  {"assetNo", "EQ-0001"},
                                                  {"registrationNo", "GC 913-21"},
                                                  {"version", 1}}))}})}};
    }
    if (sql.find("FROM fwm_pm_triggers t") != std::string::npos) {
      return {{rowObj({{"record", jsonStr(rowObj({{"id", schId}, {"triggerType", "kilometers"}}))}})}};
    }

    // Meter changes & readings
    if (sql.find("INSERT INTO fwm_meter_changes") != std::string::npos) {
      return {{rowObj({{"id", fuelId}})}};
    }
    if (sql.find("INSERT INTO fwm_meter_readings") != std::string::npos) {
      assert(args[4].asString() == "200" || args[4].asString() == "200.000000"); // 10200 - 10000 delta
      return {{rowObj({{"id", fuelId}})}};
    }

    // Fuel logs + Inventory issue/reversal + tolerance alert
    if (sql.find("INSERT INTO fwm_fuel_logs") != std::string::npos) {
      // args: 14=actualRate, 16=variancePct, 17=withinTol
      fuelActualRate = args[14].asString();
      fuelVariancePct = args[16].asString();
      fuelWithinTolerance = args[17].asBool() ? "true" : "false";
      return {{rowObj({{"id", fuelId}})}};
    }
    if (sql.find("FROM fwm_fuel_logs f") != std::string::npos &&
        sql.find("FOR UPDATE OF f") != std::string::npos) {
      return {{rowObj({{"id", fuelId},
                       {"accounting_unit_id", unit},
                       {"fuel_log_number", "FUL-00001"},
                       {"vehicle_id", vehId},
                       {"asset_no", "EQ-0001"},
                       {"log_date", "2026-01-16"},
                       {"meter_reading", "10200.000000"},
                       {"fuel_item_id", itemId},
                       {"uom_id", uomId},
                       {"warehouse_id", whId},
                       {"qty", "80.000000"},
                       {"uc", "12.500000"},
                       {"total_cost", "1000.000000"},
                       {"currency_id", curr},
                       {"cost_center_id", Json::Value()},
                       {"status", fuelStatus},
                       {"version", 1},
                       {"notes", "Diesel @ Apedwa"},
                       {"use_fuel_log_for_pm", true},
                       {"cur_meter", "10000.000000"},
                       {"cum_meter", "45000.000000"},
                       {"primary_meter_unit", "kilometers"}})}};
    }
    if (sql.find("SELECT status, inv_stock_document_id FROM fwm_fuel_logs") != std::string::npos) {
      return {{rowObj({{"status", fuelStatus}, {"inv_stock_document_id", invDocId}})}};
    }
    if (sql.find("UPDATE fwm_fuel_logs SET status='posted'") != std::string::npos) {
      fuelStatus = "posted";
      return {};
    }
    if (sql.find("UPDATE fwm_fuel_logs SET status='reversed'") != std::string::npos) {
      fuelStatus = "reversed";
      return {};
    }
    if (sql.find("FROM fwm_fuel_logs f") != std::string::npos &&
        sql.find("jsonb_build_object") != std::string::npos) {
      return {{rowObj({{"record", jsonStr(rowObj({{"id", fuelId},
                                                  {"fuelLogNumber", "FUL-00001"},
                                                  {"status", fuelStatus},
                                                  {"actualConsumptionRate", fuelActualRate},
                                                  {"variancePct", fuelVariancePct},
                                                  {"withinTolerance", fuelWithinTolerance == "true"}}))}})}};
    }

    // InventoryService::postStockDocument & reverseStockDocument database seams
    if (sql.find("SELECT base_uom_id FROM inv_items") != std::string::npos) {
      return {{rowObj({{"base_uom_id", uomId}})}};
    }
    if (sql.find("FROM inv_warehouses WHERE tenant_id=$1 AND id=$2") != std::string::npos ||
        sql.find("FROM inv_warehouses WHERE tenant_id=$1 AND id=$2::uuid") != std::string::npos) {
      return {{rowObj({{"id", whId},
                       {"accounting_unit_id", unit},
                       {"is_active", true},
                       {"allows_negative_stock", true}})}};
    }
    if (sql.find("FROM inv_items i WHERE") != std::string::npos &&
        sql.find("jsonb_build_object") != std::string::npos) {
      Json::Value item = rowObj({{"id", itemId},
                                 {"itemCode", "DSL-001"},
                                 {"name", "Automotive Gas Oil"},
                                 {"itemType", "stock"},
                                 {"status", "active"},
                                 {"baseUomId", uomId},
                                 {"trackingMethod", "none"},
                                 {"valuationMethod", "weighted_average"},
                                 {"currencyId", curr},
                                 {"averageUnitCost", "12.500000"},
                                 {"standardCost", "12.500000"},
                                 {"lastUnitCost", "12.500000"},
                                 {"inventoryAccountId", acctInv},
                                 {"cogsAccountId", acctCogs},
                                 {"revenueAccountId", acctInv},
                                 {"purchaseAccountId", acctExp},
                                 {"varianceAccountId", acctExp}});
      return {{rowObj({{"record", jsonStr(item)}})}};
    }
    if (sql.find("FROM inv_items WHERE") != std::string::npos &&
        (sql.find("tracking_method") != std::string::npos || sql.find("valuation_method") != std::string::npos)) {
      return {{rowObj({{"id", itemId},
                       {"item_code", "DSL-001"},
                       {"name", "Automotive Gas Oil"},
                       {"item_type", "stock"},
                       {"status", "active"},
                       {"base_uom_id", uomId},
                       {"tracking_method", "none"},
                       {"valuation_method", "weighted_average"},
                       {"currency_id", curr},
                       {"average_unit_cost", "12.500000"},
                       {"standard_cost", "12.500000"},
                       {"last_unit_cost", "12.500000"},
                       {"inventory_account_id", acctInv},
                       {"cogs_account_id", acctCogs},
                       {"revenue_account_id", acctInv},
                       {"purchase_account_id", acctExp},
                       {"variance_account_id", acctExp}})}};
    }
    if (sql.find("FROM inv_units_of_measure") != std::string::npos) {
      return {{rowObj({{"id", uomId}, {"code", "LTR"}, {"is_active", true}})}};
    }
    if (sql.find("FROM inv_item_uom_conversions") != std::string::npos) {
      return {{rowObj({{"factor", "1.0000000000"}})}};
    }
    if (sql.find("FROM inv_stock_balances") != std::string::npos) {
      return {{rowObj({{"id", lineId},
                       {"q", "1000.000000"},
                       {"c", "12.500000"},
                       {"v", "12500.000000"},
                       {"version", 1},
                       {"quantity_on_hand", "1000.000000"},
                       {"quantity_reserved", "0.000000"},
                       {"average_unit_cost", "12.500000"},
                       {"total_value", "12500.000000"}})}};
    }
    if (sql.find("FROM inv_valuation_closes") != std::string::npos) {
      return {};
    }
    if (sql.find("FROM gl_accounting_periods") != std::string::npos) {
      return {{rowObj({{"id", periodId},
                       {"status", "open"},
                       {"begin_date", "2026-01-01"},
                       {"end_date", "2026-12-31"}})}};
    }
    if (sql.find("FROM gl_accounts WHERE") != std::string::npos) {
      std::vector<drogon::TestRow> rows;
      for (const auto &aid : {acctExp, acctRec, acctCogs, acctInv}) {
        rows.push_back(drogon::TestRow{rowObj({{"id", aid},
                                                {"account_name", "GL Account"},
                                                {"currency_id", curr},
                                                {"standard_account_type", 1},
                                                {"allow_manual_posting", true},
                                                {"is_control_account", false},
                                                {"status", "active"}})});
      }
      return rows;
    }
    if (sql.find("FROM core_currencies WHERE") != std::string::npos) {
      return {{rowObj({{"id", curr}, {"code", "GHS"}, {"name", "Ghana Cedi"}})}};
    }
    if (sql.find("WITH lines AS(SELECT x") != std::string::npos) {
      Json::Value linesJson(Json::arrayValue);
      long long sumD = 0;
      long long sumC = 0;
      if (!args.empty()) {
        Json::Value arr;
        Json::CharReaderBuilder rb;
        std::string perr;
        std::unique_ptr<Json::CharReader> rd(rb.newCharReader());
        const std::string raw = args[0].asString();
        if (rd->parse(raw.data(), raw.data() + raw.size(), &arr, &perr)) {
          for (auto &el : arr) {
            el["baseDebit"] = el["debit"];
            el["baseCredit"] = el["credit"];
            sumD += static_cast<long long>(std::llround(std::stold(el["debit"].asString()) * 1000000.0L));
            sumC += static_cast<long long>(std::llround(std::stold(el["credit"].asString()) * 1000000.0L));
            linesJson.append(el);
          }
        }
      }
      auto fmt6s = [](long long v) {
        char b[48];
        std::snprintf(b, sizeof b, "%lld.%06lld", v / 1000000LL, v % 1000000LL);
        return std::string(b);
      };
      return {{rowObj({{"debit", fmt6s(sumD)},
                       {"credit", fmt6s(sumC)},
                       {"balanced", sumD == sumC},
                       {"fits", true},
                       {"lines", jsonStr(linesJson)}})}};
    }
    if (sql.find("SELECT version FROM inv_stock_documents") != std::string::npos) {
      const bool isMirror = !args.empty() && args[1].asString() == mirrorDocId;
      return {{rowObj({{"version", isMirror ? mirrorDocVersion : invDocVersion}})}};
    }
    if (sql.find("INSERT INTO inv_stock_documents") != std::string::npos) {
      const bool isMirror = args.size() > 3 && args[3].asString() == "adjustment";
      if (isMirror) {
        mirrorDocStatus = "draft";
        mirrorDocVersion = 1;
        return {{rowObj({{"id", mirrorDocId}, {"document_number", "ADJ-00001"}})}};
      }
      invDocStatus = "draft";
      invDocVersion = 1;
      return {{rowObj({{"id", invDocId}, {"document_number", "ISS-00001"}})}};
    }
    if (sql.find("UPDATE inv_stock_documents SET status='submitted'") != std::string::npos) {
      const bool isMirror = args.size() > 1 && args[1].asString() == mirrorDocId;
      if (isMirror) {
        mirrorDocStatus = "submitted";
        ++mirrorDocVersion;
      } else {
        invDocStatus = "submitted";
        ++invDocVersion;
      }
      return {};
    }
    if (sql.find("UPDATE inv_stock_documents SET status='approved'") != std::string::npos) {
      const bool isMirror = args.size() > 1 && args[1].asString() == mirrorDocId;
      if (isMirror) {
        mirrorDocStatus = "approved";
        ++mirrorDocVersion;
      } else {
        invDocStatus = "approved";
        ++invDocVersion;
      }
      return {};
    }
    if (sql.find("UPDATE inv_stock_documents SET status='posted'") != std::string::npos) {
      const bool isMirror = args.size() > 1 && args[1].asString() == mirrorDocId;
      if (isMirror) {
        mirrorDocStatus = "posted";
        ++mirrorDocVersion;
      } else {
        invDocStatus = "posted";
        invStockPosted = true;
        ++invDocVersion;
      }
      return {};
    }
    if (sql.find("UPDATE inv_stock_documents SET status='reversed'") != std::string::npos ||
        sql.find("UPDATE inv_stock_documents SET reversal_document_id") != std::string::npos) {
      invDocStatus = "reversed";
      invStockReversed = true;
      ++invDocVersion;
      return {};
    }
    if (sql.find("SELECT 1 AS one FROM inv_stock_document_lines") != std::string::npos) {
      return {{rowObj({{"one", 1}})}};
    }
    if (sql.find("FROM inv_stock_documents d") != std::string::npos) {
      const bool isMirror = args.size() > 1 && args[1].asString() == mirrorDocId;
      Json::Value rec = rowObj({{"id", isMirror ? mirrorDocId : invDocId},
                                {"version", isMirror ? mirrorDocVersion : invDocVersion},
                                {"accountingUnitId", unit},
                                {"documentNumber", isMirror ? "ADJ-00001" : "ISS-00001"},
                                {"documentType", isMirror ? "adjustment" : "issue"},
                                {"movementReason", isMirror ? "other_adjustment" : "internal_use"},
                                {"documentDate", "2026-01-16"},
                                {"status", isMirror ? mirrorDocStatus : invDocStatus},
                                {"sourceWarehouseId", whId},
                                {"totalQuantity", "80.000000"},
                                {"totalValue", "1000.000000"},
                                {"currencyCode", "GHS"},
                                {"referenceNumber", "FUL-00001"},
                                {"notes", "Diesel"}});
      return {{rowObj({{"record", jsonStr(rec)}})}};
    }
    if (sql.find("FROM inv_stock_document_lines l") != std::string::npos &&
        sql.find("jsonb_build_object('line'") != std::string::npos) {
      Json::Value row = rowObj(
          {{"line", rowObj({{"id", lineId},
                            {"lineNumber", 1},
                            {"itemId", itemId},
                            {"quantityBase", "80.000000"},
                            {"countedQuantity", "0"},
                            {"unitCost", "12.500000"},
                            {"serialNumbers", Json::arrayValue}})},
           {"item", rowObj({{"id", itemId},
                            {"itemCode", "DSL-001"},
                            {"trackingMethod", "none"},
                            {"valuationMethod", "weighted_average"},
                            {"standardCost", "12.500000"},
                            {"averageUnitCost", "12.500000"},
                            {"lastUnitCost", "12.500000"},
                            {"inventoryAccountId", acctInv},
                            {"cogsAccountId", acctCogs},
                            {"purchaseAccountId", acctExp},
                            {"varianceAccountId", acctExp}})}});
      return {{rowObj({{"record", jsonStr(row)}})}};
    }
    if (sql.find("FROM inv_stock_document_lines l") != std::string::npos) {
      Json::Value rec = rowObj({{"id", lineId},
                                {"version", 1},
                                {"lineNumber", 1},
                                {"itemId", itemId},
                                {"uomId", uomId},
                                {"quantity", "80.000000"},
                                {"quantityBase", "80.000000"},
                                {"unitCost", "12.500000"},
                                {"lineValue", "1000.000000"},
                                {"serialNumbers", Json::arrayValue},
                                {"description", "Fuel"}});
      return {{rowObj({{"record", jsonStr(rec)}})}};
    }
    if (sql.find("FROM inv_stock_transactions") != std::string::npos) {
      return {{rowObj({{"document_line_id", lineId}, {"c", "12.500000"}})}};
    }
    if (sql.find("FROM inv_stock_document_events") != std::string::npos) {
      return {};
    }
    if (sql.find("INSERT INTO gl_journal_batches") != std::string::npos) {
      glStatus = "draft";
      return {{rowObj({{"id", batchId}, {"batch_number", "JV-00011"}})}};
    }
    if (sql.find("UPDATE gl_journal_batches SET status='posted'") != std::string::npos) {
      glStatus = "posted";
      glBatchPosted = true;
      return {};
    }
    if (sql.find("FROM gl_journal_batches b") != std::string::npos) {
      Json::Value jlines(Json::arrayValue);
      jlines.append(rowObj({{"id", lineId},
                            {"accountId", acctCogs},
                            {"currencyId", curr},
                            {"costCenterId", Json::Value()},
                            {"exchangeRate", "1"},
                            {"debit", "1000.000000"},
                            {"credit", "0"},
                            {"description", "Journal Dr"},
                            {"referenceNumber", "FUL-00001"},
                            {"chequeNumber", ""},
                            {"transactionDate", "2026-01-16"}}));
      jlines.append(rowObj({{"id", mileId},
                            {"accountId", acctInv},
                            {"currencyId", curr},
                            {"costCenterId", Json::Value()},
                            {"exchangeRate", "1"},
                            {"debit", "0"},
                            {"credit", "1000.000000"},
                            {"description", "Journal Cr"},
                            {"referenceNumber", "FUL-00001"},
                            {"chequeNumber", ""},
                            {"transactionDate", "2026-01-16"}}));
      Json::Value rec = rowObj({{"id", batchId},
                                {"accountingUnitId", unit},
                                {"batchNumber", "JV-00011"},
                                {"batchDate", "2026-01-16"},
                                {"description", "Journal"},
                                {"periodId", periodId},
                                {"version", 1},
                                {"status", glStatus},
                                {"totalDebit", "1000.000000"},
                                {"totalCredit", "1000.000000"},
                                {"isMultiCurrency", false},
                                {"lines", jlines}});
      return {{rowObj({{"record", jsonStr(rec)}})}};
    }

    // Major components & tyres
    if (sql.find("INSERT INTO fwm_major_components") != std::string::npos) {
      return {{rowObj({{"id", compId}})}};
    }
    if (sql.find("SELECT status, current_vehicle_id, mounted_cum_odo::text AS mounted_odo") !=
        std::string::npos) {
      return {{rowObj({{"status", compStatus},
                       {"current_vehicle_id", Json::Value()},
                       {"mounted_odo", "0"},
                       {"acc_hrs", "0"},
                       {"rep_cost", "0"}})}};
    }
    if (sql.find("UPDATE fwm_major_components SET status='fitted'") != std::string::npos) {
      compStatus = "fitted";
      return {};
    }
    if (sql.find("FROM fwm_major_components c") != std::string::npos) {
      return {{rowObj({{"record", jsonStr(rowObj({{"id", compId}, {"status", compStatus}}))}})}};
    }
    if (sql.find("INSERT INTO fwm_tyres") != std::string::npos) {
      return {{rowObj({{"id", tyreId}})}};
    }
    if (sql.find("SELECT status, current_vehicle_id, fitted_meter_reading::text AS fit_m") !=
        std::string::npos) {
      return {{rowObj({{"status", tyreStatus},
                       {"current_vehicle_id", vehId},
                       {"fit_m", "0"},
                       {"acc_m", "0"}})}};
    }
    if (sql.find("UPDATE fwm_tyres SET status='fitted'") != std::string::npos) {
      tyreStatus = "fitted";
      return {};
    }
    if (sql.find("FROM fwm_tyres t") != std::string::npos) {
      return {{rowObj({{"record", jsonStr(rowObj({{"id", tyreId}, {"status", tyreStatus}}))}})}};
    }

    // PM schedules & generator + create-job-card + SCM requisition
    if (sql.find("SELECT v.id AS vehicle_id, v.asset_no, v.is_heavy_machinery") !=
        std::string::npos) {
      return {{rowObj({{"vehicle_id", vehId},
                       {"asset_no", "EQ-0001"},
                       {"is_heavy_machinery", true},
                       {"cur", "14500.000000"},
                       {"wu", "250.000000"},
                       {"weekday_days", 5},
                       {"su", "100.000000"},
                       {"sunu", "0"},
                       {"trigger_type", "kilometers"},
                       {"freq", "10000.000000"},
                       {"dt", "4.000000"},
                       {"mfreq", "40000.000000"},
                       {"mdt", "12.000000"},
                       {"lsr", "5000.000000"},
                       {"lmsr", "0"}})}};
    }
    if (sql.find("FROM fwm_maintenance_schedules s JOIN fwm_vehicles v") != std::string::npos &&
        sql.find("FOR UPDATE OF s") != std::string::npos) {
      return {{rowObj({{"id", schId},
                       {"accounting_unit_id", unit},
                       {"schedule_number", "PM-00001"},
                       {"vehicle_id", vehId},
                       {"asset_group_id", grpId},
                       {"cost_center_id", Json::Value()},
                       {"ownership_type", "company_owned"},
                       {"customer_id", Json::Value()},
                       {"coupled_trailer_id", Json::Value()},
                       {"mr", "14500.000000"},
                       {"service_type", "Service"},
                       {"work_category", "maintenance_schedule"},
                       {"procedure_id", Json::Value()},
                       {"dt", "4.000000"},
                       {"special_conditions", "15000 km Service"},
                       {"status", "forecasted"},
                       {"job_card_id", Json::Value()}})}};
    }
    if (sql.find("FROM fwm_maintenance_schedules s JOIN fwm_vehicles v") != std::string::npos &&
        (sql.find("FOR SHARE OF s") != std::string::npos ||
         sql.find("FOR SHARE of s") != std::string::npos)) {
      return {{rowObj({{"accounting_unit_id", unit},
                       {"schedule_number", "PM-00001"},
                       {"sdate", "2026-01-20"},
                       {"service_type", "Service"},
                       {"asset_no", "EQ-0001"},
                       {"asset_group_id", grpId},
                       {"cost_center_id", Json::Value()}})}};
    }
    if (sql.find("INSERT INTO fwm_maintenance_schedules") != std::string::npos) {
      return {{rowObj({{"id", schId}})}};
    }
    if (sql.find("FROM fwm_maintenance_schedules s") != std::string::npos &&
        sql.find("jsonb_build_object") != std::string::npos) {
      return {{rowObj({{"record", jsonStr(rowObj({{"id", schId}, {"scheduleNumber", "PM-00001"}}))}})}};
    }

    // SupplyChainService::createRequisition database seams
    if (sql.find("INSERT INTO scm_purchase_requisitions") != std::string::npos) {
      scmReqCreated = true;
      return {{rowObj({{"id", reqId}})}};
    }
    if (sql.find("FROM scm_purchase_requisitions r") != std::string::npos) {
      return {{rowObj({{"record", jsonStr(rowObj({{"id", reqId},
                                                  {"requisitionNumber", "REQ-00001"},
                                                  {"estimatedTotal", "300.000000"}}))}})}};
    }
    if (sql.find("FROM scm_purchase_requisition_lines l") != std::string::npos ||
        sql.find("FROM scm_procurement_events e") != std::string::npos) {
      return {};
    }

    // Job cards CRUD, lines, assignments, milestones, issue-parts, post-gl, handoff, transition
    if (sql.find("INSERT INTO fwm_job_cards") != std::string::npos) {
      return {{rowObj({{"id", jobId}})}};
    }
    if (sql.find("SELECT status FROM fwm_job_cards") != std::string::npos) {
      return {{rowObj({{"status", jobStatus}})}};
    }
    if (sql.find("SELECT accounting_unit_id, status, vehicle_id, schedule_id, job_type, version") !=
        std::string::npos) {
      return {{rowObj({{"accounting_unit_id", unit},
                       {"status", jobStatus},
                       {"vehicle_id", vehId},
                       {"schedule_id", Json::Value()},
                       {"job_type", "corrective_repair"},
                       {"version", 1}})}};
    }
    if (sql.find("UPDATE fwm_job_cards SET status=$3") != std::string::npos) {
      jobStatus = args[2].asString();
      return {};
    }
    if (sql.find("FROM fwm_job_cards j JOIN fwm_vehicles v") != std::string::npos &&
        sql.find("FOR UPDATE OF j") != std::string::npos) {
      return {{rowObj({{"accounting_unit_id", unit},
                       {"job_number", "JOB-00001"},
                       {"billing_scope", jobBillingScope},
                       {"customer_id", custId},
                       {"cost_center_id", Json::Value()},
                       {"warehouse_id", whId},
                       {"odate", "2026-01-16"},
                       {"currency_id", curr},
                       {"status", jobStatus},
                       {"default_warehouse_id", whId},
                       {"asset_no", "EQ-0001"},
                       {"total_cost", "1300.000000"},
                       {"labour_cost", "300.000000"},
                       {"out_cost", "0.000000"},
                       {"parts_cost", "1000.000000"},
                       {"lub_cost", "0.000000"},
                       {"bill_parts", "1200.000000"},
                       {"bill_labour", "450.000000"},
                       {"bill_other", "0.000000"},
                       {"tax_total", "247.500000"},
                       {"bill_grand", "1897.500000"},
                       {"total_billable", "1897.500000"},
                       {"is_major_project", jobIsProject == "true"}})}};
    }
    if (sql.find("FROM fwm_job_cards j JOIN fwm_vehicles v") != std::string::npos &&
        sql.find("FOR SHARE OF j") != std::string::npos) {
      return {{rowObj({{"accounting_unit_id", unit},
                       {"job_number", "JOB-00001"},
                       {"odate", "2026-01-16"},
                       {"cost_center_id", Json::Value()},
                       {"warehouse_id", whId},
                       {"priority", "high"},
                       {"currency_id", curr},
                       {"status", jobStatus},
                       {"asset_no", "EQ-0001"}})}};
    }
    if (sql.find("FROM fwm_job_card_lines l JOIN inv_items i") != std::string::npos) {
      return {{rowObj({{"id", lineId},
                       {"inv_item_id", itemId},
                       {"uom_id", uomId},
                       {"qty", "4.000000"},
                       {"uc", "150.000000"},
                       {"description", "Front Brake Pads"},
                       {"supplier_id", Json::Value()}})}};
    }
    if (sql.find("COALESCE(sum(line_cost)") != std::string::npos) {
      return {{rowObj({{"parts_cost", "600.000000"},
                       {"line_labour_cost", "300.000000"},
                       {"out_cost", "0"},
                       {"lub_cost", "0"},
                       {"bill_parts", "800.000000"},
                       {"bill_labour", "450.000000"},
                       {"bill_other", "0"}})}};
    }
    if (sql.find("FROM fwm_job_card_assignments") != std::string::npos &&
        sql.find("sum(") != std::string::npos) {
      return {{rowObj({{"assign_cost", "0"}, {"assign_bill", "0"}})}};
    }
    if (sql.find("SELECT j.accounting_unit_id, j.billing_scope, COALESCE(s.default_tax_rate") !=
        std::string::npos) {
      return {{rowObj({{"accounting_unit_id", unit},
                       {"billing_scope", jobBillingScope},
                       {"tax_rate", "0.150000"}})}};
    }
    if (sql.find("UPDATE fwm_job_milestones SET is_deleted=true") != std::string::npos) {
      assert(sql.find("deleted_at") == std::string::npos); // uses last_modified_at, not deleted_at!
      return {{rowObj({{"id", mileId}})}};
    }
    if (sql.find("UPDATE fwm_job_card_lines SET is_deleted=true") != std::string::npos ||
        sql.find("UPDATE fwm_job_card_lines SET line_type=$4") != std::string::npos ||
        sql.find("UPDATE fwm_job_milestones SET milestone_code=$4") != std::string::npos) {
      return {{rowObj({{"id", lineId}})}};
    }
    if (sql.find("FROM fwm_job_card_lines l") != std::string::npos &&
        sql.find("jsonb_build_object") != std::string::npos) {
      Json::Value jl = rowObj({{"id", lineId},
                               {"lineNumber", 1},
                               {"lineType", "spare_part"},
                               {"sourceType", "inventory_issue"},
                               {"description", "Front Brake Pads"},
                               {"quantity", "4.000000"},
                               {"unitCost", "150.000000"},
                               {"lineCost", "600.000000"},
                               {"unitPrice", "200.000000"},
                               {"lineBillableAmount", "800.000000"}});
      return {{rowObj({{"record", jsonStr(jl)}})}};
    }
    if (sql.find("FROM fwm_job_cards j") != std::string::npos &&
        sql.find("jsonb_build_object") != std::string::npos) {
      Json::Value jc = rowObj({{"id", jobId},
                               {"accountingUnitId", unit},
                               {"jobNumber", "JOB-00001"},
                               {"vehicleId", vehId},
                               {"assetNo", "EQ-0001"},
                               {"registrationNo", "GC 913-21"},
                               {"jobType", "corrective_repair"},
                               {"billingScope", jobBillingScope},
                               {"customerId", custId},
                               {"customerName", "Apedwa Mining Ltd"},
                               {"currencyId", curr},
                               {"currencyCode", "GHS"},
                               {"openedDate", "2026-01-16"},
                               {"totalCost", "1300.000000"},
                               {"billablePartsTotal", "1200.000000"},
                               {"billableLabourTotal", "450.000000"},
                               {"billableOtherTotal", "0.000000"},
                               {"taxTotal", "247.500000"},
                               {"billableGrandTotal", "1897.500000"},
                               {"isMajorProject", jobIsProject == "true"},
                               {"status", jobStatus},
                               {"version", 1}});
      return {{rowObj({{"record", jsonStr(jc)}})}};
    }

    // Diary entries + allocations + promote
    if (sql.find("INSERT INTO fwm_diary_entries") != std::string::npos) {
      return {{rowObj({{"id", diaryId}})}};
    }
    if (sql.find("SELECT total_amount::text AS total, status FROM fwm_diary_entries") !=
        std::string::npos) {
      return {{rowObj({{"total", "900.000000"}, {"status", "logged"}})}};
    }
    if (sql.find("FROM fwm_diary_entry_allocations WHERE tenant_id=$1") != std::string::npos) {
      return {{rowObj({{"id", lineId}, {"vehicle_id", vehId}, {"qty", "1.000000"}, {"amt", "450.000000"}})},
              {rowObj({{"id", mileId}, {"vehicle_id", trailerId}, {"qty", "1.000000"}, {"amt", "450.000000"}})}};
    }
    if (sql.find("FROM fwm_diary_entries WHERE tenant_id=$1 AND id=$2::uuid") != std::string::npos) {
      return {{rowObj({{"accounting_unit_id", unit},
                       {"entry_number", "DRY-00001"},
                       {"edate", "2026-01-17"},
                       {"vehicle_id", vehId},
                       {"entry_category", "parts"},
                       {"description", "2 new front brake pads @ Apedwa"},
                       {"position_or_side", "front"},
                       {"location_or_vendor", "@ Apedwa"},
                       {"supplier_id", Json::Value()},
                       {"inv_item_id", itemId},
                       {"employee_id", empId},
                       {"qty", "2.000000"},
                       {"ua", "450.000000"},
                       {"tot", "900.000000"},
                       {"currency_id", curr},
                       {"is_paid", true},
                       {"status", "allocated"}})}};
    }
    if (sql.find("UPDATE fwm_diary_entries SET is_paid=true") != std::string::npos) {
      return {{rowObj({{"id", diaryId}})}};
    }
    if (sql.find("FROM fwm_diary_entries d") != std::string::npos &&
        sql.find("jsonb_build_object") != std::string::npos) {
      return {{rowObj({{"record", jsonStr(rowObj({{"id", diaryId},
                                                  {"entryNumber", "DRY-00001"},
                                                  {"description", "2 new front brake pads @ Apedwa"}}))}})}};
    }

    // Cross-module links
    if (sql.find("INSERT INTO fwm_cross_module_links") != std::string::npos) {
      handoffsCreated.insert(args[4].asString() + ":" + args[5].asString());
      return {{rowObj({{"id", linkId}})}};
    }
    if (sql.find("FROM fwm_cross_module_links l") != std::string::npos) {
      return {{rowObj({{"record", jsonStr(rowObj({{"id", linkId},
                                                  {"targetModule", "fixed_assets"},
                                                  {"handoffStatus", "staged"}}))}})}};
    }

    if (sql.find("INSERT INTO fwm_job_card_lines") != std::string::npos ||
        sql.find("INSERT INTO fwm_job_milestones") != std::string::npos ||
        sql.find("INSERT INTO fwm_job_card_assignments") != std::string::npos ||
        sql.find("INSERT INTO fwm_diary_entry_allocations") != std::string::npos ||
        sql.find("INSERT INTO fwm_pm_triggers") != std::string::npos ||
        sql.find("INSERT INTO fwm_lubricant_logs") != std::string::npos ||
        sql.find("INSERT INTO fwm_procedures") != std::string::npos ||
        sql.find("INSERT INTO fwm_workshop_employees") != std::string::npos) {
      return {{rowObj({{"id", lineId}})}};
    }
    // Reports 6-tab queries
    if (sql.find("COALESCE(sum(") != std::string::npos ||
        sql.find("jsonb_build_object") != std::string::npos) {
      return {};
    }

    return {};
  };

  auto call = [&](std::string op, std::string id = "", Json::Value body = Json::Value(),
                  std::string subId = "", AuditIdentity identity = {}) {
    if (identity.tenantId.empty())
      identity = who;
    return FleetWorkshopService::execute(op, id, subId, body, 1, 20, "", unit, identity).get();
  };
  auto mustOk = [&](const business_desk::dto::BaseApiResponse &res, const char *label) {
    if (!res.success) {
      std::cerr << "FAIL [" << label << "]: " << res.error.toStyledString() << "\n";
      for (size_t i = sqlLog.size() > 5 ? sqlLog.size() - 5 : 0; i < sqlLog.size(); ++i)
        std::cerr << "  SQL[" << i << "]: " << sqlLog[i] << "\n";
      std::abort();
    }
    return res;
  };

  // 1. Authorization, tenant scope, and schema-readiness fail-closed checks.
  assert(FleetWorkshopService::execute("vehicles.list", "", "", {}, 1, 20, "", unit, {}).get().error["code"] ==
         "unauthorized");
  assert(call("vehicles.list").error["code"] == "forbidden");
  permissions = {"fleet_workshop.read"};
  assert(call("vehicles.list").success && !call("vehicles.list").result["canWrite"].asBool());
  assert(call("vehicles.create", "", rowObj({{"assetNo", "EQ-1"}})).error["code"] == "forbidden");
  permissions = {"fleet_workshop_management.write"};
  assert(call("dashboard.summary").success);

  schemaOk = false;
  assert(call("vehicles.list").error["code"] == "schema_not_ready");
  schemaOk = true;

  actorLive = false;
  assert(call("vehicles.list").error["code"] == "forbidden");
  actorLive = true;

  // 2. Mass assignment & input validation rejections.
  Json::Value badGrp = rowObj({{"code", "CAT"}, {"model", "320D"}, {"tenantId", tenant}});
  assert(call("asset-groups.create", "", badGrp).error["code"] == "validation_error");
  Json::Value badDate =
      rowObj({{"vehicleId", vehId}, {"logDate", "2027-02-29"}, {"quantityLitres", "10"}});
  assert(call("fuel-logs.create", "", badDate).error["code"] == "validation_error");

  // 3. GL Settings & Asset Groups & Vehicles & FA handoff.
  Json::Value glSet = rowObj({{"accountingUnitId", unit},
                              {"defaultWarehouseId", whId},
                              {"repairsExpenseAccountId", acctExp},
                              {"fuelExpenseAccountId", acctExp},
                              {"defaultLabourRate", "50"},
                              {"defaultTaxRate", "0.15"}});
  assert(call("gl-settings.upsert", "", glSet).success);
  assert(call("gl-settings.options").success);

  Json::Value grp = rowObj({{"code", "CAT-320D"},
                            {"model", "Caterpillar 320D"},
                            {"assetClass", "heavy_equipment"}});
  assert(call("asset-groups.create", "", grp).success);
  assert(call("asset-groups.materials.list", grpId).success);

  Json::Value veh = rowObj({{"accountingUnitId", unit},
                            {"assetNo", "EQ-0001"},
                            {"assetGroupId", grpId},
                            {"registrationNo", "GC 913-21"},
                            {"ownershipType", "company_owned"},
                            {"primaryMeterUnit", "kilometers"},
                            {"weekdayUtilization", "250"},
                            {"trackFuelConsumption", true},
                            {"idealConsumptionRate", "25"},
                            {"consumptionUnit", "litres_per_100km"},
                            {"toleranceBelowPct", "15"},
                            {"toleranceAbovePct", "15"}});
  assert(call("vehicles.create", "", veh).success);
  assert(call("vehicles.next-number").result["nextNumber"].asString() == "EQ-0001");
  assert(call("vehicles.handoff-fa", vehId).success);
  assert(handoffsCreated.count("fixed_assets:vehicle_asset_sync"));
  assert(call("vehicles.handoff-fa", trailerId).error["code"] == "conflict");

  // 4. Meter readings & Fuel consumption tolerance + Inventory stock issue & reversal.
  assert(call("meter-readings.create", "",
              rowObj({{"vehicleId", vehId}, {"logDate", "2026-01-15"}, {"reading", "9500"}}))
             .error["code"] == "conflict");
  assert(call("meter-readings.create", "",
              rowObj({{"vehicleId", vehId}, {"logDate", "2026-01-15"}, {"reading", "10200"}}))
             .success);

  // 80 litres across 200km (10200 - 10000) = 40 L/100km vs ideal 25 (+60% variance -> out of 15% tolerance!)
  Json::Value fuel = rowObj({{"accountingUnitId", unit},
                             {"vehicleId", vehId},
                             {"logDate", "2026-01-16"},
                             {"meterReading", "10200"},
                             {"fuelItemId", itemId},
                             {"uomId", uomId},
                             {"warehouseId", whId},
                             {"quantityLitres", "80"},
                             {"unitCost", "12.5"},
                             {"stationOrPump", "Apedwa Fuel Depot"}});
  auto fuelRes = mustOk(call("fuel-logs.create", "", fuel), "fuel-logs.create");
  assert(fuelRes.result["withinTolerance"].asBool() == false);
  mustOk(call("fuel-logs.post", fuelId), "fuel-logs.post");
  assert(invStockPosted);
  assert(handoffsCreated.count("inventory:fuel_stock_issue"));
  assert(call("fuel-logs.post", fuelId).error["code"] == "conflict");
  mustOk(call("fuel-logs.reverse", fuelId, rowObj({{"reason", "Wrong meter"}})),
         "fuel-logs.reverse");
  assert(invStockReversed);

  // 5. Major components & tyres lifecycle.
  mustOk(call("major-components.create", "",
              rowObj({{"componentCode", "ENG-01"},
                      {"componentType", "Engine"},
                      {"serialNo", "ENG-SN-1"}})),
         "major-components.create");
  mustOk(call("major-components.mount", compId,
              rowObj({{"vehicleId", vehId}, {"eventDate", "2026-01-16"}, {"cumOdoReading", "10200"}})),
         "major-components.mount");
  assert(compStatus == "fitted");

  mustOk(call("tyres.create", "",
              rowObj({{"serialNo", "TYR-001"}, {"brand", "Michelin"}, {"sizeSpec", "295/80R22.5"}})),
         "tyres.create");
  mustOk(call("tyres.fit", tyreId,
              rowObj({{"vehicleId", vehId},
                      {"axlePosition", "Front Left"},
                      {"eventDate", "2026-01-16"},
                      {"meterReading", "10200"}})),
         "tyres.fit");
  assert(tyreStatus == "fitted");

  // 6. PM Schedules forecast + Create Job Card + Raise SCM Requisition.
  mustOk(call("schedules.generate", "", rowObj({{"accountingUnitId", unit}, {"horizonDays", 60}})),
         "schedules.generate");
  mustOk(call("schedules.create-job-card", schId), "schedules.create-job-card");
  mustOk(call("schedules.requisitions", schId), "schedules.requisitions");
  assert(scmReqCreated);
  assert(handoffsCreated.count("supply_chain:pm_parts_requisition"));

  // 7. Job cards, lines, milestones, Inventory parts issue, SCM req, GL posting, handoffs, transitions.
  jobBillingScope = "customer_billable";
  jobIsProject = "true";
  mustOk(call("job-cards.create", "",
              rowObj({{"accountingUnitId", unit},
                      {"vehicleId", vehId},
                      {"jobType", "corrective_repair"},
                      {"billingScope", "customer_billable"},
                      {"customerId", custId},
                      {"warehouseId", whId},
                      {"openedDate", "2026-01-16"},
                      {"reportedFault", "Brake pad replacement @ Apedwa"},
                      {"isMajorProject", true}})),
         "job-cards.create");
  mustOk(call("job-cards.lines.add", jobId,
              rowObj({{"lineType", "spare_part"},
                      {"description", "Front Brake Pads"},
                      {"invItemId", itemId},
                      {"uomId", uomId},
                      {"warehouseId", whId},
                      {"quantity", "4"},
                      {"unitCost", "150"},
                      {"unitPrice", "200"},
                      {"isBillable", true}})),
         "job-cards.lines.add");
  mustOk(call("job-cards.milestones.create", jobId,
              rowObj({{"milestoneCode", "MS-01"},
                      {"title", "Brake Assembly Overhaul"},
                      {"progressPct", 50}})),
         "job-cards.milestones.create");
  mustOk(call("job-cards.milestones.delete", jobId, rowObj({{"version", 1}}), mileId),
         "job-cards.milestones.delete");
  mustOk(call("job-cards.issue-parts", jobId), "job-cards.issue-parts");
  assert(handoffsCreated.count("inventory:job_parts_issue"));
  mustOk(call("job-cards.requisitions", jobId), "job-cards.requisitions");
  assert(handoffsCreated.count("supply_chain:job_parts_requisition"));
  mustOk(call("job-cards.post-gl", jobId,
              rowObj({{"mode", "revenue_recognition"}, {"periodId", periodId}})),
         "job-cards.post-gl");
  assert(glBatchPosted);
  assert(handoffsCreated.count("gl:job_revenue_recognition"));
  mustOk(call("job-cards.handoff", jobId, rowObj({{"targetModule", "ar"}})), "handoff.ar");
  mustOk(call("job-cards.handoff", jobId, rowObj({{"targetModule", "point_of_sale"}})),
         "handoff.pos");
  mustOk(call("job-cards.handoff", jobId, rowObj({{"targetModule", "project_management"}})),
         "handoff.pm");
  assert(handoffsCreated.count("ar:customer_repair_invoice"));
  assert(handoffsCreated.count("point_of_sale:pos_repair_checkout"));
  assert(handoffsCreated.count("project_management:major_repair_project"));
  assert(call("job-cards.transition", jobId, rowObj({{"action", "close"}, {"version", 1}}))
             .error["code"] == "conflict");
  jobStatus = "draft";
  mustOk(call("job-cards.transition", jobId, rowObj({{"action", "open"}, {"version", 1}})),
         "transition.open");
  mustOk(call("job-cards.transition", jobId, rowObj({{"action", "start"}, {"version", 1}})),
         "transition.start");
  mustOk(call("job-cards.transition", jobId, rowObj({{"action", "complete"}, {"version", 1}})),
         "transition.complete");
  mustOk(call("job-cards.transition", jobId, rowObj({{"action", "close"}, {"version", 1}})),
         "transition.close");

  // 8. Workshop Diary Ledger (Jan 2026 handwritten pattern: split across trucks & promote).
  mustOk(call("diary-entries.create", "",
              rowObj({{"accountingUnitId", unit},
                      {"entryDate", "2026-01-17"},
                      {"entryCategory", "parts"},
                      {"description", "2 new front brake pads @ Apedwa"},
                      {"locationOrVendor", "@ Apedwa"},
                      {"quantity", "2"},
                      {"unitAmount", "450"},
                      {"isPaid", false}})),
         "diary-entries.create");
  assert(call("diary-entries.next-number").result["nextNumber"].asString() == "DRY-00001");
  Json::Value allocs(Json::arrayValue);
  allocs.append(rowObj({{"vehicleId", vehId}, {"allocatedQuantity", "1"}, {"allocatedAmount", "450"}}));
  allocs.append(rowObj({{"vehicleId", trailerId}, {"allocatedQuantity", "1"}, {"allocatedAmount", "450"}}));
  mustOk(call("diary-entries.allocate", diaryId, rowObj({{"allocations", allocs}})),
         "diary-entries.allocate");
  mustOk(call("diary-entries.mark-paid", diaryId, rowObj({{"paymentReference", "CASH-JAN-17"}})),
         "diary-entries.mark-paid");
  mustOk(call("diary-entries.promote", diaryId, rowObj({{"vehicleId", vehId}})),
         "diary-entries.promote");

  // 9. Multi-currency reports across all 6 Mcguan tabs.
  for (const auto *tab :
       {"forecast", "fuel_lubs", "jobs", "tyres", "major_components", "others"}) {
    auto rep = FleetWorkshopService::execute(
                   "reports.run", "", "",
                   rowObj({{"tab", tab}, {"dateFrom", "2026-01-01"}, {"dateTo", "2026-01-31"},
                           {"exchangeRate", "1.25"}}),
                   1, 20, "", unit, who)
                   .get();
    assert(rep.success);
    assert(rep.result["tab"].asString() == tab);
    assert(rep.result["exchangeRate"].asString() == "1.25");
  }

  // 10. Real FleetWorkshopController HTTP status code & Cache-Control tests.
  FleetWorkshopController ctrl;
  auto rUnauth = ctrl.list(makeReq(drogon::Get, "", ""), "vehicles").get();
  assert(rUnauth->status == 401 && rUnauth->headers["Cache-Control"] == "no-store");

  Json::Value createPayload = grp;
  auto rCreated = ctrl.create(makeReq(drogon::Post, tenant, actor, &createPayload), "asset-groups").get();
  if (rCreated->status != 201 || !rCreated->body["success"].asBool()) {
    std::cerr << "FAIL [ctrl.create]: status=" << rCreated->status << " body=" << rCreated->body.toStyledString() << "\n";
    std::abort();
  }

  auto rSub = ctrl.subGet(makeReq(drogon::Get, tenant, actor), "asset-groups", grpId, "materials").get();
  if (rSub->status != 200) {
    std::cerr << "FAIL [ctrl.subGet]: status=" << rSub->status << " body=" << rSub->body.toStyledString() << "\n";
    std::abort();
  }

  auto rMile = ctrl.action(makeReq(drogon::Post, tenant, actor, &createPayload), "job-cards", jobId, "milestones").get();
  if (rMile->status != 400) {
    std::cerr << "FAIL [ctrl.action milestone]: status=" << rMile->status << " body=" << rMile->body.toStyledString() << "\n";
    std::abort();
  }

  auto rOpt = ctrl.options(makeReq(drogon::Get, tenant, actor), "vehicles").get();
  if (rOpt->status != 200) {
    std::cerr << "FAIL [ctrl.options]: status=" << rOpt->status << " body=" << rOpt->body.toStyledString() << "\n";
    std::abort();
  }

  auto rDel = ctrl.remove(makeReq(drogon::Delete, tenant, actor, nullptr, {{"version", "1"}}),
                          "job-cards", jobId)
                  .get();
  if (rDel->status != 409) {
    std::cerr << "FAIL [ctrl.remove]: status=" << rDel->status << " body=" << rDel->body.toStyledString() << "\n";
    std::abort();
  }

  auto rDash = ctrl.dashboard(makeReq(drogon::Get, tenant, actor, nullptr, {{"accountingUnitId", unit}})).get();
  assert(rDash->status == 200 && rDash->headers["Cache-Control"] == "no-store");

  auto rList = ctrl.list(makeReq(drogon::Get, tenant, actor), "vehicles").get();
  assert(rList->status == 200 && rList->headers["Cache-Control"] == "no-store");

  auto rNext = ctrl.nextNumber(makeReq(drogon::Get, tenant, actor, nullptr, {{"accountingUnitId", unit}}),
                               "diary-entries")
                   .get();
  assert(rNext->status == 200 && rNext->headers["Cache-Control"] == "no-store");

  auto rRep = ctrl.reports(makeReq(drogon::Get, tenant, actor, nullptr, {{"tab", "forecast"}})).get();
  assert(rRep->status == 200 && rRep->headers["Cache-Control"] == "no-store");

  Json::Value jobLinePayload = rowObj({{"lineType", "other"}, {"description", "Bay fee"}, {"quantity", "1"}, {"unitCost", "25"}});
  jobStatus = "open";
  auto rLineAdd = ctrl.action(makeReq(drogon::Post, tenant, actor, &jobLinePayload), "job-cards", jobId, "lines").get();
  assert(rLineAdd->status == 201 && rLineAdd->headers["Cache-Control"] == "no-store");
  jobStatus = "closed";
  auto rLineClosed = ctrl.action(makeReq(drogon::Post, tenant, actor, &jobLinePayload), "job-cards", jobId, "lines").get();
  assert(rLineClosed->status == 409 && rLineClosed->headers["Cache-Control"] == "no-store");

  auto savedPerms = permissions;
  const bool savedAdmin = isAdmin;
  permissions.clear();
  isAdmin = false;
  auto rForbid = ctrl.list(makeReq(drogon::Get, tenant, actor), "vehicles").get();
  assert(rForbid->status == 403 && rForbid->headers["Cache-Control"] == "no-store");
  permissions = savedPerms;
  isAdmin = savedAdmin;

  schemaOk = false;
  auto rUnavail = ctrl.list(makeReq(drogon::Get, tenant, actor), "vehicles").get();
  assert(rUnavail->status == 503 && rUnavail->headers["Cache-Control"] == "no-store");
  schemaOk = true;

  std::cout << "All Fleet & Workshop service, cross-module & controller seam tests passed ("
            << sqlLog.size() << " SQL statements exercised)\n";
  return 0;
}
