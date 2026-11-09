#include "InventoryService.h"
#include "InventoryInternal.h"
#include "domain_services/gl/JournalService.h"
#include "utils/TransactionUtil.h"
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <map>
#include <optional>
#include <vector>
#include <optional>
namespace business_desk::domain_services {
namespace {
using namespace inventory_internal;

// Exact 6-decimal scaled arithmetic: every quantity/value in the stock engine
// is numeric(20,6), so int64 scaled by 1e6 keeps postings exact.
constexpr long long SCALE = 1000000;
long long dec6(const std::string &s) {
  bool neg = !s.empty() && s[0] == '-';
  const std::string t = neg ? s.substr(1) : s;
  const auto dot = t.find('.');
  const auto whole = dot == std::string::npos ? t : t.substr(0, dot);
  const auto frac = dot == std::string::npos ? "" : t.substr(dot + 1);
  long long v = whole.empty() ? 0 : std::stoll(whole);
  long long f = 0;
  for (size_t i = 0; i < 6; i++)
    f = f * 10 + (i < frac.size() && frac[i] >= '0' && frac[i] <= '9' ? frac[i] - '0' : 0);
  v = v * SCALE + f;
  return neg ? -v : v;
}
std::string dec6str(long long v) {
  if (v == 0)
    return "0";
  const bool neg = v < 0;
  const unsigned long long a = neg ? (unsigned long long)(-(v + 1)) + 1 : v;
  char buf[48];
  if (a % SCALE == 0)
    std::snprintf(buf, sizeof buf, "%s%llu", neg ? "-" : "", (unsigned long long)(a / SCALE));
  else
    std::snprintf(buf, sizeof buf, "%s%llu.%06llu", neg ? "-" : "",
                  (unsigned long long)(a / SCALE), (unsigned long long)(a % SCALE));
  return buf;
}
// quantity (1e6 scale) * factor (SQL numeric text) -> 1e6 scale, half-up.
long long mulFactor(long long qty, const std::string &factor) {
  const long double prod = (long double)qty * std::stold(factor) / 1e10L;
  return prod >= 0 ? (long long)std::floor(prod + 0.5L)
                   : (long long)std::ceil(prod - 0.5L);
}
const std::map<std::string, std::set<std::string>> &reasons() {
  static const std::map<std::string, std::set<std::string>> map = {
      {"receipt", {"purchase_receipt", "opening_balance", "customer_return", "production_receipt", "other_receipt"}},
      {"issue", {"sales_issue", "production_issue", "damage", "expiry", "sample", "internal_use", "other_issue"}},
      {"transfer", {"inter_warehouse", "van_replenishment", "other_transfer"}},
      {"adjustment", {"recount", "shrinkage", "write_off", "other_adjustment"}},
      {"count", {"cycle_count", "annual_count"}},
  };
  return map;
}
std::string docPrefix(const std::string &type) {
  if (type == "receipt") return "RCV";
  if (type == "issue") return "ISS";
  if (type == "transfer") return "TRF";
  if (type == "count") return "CNT";
  return "ADJ";
}
std::string headerSelect() {
  return R"(SELECT (jsonb_build_object('id',d.id,'version',d.version,'accountingUnitId',d.accounting_unit_id,
'documentNumber',d.document_number,'documentType',d.document_type,'movementReason',d.movement_reason,
'documentDate',d.document_date,'status',d.status,'sourceWarehouseId',d.source_warehouse_id,
'destinationWarehouseId',d.destination_warehouse_id,'sourceWarehouse',sw.name,'sourceWarehouseCode',sw.code,
'destinationWarehouse',dw.name,'supplierId',d.supplier_id,'supplierName',sp.name,'customerId',d.customer_id,
'customerName',cu.name,'costCenterId',d.cost_center_id,'referenceNumber',d.reference_number,'notes',d.notes,
'totalQuantity',d.total_quantity::text,'totalValue',d.total_value::text,'periodId',d.period_id,
'journalBatchId',d.journal_batch_id,'reversalDocumentId',d.reversal_document_id,'currencyCode',cr.code,
'submittedAt',d.submitted_at,'approvedAt',d.approved_at,'postedAt',d.posted_at,'cancelledAt',d.cancelled_at,
'cancelReason',d.cancel_reason,'requestId',d.request_key,'createdAt',d.created_at,
'lastModifiedAt',d.last_modified_at))::text AS record
FROM inv_stock_documents d
JOIN inv_warehouses sw ON sw.tenant_id=d.tenant_id AND sw.id=d.source_warehouse_id
LEFT JOIN inv_warehouses dw ON dw.tenant_id=d.tenant_id AND dw.id=d.destination_warehouse_id
LEFT JOIN core_suppliers sp ON sp.tenant_id=d.tenant_id AND sp.id=d.supplier_id AND sp.is_deleted=false
LEFT JOIN core_customers cu ON cu.tenant_id=d.tenant_id AND cu.id=d.customer_id AND cu.is_deleted=false
JOIN core_currencies cr ON cr.id=d.currency_id)";
}
std::string linesSelect() {
  return R"(SELECT (jsonb_build_object('id',l.id,'version',l.version,'lineNumber',l.line_number,
'itemId',l.item_id,'itemCode',i.item_code,'itemName',i.name,'trackingMethod',i.tracking_method,
'valuationMethod',i.valuation_method,'batchId',l.batch_id,'batchNumber',bt.batch_number,
'uomId',l.uom_id,'uom',um.code,'conversionFactor',l.conversion_factor::text,'quantity',l.quantity::text,
'quantityBase',l.quantity_base::text,'countedQuantity',l.counted_quantity::text,'unitCost',l.unit_cost::text,
'lineValue',l.line_value::text,'sourceBinId',l.source_bin_id,'destinationBinId',l.destination_bin_id,
'serialNumbers',l.serial_numbers,'description',l.description))::text AS record
FROM inv_stock_document_lines l
JOIN inv_items i ON i.tenant_id=l.tenant_id AND i.id=l.item_id
JOIN inv_units_of_measure um ON um.tenant_id=l.tenant_id AND um.id=l.uom_id
LEFT JOIN inv_batches bt ON bt.tenant_id=l.tenant_id AND bt.id=l.batch_id AND bt.is_deleted=false
WHERE l.tenant_id=$1 AND l.document_id=$2::uuid AND l.is_deleted=false ORDER BY l.line_number,l.id)";
}
std::string eventsSelect() {
  return R"(SELECT (jsonb_build_object('id',e.id,'action',e.action,'previousStatus',e.previous_status,
'newStatus',e.new_status,'reason',e.reason,'version',e.version,'createdAt',e.created_at,
'actor',COALESCE(concat_ws(' ',u.first_name,u.last_name),'')))::text AS record
FROM inv_stock_document_events e LEFT JOIN users u ON u.id=e.created_by_user_id
WHERE e.tenant_id=$1 AND e.document_id=$2::uuid AND e.is_deleted=false ORDER BY e.version)";
}
drogon::Task<void> addEvent(DbClientPtr tx, const utils::AuditIdentity &who,
                            const std::string &docId, const char *action,
                            const std::string &prev, const std::string &next,
                            const std::string &reason) {
  co_await tx->execSqlCoro(
      "INSERT INTO inv_stock_document_events(tenant_id,document_id,action,previous_status,new_status,reason,"
      "version,created_by_user_id) SELECT $1,$2::uuid,$3,NULLIF($4,''),$5,$6,"
      "COALESCE((SELECT max(version) FROM inv_stock_document_events WHERE tenant_id=$1 AND "
      "document_id=$2::uuid),0)+1,$7",
      who.tenantId, docId, action, prev, next, reason, who.userId);
  co_return;
}
// ---------------------------------------------------------------------------
// Validation of the document body (header + lines), shared by HTTP create and
// the cross-module contract.
// ---------------------------------------------------------------------------
std::string validateDocument(Json::Value &b, bool update) {
  if (!b.isObject())
    return "Expected a document object.";
  static const std::set<std::string> headerKeys{
      "accountingUnitId", "documentType",          "movementReason",
      "documentDate",     "sourceWarehouseId",     "destinationWarehouseId",
      "supplierId",       "customerId",            "costCenterId",
      "referenceNumber",  "notes",                 "requestId",
      "lines",            "version"};
  static const std::set<std::string> lineKeys{
      "itemId", "uomId",       "quantity",   "unitCost",       "countedQuantity",
      "batchId", "batchCode",  "expiryDate", "sourceBinId",    "destinationBinId",
      "serialNumbers", "description"};
  for (const auto &k : b.getMemberNames())
    if (!headerKeys.count(k))
      return "Unknown or server-owned field: " + k;
  if (update && (!b["version"].isInt() || b["version"].asInt() < 1))
    return "A valid record version is required.";
  const auto requireUuid = [&](Json::Value &row, const char *key, bool required) -> std::string {
    auto &v = row[key];
    if (!v.isString() || trim(v.asString()).empty()) {
      if (required)
        return std::string(key) + ": a UUID is required.";
      v = Json::nullValue;
      return {};
    }
    const auto s = lower(trim(v.asString()));
    if (!uuid(s))
      return std::string(key) + ": invalid UUID.";
    v = s;
    return {};
  };
  if (const auto p = requireUuid(b, "accountingUnitId", true); !p.empty()) return p;
  if (const auto p = requireUuid(b, "sourceWarehouseId", true); !p.empty()) return p;
  if (const auto p = requireUuid(b, "destinationWarehouseId", false); !p.empty()) return p;
  if (const auto p = requireUuid(b, "supplierId", false); !p.empty()) return p;
  if (const auto p = requireUuid(b, "customerId", false); !p.empty()) return p;
  if (const auto p = requireUuid(b, "costCenterId", false); !p.empty()) return p;
  if (const auto p = requireUuid(b, "requestId", false); !p.empty()) return p;
  if (!b["documentType"].isString() || !reasons().count(lower(trim(b["documentType"].asString()))))
    return "documentType must be receipt, issue, transfer, adjustment or count.";
  b["documentType"] = lower(trim(b["documentType"].asString()));
  const std::string type = b["documentType"].asString();
  if (!b["movementReason"].isString() ||
      !reasons().at(type).count(lower(trim(b["movementReason"].asString()))))
    return "movementReason is not valid for this document type.";
  b["movementReason"] = lower(trim(b["movementReason"].asString()));
  const std::string reason = b["movementReason"].asString();
  if (!b["documentDate"].isString() || !date(trim(b["documentDate"].asString())))
    return "documentDate: use a valid ISO date (1900-2999).";
  b["documentDate"] = trim(b["documentDate"].asString());
  if (!b["referenceNumber"].isString() || !text(b["referenceNumber"].asString(), 1000))
    return "referenceNumber: up to 1000 characters.";
  if (!b["notes"].isString() || !text(b["notes"].asString(), 1000))
    return "notes: up to 1000 characters.";
  if ((type == "transfer") != !b["destinationWarehouseId"].isNull())
    return type == "transfer" ? "destinationWarehouseId is required for transfers."
                              : "destinationWarehouseId only applies to transfers.";
  if (!b["destinationWarehouseId"].isNull() &&
      b["sourceWarehouseId"] == b["destinationWarehouseId"])
    return "Transfer warehouses must differ.";
  if (reason == "purchase_receipt" && b["supplierId"].isNull())
    return "supplierId is required for purchase receipts.";
  if ((reason == "sales_issue" || reason == "customer_return") && b["customerId"].isNull())
    return "customerId is required for this movement reason.";
  if (type == "receipt" && !b["customerId"].isNull() && reason != "customer_return")
    return "customerId applies to customer returns only.";
  if (!b["lines"].isArray() || b["lines"].empty() || b["lines"].size() > 200)
    return "Enter between 1 and 200 document lines.";
  std::set<std::string> serialsSeen;
  for (auto &l : b["lines"]) {
    if (!l.isObject())
      return "Each line must be an object.";
    for (const auto &k : l.getMemberNames())
      if (!lineKeys.count(k))
        return "Unknown line field: " + k;
    if (const auto p = requireUuid(l, "itemId", true); !p.empty()) return p;
    if (const auto p = requireUuid(l, "uomId", true); !p.empty()) return p;
    if (const auto p = requireUuid(l, "batchId", false); !p.empty()) return p;
    if (const auto p = requireUuid(l, "sourceBinId", false); !p.empty()) return p;
    if (const auto p = requireUuid(l, "destinationBinId", false); !p.empty()) return p;
    if (!l["description"].isString() || !text(l["description"].asString(), 500))
      return "Line description: up to 500 characters.";
    if (!l["batchCode"].isString() || !text(l["batchCode"].asString(), 80))
      return "batchCode: up to 80 characters.";
    l["batchCode"] = trim(l["batchCode"].asString());
    if (!l["expiryDate"].isNull()) {
      if (!l["expiryDate"].isString() || !date(trim(l["expiryDate"].asString())))
        return "expiryDate: use a valid ISO date.";
      l["expiryDate"] = trim(l["expiryDate"].asString());
    }
    if (type == "count") {
      if (!l["countedQuantity"].isString() || !decimal(trim(l["countedQuantity"].asString())))
        return "countedQuantity: non-negative decimal string required.";
      l["countedQuantity"] = trim(l["countedQuantity"].asString());
      l["quantity"] = "0";
    } else {
      l.removeMember("countedQuantity");
      if (!l["quantity"].isString() || !decimal(trim(l["quantity"].asString()), type == "adjustment"))
        return type == "adjustment" ? "Line quantity: signed decimal string required."
                                    : "Line quantity: non-negative decimal string required.";
      l["quantity"] = trim(l["quantity"].asString());
      if (l["quantity"].asString() == "0")
        return "Stock movement lines require a non-zero quantity.";
      if (type != "adjustment" && l["quantity"].asString()[0] == '-')
        return "Receipts, issues and transfers use positive quantities.";
    }
    if (!l["unitCost"].isString())
      l["unitCost"] = "0";
    if (!decimal(trim(l["unitCost"].asString())))
      return "unitCost: non-negative decimal string required.";
    l["unitCost"] = trim(l["unitCost"].asString());
    if (l["serialNumbers"].isNull())
      l["serialNumbers"] = Json::arrayValue;
    if (!l["serialNumbers"].isArray() || l["serialNumbers"].size() > 1000)
      return "serialNumbers must be an array of up to 1000 entries.";
    for (auto &sn : l["serialNumbers"]) {
      if (!sn.isString() || trim(sn.asString()).empty() || !text(sn.asString(), 120))
        return "serialNumbers: 1-120 characters each.";
      sn = trim(sn.asString());
      if (!serialsSeen.insert(lower(sn.asString())).second)
        return "serialNumbers contains a duplicate.";
    }
  }
  return {};
}
struct PreparedLine {
  Json::Value line; // normalized client line, extended with factor/batchId
  Json::Value item;
  std::string batchId;
  long long qtyBase = 0;   // signed, 1e6 scale, in base units
  long long unitCost = 0;  // 1e6 scale per base unit as entered
};
// Lock each item and resolve conversions/tracking rules per line.
drogon::Task<dto::BaseApiResponse>
prepareLines(DbClientPtr tx, const utils::AuditIdentity &who, const std::string &type,
             const std::string &sourceWarehouse,
             Json::Value &body, std::vector<PreparedLine> &prepared) {
  prepared.clear();
  std::map<std::string, Json::Value> items;
  for (auto &l : body["lines"]) {
    const std::string itemKey = l["itemId"].asString();
    if (!items.count(itemKey)) {
      const auto rows = co_await tx->execSqlCoro(
          "SELECT (jsonb_build_object('id',i.id,'itemCode',i.item_code,'name',i.name,'itemType',i.item_type,"
          "'baseUomId',i.base_uom_id,'trackingMethod',i.tracking_method,'valuationMethod',i.valuation_method,"
          "'standardCost',i.standard_cost::text,'averageUnitCost',i.average_unit_cost::text,"
          "'lastUnitCost',i.last_unit_cost::text,'status',i.status,"
          "'inventoryAccountId',i.inventory_account_id,'cogsAccountId',i.cogs_account_id,"
          "'varianceAccountId',i.variance_account_id,'purchaseAccountId',i.purchase_account_id))::text AS record "
          "FROM inv_items i WHERE i.tenant_id=$1 AND i.id=$2::uuid AND i.is_deleted=false FOR UPDATE OF i",
          who.tenantId, itemKey);
      if (rows.empty())
        co_return fail("validation_error", "Select live catalog items only.");
      auto item = parse(rows[0]["record"].as<std::string>());
      if (item["status"].asString() != "active")
        co_return fail("validation_error", item["itemCode"].asString() + " is not active.");
      if (item["itemType"].asString() != "stock")
        co_return fail("validation_error",
                       item["itemCode"].asString() + " is not a stocked item.");
      items[itemKey] = item;
    }
    PreparedLine pl;
    pl.line = l;
    pl.item = items[itemKey];
    const std::string tracking = pl.item["trackingMethod"].asString();
    if (type == "count") {
      pl.qtyBase = dec6(l["countedQuantity"].asString()); // delta resolved at posting
      pl.line["conversionFactor"] = "1";
    } else {
      const auto factor = co_await tx->execSqlCoro(
          "SELECT CASE WHEN $3::uuid=$4::uuid THEN 1::numeric "
          "ELSE COALESCE((SELECT c.factor FROM inv_item_uom_conversions c WHERE c.tenant_id=$1 AND "
          "c.item_id=$2::uuid AND c.from_uom_id=$3::uuid AND c.to_uom_id=$4::uuid AND c.is_deleted=false AND c.is_active),"
          "(SELECT 1/c.factor FROM inv_item_uom_conversions c WHERE c.tenant_id=$1 AND c.item_id=$2::uuid "
          "AND c.from_uom_id=$4::uuid AND c.to_uom_id=$3::uuid AND c.is_deleted=false AND c.is_active)) END::text AS factor",
          who.tenantId, itemKey, l["uomId"].asString(), pl.item["baseUomId"].asString());
      if (factor.empty() || factor[0]["factor"].isNull())
        co_return fail("validation_error",
                       "No unit conversion from the line unit to the base unit of " +
                           pl.item["itemCode"].asString() + ".");
      const std::string fstr = factor[0]["factor"].as<std::string>();
      pl.qtyBase = mulFactor(dec6(l["quantity"].asString()), fstr);
      if (dec6(l["quantity"].asString()) != 0 && pl.qtyBase == 0)
        co_return fail("validation_error",
                       "Converted base quantity rounds to zero for " +
                           pl.item["itemCode"].asString() + ".");
      pl.line["conversionFactor"] = fstr;
    }
    pl.unitCost = dec6(l["unitCost"].asString());
    if (tracking == "batch") {
      const bool inbound = type == "receipt" || (type == "adjustment" && pl.qtyBase > 0);
      if (inbound && l["batchId"].isNull() && l["batchCode"].asString().empty())
        co_return fail("validation_error",
                       pl.item["itemCode"].asString() +
                           " is batch-tracked: provide batchId or a new batchCode.");
      if (!inbound && type != "transfer" && l["batchId"].isNull() && type != "count" && false)
        co_return fail("validation_error", "Provide batchId.");
      if ((type == "issue" || type == "transfer" || type == "count" ||
           (type == "adjustment" && pl.qtyBase < 0)) && l["batchId"].isNull() &&
          l["batchCode"].asString().empty())
        co_return fail("validation_error",
                       pl.item["itemCode"].asString() +
                           " is batch-tracked: provide batchId or batchCode.");
      if (!l["batchId"].isNull()) {
        const auto batch = co_await tx->execSqlCoro(
            "SELECT id FROM inv_batches WHERE tenant_id=$1 AND id=$2::uuid AND item_id=$3::uuid "
            "AND is_deleted=false FOR SHARE",
            who.tenantId, l["batchId"].asString(), itemKey);
        if (batch.empty())
          co_return fail("validation_error", "Unknown batch for this item.");
      }
      if (l["batchId"].isNull() && !l["batchCode"].asString().empty()) {
        const auto ins = co_await tx->execSqlCoro(
            "INSERT INTO inv_batches(tenant_id,item_id,batch_number,expiry_date,quality_status,created_by_user_id) "
            "VALUES($1,$2::uuid,$3,NULLIF($4::text,'')::date,'accepted',$5) "
            "ON CONFLICT(tenant_id,item_id,lower(btrim(batch_number))) WHERE is_deleted=false DO NOTHING RETURNING id",
            who.tenantId, itemKey, l["batchCode"].asString(),
            l["expiryDate"].asString(), who.userId);
        std::string created;
        if (!ins.empty())
          created = ins[0]["id"].as<std::string>();
        else {
          const auto existing = co_await tx->execSqlCoro(
              "SELECT id FROM inv_batches WHERE tenant_id=$1 AND item_id=$2::uuid AND "
              "lower(btrim(batch_number))=lower($3) AND is_deleted=false FOR SHARE",
              who.tenantId, itemKey, l["batchCode"].asString());
          if (existing.empty())
            co_return fail("database_error", "Unable to register the batch.");
          created = existing[0]["id"].as<std::string>();
        }
        l["batchId"] = created;
      }
      pl.batchId = l["batchId"].isNull() ? "" : l["batchId"].asString();
    } else if (tracking == "none" &&
               (!l["batchId"].isNull() || !l["batchCode"].asString().empty()))
      co_return fail("validation_error",
                     pl.item["itemCode"].asString() + " is not batch-tracked.");
    if (tracking == "serial") {
      const long long qty = dec6(l["quantity"].asString());
      if (qty % SCALE != 0 || std::llabs(qty) != (long long)l["serialNumbers"].size())
        co_return fail("validation_error",
                       pl.item["itemCode"].asString() +
                           " is serial-tracked: whole units, one serial number per unit.");
      if (type == "count")
        co_return fail("validation_error",
                       "Use an adjustment document for serial-tracked quantities.");
      const bool outbound = type == "issue" || type == "transfer" ||
                            (type == "adjustment" && qty < 0);
      if (outbound) {
        const auto found = co_await tx->execSqlCoro(
            "SELECT serial_number FROM inv_serial_numbers WHERE tenant_id=$1 AND item_id=$2::uuid "
            "AND is_deleted=false AND status='in_stock' AND warehouse_id=$3::uuid AND lower(serial_number) "
            "IN(SELECT lower(value::text) FROM jsonb_array_elements_text($4::jsonb)) FOR UPDATE",
            who.tenantId, itemKey, sourceWarehouse, json(l["serialNumbers"]));
        if (found.size() != l["serialNumbers"].size())
          co_return fail("validation_error",
                         "Some serial numbers are not in stock at the source warehouse for " +
                             pl.item["itemCode"].asString() + ".");
      }
    } else if (!l["serialNumbers"].empty())
      co_return fail("validation_error",
                     pl.item["itemCode"].asString() + " is not serial-tracked.");
    // Bins must belong to the movement warehouse on their side.
    if (!l["sourceBinId"].isNull()) {
      const auto bin = co_await tx->execSqlCoro(
          "SELECT id FROM inv_bin_locations WHERE tenant_id=$1 AND id=$2::uuid AND "
          "warehouse_id=$3::uuid AND is_deleted=false",
          who.tenantId, l["sourceBinId"].asString(), sourceWarehouse);
      if (bin.empty())
        co_return fail("validation_error", "sourceBinId must belong to the source warehouse.");
    }
    if (!l["destinationBinId"].isNull()) {
      const auto dest = body["destinationWarehouseId"].isNull()
                            ? body["sourceWarehouseId"].asString()
                            : body["destinationWarehouseId"].asString();
      const auto bin = co_await tx->execSqlCoro(
          "SELECT id FROM inv_bin_locations WHERE tenant_id=$1 AND id=$2::uuid AND "
          "warehouse_id=$3::uuid AND is_deleted=false",
          who.tenantId, l["destinationBinId"].asString(), dest);
      if (bin.empty())
        co_return fail("validation_error", "destinationBinId must belong to the destination warehouse.");
    }
    prepared.push_back(std::move(pl));
  }
  dto::BaseApiResponse ok;
  ok.success = true;
  co_return ok;
}
drogon::Task<std::string> allocateNumber(DbClientPtr tx, const utils::AuditIdentity &who,
                                         const std::string &unit, const std::string &type) {
  const auto seq = co_await tx->execSqlCoro(
      "INSERT INTO inv_document_sequences(tenant_id,accounting_unit_id,document_type,prefix,padding,next_number,"
      "created_by_user_id) VALUES($1,$2::uuid,$3,$4,5,2,$5) "
      "ON CONFLICT(tenant_id,accounting_unit_id,document_type) DO UPDATE SET "
      "next_number=inv_document_sequences.next_number+1 "
      "RETURNING prefix||'-'||lpad((next_number-1)::text,padding,'0') AS number",
      who.tenantId, unit, type, docPrefix(type), who.userId);
  co_return seq[0]["number"].as<std::string>();
}
drogon::Task<dto::BaseApiResponse> fetchDocument(DbClientPtr db, const utils::AuditIdentity &who,
                                                 const std::string &id) {
  const auto head = co_await db->execSqlCoro(
      headerSelect() + " WHERE d.tenant_id=$1 AND d.id=$2::uuid AND d.is_deleted=false",
      who.tenantId, id);
  dto::BaseApiResponse r;
  if (head.empty())
    co_return fail("not_found", "Stock document not found.");
  r.result = parse(head[0]["record"].as<std::string>());
  const auto lines = co_await db->execSqlCoro(linesSelect(), who.tenantId, id);
  r.result["lines"] = Json::arrayValue;
  for (const auto &row : lines)
    r.result["lines"].append(parse(row["record"].as<std::string>()));
  const auto events = co_await db->execSqlCoro(eventsSelect(), who.tenantId, id);
  r.result["events"] = Json::arrayValue;
  for (const auto &row : events)
    r.result["events"].append(parse(row["record"].as<std::string>()));
  r.success = true;
  co_return r;
}
drogon::Task<void> insertLines(DbClientPtr tx, const utils::AuditIdentity &who,
                               const std::string &docId, const std::string &type,
                               const std::vector<PreparedLine> &prepared) {
  int lineNo = 0;
  for (const auto &pl : prepared) {
    Json::Value record;
    record["document_id"] = docId;
    record["line_number"] = ++lineNo;
    record["item_id"] = pl.item["id"].asString();
    record["uom_id"] = pl.line["uomId"].asString();
    record["conversion_factor"] = pl.line["conversionFactor"].asString();
    record["quantity"] = pl.line["quantity"].asString();
    record["quantity_base"] = type == "count" ? "0" : dec6str(pl.qtyBase);
    if (type == "count")
      record["counted_quantity"] = pl.line["countedQuantity"].asString();
    record["unit_cost"] = pl.line["unitCost"].asString();
    record["line_value"] = dec6str(std::llabs(pl.qtyBase) * pl.unitCost / SCALE);
    if (pl.batchId.empty())
      record["batch_id"] = Json::nullValue;
    else
      record["batch_id"] = pl.batchId;
    if (pl.line["sourceBinId"].isString())
      record["source_bin_id"] = pl.line["sourceBinId"].asString();
    if (pl.line["destinationBinId"].isString())
      record["destination_bin_id"] = pl.line["destinationBinId"].asString();
    record["serial_numbers"] = pl.line["serialNumbers"];
    record["description"] = pl.line["description"].asString();
    const std::string payload = Json::writeString(Json::StreamWriterBuilder{}, record);
    co_await tx->execSqlCoro(
        "INSERT INTO inv_stock_document_lines(tenant_id,document_id,line_number,item_id,uom_id,conversion_factor,"
        "quantity,quantity_base,counted_quantity,unit_cost,line_value,batch_id,source_bin_id,destination_bin_id,"
        "serial_numbers,description,created_by_user_id) "
        "SELECT $1::uuid,p.document_id,p.line_number,p.item_id,p.uom_id,p.conversion_factor,p.quantity,p.quantity_base,"
        "p.counted_quantity,p.unit_cost,p.line_value,p.batch_id,p.source_bin_id,p.destination_bin_id,"
        "p.serial_numbers,p.description,$2::uuid "
        "FROM jsonb_populate_record(NULL::inv_stock_document_lines,$3::jsonb) p",
        who.tenantId, who.userId, payload);
  }
  co_return;
}
// Insert header + prepared lines; returns id/number in `r.result`.
drogon::Task<dto::BaseApiResponse>
insertDocument(DbClientPtr tx, const utils::AuditIdentity &who, Json::Value &body,
               const std::vector<PreparedLine> &prepared, const std::string &number) {
  const auto unitRow = co_await tx->execSqlCoro(
      "SELECT id,base_currency_id FROM core_accounting_units WHERE tenant_id=$1 AND id=$2::uuid "
      "AND is_deleted=false AND is_active=true FOR SHARE",
      who.tenantId, body["accountingUnitId"].asString());
  if (unitRow.empty())
    co_return fail("not_found", "Accounting unit not found.");
  long long totalQty = 0, totalValue = 0;
  for (const auto &pl : prepared) {
    totalQty += std::llabs(pl.qtyBase);
    const long long basis =
        pl.item["valuationMethod"].asString() == "standard"
            ? dec6(pl.item["standardCost"].asString())
            : pl.unitCost;
    totalValue += std::llabs(pl.qtyBase) * basis / SCALE;
  }
  const std::string refNo = trim(body["referenceNumber"].asString()).substr(0, 80);
  const auto saved = co_await tx->execSqlCoro(
      "INSERT INTO inv_stock_documents(tenant_id,accounting_unit_id,document_number,document_type,movement_reason,"
      "document_date,source_warehouse_id,destination_warehouse_id,supplier_id,customer_id,cost_center_id,"
      "reference_number,notes,currency_id,request_key,total_quantity,total_value,created_by_user_id) "
      "VALUES($1,$2::uuid,$3,$4,$5,$6::date,$7::uuid,NULLIF($8::text,'')::uuid,NULLIF($9::text,'')::uuid,"
      "NULLIF($10::text,'')::uuid,NULLIF($11::text,'')::uuid,$12,$13,$14::uuid,NULLIF($15::text,'')::uuid,"
      "($16::text)::numeric,($17::text)::numeric,$18) RETURNING id",
      who.tenantId, body["accountingUnitId"].asString(), number,
      body["documentType"].asString(), body["movementReason"].asString(),
      body["documentDate"].asString(), body["sourceWarehouseId"].asString(),
      body["destinationWarehouseId"].isNull() ? "" : body["destinationWarehouseId"].asString(),
      body["supplierId"].isNull() ? "" : body["supplierId"].asString(),
      body["customerId"].isNull() ? "" : body["customerId"].asString(),
      body["costCenterId"].isNull() ? "" : body["costCenterId"].asString(),
      refNo, body["notes"].asString(),
      unitRow[0]["base_currency_id"].as<std::string>(),
      body["requestId"].isNull() ? "" : body["requestId"].asString(),
      dec6str(totalQty), dec6str(totalValue), who.userId);
  const std::string docId = saved[0]["id"].as<std::string>();
  co_await insertLines(tx, who, docId, body["documentType"].asString(), prepared);
  co_await addEvent(tx, who, docId, "created", "", "draft", "");
  dto::BaseApiResponse r;
  r.result["id"] = docId;
  r.result["documentNumber"] = number;
  r.success = true;
  co_return r;
}
// ---------------------------------------------------------------------------
// Posting engine.
// ---------------------------------------------------------------------------
struct MovementResult {
  long long value = 0;     // absolute stock value moved (1e6)
  long long unitCost = 0;  // absolute per-base-unit cost applied (1e6)
  long long newOnHand = 0;
  long long newValue = 0;
  long long variance = 0;  // standard-cost receipt price variance (signed)
};
drogon::Task<dto::BaseApiResponse>
applyMovement(DbClientPtr tx, const utils::AuditIdentity &who, const Json::Value &doc,
              const Json::Value &line, const Json::Value &item, const std::string &warehouse,
              long long signedQty, long long inboundCost, MovementResult &out) {
  dto::BaseApiResponse bad;
  const std::string method = item["valuationMethod"].asString();
  const std::string batchId = line["batchId"].isNull() ? "" : line["batchId"].asString();
  co_await tx->execSqlCoro(
      "INSERT INTO inv_stock_balances(tenant_id,item_id,warehouse_id,batch_id,created_by_user_id) "
      "VALUES($1,$2::uuid,$3::uuid,NULLIF($4::text,'')::uuid,$5) "
      "ON CONFLICT ON CONSTRAINT uq_inv_stock_balances_scope DO NOTHING",
      who.tenantId, item["id"].asString(), warehouse, batchId, who.userId);
  const auto balance = co_await tx->execSqlCoro(
      "SELECT id,quantity_on_hand::text AS q,average_unit_cost::text AS c,stock_value::text AS v,version "
      "FROM inv_stock_balances WHERE tenant_id=$1 AND item_id=$2::uuid AND warehouse_id=$3::uuid "
      "AND batch_id IS NOT DISTINCT FROM NULLIF($4::text,'')::uuid AND is_deleted=false FOR UPDATE",
      who.tenantId, item["id"].asString(), warehouse, batchId);
  const long long oldQty = dec6(balance[0]["q"].as<std::string>());
  const long long oldValue = dec6(balance[0]["v"].as<std::string>());
  const long long oldAvg = dec6(balance[0]["c"].as<std::string>());
  const long long newQty = oldQty + signedQty;
  const bool inbound = signedQty > 0;
  const long long standard = method == "standard" ? dec6(item["standardCost"].asString()) : 0;
  long long applied = 0, newValue = oldValue, newAvg = oldAvg;
  // Sentinel: inboundCost < 0 means "use the current average cost".
  long long inCost = inboundCost;
  if (signedQty > 0 && inCost < 0)
    inCost = oldAvg > 0 ? oldAvg : dec6(item["lastUnitCost"].asString());
  if (signedQty == 0) {
    out.value = 0;
    out.unitCost = 0;
    out.newOnHand = newQty;
    out.newValue = newValue;
    bad.success = true;
    co_return bad;
  }
  if (inbound) {
    if (method == "standard") {
      applied = signedQty * standard / SCALE;
      out.variance = signedQty * inCost / SCALE - applied;
    } else
      applied = signedQty * inCost / SCALE;
    newValue = (oldQty <= 0) ? applied : oldValue + applied;
    newAvg = newQty != 0 ? newValue * SCALE / newQty
                         : (method == "standard" ? standard : inCost);
    if (method == "fifo")
      co_await tx->execSqlCoro(
          "INSERT INTO inv_cost_layers(tenant_id,item_id,warehouse_id,batch_id,quantity_received,"
          "quantity_remaining,unit_cost,document_id,document_line_id,document_number,created_by_user_id) "
          "VALUES($1,$2::uuid,$3::uuid,NULLIF($4::text,'')::uuid,($5::text)::numeric,($5::text)::numeric,"
          "($6::text)::numeric,$7::uuid,$8::uuid,$9,$10)",
          who.tenantId, item["id"].asString(), warehouse, batchId, dec6str(signedQty),
          dec6str(inCost), doc["id"].asString(), line["id"].asString(),
          doc["documentNumber"].asString(), who.userId);
  } else {
    const long long qty = -signedQty;
    if (method == "fifo") {
      long long remaining = qty;
      const auto layers = co_await tx->execSqlCoro(
          "SELECT id,quantity_remaining::text AS q,unit_cost::text AS c FROM inv_cost_layers "
          "WHERE tenant_id=$1 AND item_id=$2::uuid AND warehouse_id=$3::uuid "
          "AND batch_id IS NOT DISTINCT FROM NULLIF($4::text,'')::uuid AND is_deleted=false "
          "AND quantity_remaining>0 ORDER BY received_at,id FOR UPDATE",
          who.tenantId, item["id"].asString(), warehouse, batchId);
      for (const auto &layer : layers) {
        if (remaining <= 0)
          break;
        const long long layerQty = dec6(layer["q"].as<std::string>());
        const long long take = std::min(layerQty, remaining);
        applied += take * dec6(layer["c"].as<std::string>()) / SCALE;
        co_await tx->execSqlCoro(
            "UPDATE inv_cost_layers SET quantity_remaining=quantity_remaining-($3::text)::numeric,"
            "version=version+1,last_modified_at=now(),last_modified_by_user_id=$4 "
            "WHERE tenant_id=$1 AND id=$2::uuid",
            who.tenantId, layer["id"].as<std::string>(), dec6str(take), who.userId);
        remaining -= take;
      }
      if (remaining > 0)
        applied += remaining *
                   (oldAvg > 0 ? oldAvg : dec6(item["lastUnitCost"].asString())) / SCALE;
    } else {
      const long long unit = method == "standard" ? standard
                             : (oldAvg > 0 ? oldAvg : dec6(item["lastUnitCost"].asString()));
      applied = qty * unit / SCALE;
    }
    if (newQty < 0 && oldQty > 0) {
      // Only what existed can leave: shortfall (negative-stock warehouses) is
      // valued at zero cost so balances never go negative in value.
      applied = oldValue > 0 ? oldValue : 0;
    } else if (newQty < 0) {
      applied = 0;
    }
    newValue = newQty <= 0 ? 0 : oldValue - applied;
  }
  out.value = applied;
  out.unitCost = inbound ? (method == "standard" ? standard : inCost)
                         : (std::llabs(signedQty) > 0
                                ? applied * SCALE / std::llabs(signedQty)
                                : 0);
  out.newOnHand = newQty;
  out.newValue = newValue;
  co_await tx->execSqlCoro(
      "UPDATE inv_stock_balances SET quantity_on_hand=($3::text)::numeric,average_unit_cost=($4::text)::numeric,"
      "stock_value=($5::text)::numeric,last_movement_at=now(),version=version+1,last_modified_at=now(),"
      "last_modified_by_user_id=$6 WHERE tenant_id=$1 AND id=$2::uuid",
      who.tenantId, balance[0]["id"].as<std::string>(), dec6str(newQty),
      dec6str(newAvg < 0 ? 0 : newAvg), dec6str(newValue), who.userId);
  // Item costing statistics follow movements.
  co_await tx->execSqlCoro(
      "UPDATE inv_items i SET average_unit_cost=COALESCE((SELECT sum(b.stock_value)/NULLIF(sum(b.quantity_on_hand),0) "
      "FROM inv_stock_balances b WHERE b.tenant_id=i.tenant_id AND b.item_id=i.id AND b.is_deleted=false "
      "AND b.quantity_on_hand>0),0),last_unit_cost=CASE WHEN $3::boolean THEN ($4::text)::numeric ELSE i.last_unit_cost END,"
      "last_modified_at=now(),last_modified_by_user_id=$5,version=version+1 "
      "WHERE i.tenant_id=$1 AND i.id=$2::uuid",
      who.tenantId, item["id"].asString(), inbound, dec6str(out.unitCost), who.userId);
  bad.success = true;
  co_return bad;
}
drogon::Task<void> insertLedger(DbClientPtr tx, const utils::AuditIdentity &who,
                                const Json::Value &doc, const Json::Value &line,
                                const Json::Value &item, const std::string &warehouse,
                                long long signedQty, const MovementResult &mv) {
  const std::string batchId = line["batchId"].isNull() ? "" : line["batchId"].asString();
  co_await tx->execSqlCoro(
      "INSERT INTO inv_stock_transactions(tenant_id,accounting_unit_id,item_id,warehouse_id,batch_id,"
      "document_id,document_line_id,document_number,document_type,movement_reason,transaction_date,"
      "quantity,unit_cost,stock_value,balance_quantity,balance_value,costing_method,reference_number,"
      "created_by_user_id) VALUES($1,$2::uuid,$3::uuid,$4::uuid,NULLIF($5::text,'')::uuid,$6::uuid,$7::uuid,"
      "$8,$9,$10,$11::date,($12::text)::numeric,($13::text)::numeric,($14::text)::numeric,($15::text)::numeric,"
      "($16::text)::numeric,$17,$18,$19)",
      who.tenantId, doc["accountingUnitId"].asString(), item["id"].asString(), warehouse, batchId,
      doc["id"].asString(), line["id"].asString(), doc["documentNumber"].asString(),
      doc["documentType"].asString(), doc["movementReason"].asString(),
      doc["documentDate"].asString(), dec6str(signedQty), dec6str(mv.unitCost),
      dec6str(signedQty >= 0 ? mv.value : -mv.value), dec6str(mv.newOnHand),
      dec6str(mv.newValue), item["valuationMethod"].asString(),
      doc["referenceNumber"].asString(), who.userId);
  co_return;
}
// Lock the balance row for a scope and return its on-hand quantity (1e6).
drogon::Task<long long> lockOnHand(DbClientPtr tx, const utils::AuditIdentity &who,
                                   const std::string &itemId, const std::string &warehouse,
                                   const std::string &batchId) {
  co_await tx->execSqlCoro(
      "INSERT INTO inv_stock_balances(tenant_id,item_id,warehouse_id,batch_id,created_by_user_id) "
      "VALUES($1,$2::uuid,$3::uuid,NULLIF($4::text,'')::uuid,$5) "
      "ON CONFLICT ON CONSTRAINT uq_inv_stock_balances_scope DO NOTHING",
      who.tenantId, itemId, warehouse, batchId, who.userId);
  const auto bal = co_await tx->execSqlCoro(
      "SELECT quantity_on_hand::text AS q FROM inv_stock_balances WHERE tenant_id=$1 AND item_id=$2::uuid "
      "AND warehouse_id=$3::uuid AND batch_id IS NOT DISTINCT FROM NULLIF($4::text,'')::uuid "
      "AND is_deleted=false FOR UPDATE",
      who.tenantId, itemId, warehouse, batchId);
  co_return bal.empty() ? 0 : dec6(bal[0]["q"].as<std::string>());
}
// Serial number side-effects of a posted movement.
drogon::Task<void> applySerials(DbClientPtr tx, const utils::AuditIdentity &who,
                                const Json::Value &line, const Json::Value &item,
                                const std::string &type, const std::string &reason,
                                long long signedQty, const std::string &source,
                                const std::string &destination) {
  if (line["serialNumbers"].empty())
    co_return;
  const std::string batchId = line["batchId"].isNull() ? "" : line["batchId"].asString();
  if (type == "issue" || (type == "adjustment" && signedQty < 0)) {
    const char *outStatus =
        (reason == "damage" || reason == "expiry" || reason == "write_off") ? "defective" : "issued";
    for (const auto &sn : line["serialNumbers"])
      co_await tx->execSqlCoro(
          "UPDATE inv_serial_numbers SET status=$4,issued_at=now(),version=version+1,"
          "last_modified_at=now(),last_modified_by_user_id=$5 WHERE tenant_id=$1 AND item_id=$2::uuid "
          "AND lower(serial_number)=lower($3) AND is_deleted=false",
          who.tenantId, item["id"].asString(), sn.asString(), outStatus, who.userId);
    co_return;
  }
  if (type == "transfer") {
    for (const auto &sn : line["serialNumbers"])
      co_await tx->execSqlCoro(
          "UPDATE inv_serial_numbers SET warehouse_id=$4::uuid,version=version+1,"
          "last_modified_at=now(),last_modified_by_user_id=$5 WHERE tenant_id=$1 AND item_id=$2::uuid "
          "AND lower(serial_number)=lower($3) AND is_deleted=false",
          who.tenantId, item["id"].asString(), sn.asString(), destination, who.userId);
    co_return;
  }
  // Inbound (receipt / positive adjustment): register the serial, reusing an
  // existing tracked unit when it left stock before (returns, reversals).
  for (const auto &sn : line["serialNumbers"]) {
    const auto reused = co_await tx->execSqlCoro(
        "UPDATE inv_serial_numbers SET status='in_stock',warehouse_id=$4::uuid,batch_id=NULLIF($5::text,'')::uuid,"
        "received_at=now(),version=version+1,last_modified_at=now(),last_modified_by_user_id=$6 "
        "WHERE tenant_id=$1 AND item_id=$2::uuid AND lower(serial_number)=lower($3) AND is_deleted=false "
        "AND status IN('issued','returned','defective') RETURNING id",
        who.tenantId, item["id"].asString(), sn.asString(), source, batchId, who.userId);
    if (reused.empty())
      co_await tx->execSqlCoro(
          "INSERT INTO inv_serial_numbers(tenant_id,item_id,serial_number,batch_id,warehouse_id,status,"
          "received_at,created_by_user_id) VALUES($1,$2::uuid,$3,NULLIF($4::text,'')::uuid,$5::uuid,"
          "'in_stock',now(),$6)",
          who.tenantId, item["id"].asString(), sn.asString(), batchId, source, who.userId);
  }
  co_return;
}
// ---------------------------------------------------------------------------
// Posting. The whole flow runs inside the caller's transaction; any failure
// rolls back balances, ledger, serials and the journal together.
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse> postDocument(DbClientPtr tx, const utils::AuditIdentity &who,
                                                const std::string &id) {
  const auto head = co_await tx->execSqlCoro(
      headerSelect() + " WHERE d.tenant_id=$1 AND d.id=$2::uuid AND d.is_deleted=false FOR UPDATE OF d",
      who.tenantId, id);
  if (head.empty())
    co_return fail("not_found", "Stock document not found.");
  const auto doc = parse(head[0]["record"].as<std::string>());
  if (doc["status"].asString() != "approved")
    co_return fail("conflict", "Approve the document before posting.");
  const std::string type = doc["documentType"].asString(),
                    reason = doc["movementReason"].asString(),
                    unit = doc["accountingUnitId"].asString();
  const auto period = co_await tx->execSqlCoro(
      "SELECT id FROM gl_accounting_periods WHERE tenant_id=$1 AND accounting_unit_id=$2::uuid AND "
      "is_deleted=false AND status='open' AND $3::date BETWEEN period_start_date AND period_end_date "
      "FOR UPDATE",
      who.tenantId, unit, doc["documentDate"].asString());
  if (period.empty())
    co_return fail("conflict",
                   "Post stock documents only into an open accounting period.");
  const std::string periodId = period[0]["id"].as<std::string>();
  const auto defaults = co_await tx->execSqlCoro(
      "SELECT inventory_account_id,stock_purchases_account_id,goods_in_transit_account_id "
      "FROM gl_default_accounts WHERE tenant_id=$1 AND accounting_unit_id=$2::uuid AND is_deleted=false FOR SHARE",
      who.tenantId, unit);
  const auto unitRow = co_await tx->execSqlCoro(
      "SELECT base_currency_id FROM core_accounting_units WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false",
      who.tenantId, unit);
  if (unitRow.empty())
    co_return fail("not_found", "Accounting unit not found.");
  const std::string baseCurrency = unitRow[0]["base_currency_id"].as<std::string>();
  const std::string defInventory = defaults.empty() ? "" : defaults[0]["inventory_account_id"].isNull() ? "" : defaults[0]["inventory_account_id"].as<std::string>();
  const std::string defPurchases = defaults.empty() ? "" : defaults[0]["stock_purchases_account_id"].isNull() ? "" : defaults[0]["stock_purchases_account_id"].as<std::string>();
  const std::string defTransit = defaults.empty() ? "" : defaults[0]["goods_in_transit_account_id"].isNull() ? "" : defaults[0]["goods_in_transit_account_id"].as<std::string>();
  const auto linesRows = co_await tx->execSqlCoro(
      "SELECT (jsonb_build_object('line',jsonb_build_object('id',l.id,'lineNumber',l.line_number,"
      "'itemId',l.item_id,'batchId',l.batch_id,'quantityBase',l.quantity_base::text,"
      "'countedQuantity',l.counted_quantity::text,'unitCost',l.unit_cost::text,'serialNumbers',l.serial_numbers,"
      "'sourceBinId',l.source_bin_id,'destinationBinId',l.destination_bin_id),"
      "'item',jsonb_build_object('id',i.id,'itemCode',i.item_code,'trackingMethod',i.tracking_method,"
      "'valuationMethod',i.valuation_method,'standardCost',i.standard_cost::text,"
      "'averageUnitCost',i.average_unit_cost::text,'lastUnitCost',i.last_unit_cost::text,"
      "'inventoryAccountId',i.inventory_account_id,'cogsAccountId',i.cogs_account_id,"
      "'purchaseAccountId',i.purchase_account_id,'varianceAccountId',i.variance_account_id)))::text AS record "
      "FROM inv_stock_document_lines l JOIN inv_items i ON i.tenant_id=l.tenant_id AND i.id=l.item_id "
      "WHERE l.tenant_id=$1 AND l.document_id=$2::uuid AND l.is_deleted=false ORDER BY l.line_number "
      "FOR UPDATE OF l,i",
      who.tenantId, id);
  if (linesRows.empty())
    co_return fail("conflict", "The document has no lines to post.");
  struct Loaded {
    Json::Value line, item;
  };
  std::vector<Loaded> loaded;
  for (const auto &row : linesRows) {
    const auto rec = parse(row["record"].as<std::string>());
    loaded.push_back({rec["line"], rec["item"]});
  }
  // Pass 1: account resolution. Resolve every account before any movement so a
  // configuration gap never leaves half-posted stock.
  const bool glNeeded = type != "transfer";
  std::vector<std::string> missing;
  for (const auto &ld : loaded) {
    if (!glNeeded)
      break;
    const auto &item = ld.item;
    const std::string inv = item["inventoryAccountId"].isNull() ? "" : item["inventoryAccountId"].asString();
    if (inv.empty() && defInventory.empty())
      missing.push_back("inventory valuation account for " + item["itemCode"].asString());
    if (type == "issue") {
      const std::string cogs = item["cogsAccountId"].isNull() ? "" : item["cogsAccountId"].asString();
      if (cogs.empty())
        missing.push_back("COGS account for " + item["itemCode"].asString());
    }
    if (type == "receipt" && reason != "purchase_receipt") {
      const std::string pu = item["purchaseAccountId"].isNull() ? "" : item["purchaseAccountId"].asString();
      if (pu.empty() && defPurchases.empty())
        missing.push_back("stock purchases offset account for " + item["itemCode"].asString());
    }
    if (type == "receipt" && reason == "purchase_receipt" && defTransit.empty())
      missing.emplace_back("goods-in-transit (GRNI) default account");
    if ((type == "adjustment" || type == "count") &&
        (item["varianceAccountId"].isNull() || item["varianceAccountId"].asString().empty()) &&
        defPurchases.empty())
      missing.push_back("variance account for " + item["itemCode"].asString());
    if (type == "receipt" && item["valuationMethod"].asString() == "standard" &&
        dec6(ld.line["unitCost"].asString()) != dec6(item["standardCost"].asString()) &&
        (item["varianceAccountId"].isNull() || item["varianceAccountId"].asString().empty()))
      missing.push_back("purchase price variance account for " + item["itemCode"].asString());
  }
  if (!missing.empty()) {
    std::string msg = "Configure posting accounts before posting: ";
    for (size_t i = 0; i < missing.size(); i++)
      msg += (i ? "; " : "") + missing[i];
    co_return fail("validation_error", msg);
  }
  // Pass 2: movements, ledger, serials, GL accumulation.
  std::map<std::string, long long> debit, credit;
  long long sumQty = 0, sumVal = 0;
  const std::string sourceWh = doc["sourceWarehouseId"].asString();
  const std::string destWh = doc["destinationWarehouseId"].isNull()
                                 ? ""
                                 : doc["destinationWarehouseId"].asString();
  for (const auto &ld : loaded) {
    const auto &line = ld.line;
    const auto &item = ld.item;
    const std::string batchId = line["batchId"].isNull() ? "" : line["batchId"].asString();
    long long qb = dec6(line["quantityBase"].asString());
    const long long enteredCost = dec6(line["unitCost"].asString());
    const std::string method = item["valuationMethod"].asString();
    const std::string invAcct =
        (item["inventoryAccountId"].isNull() || item["inventoryAccountId"].asString().empty())
            ? defInventory
            : item["inventoryAccountId"].asString();
    const std::string varianceAcct =
        (item["varianceAccountId"].isNull() || item["varianceAccountId"].asString().empty())
            ? defPurchases
            : item["varianceAccountId"].asString();
    if (type == "count") {
      const long long onHand =
          co_await lockOnHand(tx, who, item["id"].asString(), sourceWh, batchId);
      qb = dec6(line["countedQuantity"].asString()) - onHand;
      if (qb == 0)
        continue; // counted equals system: nothing moves
    }
    if (type == "transfer") {
      MovementResult outSrc, outDst;
      auto moved = co_await applyMovement(tx, who, doc, line, item, sourceWh, -qb, 0, outSrc);
      if (!moved.success)
        co_return moved;
      moved = co_await applyMovement(tx, who, doc, line, item, destWh, qb, outSrc.unitCost, outDst);
      if (!moved.success)
        co_return moved;
      co_await insertLedger(tx, who, doc, line, item, sourceWh, -qb, outSrc);
      co_await insertLedger(tx, who, doc, line, item, destWh, qb, outDst);
      co_await applySerials(tx, who, line, item, type, reason, qb, sourceWh, destWh);
      sumQty += std::llabs(qb);
      sumVal += outSrc.value;
      continue;
    }
    long long signedQty = qb;
    if (type == "issue")
      signedQty = -qb;
    const long long inboundCost =
        (signedQty > 0 && type == "count") ? -1 : enteredCost;
    MovementResult mv;
    auto moved = co_await applyMovement(tx, who, doc, line, item, sourceWh, signedQty,
                                        inboundCost, mv);
    if (!moved.success)
      co_return moved;
    if (signedQty != 0) {
      co_await insertLedger(tx, who, doc, line, item, sourceWh, signedQty, mv);
      co_await applySerials(tx, who, line, item, type, reason, signedQty, sourceWh, destWh);
      sumQty += std::llabs(signedQty);
      sumVal += mv.value;
    }
    if (!glNeeded || mv.value == 0 || invAcct.empty())
      continue;
    if (type == "receipt") {
      const std::string offset = reason == "purchase_receipt"
                                     ? defTransit
                                     : (item["purchaseAccountId"].isNull() ||
                                                item["purchaseAccountId"].asString().empty()
                                            ? defPurchases
                                            : item["purchaseAccountId"].asString());
      debit[invAcct] += mv.value;
      credit[offset] += mv.value;
      if (mv.variance > 0)
        debit[varianceAcct] += mv.variance;
      else if (mv.variance < 0)
        credit[varianceAcct] += -mv.variance;
    } else if (type == "issue") {
      debit[item["cogsAccountId"].asString()] += mv.value;
      credit[invAcct] += mv.value;
    } else {
      // adjustments and counts
      if (signedQty > 0) {
        debit[invAcct] += mv.value;
        credit[varianceAcct] += mv.value;
      } else {
        debit[varianceAcct] += mv.value;
        credit[invAcct] += mv.value;
      }
    }
  }
  // Post the journal when there is value to move (transfers and zero-value
  // counts post no journal by design).
  std::string journalId;
  if (glNeeded) {
    long long totalDr = 0, totalCr = 0;
    Json::Value jl(Json::arrayValue);
    const std::string descBase =
        "Inventory " + type + " " + doc["documentNumber"].asString() + " [" + reason + "]";
    for (const auto &kv : debit) {
      if (kv.second <= 0)
        continue;
      Json::Value l;
      l["accountId"] = kv.first;
      l["currencyId"] = baseCurrency;
      l["exchangeRate"] = "1.0000000000";
      l["debit"] = dec6str(kv.second);
      l["credit"] = "0";
      l["description"] = descBase;
      l["referenceNumber"] = trim(doc["referenceNumber"].asString()).substr(0, 80).empty()
                                 ? doc["documentNumber"].asString()
                                 : trim(doc["referenceNumber"].asString()).substr(0, 40);
      l["transactionDate"] = doc["documentDate"].asString();
      jl.append(l);
      totalDr += kv.second;
    }
    for (const auto &kv : credit) {
      if (kv.second <= 0)
        continue;
      Json::Value l;
      l["accountId"] = kv.first;
      l["currencyId"] = baseCurrency;
      l["exchangeRate"] = "1.0000000000";
      l["debit"] = "0";
      l["credit"] = dec6str(kv.second);
      l["description"] = descBase;
      l["referenceNumber"] = trim(doc["referenceNumber"].asString()).substr(0, 80).empty()
                                 ? doc["documentNumber"].asString()
                                 : trim(doc["referenceNumber"].asString()).substr(0, 40);
      l["transactionDate"] = doc["documentDate"].asString();
      jl.append(l);
      totalCr += kv.second;
    }
    if (totalDr != totalCr)
      co_return fail("database_error", "Journal construction error: unbalanced inventory batch.");
    if (totalDr > 0) {
      Json::Value payload;
      payload["accountingUnitId"] = unit;
      payload["batchDate"] = doc["documentDate"].asString();
      payload["description"] = descBase.substr(0, 200);
      payload["periodId"] = periodId;
      payload["isMultiCurrency"] = false;
      payload["lines"] = jl;
      const auto posted = co_await JournalService::createAndPost(tx, payload, who);
      if (!posted.success)
        co_return posted;
      journalId = posted.result["id"].asString();
    }
  }
  co_await tx->execSqlCoro(
      "UPDATE inv_stock_documents SET status='posted',is_posted=true,posted_at=now(),posted_by_user_id=$3,"
      "period_id=$4::uuid,journal_batch_id=NULLIF($5::text,'')::uuid,total_quantity=($6::text)::numeric,"
      "total_value=($7::text)::numeric,version=version+1,last_modified_at=now(),last_modified_by_user_id=$3 "
      "WHERE tenant_id=$1 AND id=$2::uuid AND status='approved' AND is_deleted=false",
      who.tenantId, id, who.userId, periodId, journalId, dec6str(sumQty), dec6str(sumVal));
  co_await addEvent(tx, who, id, "posted", "approved", "posted", "");
  co_return co_await fetchDocument(tx, who, id);
}
// Full create flow (used by HTTP create and, internally, by reversals and the
// cross-module contract). Assumes a validated body and a live transaction.
drogon::Task<dto::BaseApiResponse> createFlow(DbClientPtr tx, const utils::AuditIdentity &who,
                                              Json::Value b) {
  if (const auto problem = validateDocument(b, false); !problem.empty())
    co_return fail("validation_error", problem);
  // Idempotency: the same request from the same actor replays its document.
  if (b["requestId"].isString()) {
    const auto dupe = co_await tx->execSqlCoro(
        "SELECT id,created_by_user_id FROM inv_stock_documents WHERE tenant_id=$1 AND request_key=$2::uuid "
        "AND is_deleted=false",
        who.tenantId, b["requestId"].asString());
    if (!dupe.empty()) {
      if (dupe[0]["created_by_user_id"].as<std::string>() != who.userId)
        co_return fail("conflict", "Request ID already belongs to another actor.");
      co_return co_await fetchDocument(tx, who, dupe[0]["id"].as<std::string>());
    }
  }
  const std::string type = b["documentType"].asString();
  const std::string number =
      co_await allocateNumber(tx, who, b["accountingUnitId"].asString(), type);
  std::vector<PreparedLine> prepared;
  const auto ready = co_await prepareLines(tx, who, type,
                                           b["sourceWarehouseId"].asString(), b, prepared);
  if (!ready.success)
    co_return ready;
  auto created = co_await insertDocument(tx, who, b, prepared, number);
  if (!created.success)
    co_return created;
  co_return co_await fetchDocument(tx, who, created.result["id"].as<std::string>());
}
// Lifecycle transitions: submit / approve / cancel.
drogon::Task<dto::BaseApiResponse> transitionFlow(DbClientPtr tx, const utils::AuditIdentity &who,
                                                  const std::string &id, const std::string &action,
                                                  Json::Value b) {
  if (!b.isObject() || !b["version"].isInt() || b["version"].asInt() < 1)
    co_return fail("validation_error", "A valid record version is required.");
  const auto head = co_await tx->execSqlCoro(
      headerSelect() + " WHERE d.tenant_id=$1 AND d.id=$2::uuid AND d.is_deleted=false FOR UPDATE OF d",
      who.tenantId, id);
  if (head.empty())
    co_return fail("not_found", "Stock document not found.");
  const auto doc = parse(head[0]["record"].as<std::string>());
  if (doc["version"].asInt() != b["version"].asInt())
    co_return fail("conflict", "Document changed. Reload before continuing.");
  const std::string status = doc["status"].asString();
  std::string reason = b["reason"].isString() ? trim(b["reason"].asString()) : "";
  if (reason.size() > 500)
    co_return fail("validation_error", "reason: up to 500 characters.");
  if (action == "submit") {
    if (status != "draft")
      co_return fail("conflict", "Only a draft can be submitted.");
    const auto lines = co_await tx->execSqlCoro(
        "SELECT 1 AS one FROM inv_stock_document_lines WHERE tenant_id=$1 AND document_id=$2::uuid "
        "AND is_deleted=false LIMIT 1",
        who.tenantId, id);
    if (lines.empty())
      co_return fail("validation_error", "Add at least one line before submitting.");
    co_await tx->execSqlCoro(
        "UPDATE inv_stock_documents SET status='submitted',submitted_at=now(),submitted_by_user_id=$3,"
        "version=version+1,last_modified_at=now(),last_modified_by_user_id=$3 "
        "WHERE tenant_id=$1 AND id=$2::uuid",
        who.tenantId, id, who.userId);
    co_await addEvent(tx, who, id, "submitted", "draft", "submitted", reason);
  } else if (action == "approve") {
    if (status != "submitted")
      co_return fail("conflict", "Only a submitted document can be approved.");
    co_await tx->execSqlCoro(
        "UPDATE inv_stock_documents SET status='approved',approved_at=now(),approved_by_user_id=$3,"
        "version=version+1,last_modified_at=now(),last_modified_by_user_id=$3 "
        "WHERE tenant_id=$1 AND id=$2::uuid",
        who.tenantId, id, who.userId);
    co_await addEvent(tx, who, id, "approved", "submitted", "approved", reason);
  } else if (action == "cancel") {
    if (status != "draft" && status != "submitted" && status != "approved")
      co_return fail("conflict", "Posted documents cannot be cancelled; reverse them.");
    if (reason.empty())
      co_return fail("validation_error", "Cancellations require a reason.");
    co_await tx->execSqlCoro(
        "UPDATE inv_stock_documents SET status='cancelled',cancelled_at=now(),cancelled_by_user_id=$3,"
        "cancel_reason=$4,version=version+1,last_modified_at=now(),last_modified_by_user_id=$3 "
        "WHERE tenant_id=$1 AND id=$2::uuid",
        who.tenantId, id, who.userId, reason);
    co_await addEvent(tx, who, id, "cancelled", status, "cancelled", reason);
  } else {
    co_return fail("validation_error", "Unsupported transition.");
  }
  co_return co_await fetchDocument(tx, who, id);
}
// Draft update: header fields + full line replacement.
drogon::Task<dto::BaseApiResponse> updateFlow(DbClientPtr tx, const utils::AuditIdentity &who,
                                              const std::string &id, Json::Value b) {
  if (const auto problem = validateDocument(b, true); !problem.empty())
    co_return fail("validation_error", problem);
  const auto head = co_await tx->execSqlCoro(
      "SELECT status,version,document_type,accounting_unit_id FROM inv_stock_documents WHERE tenant_id=$1 AND id=$2::uuid "
      "AND is_deleted=false FOR UPDATE",
      who.tenantId, id);
  if (head.empty())
    co_return fail("not_found", "Stock document not found.");
  if (head[0]["status"].as<std::string>() != "draft")
    co_return fail("conflict", "Only draft documents can be updated.");
  if (head[0]["version"].as<int>() != b["version"].asInt())
    co_return fail("conflict", "Document changed. Reload before saving.");
  if (head[0]["document_type"].as<std::string>() != b["documentType"].asString() ||
      head[0]["accounting_unit_id"].as<std::string>() != b["accountingUnitId"].asString())
    co_return fail("conflict", "Document type and accounting unit cannot change.");
  std::vector<PreparedLine> prepared;
  const auto ready = co_await prepareLines(tx, who, b["documentType"].asString(),
                                           b["sourceWarehouseId"].asString(), b, prepared);
  if (!ready.success)
    co_return ready;
  long long totalQty = 0, totalValue = 0;
  for (const auto &pl : prepared) {
    totalQty += std::llabs(pl.qtyBase);
    const long long basis = pl.item["valuationMethod"].asString() == "standard"
                                ? dec6(pl.item["standardCost"].asString())
                                : pl.unitCost;
    totalValue += std::llabs(pl.qtyBase) * basis / SCALE;
  }
  co_await tx->execSqlCoro(
      "UPDATE inv_stock_documents SET movement_reason=$3,document_date=$4::date,"
      "source_warehouse_id=$5::uuid,destination_warehouse_id=NULLIF($6::text,'')::uuid,"
      "supplier_id=NULLIF($7::text,'')::uuid,customer_id=NULLIF($8::text,'')::uuid,"
      "cost_center_id=NULLIF($9::text,'')::uuid,reference_number=$10,notes=$11,"
      "total_quantity=($12::text)::numeric,total_value=($13::text)::numeric,"
      "version=version+1,last_modified_at=now(),last_modified_by_user_id=$14 "
      "WHERE tenant_id=$1 AND id=$2::uuid AND status='draft' AND is_deleted=false",
      who.tenantId, id, b["movementReason"].asString(), b["documentDate"].asString(),
      b["sourceWarehouseId"].asString(),
      b["destinationWarehouseId"].isNull() ? "" : b["destinationWarehouseId"].asString(),
      b["supplierId"].isNull() ? "" : b["supplierId"].asString(),
      b["customerId"].isNull() ? "" : b["customerId"].asString(),
      b["costCenterId"].isNull() ? "" : b["costCenterId"].asString(),
      trim(b["referenceNumber"].asString()).substr(0, 80), b["notes"].asString(),
      dec6str(totalQty), dec6str(totalValue), who.userId);
  co_await tx->execSqlCoro(
      "UPDATE inv_stock_document_lines SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3,"
      "last_modified_at=now(),last_modified_by_user_id=$3 WHERE tenant_id=$1 AND document_id=$2::uuid "
      "AND is_deleted=false",
      who.tenantId, id, who.userId);
  co_await insertLines(tx, who, id, b["documentType"].asString(), prepared);
  co_await addEvent(tx, who, id, "updated", "draft", "draft", "");
  co_return co_await fetchDocument(tx, who, id);
}
// Reverse a posted document: create and post the mirror document, then link.
drogon::Task<dto::BaseApiResponse> reverseFlow(DbClientPtr tx, const utils::AuditIdentity &who,
                                               const std::string &id, Json::Value b) {
  if (!b.isObject() || !b["version"].isInt() || b["version"].asInt() < 1)
    co_return fail("validation_error", "A valid record version is required.");
  const std::string reason = b["reason"].isString() ? trim(b["reason"].asString()) : "";
  if (reason.empty() || !text(reason, 500))
    co_return fail("validation_error", "Reversals require a reason (1-500 characters).");
  const auto head = co_await tx->execSqlCoro(
      headerSelect() + " WHERE d.tenant_id=$1 AND d.id=$2::uuid AND d.is_deleted=false FOR UPDATE OF d",
      who.tenantId, id);
  if (head.empty())
    co_return fail("not_found", "Stock document not found.");
  const auto doc = parse(head[0]["record"].as<std::string>());
  if (doc["status"].asString() != "posted")
    co_return fail("conflict", "Only posted documents can be reversed.");
  if (doc["version"].asInt() != b["version"].asInt())
    co_return fail("conflict", "Document changed. Reload before reversing.");
  const auto lines = co_await tx->execSqlCoro(linesSelect(), who.tenantId, id);
  if (lines.empty())
    co_return fail("conflict", "The document has no lines to reverse.");
  // Applied per-line cost from the ledger keeps reversals penny-symmetric.
  std::map<std::string, long long> appliedCost;
  const auto costs = co_await tx->execSqlCoro(
      "SELECT document_line_id,COALESCE(sum(abs(stock_value))/NULLIF(sum(abs(quantity)),0),0)::text AS c "
      "FROM inv_stock_transactions WHERE tenant_id=$1 AND document_id=$2::uuid GROUP BY document_line_id",
      who.tenantId, id);
  for (const auto &row : costs)
    appliedCost[row["document_line_id"].as<std::string>()] = dec6(row["c"].as<std::string>());
  const std::string type = doc["documentType"].asString();
  Json::Value mirror;
  mirror["accountingUnitId"] = doc["accountingUnitId"].asString();
  mirror["documentType"] = type == "transfer" ? "transfer" : "adjustment";
  mirror["movementReason"] =
      type == "transfer" ? doc["movementReason"].asString() : "other_adjustment";
  mirror["documentDate"] = doc["documentDate"].asString();
  mirror["sourceWarehouseId"] = type == "transfer"
                                    ? doc["destinationWarehouseId"].asString()
                                    : doc["sourceWarehouseId"].asString();
  if (type == "transfer")
    mirror["destinationWarehouseId"] = doc["sourceWarehouseId"].asString();
  if (doc["supplierId"].isString())
    mirror["supplierId"] = doc["supplierId"].asString();
  if (doc["customerId"].isString())
    mirror["customerId"] = doc["customerId"].asString();
  if (doc["costCenterId"].isString())
    mirror["costCenterId"] = doc["costCenterId"].asString();
  mirror["referenceNumber"] =
      trim("Reversal of " + doc["documentNumber"].asString()).substr(0, 80);
  mirror["notes"] = reason;
  mirror["lines"] = Json::arrayValue;
  for (const auto &row : lines) {
    const auto l = parse(row["record"].as<std::string>());
    Json::Value m;
    m["itemId"] = l["itemId"].asString();
    m["uomId"] = l["uomId"].asString();
    const long long qb = dec6(l["quantityBase"].asString());
    long long unitCostMirror = appliedCost.count(l["id"].asString())
                                   ? appliedCost[l["id"].asString()]
                                   : dec6(l["unitCost"].asString());
    if (type == "transfer") {
      m["quantity"] = dec6str(qb);
      m["unitCost"] = dec6str(unitCostMirror);
      if (l["destinationBinId"].isString())
        m["sourceBinId"] = l["destinationBinId"].asString();
      if (l["sourceBinId"].isString())
        m["destinationBinId"] = l["sourceBinId"].asString();
    } else {
      long long mirrorQty = -qb;
      if (type == "count") {
        // Count lines store zero; the posted delta lives in the ledger, and
        // the delta (not the counted quantity) is what must reverse.
        const auto delta = co_await tx->execSqlCoro(
            "SELECT COALESCE(sum(quantity),0)::text AS q FROM inv_stock_transactions "
            "WHERE tenant_id=$1 AND document_line_id=$2::uuid",
            who.tenantId, l["id"].asString());
        mirrorQty = -dec6(delta[0]["q"].as<std::string>());
      }
      if (mirrorQty == 0)
        continue; // count line that posted no delta: nothing to reverse
      m["quantity"] = dec6str(mirrorQty);
      m["unitCost"] = dec6str(unitCostMirror);
      if (l["sourceBinId"].isString())
        m["sourceBinId"] = l["sourceBinId"].asString();
    }
    m["serialNumbers"] = l["serialNumbers"];
    if (l["batchId"].isString())
      m["batchId"] = l["batchId"].asString();
    m["description"] = "Reversal: " + l["description"].asString();
    mirror["lines"].append(m);
  }
  auto created = co_await createFlow(tx, who, mirror);
  if (!created.success)
    co_return created;
  const std::string mirrorId = created.result["id"].as<std::string>();
  co_await tx->execSqlCoro(
      "UPDATE inv_stock_documents SET source_document_type='reversal',source_document_id=$3::uuid "
      "WHERE tenant_id=$1 AND id=$2::uuid AND status='draft'",
      who.tenantId, mirrorId, id);
  // Internal lifecycle for the mirror: submit, approve, post in one flow.
  Json::Value any;
  any["version"] = 1;
  auto moved = co_await transitionFlow(tx, who, mirrorId, "submit", any);
  if (!moved.success)
    co_return moved;
  any["version"] = 2;
  moved = co_await transitionFlow(tx, who, mirrorId, "approve", any);
  if (!moved.success)
    co_return moved;
  auto posted = co_await postDocument(tx, who, mirrorId);
  if (!posted.success)
    co_return posted;
  co_await tx->execSqlCoro(
      "UPDATE inv_stock_documents SET status='reversed',reversal_document_id=$3::uuid,"
      "version=version+1,last_modified_at=now(),last_modified_by_user_id=$4 "
      "WHERE tenant_id=$1 AND id=$2::uuid AND status='posted'",
      who.tenantId, id, mirrorId, who.userId);
  co_await addEvent(tx, who, id, "reversed", "posted", "reversed", reason);
  auto result = co_await fetchDocument(tx, who, mirrorId);
  result.result["reversalOf"] = id;
  co_return result;
}
} // namespace
// ---------------------------------------------------------------------------
// Public stock-document entry: documents.<action>.
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse>
InventoryService::documents(std::string op, std::string id, Json::Value body,
                            int page, int size, std::string query,
                            std::string unitId, utils::AuditIdentity who) {
  static const std::set<std::string> readOps{"list", "get", "next-number"};
  static const std::set<std::string> writeOps{"create", "update", "delete", "submit",
                                              "approve", "post",  "cancel", "reverse"};
  const std::string action = op == "documents" ? "list"
                             : op.rfind("documents.") == 0 ? op.substr(10) : op;
  if ((!readOps.count(action) && !writeOps.count(action)) || page < 1 ||
      page > 1000000 || size < 1 || size > 100 || !text(query, 200))
    co_return fail("validation_error", "Invalid operation, paging or search.");
  const bool write = writeOps.count(action);
  if ((action == "get" || action == "update" || action == "delete" ||
       action == "submit" || action == "approve" || action == "post" ||
       action == "cancel" || action == "reverse") && !uuid(id))
    co_return fail("validation_error", "A valid document ID is required.");
  std::string unit;
  if (!unitId.empty()) {
    if (!uuid(unitId))
      co_return fail("validation_error", "accountingUnitId: a UUID is required.");
    unit = lower(unitId);
  }
  try {
    auto db = drogon::app().getDbClient();
    static const std::vector<std::string> requiredTables{
        "inv_stock_documents", "inv_stock_document_lines",
        "inv_stock_balances", "inv_stock_transactions"};
    if (!(co_await schemaReady(db, requiredTables)))
      co_return fail("schema_not_ready",
                     "Inventory upgrade required: apply migrations 029-035 first.");
    bool canWrite = false;
    if (!write) {
      const auto authz = co_await inventory_internal::authorize(db, who, false, "inventory", canWrite);
      if (!authz.success)
        co_return authz;
      dto::BaseApiResponse r;
      if (action == "next-number") {
        const std::string type = body.isObject() && body["documentType"].isString()
                                     ? lower(body["documentType"].asString())
                                     : "";
        if (!reasons().count(type) || unit.empty())
          co_return fail("validation_error",
                         "documentType and a UUID accountingUnitId are required.");
        auto seq = co_await db->execSqlCoro(
            "SELECT prefix||'-'||lpad(next_number::text,padding,'0') AS n FROM inv_document_sequences "
            "WHERE tenant_id=$1 AND accounting_unit_id=$2::uuid AND document_type=$3",
            who.tenantId, unit, type);
        r.result["documentNumber"] =
            seq.empty() ? docPrefix(type) + "-00001" : seq[0]["n"].as<std::string>();
        r.result["reserved"] = false;
        r.success = true;
        co_return r;
      }
      if (action == "get")
        co_return co_await fetchDocument(db, who, id);
      // list
      std::string w = " WHERE d.tenant_id=$1 AND d.is_deleted=false AND "
                      "(strpos(lower(d.document_number),lower($2))>0 OR "
                      "strpos(lower(COALESCE(sp.name,'')),lower($2))>0 OR "
                      "strpos(lower(sw.name),lower($2))>0)";
      std::vector<std::string> args{who.tenantId, search(query)};
      if (!unit.empty()) {
        args.push_back(unit);
        w += " AND d.accounting_unit_id=$3::uuid";
      }
      const std::string type = body.isObject() && body["documentType"].isString()
                                   ? lower(trim(body["documentType"].asString())) : "";
      const std::string status = body.isObject() && body["status"].isString()
                                     ? lower(trim(body["status"].asString())) : "";
      if (!type.empty() && reasons().count(type))
        w += " AND d.document_type=$" + std::to_string(args.size() + 1);
      if (!type.empty() && reasons().count(type))
        args.push_back(type);
      if (!status.empty())
        w += " AND d.status=$" + std::to_string(args.size() + 1);
      if (!status.empty())
        args.push_back(status);
      const int64_t limit = size, offset = (int64_t(page) - 1) * size;
      const std::string sel = headerSelect() + w + " ORDER BY d.document_date DESC,d.id DESC LIMIT $" +
                              std::to_string(args.size() + 1) + "::bigint OFFSET $" +
                              std::to_string(args.size() + 2) + "::bigint";
      const std::string countSel =
          "SELECT count(*) AS total FROM inv_stock_documents d "
          "JOIN inv_warehouses sw ON sw.tenant_id=d.tenant_id AND sw.id=d.source_warehouse_id "
          "LEFT JOIN inv_warehouses dw ON dw.tenant_id=d.tenant_id AND dw.id=d.destination_warehouse_id "
          "LEFT JOIN core_suppliers sp ON sp.tenant_id=d.tenant_id AND sp.id=d.supplier_id AND sp.is_deleted=false "
          "LEFT JOIN core_customers cu ON cu.tenant_id=d.tenant_id AND cu.id=d.customer_id AND cu.is_deleted=false "
          "JOIN core_currencies cr ON cr.id=d.currency_id" + w;
      std::optional<drogon::orm::Result> rows, totals;
      switch (args.size()) {
      case 2:
        rows = co_await db->execSqlCoro(sel, args[0], args[1], limit, offset);
        totals = co_await db->execSqlCoro(countSel, args[0], args[1]);
        break;
      case 3:
        rows = co_await db->execSqlCoro(sel, args[0], args[1], args[2], limit, offset);
        totals = co_await db->execSqlCoro(countSel, args[0], args[1], args[2]);
        break;
      case 4:
        rows = co_await db->execSqlCoro(sel, args[0], args[1], args[2], args[3], limit, offset);
        totals = co_await db->execSqlCoro(countSel, args[0], args[1], args[2], args[3]);
        break;
      default:
        rows = co_await db->execSqlCoro(sel, args[0], args[1], args[2], args[3], args[4], limit, offset);
        totals = co_await db->execSqlCoro(countSel, args[0], args[1], args[2], args[3], args[4]);
        break;
      }
      r.result["data"] = Json::arrayValue;
      for (const auto &row : *rows)
        r.result["data"].append(parse(row["record"].as<std::string>()));
      r.result["totalCount"] = Json::Int64((*totals)[0]["total"].as<int64_t>());
      r.result["capabilities"]["canWrite"] = canWrite;
      r.success = true;
      co_return r;
    }
    auto tx = co_await db->newTransactionCoro();
    dto::BaseApiResponse result;
    try {
      const auto authz = co_await inventory_internal::authorize(tx, who, true, "inventory", canWrite);
      if (!authz.success) {
        result = authz;
      } else if (action == "create") {
        result = co_await createFlow(tx, who, body);
      } else if (action == "update") {
        result = co_await updateFlow(tx, who, id, body);
      } else if (action == "delete") {
        if (!body.isObject() || !body["version"].isInt() || body["version"].asInt() < 1)
          result = fail("validation_error", "A record version is required to delete.");
        else {
          const auto head = co_await tx->execSqlCoro(
              "SELECT status,version FROM inv_stock_documents WHERE tenant_id=$1 AND id=$2::uuid "
              "AND is_deleted=false FOR UPDATE",
              who.tenantId, id);
          if (head.empty())
            result = fail("not_found", "Stock document not found.");
          else if (head[0]["status"].as<std::string>() != "draft")
            result = fail("conflict", "Only draft documents can be deleted.");
          else if (head[0]["version"].as<int>() != body["version"].asInt())
            result = fail("conflict", "Document changed. Reload before deleting.");
          else {
            co_await tx->execSqlCoro(
                "UPDATE inv_stock_document_lines SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3,"
                "last_modified_at=now(),last_modified_by_user_id=$3 WHERE tenant_id=$1 AND "
                "document_id=$2::uuid AND is_deleted=false",
                who.tenantId, id, who.userId);
            co_await tx->execSqlCoro(
                "UPDATE inv_stock_documents SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3,"
                "version=version+1,last_modified_at=now(),last_modified_by_user_id=$3 "
                "WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false",
                who.tenantId, id, who.userId);
            result.success = true;
            result.result["id"] = id;
          }
        }
      } else if (action == "submit" || action == "approve" || action == "cancel") {
        result = co_await transitionFlow(tx, who, id, action, body);
      } else if (action == "post") {
        if (!body.isObject() || !body["version"].isInt() || body["version"].asInt() < 1)
          result = fail("validation_error", "A valid record version is required.");
        else {
          const auto head = co_await tx->execSqlCoro(
              "SELECT version FROM inv_stock_documents WHERE tenant_id=$1 AND id=$2::uuid AND "
              "is_deleted=false FOR UPDATE",
              who.tenantId, id);
          if (head.empty())
            result = fail("not_found", "Stock document not found.");
          else if (head[0]["version"].as<int>() != body["version"].asInt())
            result = fail("conflict", "Document changed. Reload before posting.");
          else
            result = co_await postDocument(tx, who, id);
        }
      } else if (action == "reverse") {
        result = co_await reverseFlow(tx, who, id, body);
      } else {
        result = fail("validation_error", "Unsupported operation.");
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
      co_return fail("database_error", "Unable to commit stock document changes.");
    co_return result;
  } catch (const drogon::orm::UniqueViolation &) {
    co_return fail("conflict", "A document with these details already exists.");
  } catch (const drogon::orm::Failure &e) {
    const auto message = inventory_internal::knownMessage(e.what() ? e.what() : "");
    if (!message.empty())
      co_return fail("conflict", message);
    co_return fail("database_error",
                   "Inventory service unavailable. Verify migrations 029-035 are installed.");
  } catch (const std::exception &) {
    co_return fail("database_error",
                   "Inventory service unavailable. Verify migrations 029-035 are installed.");
  }
}
// Cross-module contract: SCM receipt posting lands here.
drogon::Task<dto::BaseApiResponse>
InventoryService::postStockDocument(drogon::orm::DbClientPtr transaction,
                                    Json::Value payload, utils::AuditIdentity who) {
  if (!uuid(who.tenantId) || !uuid(who.userId))
    co_return fail("unauthorized", "Trusted tenant scope required.");
  auto tx = transaction;
  auto created = co_await createFlow(tx, who, payload);
  if (!created.success)
    co_return created;
  const std::string docId = created.result["id"].as<std::string>();
  Json::Value any;
  any["version"] = 1;
  auto moved = co_await transitionFlow(tx, who, docId, "submit", any);
  if (!moved.success)
    co_return moved;
  any["version"] = 2;
  moved = co_await transitionFlow(tx, who, docId, "approve", any);
  if (!moved.success)
    co_return moved;
  auto posted = co_await postDocument(tx, who, docId);
  if (!posted.success)
    co_return posted;
  dto::BaseApiResponse r;
  r.result["documentId"] = docId;
  r.result["documentNumber"] = posted.result["documentNumber"];
  r.result["journalBatchId"] = posted.result["journalBatchId"];
  r.result["totalQuantity"] = posted.result["totalQuantity"];
  r.result["totalValue"] = posted.result["totalValue"];
  r.success = true;
  co_return r;
}
drogon::Task<dto::BaseApiResponse>
InventoryService::reverseStockDocument(drogon::orm::DbClientPtr transaction,
                                       std::string documentId, std::string reason,
                                       utils::AuditIdentity who) {
  if (!uuid(who.tenantId) || !uuid(who.userId) || !uuid(documentId))
    co_return fail("unauthorized", "Trusted tenant scope required.");
  auto tx = transaction;
  const auto head = co_await tx->execSqlCoro(
      "SELECT version FROM inv_stock_documents WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false",
      who.tenantId, documentId);
  if (head.empty())
    co_return fail("not_found", "Stock document not found.");
  Json::Value b;
  b["version"] = head[0]["version"].as<int>();
  b["reason"] = reason;
  co_return co_await reverseFlow(tx, who, documentId, b);
}
} // namespace business_desk::domain_services

