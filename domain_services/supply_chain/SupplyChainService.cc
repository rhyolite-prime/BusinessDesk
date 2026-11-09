// Supply chain module: purchase requisitions, purchase orders and goods
// receipts. Every write runs inside one transaction; receipts land in stock
// through InventoryService::postStockDocument / reverseStockDocument so a
// failure rolls documents, stock, costing and journals back together.
#include "SupplyChainService.h"
#include "domain_services/inventory/InventoryInternal.h"
#include "domain_services/inventory/InventoryService.h"
#include "utils/TransactionUtil.h"
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <map>
#include <optional>
#include <set>
#include <vector>
#include <optional>
namespace business_desk::domain_services {
namespace {
using namespace inventory_internal;
// Error pass-through: authored migration RAISE lines (substring match) reach
// the UI as conflict guidance; everything else is internal scrubbed detail.
std::string scmMessage(const std::string &hay) {
  static const std::vector<std::string> known = {
      "Invalid requisition status transition",
      "Invalid purchase order status transition",
      "Invalid receipt status transition",
      "Record the submission before marking a requisition submitted",
      "Record the approval before marking a requisition approved",
      "Record the submission before marking an order submitted",
      "Record the approval before marking an order approved",
      "Record the send before marking an order sent",
      "Rejections require a reason",
      "Cancellations require a reason",
      "Only draft requisitions can be deleted",
      "Only draft orders can be deleted",
      "Submitted requisitions are locked; cancel and raise a new one to change scope",
      "Submitted orders are locked; cancel and re-issue to change terms",
      "Purchase requisitions are never hard-deleted",
      "Purchase orders are never hard-deleted",
      "Purchase receipts are never hard-deleted",
      "Lines can only be added to a draft requisition",
      "Lines can only be added to a draft order",
      "Lines of a submitted requisition are locked",
      "Lines of a submitted order are locked",
      "Lines of a posted receipt are immutable",
      "Ordered quantity is set by purchase orders and never decreases here",
      "Receiving counters are set by goods receipts and never decrease here",
      "Unknown purchase requisition for this line",
      "Unknown purchase order for this line",
      "Unknown purchase receipt for this line",
      "Select a live purchasable catalog item",
      "Select a live active supplier",
      "Select a live warehouse in this accounting unit",
      "Select a live active warehouse",
      "The quotation must belong to this supplier",
      "Requisition line must be approved, open and for this item and unit",
      "Receipt line must target an open line of this order for the same item",
      "Receipts must target an open order for this supplier, warehouse and unit",
      "Posting a receipt requires its stock document and posting stamp",
      "Posted receipts cannot be deleted; reverse them instead",
      "Posted receipts are immutable; reverse the receipt to correct it",
      "Procurement events are immutable audit records",
  };
  for (const auto &needle : known)
    if (hay.find(needle) != std::string::npos)
      return needle;
  return {};
}
// Strict decimal parse (rejects overflow / non-numeric garbage).
bool decOk(const std::string &s, bool positive) {
  if (s.empty() || s.size() > 40)
    return false;
  try {
    size_t used = 0;
    const long double v = std::stold(s, &used);
    if (used != s.size() || !std::isfinite(v) || std::fabs(v) > 9.9999999999e13L)
      return false;
    return positive ? v > 0 : v >= 0;
  } catch (const std::exception &) {
    return false;
  }
}
std::string decVal(const Json::Value &v, const std::string &fallback) {
  return v.isString() ? trim(v.asString()) : fallback;
}
// Quantize to 6 dp (half-up), trimming trailing zeros, needed for document
// monetary totals (numeric(20,6) columns).
std::string q6(long double v) {
  const long long scaled =
      v >= 0 ? (long long)std::floor((double)(v * 1e6L) + 0.5)
             : (long long)std::ceil((double)(v * 1e6L) - 0.5);
  if (scaled == 0)
    return "0";
  const bool neg = scaled < 0;
  const unsigned long long a = neg ? (unsigned long long)(-(scaled + 1)) + 1
                                   : (unsigned long long)scaled;
  char buf[48];
  if (a % 1000000ULL == 0)
    std::snprintf(buf, sizeof buf, "%s%llu", neg ? "-" : "", a / 1000000ULL);
  else
    std::snprintf(buf, sizeof buf, "%s%llu.%06llu", neg ? "-" : "", a / 1000000ULL,
                  a % 1000000ULL);
  return buf;
}
// Sequential, gap-tolerant document numbers per accounting unit and
// document type (scm_document_sequences).
drogon::Task<std::string> scmNextNumber(DbClientPtr tx, const utils::AuditIdentity &who,
                                        const std::string &unit, const std::string &type,
                                        const std::string &prefix) {
  const auto rows = co_await tx->execSqlCoro(
      "INSERT INTO scm_document_sequences(tenant_id,accounting_unit_id,document_type,prefix,padding,"
      "next_number,created_by_user_id) VALUES($1,$2::uuid,$3,$4,5,2,$5) "
      "ON CONFLICT(tenant_id,accounting_unit_id,document_type) DO UPDATE SET "
      "next_number=scm_document_sequences.next_number+1,last_modified_at=now(),"
      "last_modified_by_user_id=$5 RETURNING prefix,padding,next_number",
      who.tenantId, unit, type, prefix, who.userId);
  const std::string p = rows[0]["prefix"].as<std::string>();
  const long long n = rows[0]["next_number"].as<long long>() - 1;
  const int pad = rows[0]["padding"].as<int>();
  char buf[64];
  std::snprintf(buf, sizeof buf, "%0*lld", std::max(1, pad), n);
  co_return p + "-" + buf;
}
drogon::Task<void> scmEvent(DbClientPtr tx, const utils::AuditIdentity &who,
                            const std::string &entityType, const std::string &entityId,
                            const std::string &action, const std::string &prev,
                            const std::string &next, const std::string &reason) {
  co_await tx->execSqlCoro(
      "INSERT INTO scm_procurement_events(tenant_id,entity_type,entity_id,action,previous_status,"
      "new_status,reason,version,created_by_user_id) SELECT $1::uuid,$2::varchar,$3::uuid,$4::varchar,"
      "NULLIF($5,''),$6::varchar,$7,"
      "COALESCE((SELECT max(version) FROM scm_procurement_events WHERE tenant_id=$1::uuid AND "
      "entity_type=$2::varchar AND entity_id=$3::uuid),0)+1,$8::uuid",
      who.tenantId, entityType, entityId, action, prev, next, reason, who.userId);
  co_return;
}
// Version guard shared by every id-targeted write.
drogon::Task<bool> versionMatches(DbClientPtr tx, const utils::AuditIdentity &who,
                                  const char *table, const std::string &id, int version) {
  const auto rows = co_await tx->execSqlCoro(
      "SELECT version FROM " + std::string(table) +
          " WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR UPDATE",
      who.tenantId, id);
  co_return !rows.empty() && rows[0]["version"].as<int>() == version;
}
// ---------------------------------------------------------------------------
// Requisitions.
// ---------------------------------------------------------------------------
std::string requisitionHeaderSelect() {
  return R"(SELECT (jsonb_build_object('id',r.id,'version',r.version,'accountingUnitId',r.accounting_unit_id,
'requisitionNumber',r.requisition_number,'requestDate',r.request_date,'requiredByDate',r.required_by_date,
'priority',r.priority,'status',r.status,'costCenterId',r.cost_center_id,'warehouseId',r.warehouse_id,
'warehouseName',w.name,'purpose',r.purpose,'estimatedTotal',r.estimated_total::text,
'requestedByUserId',r.requested_by_user_id,'requestedBy',concat_ws(' ',rq.first_name,rq.last_name),
'submittedAt',r.submitted_at,'approvedAt',r.approved_at,'rejectedAt',r.rejected_at,
'rejectionReason',r.rejection_reason,'closedAt',r.closed_at,'cancelledAt',r.cancelled_at,
'cancelReason',r.cancel_reason,'createdAt',r.created_at,'lastModifiedAt',r.last_modified_at,
'lastModifiedBy',concat_ws(' ',mb.first_name,mb.last_name),'createdBy',concat_ws(' ',cb.first_name,cb.last_name)))::text AS record
FROM scm_purchase_requisitions r
LEFT JOIN inv_warehouses w ON w.tenant_id=r.tenant_id AND w.id=r.warehouse_id AND w.is_deleted=false
LEFT JOIN users rq ON rq.id=r.requested_by_user_id
LEFT JOIN users cb ON cb.id=r.created_by_user_id
LEFT JOIN users mb ON mb.id=r.last_modified_by_user_id)";
}
std::string requisitionLinesSelect() {
  return R"(SELECT (jsonb_build_object('id',l.id,'lineNumber',l.line_number,'itemId',l.item_id,
'itemCode',i.item_code,'itemName',i.name,'description',l.description,'uomId',l.uom_id,
'uomCode',u.code,'quantity',l.quantity::text,'orderedQuantity',l.ordered_quantity::text,
'estimatedUnitCost',l.estimated_unit_cost::text,'estimatedAmount',l.estimated_amount::text,
'suggestedSupplierId',l.suggested_supplier_id,'suggestedSupplierName',sp.name,
'neededByDate',l.needed_by_date,'status',l.status,'notes',l.notes))::text AS record
FROM scm_purchase_requisition_lines l
JOIN inv_items i ON i.tenant_id=l.tenant_id AND i.id=l.item_id
JOIN inv_units_of_measure u ON u.tenant_id=l.tenant_id AND u.id=l.uom_id
LEFT JOIN core_suppliers sp ON sp.tenant_id=l.tenant_id AND sp.id=l.suggested_supplier_id AND sp.is_deleted=false
WHERE l.tenant_id=$1 AND l.requisition_id=$2::uuid AND l.is_deleted=false ORDER BY l.line_number,l.id)";
}
std::string eventsSelect() {
  return R"(SELECT (jsonb_build_object('id',e.id,'action',e.action,'previousStatus',e.previous_status,
'newStatus',e.new_status,'reason',e.reason,'version',e.version,'createdAt',e.created_at,
'actor',COALESCE(concat_ws(' ',u.first_name,u.last_name),'')))::text AS record
FROM scm_procurement_events e LEFT JOIN users u ON u.id=e.created_by_user_id
WHERE e.tenant_id=$1 AND e.entity_type=$3 AND e.entity_id=$2::uuid AND e.is_deleted=false
ORDER BY e.version)";
}
// Field-level UUID validation used by the payload validators below. Returns an
// empty string when the field checks out, otherwise the client-visible problem
// message. Optional fields tolerate missing/null/empty-string values; present
// values are trimmed back into the payload for storage.
std::string requireUuid(Json::Value &b, const char *field, bool optional) {
  const auto &v = b[field];
  const std::string raw = v.isString() ? trim(v.asString()) : "";
  if (raw.empty())
    return optional ? "" : std::string(field) + " is required.";
  if (!uuid(raw))
    return std::string(field) + " must be a valid UUID.";
  b[field] = raw;
  return "";
}
std::string validateRequisition(Json::Value &b, bool update) {
  if (!b.isObject())
    return "Expected a requisition object.";
  static const std::set<std::string> keys{
      "accountingUnitId", "requestDate",    "requiredByDate", "priority", "costCenterId",
      "warehouseId",      "purpose",        "requestId",      "lines",    "version"};
  for (const auto &k : b.getMemberNames())
    if (!keys.count(k))
      return "Unexpected field: " + k;
  if (const auto p = requireUuid(b, "accountingUnitId", false); !p.empty()) return p;
  if (const auto p = requireUuid(b, "costCenterId", true); !p.empty()) return p;
  if (const auto p = requireUuid(b, "warehouseId", true); !p.empty()) return p;
  if (const auto p = requireUuid(b, "requestId", true); !p.empty()) return p;
  if (!b["requestDate"].isString() || !date(trim(b["requestDate"].asString())))
    return "requestDate: a YYYY-MM-DD date is required.";
  if (b["requiredByDate"].isString() && !b["requiredByDate"].asString().empty() &&
      !date(trim(b["requiredByDate"].asString())))
    return "requiredByDate: a YYYY-MM-DD date is required.";
  if (b["requiredByDate"].isString() && date(trim(b["requiredByDate"].asString())) &&
      trim(b["requiredByDate"].asString()) < trim(b["requestDate"].asString()))
    return "requiredByDate cannot precede requestDate.";
  const std::string priority = b["priority"].isString() ? lower(trim(b["priority"].asString())) : "normal";
  b["priority"] = priority;
  if (!std::set<std::string>{"low", "normal", "high", "urgent"}.count(priority))
    return "priority: low, normal, high or urgent.";
  b["purpose"] = b["purpose"].isString() ? b["purpose"].asString() : "";
  if (!text(b["purpose"].asString(), 1000))
    return "purpose: up to 1000 characters.";
  if (update && (!b["version"].isInt() || b["version"].asInt() < 1))
    return "A valid record version is required.";
  if (!b["lines"].isArray() || b["lines"].empty() || b["lines"].size() > 200)
    return "Provide 1-200 requisition lines.";
  static const std::set<std::string> lineKeys{
      "itemId", "description", "uomId", "quantity", "estimatedUnitCost",
      "suggestedSupplierId", "neededByDate", "notes"};
  for (auto &l : b["lines"]) {
    if (!l.isObject())
      return "Each requisition line must be an object.";
    for (const auto &k : l.getMemberNames())
      if (!lineKeys.count(k))
        return "Unexpected line field: " + k;
    if (const auto p = requireUuid(l, "itemId", false); !p.empty()) return p;
    if (const auto p = requireUuid(l, "uomId", false); !p.empty()) return p;
    if (const auto p = requireUuid(l, "suggestedSupplierId", true); !p.empty()) return p;
    const std::string qty = decVal(l["quantity"], "");
    if (!decOk(qty, true))
      return "quantity: a positive number with up to 6 decimals is required.";
    l["quantity"] = qty;
    const std::string cost = decVal(l["estimatedUnitCost"], "0");
    if (!decOk(cost, false))
      return "estimatedUnitCost: a non-negative number with up to 6 decimals is required.";
    l["estimatedUnitCost"] = cost;
    if (l["neededByDate"].isString() && !l["neededByDate"].asString().empty() &&
        !date(trim(l["neededByDate"].asString())))
      return "neededByDate: a YYYY-MM-DD date is required.";
    l["description"] = l["description"].isString() ? l["description"].asString() : "";
    l["notes"] = l["notes"].isString() ? l["notes"].asString() : "";
    if (!text(l["description"].asString(), 500) || !text(l["notes"].asString(), 500))
      return "Line descriptions and notes stay within 500 characters.";
  }
  return {};
}
// Insert the lines of a requisition/order/receipt from a prepared record list.
// jsonb_populate_record projects every table column, so the select list names
// exactly the provided columns (same list string reused for both sides).
drogon::Task<void> insertLinesSql(DbClientPtr tx, const utils::AuditIdentity &who,
                                  const char *table, const char *columns,
                                  const std::vector<std::string> &payloads) {
  std::string prefixed;
  std::string rest{columns};
  size_t pos = 0;
  while (pos <= rest.size()) {
    const auto comma = rest.find(',', pos);
    prefixed += comma == std::string::npos ? "p." + rest.substr(pos)
                                           : "p." + rest.substr(pos, comma - pos) + ",";
    if (comma == std::string::npos)
      break;
    pos = comma + 1;
  }
  for (const auto &payload : payloads)
    co_await tx->execSqlCoro(
        "INSERT INTO " + std::string(table) + "(tenant_id," + std::string(columns) +
            ",created_by_user_id) SELECT $1::uuid," + prefixed + ",$2::uuid "
            "FROM jsonb_populate_record(NULL::" +
            std::string(table) + ",$3::jsonb) p",
        who.tenantId, who.userId, payload);
  co_return;
}
drogon::Task<dto::BaseApiResponse> getRequisition(DbClientPtr db, const utils::AuditIdentity &who,
                                                  const std::string &id, bool canWrite) {
  const auto rows = co_await db->execSqlCoro(
      requisitionHeaderSelect() + " WHERE r.tenant_id=$1 AND r.id=$2::uuid AND r.is_deleted=false",
      who.tenantId, id);
  if (rows.empty())
    co_return fail("not_found", "Requisition not found.");
  dto::BaseApiResponse r;
  r.result = parse(rows[0]["record"].as<std::string>());
  r.result["lines"] = Json::arrayValue;
  const auto lines = co_await db->execSqlCoro(requisitionLinesSelect(), who.tenantId, id);
  for (const auto &row : lines)
    r.result["lines"].append(parse(row["record"].as<std::string>()));
  r.result["history"] = Json::arrayValue;
  const auto events = co_await db->execSqlCoro(eventsSelect(), who.tenantId, id, "requisition");
  for (const auto &row : events)
    r.result["history"].append(parse(row["record"].as<std::string>()));
  r.result["capabilities"]["canWrite"] = canWrite;
  r.success = true;
  co_return r;
}
drogon::Task<dto::BaseApiResponse> createRequisition(DbClientPtr tx,
                                                     const utils::AuditIdentity &who,
                                                     Json::Value b) {
  if (const auto p = validateRequisition(b, false); !p.empty())
    co_return fail("validation_error", p);
  if (b["requestId"].isString()) {
    const auto dupe = co_await tx->execSqlCoro(
        "SELECT id,created_by_user_id FROM scm_purchase_requisitions WHERE tenant_id=$1 AND "
        "request_key=$2::uuid AND is_deleted=false",
        who.tenantId, b["requestId"].asString());
    if (!dupe.empty()) {
      if (dupe[0]["created_by_user_id"].as<std::string>() != who.userId)
        co_return fail("conflict", "Request ID already belongs to another actor.");
      Json::Value ignored;
      co_return co_await getRequisition(tx, who, dupe[0]["id"].as<std::string>(), true);
    }
  }
  const std::string unit = lower(b["accountingUnitId"].asString());
  const auto unitRow = co_await tx->execSqlCoro(
      "SELECT 1 AS ok FROM core_accounting_units WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false",
      who.tenantId, unit);
  if (unitRow.empty())
    co_return fail("validation_error", "accountingUnitId: an accounting unit of this tenant is required.");
  long double estimated = 0;
  std::vector<std::string> payloads;
  int lineNo = 0;
  for (const auto &l : b["lines"]) {
    Json::Value record;
    record["requisition_id"] = Json::nullValue; // patched after header insert
    record["line_number"] = ++lineNo;
    record["item_id"] = lower(l["itemId"].asString());
    record["description"] = l["description"].asString();
    record["uom_id"] = lower(l["uomId"].asString());
    record["quantity"] = l["quantity"].asString();
    record["estimated_unit_cost"] = l["estimatedUnitCost"].asString();
    const long double amount = std::stold(l["quantity"].asString()) * std::stold(l["estimatedUnitCost"].asString());
    record["estimated_amount"] = q6(amount);
    estimated += amount;
    if (l["suggestedSupplierId"].isString())
      record["suggested_supplier_id"] = lower(l["suggestedSupplierId"].asString());
    if (l["neededByDate"].isString() && !l["neededByDate"].asString().empty())
      record["needed_by_date"] = trim(l["neededByDate"].asString());
    record["notes"] = l["notes"].asString();
    payloads.push_back(Json::writeString(Json::StreamWriterBuilder{}, record));
  }
  const std::string number = co_await scmNextNumber(tx, who, unit, "requisition", "REQ");
  Json::Value header;
  header["accounting_unit_id"] = unit;
  header["requisition_number"] = number;
  header["request_date"] = trim(b["requestDate"].asString());
  if (b["requiredByDate"].isString() && !b["requiredByDate"].asString().empty())
    header["required_by_date"] = trim(b["requiredByDate"].asString());
  header["priority"] = b["priority"].asString();
  if (b["costCenterId"].isString())
    header["cost_center_id"] = lower(b["costCenterId"].asString());
  if (b["warehouseId"].isString())
    header["warehouse_id"] = lower(b["warehouseId"].asString());
  header["requested_by_user_id"] = who.userId;
  header["purpose"] = b["purpose"].asString();
  header["estimated_total"] = q6(estimated);
  if (b["requestId"].isString())
    header["request_key"] = lower(b["requestId"].asString());
  const auto saved = co_await tx->execSqlCoro(
      "INSERT INTO scm_purchase_requisitions(tenant_id,accounting_unit_id,requisition_number,request_date,"
      "required_by_date,priority,cost_center_id,warehouse_id,requested_by_user_id,purpose,estimated_total,"
      "request_key,created_by_user_id) "
      "SELECT $1::uuid,p.accounting_unit_id,p.requisition_number,p.request_date,p.required_by_date,"
      "p.priority,p.cost_center_id,p.warehouse_id,p.requested_by_user_id,p.purpose,p.estimated_total,"
      "p.request_key,$2::uuid "
      "FROM jsonb_populate_record(NULL::scm_purchase_requisitions,$3::jsonb) p RETURNING id",
      who.tenantId, who.userId, Json::writeString(Json::StreamWriterBuilder{}, header));
  const std::string docId = saved[0]["id"].as<std::string>();
  for (auto &payload : payloads) {
    Json::Value record = parse(payload);
    record["requisition_id"] = docId;
    payload = Json::writeString(Json::StreamWriterBuilder{}, record);
  }
  co_await insertLinesSql(tx, who, "scm_purchase_requisition_lines",
                          "requisition_id,line_number,item_id,description,uom_id,quantity,"
                          "estimated_unit_cost,estimated_amount,suggested_supplier_id,needed_by_date,notes",
                          payloads);
  co_await scmEvent(tx, who, "requisition", docId, "created", "", "draft", "");
  co_return co_await getRequisition(tx, who, docId, true);
}
drogon::Task<dto::BaseApiResponse> updateRequisition(DbClientPtr tx,
                                                     const utils::AuditIdentity &who,
                                                     const std::string &id, Json::Value b) {
  if (const auto p = validateRequisition(b, true); !p.empty())
    co_return fail("validation_error", p);
  const auto head = co_await tx->execSqlCoro(
      "SELECT status,version,accounting_unit_id FROM scm_purchase_requisitions WHERE tenant_id=$1 AND "
      "id=$2::uuid AND is_deleted=false FOR UPDATE",
      who.tenantId, id);
  if (head.empty())
    co_return fail("not_found", "Requisition not found.");
  if (head[0]["status"].as<std::string>() != "draft")
    co_return fail("conflict", "Only draft requisitions can be updated.");
  if (head[0]["version"].as<int>() != b["version"].asInt())
    co_return fail("conflict", "Requisition changed. Reload before saving.");
  if (head[0]["accounting_unit_id"].as<std::string>() != lower(b["accountingUnitId"].asString()))
    co_return fail("conflict", "The accounting unit cannot change.");
  long double estimated = 0;
  std::vector<std::string> payloads;
  int lineNo = 0;
  for (const auto &l : b["lines"]) {
    Json::Value record;
    record["requisition_id"] = id;
    record["line_number"] = ++lineNo;
    record["item_id"] = lower(l["itemId"].asString());
    record["description"] = l["description"].asString();
    record["uom_id"] = lower(l["uomId"].asString());
    record["quantity"] = l["quantity"].asString();
    record["estimated_unit_cost"] = l["estimatedUnitCost"].asString();
    const long double amount = std::stold(l["quantity"].asString()) * std::stold(l["estimatedUnitCost"].asString());
    record["estimated_amount"] = q6(amount);
    estimated += amount;
    if (l["suggestedSupplierId"].isString())
      record["suggested_supplier_id"] = lower(l["suggestedSupplierId"].asString());
    if (l["neededByDate"].isString() && !l["neededByDate"].asString().empty())
      record["needed_by_date"] = trim(l["neededByDate"].asString());
    record["notes"] = l["notes"].asString();
    payloads.push_back(Json::writeString(Json::StreamWriterBuilder{}, record));
  }
  co_await tx->execSqlCoro(
      "UPDATE scm_purchase_requisitions SET request_date=$4::date,"
      "required_by_date=NULLIF($5::text,'')::date,priority=$6,cost_center_id=NULLIF($7::text,'')::uuid,"
      "warehouse_id=NULLIF($8::text,'')::uuid,purpose=$9,estimated_total=($10::text)::numeric,"
      "version=version+1,last_modified_at=now(),last_modified_by_user_id=$3 "
      "WHERE tenant_id=$1 AND id=$2::uuid AND status='draft' AND is_deleted=false",
      who.tenantId, id, who.userId, trim(b["requestDate"].asString()),
      b["requiredByDate"].isString() ? trim(b["requiredByDate"].asString()) : "",
      b["priority"].asString(), b["costCenterId"].isString() ? lower(b["costCenterId"].asString()) : "",
      b["warehouseId"].isString() ? lower(b["warehouseId"].asString()) : "", b["purpose"].asString(),
      q6(estimated));
  co_await tx->execSqlCoro(
      "UPDATE scm_purchase_requisition_lines SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3,"
      "last_modified_at=now(),last_modified_by_user_id=$3 WHERE tenant_id=$1 AND requisition_id=$2::uuid "
      "AND is_deleted=false",
      who.tenantId, id, who.userId);
  co_await insertLinesSql(tx, who, "scm_purchase_requisition_lines",
                          "requisition_id,line_number,item_id,description,uom_id,quantity,"
                          "estimated_unit_cost,estimated_amount,suggested_supplier_id,needed_by_date,notes",
                          payloads);
  co_await scmEvent(tx, who, "requisition", id, "updated", "draft", "draft", "");
  co_return co_await getRequisition(tx, who, id, true);
}
// Generic soft-delete of a draft document.
drogon::Task<dto::BaseApiResponse> deleteScmDraft(DbClientPtr tx, const utils::AuditIdentity &who,
                                                  const char *table, bool isReceipt,
                                                  const std::string &label, const std::string &id,
                                                  Json::Value b) {
  if (!b.isObject() || !b["version"].isInt() || b["version"].asInt() < 1)
    co_return fail("validation_error", "A record version is required to delete.");
  const std::string postedCol = isReceipt ? ",is_posted::text AS posted" : "";
  const auto head = co_await tx->execSqlCoro(
      "SELECT status,version" + postedCol + " FROM " + std::string(table) +
          " WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false FOR UPDATE",
      who.tenantId, id);
  if (head.empty())
    co_return fail("not_found", label + " not found.");
  if (head[0]["version"].as<int>() != b["version"].asInt())
    co_return fail("conflict", label + " changed. Reload before deleting.");
  const std::string status = head[0]["status"].as<std::string>();
  if (isReceipt) {
    if (head[0]["posted"].as<std::string>() == "t")
      co_return fail("conflict", "Posted receipts cannot be deleted; reverse them instead.");
  } else if (status != "draft")
    co_return fail("conflict", "Only drafts can be deleted.");
  co_await tx->execSqlCoro(
      "UPDATE " + std::string(table) +
          " SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3,version=version+1,"
          "last_modified_at=now(),last_modified_by_user_id=$3 "
          "WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false",
      who.tenantId, id, who.userId);
  dto::BaseApiResponse r;
  r.result["id"] = id;
  r.success = true;
  co_return r;
}
// Requisition lifecycle: submit | approve | reject | cancel | close.
drogon::Task<dto::BaseApiResponse> requisitionTransition(DbClientPtr tx,
                                                         const utils::AuditIdentity &who,
                                                         const std::string &id,
                                                         const std::string &action, Json::Value b) {
  if (!b.isObject() || !b["version"].isInt() || b["version"].asInt() < 1)
    co_return fail("validation_error", "A valid record version is required.");
  std::string reason = b["reason"].isString() ? trim(b["reason"].asString()) : "";
  if (reason.size() > 500)
    co_return fail("validation_error", "reason: up to 500 characters.");
  const auto head = co_await tx->execSqlCoro(
      "SELECT status FROM scm_purchase_requisitions WHERE tenant_id=$1 AND id=$2::uuid AND "
      "is_deleted=false FOR UPDATE",
      who.tenantId, id);
  if (head.empty())
    co_return fail("not_found", "Requisition not found.");
  if (!(co_await versionMatches(tx, who, "scm_purchase_requisitions", id, b["version"].asInt())))
    co_return fail("conflict", "Requisition changed. Reload before continuing.");
  const std::string status = head[0]["status"].as<std::string>();
  if (action == "approve" || action == "reject" || action == "submit")
    if (status != (action == "submit" ? "draft" : "submitted"))
      co_return fail("conflict", "This requisition cannot be " + action + "ed from its status.");
  if (action == "reject" && reason.empty())
    co_return fail("validation_error", "Rejections require a reason.");
  if (action == "cancel") {
    if (reason.empty())
      co_return fail("validation_error", "Cancellations require a reason.");
    if (status != "draft" && status != "submitted" && status != "approved" && status != "partially_ordered")
      co_return fail("conflict", "This requisition can no longer be cancelled.");
  }
  if (action == "close" && status != "approved" && status != "partially_ordered")
    co_return fail("conflict", "Only approved requisitions can be closed.");
  std::string sql;
  if (action == "submit")
    sql = "UPDATE scm_purchase_requisitions SET status='submitted',submitted_at=now(),submitted_by_user_id=$3";
  else if (action == "approve")
    sql = "UPDATE scm_purchase_requisitions SET status='approved',approved_at=now(),approved_by_user_id=$3";
  else if (action == "reject")
    sql = "UPDATE scm_purchase_requisitions SET status='rejected',rejected_at=now(),rejected_by_user_id=$3,rejection_reason=$4";
  else if (action == "cancel")
    sql = "UPDATE scm_purchase_requisitions SET status='cancelled',cancelled_at=now(),cancelled_by_user_id=$3,cancel_reason=$4";
  else
    sql = "UPDATE scm_purchase_requisitions SET status='closed',closed_at=now(),closed_by_user_id=$3";
  sql += ",version=version+1,last_modified_at=now(),last_modified_by_user_id=$3 WHERE tenant_id=$1 AND id=$2::uuid";
  if (action == "reject" || action == "cancel")
    co_await tx->execSqlCoro(sql, who.tenantId, id, who.userId, reason);
  else
    co_await tx->execSqlCoro(sql, who.tenantId, id, who.userId);
  const std::string next = action == "submit" ? "submitted" : action == "approve" ? "approved" : action == "reject" ? "rejected" : action == "cancel" ? "cancelled" : "closed";
  co_await scmEvent(tx, who, "requisition", id, action + "ed", status, next, reason);
  co_return co_await getRequisition(tx, who, id, true);
}
// ---------------------------------------------------------------------------
// Purchase orders.
// ---------------------------------------------------------------------------
std::string orderHeaderSelect() {
  return R"(SELECT (jsonb_build_object('id',o.id,'version',o.version,'accountingUnitId',o.accounting_unit_id,
'orderNumber',o.order_number,'supplierId',o.supplier_id,'supplierName',sp.name,
'supplierAccountNumber',sp.account_number,'quotationId',o.quotation_id,'orderDate',o.order_date,
'expectedDeliveryDate',o.expected_delivery_date,'status',o.status,'warehouseId',o.warehouse_id,
'warehouseName',w.name,'currencyId',o.currency_id,'currencyCode',cr.code,'exchangeRate',o.exchange_rate::text,
'incoterm',o.incoterm,'paymentTermsDays',o.payment_terms_days,'subTotal',o.sub_total::text,
'discountTotal',o.discount_total::text,'taxTotal',o.tax_total::text,'grandTotal',o.grand_total::text,
'baseGrandTotal',o.base_grand_total::text,'supplierReference',o.supplier_reference,'notes',o.notes,
'submittedAt',o.submitted_at,'approvedAt',o.approved_at,'rejectedAt',o.rejected_at,
'rejectionReason',o.rejection_reason,'sentAt',o.sent_at,'closedAt',o.closed_at,'cancelledAt',o.cancelled_at,
'cancelReason',o.cancel_reason,'createdAt',o.created_at,'lastModifiedAt',o.last_modified_at,
'lastModifiedBy',concat_ws(' ',mb.first_name,mb.last_name),'createdBy',concat_ws(' ',cb.first_name,cb.last_name)))::text AS record
FROM scm_purchase_orders o
JOIN core_suppliers sp ON sp.tenant_id=o.tenant_id AND sp.id=o.supplier_id
JOIN inv_warehouses w ON w.tenant_id=o.tenant_id AND w.id=o.warehouse_id
JOIN core_currencies cr ON cr.id=o.currency_id
LEFT JOIN users cb ON cb.id=o.created_by_user_id
LEFT JOIN users mb ON mb.id=o.last_modified_by_user_id)";
}
std::string orderLinesSelect() {
  return R"(SELECT (jsonb_build_object('id',l.id,'lineNumber',l.line_number,'itemId',l.item_id,
'itemCode',i.item_code,'itemName',i.name,'description',l.description,'uomId',l.uom_id,
'uomCode',u.code,'conversionFactor',l.conversion_factor::text,'quantity',l.quantity::text,
'unitCost',l.unit_cost::text,'discountRate',l.discount_rate::text,'taxRate',l.tax_rate::text,
'lineTotal',l.line_total::text,'receivedQuantity',l.received_quantity::text,
'rejectedQuantity',l.rejected_quantity::text,'openQuantity',(l.quantity-l.received_quantity-l.rejected_quantity)::text,
'requisitionLineId',l.requisition_line_id,'status',l.status))::text AS record
FROM scm_purchase_order_lines l
JOIN inv_items i ON i.tenant_id=l.tenant_id AND i.id=l.item_id
JOIN inv_units_of_measure u ON u.tenant_id=l.tenant_id AND u.id=l.uom_id
WHERE l.tenant_id=$1 AND l.order_id=$2::uuid AND l.is_deleted=false ORDER BY l.line_number,l.id)";
}
drogon::Task<dto::BaseApiResponse> getOrder(DbClientPtr db, const utils::AuditIdentity &who,
                                            const std::string &id, bool canWrite) {
  const auto rows = co_await db->execSqlCoro(
      orderHeaderSelect() + " WHERE o.tenant_id=$1 AND o.id=$2::uuid AND o.is_deleted=false",
      who.tenantId, id);
  if (rows.empty())
    co_return fail("not_found", "Purchase order not found.");
  dto::BaseApiResponse r;
  r.result = parse(rows[0]["record"].as<std::string>());
  r.result["lines"] = Json::arrayValue;
  const auto lines = co_await db->execSqlCoro(orderLinesSelect(), who.tenantId, id);
  for (const auto &row : lines)
    r.result["lines"].append(parse(row["record"].as<std::string>()));
  r.result["history"] = Json::arrayValue;
  const auto events = co_await db->execSqlCoro(eventsSelect(), who.tenantId, id, "purchase_order");
  for (const auto &row : events)
    r.result["history"].append(parse(row["record"].as<std::string>()));
  r.result["capabilities"]["canWrite"] = canWrite;
  r.success = true;
  co_return r;
}
std::string validateOrder(Json::Value &b, bool update) {
  if (!b.isObject())
    return "Expected a purchase order object.";
  static const std::set<std::string> keys{
      "accountingUnitId",  "supplierId",     "quotationId",  "orderDate",  "expectedDeliveryDate",
      "warehouseId",       "currencyId",     "exchangeRate", "incoterm",   "paymentTermsDays",
      "supplierReference", "notes",          "requestId",    "lines",      "version"};
  for (const auto &k : b.getMemberNames())
    if (!keys.count(k))
      return "Unexpected field: " + k;
  if (const auto p = requireUuid(b, "accountingUnitId", false); !p.empty()) return p;
  if (const auto p = requireUuid(b, "supplierId", false); !p.empty()) return p;
  if (const auto p = requireUuid(b, "quotationId", true); !p.empty()) return p;
  if (const auto p = requireUuid(b, "warehouseId", false); !p.empty()) return p;
  if (const auto p = requireUuid(b, "currencyId", true); !p.empty()) return p;
  if (const auto p = requireUuid(b, "requestId", true); !p.empty()) return p;
  if (!b["orderDate"].isString() || !date(trim(b["orderDate"].asString())))
    return "orderDate: a YYYY-MM-DD date is required.";
  if (b["expectedDeliveryDate"].isString() && !b["expectedDeliveryDate"].asString().empty()) {
    if (!date(trim(b["expectedDeliveryDate"].asString())))
      return "expectedDeliveryDate: a YYYY-MM-DD date is required.";
    if (trim(b["expectedDeliveryDate"].asString()) < trim(b["orderDate"].asString()))
      return "expectedDeliveryDate cannot precede orderDate.";
  }
  const std::string rate = decVal(b["exchangeRate"], "1");
  if (!decOk(rate, true))
    return "exchangeRate: a positive number is required.";
  b["exchangeRate"] = rate;
  const std::string incoterm = b["incoterm"].isString() ? trim(b["incoterm"].asString()) : "";
  b["incoterm"] = incoterm;
  if (!std::set<std::string>{"", "EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DPU", "DAP", "DDP"}.count(incoterm))
    return "incoterm: use a valid Incoterms 2020 code.";
  const int terms = b["paymentTermsDays"].isInt() ? b["paymentTermsDays"].asInt() : 0;
  if (terms < 0 || terms > 3650)
    return "paymentTermsDays: 0-3650.";
  b["paymentTermsDays"] = terms;
  b["supplierReference"] = b["supplierReference"].isString() ? trim(b["supplierReference"].asString()) : "";
  if (!text(b["supplierReference"].asString(), 80))
    return "supplierReference: up to 80 characters.";
  b["notes"] = b["notes"].isString() ? b["notes"].asString() : "";
  if (!text(b["notes"].asString(), 1000))
    return "notes: up to 1000 characters.";
  if (update && (!b["version"].isInt() || b["version"].asInt() < 1))
    return "A valid record version is required.";
  if (!b["lines"].isArray() || b["lines"].empty() || b["lines"].size() > 200)
    return "Provide 1-200 order lines.";
  static const std::set<std::string> lineKeys{"itemId", "description", "uomId", "quantity", "unitCost",
                                              "discountRate", "taxRate", "requisitionLineId"};
  for (auto &l : b["lines"]) {
    if (!l.isObject())
      return "Each order line must be an object.";
    for (const auto &k : l.getMemberNames())
      if (!lineKeys.count(k))
        return "Unexpected line field: " + k;
    if (const auto p = requireUuid(l, "itemId", false); !p.empty()) return p;
    if (const auto p = requireUuid(l, "uomId", false); !p.empty()) return p;
    if (const auto p = requireUuid(l, "requisitionLineId", true); !p.empty()) return p;
    const std::string qty = decVal(l["quantity"], "");
    if (!decOk(qty, true))
      return "quantity: a positive number with up to 6 decimals is required.";
    l["quantity"] = qty;
    const std::string cost = decVal(l["unitCost"], "");
    if (!decOk(cost, false))
      return "unitCost: a non-negative number with up to 6 decimals is required.";
    l["unitCost"] = cost;
    for (const char *k : {"discountRate", "taxRate"}) {
      const std::string v = decVal(l[k], "0");
      if (!decOk(v, false))
        return std::string(k) + ": a rate between 0 and 1 is required.";
      if (std::stold(v) > 1)
        return std::string(k) + ": a rate between 0 and 1 is required.";
      l[k] = v;
    }
    l["description"] = l["description"].isString() ? l["description"].asString() : "";
    if (!text(l["description"].asString(), 500))
      return "Line descriptions stay within 500 characters.";
  }
  return {};
}
// Resolve the conversion factor from the entered UOM to the item base UOM.
drogon::Task<dto::BaseApiResponse> orderLineFactor(DbClientPtr tx, const utils::AuditIdentity &who,
                                                   const std::string &itemId, const std::string &uomId,
                                                   std::string &factorOut) {
  const auto item = co_await tx->execSqlCoro(
      "SELECT base_uom_id FROM inv_items WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false "
      "FOR SHARE",
      who.tenantId, itemId);
  if (item.empty())
    co_return fail("validation_error", "itemId: a live catalog item is required.");
  const std::string base = item[0]["base_uom_id"].as<std::string>();
  if (base == uomId) {
    factorOut = "1";
    dto::BaseApiResponse ok;
    ok.success = true;
    co_return ok;
  }
  const auto conv = co_await tx->execSqlCoro(
      "SELECT factor::text AS f FROM inv_item_uom_conversions WHERE tenant_id=$1 AND item_id=$2::uuid "
      "AND is_deleted=false AND ((from_uom_id=$3::uuid AND to_uom_id=$4::uuid) OR "
      "(to_uom_id=$3::uuid AND from_uom_id=$4::uuid)) AND is_active=true "
      "ORDER BY (from_uom_id=$3::uuid) DESC LIMIT 1",
      who.tenantId, itemId, uomId, base);
  if (conv.empty())
    co_return fail("validation_error",
                   "No unit conversion to the base unit for " + uomId + "; maintain one on the item.");
  if (conv[0]["f"].isNull())
    co_return fail("validation_error", "The unit conversion has no factor.");
  factorOut = conv[0]["f"].as<std::string>();
  dto::BaseApiResponse ok;
  ok.success = true;
  co_return ok;
}
// Build order line records + totals. Shared by create and update.
drogon::Task<dto::BaseApiResponse> prepareOrderLines(DbClientPtr tx, const utils::AuditIdentity &who,
                                                     const Json::Value &body, std::vector<std::string> &payloads,
                                                     long double &subTotal, long double &discountTotal,
                                                     long double &taxTotal) {
  subTotal = discountTotal = taxTotal = 0;
  int lineNo = static_cast<int>(payloads.size());
  for (const auto &l : body["lines"]) {
    const std::string itemId = lower(l["itemId"].asString());
    std::string factor;
    const auto conv = co_await orderLineFactor(tx, who, itemId, lower(l["uomId"].asString()), factor);
    if (!conv.success)
      co_return conv;
    const long double qty = std::stold(l["quantity"].asString());
    const long double unit = std::stold(l["unitCost"].asString());
    const long double gross = qty * unit;
    const long double discount = gross * std::stold(l["discountRate"].asString());
    const long double net = gross - discount;
    const long double tax = net * std::stold(l["taxRate"].asString());
    Json::Value record;
    record["order_id"] = Json::nullValue; // patched by the caller
    record["line_number"] = ++lineNo;
    record["item_id"] = itemId;
    record["description"] = l["description"].asString();
    record["uom_id"] = lower(l["uomId"].asString());
    record["conversion_factor"] = factor;
    record["quantity"] = l["quantity"].asString();
    record["unit_cost"] = l["unitCost"].asString();
    record["discount_rate"] = l["discountRate"].asString();
    record["tax_rate"] = l["taxRate"].asString();
    record["line_total"] = q6(net + tax);
    if (l["requisitionLineId"].isString())
      record["requisition_line_id"] = lower(l["requisitionLineId"].asString());
    payloads.push_back(Json::writeString(Json::StreamWriterBuilder{}, record));
    subTotal += gross;
    discountTotal += discount;
    taxTotal += tax;
  }
  dto::BaseApiResponse ok;
  ok.success = true;
  co_return ok;
}
drogon::Task<dto::BaseApiResponse> createOrder(DbClientPtr tx, const utils::AuditIdentity &who,
                                               Json::Value b) {
  if (const auto p = validateOrder(b, false); !p.empty())
    co_return fail("validation_error", p);
  if (b["requestId"].isString()) {
    const auto dupe = co_await tx->execSqlCoro(
        "SELECT id,created_by_user_id FROM scm_purchase_orders WHERE tenant_id=$1 AND request_key=$2::uuid "
        "AND is_deleted=false",
        who.tenantId, b["requestId"].asString());
    if (!dupe.empty()) {
      if (dupe[0]["created_by_user_id"].as<std::string>() != who.userId)
        co_return fail("conflict", "Request ID already belongs to another actor.");
      co_return co_await getOrder(tx, who, dupe[0]["id"].as<std::string>(), true);
    }
  }
  const auto supplier = co_await tx->execSqlCoro(
      "SELECT currency_id FROM core_suppliers WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false "
      "FOR SHARE",
      who.tenantId, lower(b["supplierId"].asString()));
  if (supplier.empty())
    co_return fail("validation_error", "Select a live active supplier.");
  const std::string currency = b["currencyId"].isString() ? lower(b["currencyId"].asString())
                                                          : supplier[0]["currency_id"].as<std::string>();
  const auto currencyRow = co_await tx->execSqlCoro(
      "SELECT 1 AS ok FROM core_currencies WHERE id=$1 AND is_deleted=false", currency);
  if (currencyRow.empty())
    co_return fail("validation_error", "currencyId: a live currency is required.");
  const std::string unit = lower(b["accountingUnitId"].asString());
  std::vector<std::string> payloads;
  long double subTotal = 0, discountTotal = 0, taxTotal = 0;
  const auto ready = co_await prepareOrderLines(tx, who, b, payloads, subTotal, discountTotal, taxTotal);
  if (!ready.success)
    co_return ready;
  const long double grand = subTotal - discountTotal + taxTotal;
  const std::string number = co_await scmNextNumber(tx, who, unit, "purchase_order", "PO");
  Json::Value header;
  header["accounting_unit_id"] = unit;
  header["order_number"] = number;
  header["supplier_id"] = lower(b["supplierId"].asString());
  if (b["quotationId"].isString())
    header["quotation_id"] = lower(b["quotationId"].asString());
  header["order_date"] = trim(b["orderDate"].asString());
  if (b["expectedDeliveryDate"].isString() && !b["expectedDeliveryDate"].asString().empty())
    header["expected_delivery_date"] = trim(b["expectedDeliveryDate"].asString());
  header["warehouse_id"] = lower(b["warehouseId"].asString());
  header["currency_id"] = currency;
  header["exchange_rate"] = b["exchangeRate"].asString();
  header["incoterm"] = b["incoterm"].asString();
  header["payment_terms_days"] = b["paymentTermsDays"].asInt();
  header["sub_total"] = q6(subTotal);
  header["discount_total"] = q6(discountTotal);
  header["tax_total"] = q6(taxTotal);
  header["grand_total"] = q6(grand);
  header["base_grand_total"] = q6(grand * std::stold(b["exchangeRate"].asString()));
  header["supplier_reference"] = b["supplierReference"].asString();
  header["notes"] = b["notes"].asString();
  if (b["requestId"].isString())
    header["request_key"] = lower(b["requestId"].asString());
  const auto saved = co_await tx->execSqlCoro(
      "INSERT INTO scm_purchase_orders(tenant_id,accounting_unit_id,order_number,supplier_id,quotation_id,"
      "order_date,expected_delivery_date,warehouse_id,currency_id,exchange_rate,incoterm,payment_terms_days,"
      "sub_total,discount_total,tax_total,grand_total,base_grand_total,supplier_reference,notes,request_key,"
      "created_by_user_id) "
      "SELECT $1::uuid,p.accounting_unit_id,p.order_number,p.supplier_id,p.quotation_id,p.order_date,"
      "p.expected_delivery_date,p.warehouse_id,p.currency_id,p.exchange_rate,p.incoterm,p.payment_terms_days,"
      "p.sub_total,p.discount_total,p.tax_total,p.grand_total,p.base_grand_total,p.supplier_reference,p.notes,"
      "p.request_key,$2::uuid "
      "FROM jsonb_populate_record(NULL::scm_purchase_orders,$3::jsonb) p RETURNING id",
      who.tenantId, who.userId, Json::writeString(Json::StreamWriterBuilder{}, header));
  const std::string docId = saved[0]["id"].as<std::string>();
  for (auto &payload : payloads) {
    Json::Value record = parse(payload);
    record["order_id"] = docId;
    payload = Json::writeString(Json::StreamWriterBuilder{}, record);
  }
  co_await insertLinesSql(tx, who, "scm_purchase_order_lines",
                          "order_id,line_number,item_id,description,uom_id,conversion_factor,quantity,"
                          "unit_cost,discount_rate,tax_rate,line_total,requisition_line_id",
                          payloads);
  co_await scmEvent(tx, who, "purchase_order", docId, "created", "", "draft", "");
  co_return co_await getOrder(tx, who, docId, true);
}
drogon::Task<dto::BaseApiResponse> updateOrder(DbClientPtr tx, const utils::AuditIdentity &who,
                                               const std::string &id, Json::Value b) {
  if (const auto p = validateOrder(b, true); !p.empty())
    co_return fail("validation_error", p);
  const auto head = co_await tx->execSqlCoro(
      "SELECT status,version,accounting_unit_id FROM scm_purchase_orders WHERE tenant_id=$1 AND id=$2::uuid "
      "AND is_deleted=false FOR UPDATE",
      who.tenantId, id);
  if (head.empty())
    co_return fail("not_found", "Purchase order not found.");
  if (head[0]["status"].as<std::string>() != "draft")
    co_return fail("conflict", "Only draft orders can be updated.");
  if (head[0]["version"].as<int>() != b["version"].asInt())
    co_return fail("conflict", "Order changed. Reload before saving.");
  if (head[0]["accounting_unit_id"].as<std::string>() != lower(b["accountingUnitId"].asString()))
    co_return fail("conflict", "The accounting unit cannot change.");
  std::vector<std::string> payloads;
  long double subTotal = 0, discountTotal = 0, taxTotal = 0;
  const auto ready = co_await prepareOrderLines(tx, who, b, payloads, subTotal, discountTotal, taxTotal);
  if (!ready.success)
    co_return ready;
  // Currency falls back to the supplier trading currency when omitted.
  std::string currency = b["currencyId"].isString() ? lower(b["currencyId"].asString()) : "";
  if (currency.empty()) {
    const auto supplier = co_await tx->execSqlCoro(
        "SELECT currency_id FROM core_suppliers WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false "
        "FOR SHARE",
        who.tenantId, lower(b["supplierId"].asString()));
    if (supplier.empty())
      co_return fail("validation_error", "Select a live active supplier.");
    currency = supplier[0]["currency_id"].as<std::string>();
  }
  const long double grand = subTotal - discountTotal + taxTotal;
  co_await tx->execSqlCoro(
      "UPDATE scm_purchase_orders SET supplier_id=$4::uuid,quotation_id=NULLIF($5::text,'')::uuid,"
      "order_date=$6::date,expected_delivery_date=NULLIF($7::text,'')::date,warehouse_id=$8::uuid,"
      "currency_id=$9,exchange_rate=($10::text)::numeric,incoterm=$11,payment_terms_days=$12,"
      "sub_total=($13::text)::numeric,discount_total=($14::text)::numeric,tax_total=($15::text)::numeric,"
      "grand_total=($16::text)::numeric,base_grand_total=($17::text)::numeric,supplier_reference=$18,"
      "notes=$19,version=version+1,last_modified_at=now(),last_modified_by_user_id=$3 "
      "WHERE tenant_id=$1 AND id=$2::uuid AND status='draft' AND is_deleted=false",
      who.tenantId, id, who.userId, lower(b["supplierId"].asString()),
      b["quotationId"].isString() ? lower(b["quotationId"].asString()) : "",
      trim(b["orderDate"].asString()),
      b["expectedDeliveryDate"].isString() ? trim(b["expectedDeliveryDate"].asString()) : "",
      lower(b["warehouseId"].asString()), currency, b["exchangeRate"].asString(),
      b["incoterm"].asString(), b["paymentTermsDays"].asInt(), q6(subTotal), q6(discountTotal),
      q6(taxTotal), q6(grand), q6(grand * std::stold(b["exchangeRate"].asString())),
      b["supplierReference"].asString(), b["notes"].asString());
  co_await tx->execSqlCoro(
      "UPDATE scm_purchase_order_lines SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3,"
      "last_modified_at=now(),last_modified_by_user_id=$3 WHERE tenant_id=$1 AND order_id=$2::uuid "
      "AND is_deleted=false",
      who.tenantId, id, who.userId);
  for (auto &payload : payloads) {
    Json::Value record = parse(payload);
    record["order_id"] = id;
    payload = Json::writeString(Json::StreamWriterBuilder{}, record);
  }
  co_await insertLinesSql(tx, who, "scm_purchase_order_lines",
                          "order_id,line_number,item_id,description,uom_id,conversion_factor,quantity,"
                          "unit_cost,discount_rate,tax_rate,line_total,requisition_line_id",
                          payloads);
  co_await scmEvent(tx, who, "purchase_order", id, "updated", "draft", "draft", "");
  co_return co_await getOrder(tx, who, id, true);
}
// Order lifecycle: submit | approve | reject | send | cancel | close.
// Sending increments the originating requisition counters per line.
drogon::Task<dto::BaseApiResponse> orderTransition(DbClientPtr tx, const utils::AuditIdentity &who,
                                                   const std::string &id, const std::string &action,
                                                   Json::Value b) {
  if (!b.isObject() || !b["version"].isInt() || b["version"].asInt() < 1)
    co_return fail("validation_error", "A valid record version is required.");
  std::string reason = b["reason"].isString() ? trim(b["reason"].asString()) : "";
  if (reason.size() > 500)
    co_return fail("validation_error", "reason: up to 500 characters.");
  const auto head = co_await tx->execSqlCoro(
      "SELECT status FROM scm_purchase_orders WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false "
      "FOR UPDATE",
      who.tenantId, id);
  if (head.empty())
    co_return fail("not_found", "Purchase order not found.");
  if (!(co_await versionMatches(tx, who, "scm_purchase_orders", id, b["version"].asInt())))
    co_return fail("conflict", "Order changed. Reload before continuing.");
  const std::string status = head[0]["status"].as<std::string>();
  static const std::map<std::string, std::set<std::string>> allowed = {
      {"submit", {"draft"}}, {"approve", {"submitted"}}, {"reject", {"submitted"}},
      {"send", {"approved"}},
      {"cancel", {"draft", "submitted", "approved", "sent", "partially_received"}},
      {"close", {"approved", "partially_received", "received"}},
  };
  if (!allowed.count(action))
    co_return fail("validation_error", "Unsupported transition.");
  if (!allowed.at(action).count(status))
    co_return fail("conflict", "This order cannot be " + action + "ed from its status.");
  if ((action == "reject" || action == "cancel") && reason.empty())
    co_return fail("validation_error",
                   action == "reject" ? "Rejections require a reason." : "Cancellations require a reason.");
  if (action == "cancel") {
    const auto receipts = co_await tx->execSqlCoro(
        "SELECT 1 AS one FROM scm_purchase_order_lines WHERE tenant_id=$1 AND order_id=$2::uuid AND "
        "is_deleted=false AND (received_quantity>0 OR rejected_quantity>0) LIMIT 1",
        who.tenantId, id);
    if (!receipts.empty())
      co_return fail("conflict",
                     "Goods receipts exist against this order; reverse them or close the order.");
  }
  if (action == "send") {
    // Commit requisition demand: counters only ever increase (schema rule).
    const auto links = co_await tx->execSqlCoro(
        "SELECT l.requisition_line_id,l.quantity::text AS qty,rl.ordered_quantity::text AS ordered,"
        "rl.quantity::text AS cap,rl.requisition_id FROM scm_purchase_order_lines l "
        "JOIN scm_purchase_requisition_lines rl ON rl.tenant_id=l.tenant_id AND rl.id=l.requisition_line_id "
        "WHERE l.tenant_id=$1 AND l.order_id=$2::uuid AND l.is_deleted=false AND rl.is_deleted=false "
        "AND l.requisition_line_id IS NOT NULL FOR UPDATE OF rl",
        who.tenantId, id);
    std::set<std::string> touched;
    for (const auto &row : links) {
      if (std::stold(row["ordered"].as<std::string>()) + std::stold(row["qty"].as<std::string>()) >
          std::stold(row["cap"].as<std::string>()))
        co_return fail("conflict", "This send would exceed the approved requisition quantity.");
    }
    for (const auto &row : links) {
      co_await tx->execSqlCoro(
          "UPDATE scm_purchase_requisition_lines SET ordered_quantity=ordered_quantity+($4::text)::numeric,"
          "status=CASE WHEN ordered_quantity+($4::text)::numeric>=quantity THEN 'ordered' ELSE 'partially_ordered' END,"
          "version=version+1,last_modified_at=now(),last_modified_by_user_id=$3 "
          "WHERE tenant_id=$1 AND id=$2::uuid",
          who.tenantId, row["requisition_line_id"].as<std::string>(), who.userId,
          row["qty"].as<std::string>());
      touched.insert(row["requisition_id"].as<std::string>());
    }
    for (const auto &reqId : touched) {
      const auto open = co_await tx->execSqlCoro(
          "SELECT count(*) FILTER (WHERE status IN('open','partially_ordered')) AS open_lines "
          "FROM scm_purchase_requisition_lines WHERE tenant_id=$1 AND requisition_id=$2::uuid AND "
          "is_deleted=false",
          who.tenantId, reqId);
      const char *nextStatus = open[0]["open_lines"].as<long long>() == 0 ? "ordered" : "partially_ordered";
      co_await tx->execSqlCoro(
          "UPDATE scm_purchase_requisitions SET status=$4,version=version+1,last_modified_at=now(),"
          "last_modified_by_user_id=$3 WHERE tenant_id=$1 AND id=$2::uuid AND "
          "status IN('approved','partially_ordered')",
          who.tenantId, reqId, who.userId, nextStatus);
      co_await scmEvent(tx, who, "requisition", reqId, "updated", status, nextStatus,
                        "Ordered via PO " + id);
    }
  }
  std::string sql;
  if (action == "submit")
    sql = "UPDATE scm_purchase_orders SET status='submitted',submitted_at=now(),submitted_by_user_id=$3";
  else if (action == "approve")
    sql = "UPDATE scm_purchase_orders SET status='approved',approved_at=now(),approved_by_user_id=$3";
  else if (action == "reject")
    sql = "UPDATE scm_purchase_orders SET status='rejected',rejected_at=now(),rejected_by_user_id=$3,rejection_reason=$4";
  else if (action == "send")
    sql = "UPDATE scm_purchase_orders SET status='sent',sent_at=now(),sent_by_user_id=$3";
  else if (action == "close")
    sql = "UPDATE scm_purchase_orders SET status='closed',closed_at=now(),closed_by_user_id=$3";
  else
    sql = "UPDATE scm_purchase_orders SET status='cancelled',cancelled_at=now(),cancelled_by_user_id=$3,cancel_reason=$4";
  sql += ",version=version+1,last_modified_at=now(),last_modified_by_user_id=$3 WHERE tenant_id=$1 AND id=$2::uuid";
  if (action == "reject" || action == "cancel")
    co_await tx->execSqlCoro(sql, who.tenantId, id, who.userId, reason);
  else
    co_await tx->execSqlCoro(sql, who.tenantId, id, who.userId);
  const std::string next = action == "submit" ? "submitted" : action == "approve" ? "approved" : action == "reject" ? "rejected" : action == "send" ? "sent" : action == "cancel" ? "cancelled" : "closed";
  co_await scmEvent(tx, who, "purchase_order", id, action == "send" ? "sent" : action + "ed", status, next, reason);
  co_return co_await getOrder(tx, who, id, true);
}
// ---------------------------------------------------------------------------
// Goods receipts: receive accepted quantities into stock atomically.
// ---------------------------------------------------------------------------
std::string receiptHeaderSelect() {
  return R"(SELECT (jsonb_build_object('id',r.id,'version',r.version,'accountingUnitId',r.accounting_unit_id,
'receiptNumber',r.receipt_number,'purchaseOrderId',r.purchase_order_id,'orderNumber',o.order_number,
'supplierId',r.supplier_id,'supplierName',sp.name,'warehouseId',r.warehouse_id,'warehouseName',w.name,
'receiptDate',r.receipt_date,'status',r.status,'deliveryNoteNumber',r.delivery_note_number,
'receivedByUserId',r.received_by_user_id,'receivedBy',concat_ws(' ',ru.first_name,ru.last_name),
'notes',r.notes,'isPosted',r.is_posted,'postedAt',r.posted_at,
'stockDocumentId',r.inv_stock_document_id,'journalBatchId',r.journal_batch_id,
'createdAt',r.created_at,'lastModifiedAt',r.last_modified_at,
'lastModifiedBy',concat_ws(' ',mb.first_name,mb.last_name),'createdBy',concat_ws(' ',cb.first_name,cb.last_name)))::text AS record
FROM scm_purchase_receipts r
JOIN scm_purchase_orders o ON o.tenant_id=r.tenant_id AND o.id=r.purchase_order_id
JOIN core_suppliers sp ON sp.tenant_id=r.tenant_id AND sp.id=r.supplier_id
JOIN inv_warehouses w ON w.tenant_id=r.tenant_id AND w.id=r.warehouse_id
LEFT JOIN users ru ON ru.id=r.received_by_user_id
LEFT JOIN users cb ON cb.id=r.created_by_user_id
LEFT JOIN users mb ON mb.id=r.last_modified_by_user_id)";
}
std::string receiptLinesSelect() {
  return R"(SELECT (jsonb_build_object('id',l.id,'lineNumber',l.line_number,'orderLineId',l.order_line_id,
'orderLineNumber',ol.line_number,'itemId',l.item_id,'itemCode',i.item_code,'itemName',i.name,
'uomId',l.uom_id,'uomCode',u.code,'quantityReceived',l.quantity_received::text,
'quantityAccepted',l.quantity_accepted::text,'quantityRejected',l.quantity_rejected::text,
'unitCost',l.unit_cost::text,'batchId',l.batch_id,'batchNumber',bt.batch_number,
'sourceBinId',l.source_bin_id,'binCode',bn.code,'serialNumbers',l.serial_numbers,
'rejectionReason',l.rejection_reason,'notes',l.notes))::text AS record
FROM scm_purchase_receipt_lines l
JOIN scm_purchase_order_lines ol ON ol.tenant_id=l.tenant_id AND ol.id=l.order_line_id
JOIN inv_items i ON i.tenant_id=l.tenant_id AND i.id=l.item_id
JOIN inv_units_of_measure u ON u.tenant_id=l.tenant_id AND u.id=l.uom_id
LEFT JOIN inv_batches bt ON bt.tenant_id=l.tenant_id AND bt.id=l.batch_id AND bt.is_deleted=false
LEFT JOIN inv_bin_locations bn ON bn.tenant_id=l.tenant_id AND bn.id=l.source_bin_id AND bn.is_deleted=false
WHERE l.tenant_id=$1 AND l.receipt_id=$2::uuid AND l.is_deleted=false ORDER BY l.line_number,l.id)";
}
drogon::Task<dto::BaseApiResponse> getReceipt(DbClientPtr db, const utils::AuditIdentity &who,
                                              const std::string &id, bool canWrite) {
  const auto rows = co_await db->execSqlCoro(
      receiptHeaderSelect() + " WHERE r.tenant_id=$1 AND r.id=$2::uuid AND r.is_deleted=false",
      who.tenantId, id);
  if (rows.empty())
    co_return fail("not_found", "Goods receipt not found.");
  dto::BaseApiResponse r;
  r.result = parse(rows[0]["record"].as<std::string>());
  r.result["lines"] = Json::arrayValue;
  const auto lines = co_await db->execSqlCoro(receiptLinesSelect(), who.tenantId, id);
  for (const auto &row : lines)
    r.result["lines"].append(parse(row["record"].as<std::string>()));
  r.result["history"] = Json::arrayValue;
  const auto events = co_await db->execSqlCoro(eventsSelect(), who.tenantId, id, "receipt");
  for (const auto &row : events)
    r.result["history"].append(parse(row["record"].as<std::string>()));
  r.result["capabilities"]["canWrite"] = canWrite;
  r.success = true;
  co_return r;
}
std::string validateReceipt(Json::Value &b, bool update) {
  if (!b.isObject())
    return "Expected a goods receipt object.";
  static const std::set<std::string> keys{"accountingUnitId", "purchaseOrderId", "receiptDate",
                                          "deliveryNoteNumber", "notes", "requestId", "lines", "version"};
  for (const auto &k : b.getMemberNames())
    if (!keys.count(k))
      return "Unexpected field: " + k;
  if (const auto p = requireUuid(b, "purchaseOrderId", false); !p.empty()) return p;
  if (const auto p = requireUuid(b, "accountingUnitId", true); !p.empty()) return p;
  if (const auto p = requireUuid(b, "requestId", true); !p.empty()) return p;
  if (!b["receiptDate"].isString() || !date(trim(b["receiptDate"].asString())))
    return "receiptDate: a YYYY-MM-DD date is required.";
  b["deliveryNoteNumber"] = b["deliveryNoteNumber"].isString() ? trim(b["deliveryNoteNumber"].asString()) : "";
  if (!text(b["deliveryNoteNumber"].asString(), 80))
    return "deliveryNoteNumber: up to 80 characters.";
  b["notes"] = b["notes"].isString() ? b["notes"].asString() : "";
  if (!text(b["notes"].asString(), 1000))
    return "notes: up to 1000 characters.";
  if (update && (!b["version"].isInt() || b["version"].asInt() < 1))
    return "A valid record version is required.";
  if (!b["lines"].isArray() || b["lines"].empty() || b["lines"].size() > 200)
    return "Provide 1-200 receipt lines.";
  static const std::set<std::string> lineKeys{"orderLineId", "quantityReceived", "quantityAccepted",
                                              "quantityRejected", "unitCost", "batchId", "sourceBinId",
                                              "serialNumbers", "rejectionReason", "notes"};
  for (auto &l : b["lines"]) {
    if (!l.isObject())
      return "Each receipt line must be an object.";
    for (const auto &k : l.getMemberNames())
      if (!lineKeys.count(k))
        return "Unexpected line field: " + k;
    if (const auto p = requireUuid(l, "orderLineId", false); !p.empty()) return p;
    if (const auto p = requireUuid(l, "batchId", true); !p.empty()) return p;
    if (const auto p = requireUuid(l, "sourceBinId", true); !p.empty()) return p;
    const std::string received = decVal(l["quantityReceived"], "");
    if (!decOk(received, true))
      return "quantityReceived: a positive number with up to 6 decimals is required.";
    l["quantityReceived"] = received;
    const std::string rejected = decVal(l["quantityRejected"], "0");
    if (!decOk(rejected, false))
      return "quantityRejected: a non-negative number with up to 6 decimals is required.";
    l["quantityRejected"] = rejected;
    const long double rv = std::stold(received), rj = std::stold(rejected);
    if (rj > rv)
      return "quantityRejected cannot exceed quantityReceived.";
    const std::string accepted = decVal(l["quantityAccepted"], q6(rv - rj));
    if (!decOk(accepted, false))
      return "quantityAccepted: a non-negative number with up to 6 decimals is required.";
    if (std::fabs(std::stold(accepted) + rj - rv) > 0.0000005L)
      return "Accepted plus rejected quantities must equal the received quantity.";
    l["quantityAccepted"] = accepted;
    if (std::stold(rejected) > 0 &&
        (!l["rejectionReason"].isString() || trim(l["rejectionReason"].asString()).empty()))
      return "Rejections require a reason.";
    if (l["rejectionReason"].isString() && !text(l["rejectionReason"].asString(), 500))
      return "rejectionReason: up to 500 characters.";
    if (l["notes"].isString() && !text(l["notes"].asString(), 500))
      return "Line notes stay within 500 characters.";
    if (!l["serialNumbers"].isNull() &&
        (!l["serialNumbers"].isArray() || l["serialNumbers"].size() > 2000))
      return "serialNumbers: an array of up to 2000 serials is required.";
    if (l["serialNumbers"].isArray())
      for (const auto &sn : l["serialNumbers"])
        if (!sn.isString() || !text(sn.asString(), 120))
          return "serialNumbers: serials are text up to 120 characters.";
  }
  return {};
}
drogon::Task<dto::BaseApiResponse> createReceipt(DbClientPtr tx, const utils::AuditIdentity &who,
                                                 Json::Value b) {
  if (const auto p = validateReceipt(b, false); !p.empty())
    co_return fail("validation_error", p);
  if (b["requestId"].isString()) {
    const auto dupe = co_await tx->execSqlCoro(
        "SELECT id,created_by_user_id FROM scm_purchase_receipts WHERE tenant_id=$1 AND request_key=$2::uuid "
        "AND is_deleted=false",
        who.tenantId, b["requestId"].asString());
    if (!dupe.empty()) {
      if (dupe[0]["created_by_user_id"].as<std::string>() != who.userId)
        co_return fail("conflict", "Request ID already belongs to another actor.");
      co_return co_await getReceipt(tx, who, dupe[0]["id"].as<std::string>(), true);
    }
  }
  const auto po = co_await tx->execSqlCoro(
      "SELECT accounting_unit_id,supplier_id,warehouse_id,status FROM scm_purchase_orders WHERE tenant_id=$1 "
      "AND id=$2::uuid AND is_deleted=false FOR SHARE",
      who.tenantId, lower(b["purchaseOrderId"].asString()));
  if (po.empty())
    co_return fail("not_found", "Purchase order not found.");
  const std::string unit = po[0]["accounting_unit_id"].as<std::string>();
  if (b["accountingUnitId"].isString() && lower(b["accountingUnitId"].asString()) != unit)
    co_return fail("validation_error", "The receipt must belong to the order's accounting unit.");
  const std::string status = po[0]["status"].as<std::string>();
  if (status != "sent" && status != "partially_received")
    co_return fail("conflict", "Receipts require a sent (or partially received) order.");
  // Client body can only reference this order's open lines; the catalog is the authority.
  std::vector<std::string> payloads;
  int lineNo = 0;
  for (const auto &l : b["lines"]) {
    const auto ol = co_await tx->execSqlCoro(
        "SELECT item_id,uom_id,unit_cost::text AS uc FROM scm_purchase_order_lines WHERE tenant_id=$1 AND "
        "id=$2::uuid AND order_id=$3::uuid AND is_deleted=false AND status IN('open','partially_received')",
        who.tenantId, lower(l["orderLineId"].asString()), lower(b["purchaseOrderId"].asString()));
    if (ol.empty())
      co_return fail("validation_error",
                     "Receipt line must target an open line of this order for the same item.");
    Json::Value record;
    record["receipt_id"] = Json::nullValue;
    record["line_number"] = ++lineNo;
    record["order_line_id"] = lower(l["orderLineId"].asString());
    record["item_id"] = ol[0]["item_id"].as<std::string>();
    record["uom_id"] = ol[0]["uom_id"].as<std::string>();
    record["quantity_received"] = l["quantityReceived"].asString();
    record["quantity_accepted"] = l["quantityAccepted"].asString();
    record["quantity_rejected"] = l["quantityRejected"].asString();
    record["unit_cost"] = l["unitCost"].isString() && decOk(l["unitCost"].asString(), false)
                              ? l["unitCost"].asString()
                              : ol[0]["uc"].as<std::string>();
    if (l["batchId"].isString())
      record["batch_id"] = lower(l["batchId"].asString());
    if (l["sourceBinId"].isString())
      record["source_bin_id"] = lower(l["sourceBinId"].asString());
    record["serial_numbers"] = l["serialNumbers"].isArray() ? l["serialNumbers"] : Json::Value(Json::arrayValue);
    record["rejection_reason"] = l["rejectionReason"].isString() ? l["rejectionReason"].asString() : "";
    record["notes"] = l["notes"].isString() ? l["notes"].asString() : "";
    payloads.push_back(Json::writeString(Json::StreamWriterBuilder{}, record));
  }
  const std::string number = co_await scmNextNumber(tx, who, unit, "receipt", "GRN");
  Json::Value header;
  header["accounting_unit_id"] = unit;
  header["receipt_number"] = number;
  header["purchase_order_id"] = lower(b["purchaseOrderId"].asString());
  header["supplier_id"] = po[0]["supplier_id"].as<std::string>();
  header["warehouse_id"] = po[0]["warehouse_id"].as<std::string>();
  header["receipt_date"] = trim(b["receiptDate"].asString());
  header["delivery_note_number"] = b["deliveryNoteNumber"].asString();
  header["received_by_user_id"] = who.userId;
  header["notes"] = b["notes"].asString();
  if (b["requestId"].isString())
    header["request_key"] = lower(b["requestId"].asString());
  const auto saved = co_await tx->execSqlCoro(
      "INSERT INTO scm_purchase_receipts(tenant_id,accounting_unit_id,receipt_number,purchase_order_id,"
      "supplier_id,warehouse_id,receipt_date,delivery_note_number,received_by_user_id,notes,request_key,"
      "created_by_user_id) "
      "SELECT $1::uuid,p.accounting_unit_id,p.receipt_number,p.purchase_order_id,p.supplier_id,p.warehouse_id,"
      "p.receipt_date,p.delivery_note_number,p.received_by_user_id,p.notes,p.request_key,$2::uuid "
      "FROM jsonb_populate_record(NULL::scm_purchase_receipts,$3::jsonb) p RETURNING id",
      who.tenantId, who.userId, Json::writeString(Json::StreamWriterBuilder{}, header));
  const std::string docId = saved[0]["id"].as<std::string>();
  for (auto &payload : payloads) {
    Json::Value record = parse(payload);
    record["receipt_id"] = docId;
    payload = Json::writeString(Json::StreamWriterBuilder{}, record);
  }
  co_await insertLinesSql(tx, who, "scm_purchase_receipt_lines",
                          "receipt_id,line_number,order_line_id,item_id,uom_id,quantity_received,"
                          "quantity_accepted,quantity_rejected,unit_cost,batch_id,source_bin_id,"
                          "serial_numbers,rejection_reason,notes",
                          payloads);
  co_await scmEvent(tx, who, "receipt", docId, "created", "", "draft", "");
  co_return co_await getReceipt(tx, who, docId, true);
}
// Draft receipt update: header detail + full line replacement.
drogon::Task<dto::BaseApiResponse> updateReceipt(DbClientPtr tx, const utils::AuditIdentity &who,
                                                 const std::string &id, Json::Value b) {
  if (const auto p = validateReceipt(b, true); !p.empty())
    co_return fail("validation_error", p);
  const auto head = co_await tx->execSqlCoro(
      "SELECT status,version,purchase_order_id FROM scm_purchase_receipts WHERE tenant_id=$1 AND "
      "id=$2::uuid AND is_deleted=false FOR UPDATE",
      who.tenantId, id);
  if (head.empty())
    co_return fail("not_found", "Goods receipt not found.");
  if (head[0]["status"].as<std::string>() != "draft")
    co_return fail("conflict", "Only a draft receipt can be updated.");
  if (head[0]["version"].as<int>() != b["version"].asInt())
    co_return fail("conflict", "Receipt changed. Reload before saving.");
  if (head[0]["purchase_order_id"].as<std::string>() != lower(b["purchaseOrderId"].asString()))
    co_return fail("conflict", "The purchase order cannot change.");
  std::vector<std::string> payloads;
  int lineNo = 0;
  for (const auto &l : b["lines"]) {
    const auto ol = co_await tx->execSqlCoro(
        "SELECT item_id,uom_id,unit_cost::text AS uc FROM scm_purchase_order_lines WHERE tenant_id=$1 AND "
        "id=$2::uuid AND order_id=$3::uuid AND is_deleted=false AND status IN('open','partially_received')",
        who.tenantId, lower(l["orderLineId"].asString()), lower(b["purchaseOrderId"].asString()));
    if (ol.empty())
      co_return fail("validation_error",
                     "Receipt line must target an open line of this order for the same item.");
    Json::Value record;
    record["receipt_id"] = id;
    record["line_number"] = ++lineNo;
    record["order_line_id"] = lower(l["orderLineId"].asString());
    record["item_id"] = ol[0]["item_id"].as<std::string>();
    record["uom_id"] = ol[0]["uom_id"].as<std::string>();
    record["quantity_received"] = l["quantityReceived"].asString();
    record["quantity_accepted"] = l["quantityAccepted"].asString();
    record["quantity_rejected"] = l["quantityRejected"].asString();
    record["unit_cost"] = l["unitCost"].isString() && decOk(l["unitCost"].asString(), false)
                              ? l["unitCost"].asString()
                              : ol[0]["uc"].as<std::string>();
    if (l["batchId"].isString())
      record["batch_id"] = lower(l["batchId"].asString());
    if (l["sourceBinId"].isString())
      record["source_bin_id"] = lower(l["sourceBinId"].asString());
    record["serial_numbers"] = l["serialNumbers"].isArray() ? l["serialNumbers"] : Json::Value(Json::arrayValue);
    record["rejection_reason"] = l["rejectionReason"].isString() ? l["rejectionReason"].asString() : "";
    record["notes"] = l["notes"].isString() ? l["notes"].asString() : "";
    payloads.push_back(Json::writeString(Json::StreamWriterBuilder{}, record));
  }
  co_await tx->execSqlCoro(
      "UPDATE scm_purchase_receipts SET receipt_date=$4::date,delivery_note_number=$5,notes=$6,"
      "version=version+1,last_modified_at=now(),last_modified_by_user_id=$3 "
      "WHERE tenant_id=$1 AND id=$2::uuid AND status='draft' AND is_deleted=false",
      who.tenantId, id, who.userId, trim(b["receiptDate"].asString()), b["deliveryNoteNumber"].asString(),
      b["notes"].asString());
  co_await tx->execSqlCoro(
      "UPDATE scm_purchase_receipt_lines SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3,"
      "last_modified_at=now(),last_modified_by_user_id=$3 WHERE tenant_id=$1 AND receipt_id=$2::uuid "
      "AND is_deleted=false",
      who.tenantId, id, who.userId);
  co_await insertLinesSql(tx, who, "scm_purchase_receipt_lines",
                          "receipt_id,line_number,order_line_id,item_id,uom_id,quantity_received,"
                          "quantity_accepted,quantity_rejected,unit_cost,batch_id,source_bin_id,"
                          "serial_numbers,rejection_reason,notes",
                          payloads);
  co_await scmEvent(tx, who, "receipt", id, "updated", "draft", "draft", "");
  co_return co_await getReceipt(tx, who, id, true);
}
drogon::Task<dto::BaseApiResponse> postReceipt(DbClientPtr tx, const utils::AuditIdentity &who,
                                               const std::string &id, Json::Value b) {
  if (!b.isObject() || !b["version"].isInt() || b["version"].asInt() < 1)
    co_return fail("validation_error", "A valid record version is required.");
  const auto head = co_await tx->execSqlCoro(
      "SELECT status,accounting_unit_id,supplier_id,warehouse_id,receipt_date,receipt_number,"
      "delivery_note_number,purchase_order_id FROM scm_purchase_receipts WHERE tenant_id=$1 AND "
      "id=$2::uuid AND is_deleted=false FOR UPDATE",
      who.tenantId, id);
  if (head.empty())
    co_return fail("not_found", "Goods receipt not found.");
  if (!(co_await versionMatches(tx, who, "scm_purchase_receipts", id, b["version"].asInt())))
    co_return fail("conflict", "Receipt changed. Reload before posting.");
  if (head[0]["status"].as<std::string>() != "draft")
    co_return fail("conflict", "Only a draft receipt can be posted.");
  const auto po = co_await tx->execSqlCoro(
      "SELECT status FROM scm_purchase_orders WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false "
      "FOR UPDATE",
      who.tenantId, head[0]["purchase_order_id"].as<std::string>());
  if (po.empty())
    co_return fail("not_found", "Purchase order not found.");
  const std::string poStatus = po[0]["status"].as<std::string>();
  if (poStatus != "sent" && poStatus != "partially_received")
    co_return fail("conflict", "Receipts require a sent (or partially received) order.");
  const auto lines = co_await tx->execSqlCoro(
      "SELECT l.id AS lid,l.order_line_id,l.quantity_received::text AS received,l.quantity_accepted::text AS accepted,"
      "l.quantity_rejected::text AS rejected,l.unit_cost::text AS uc,l.batch_id,l.serial_numbers,"
      "ol.item_id,ol.uom_id,ol.quantity::text AS ordered,ol.received_quantity::text AS recv,"
      "ol.rejected_quantity::text AS rej FROM scm_purchase_receipt_lines l "
      "JOIN scm_purchase_order_lines ol ON ol.tenant_id=l.tenant_id AND ol.id=l.order_line_id "
      "WHERE l.tenant_id=$1 AND l.receipt_id=$2::uuid AND l.is_deleted=false AND ol.is_deleted=false "
      "ORDER BY l.line_number FOR UPDATE OF ol,l",
      who.tenantId, id);
  if (lines.empty())
    co_return fail("conflict", "Add at least one receipt line before posting.");
  Json::Value invLines(Json::arrayValue);
  struct Bump {
    std::string orderLineId;
    std::string accepted, rejected;
  };
  std::vector<Bump> bumps;
  for (const auto &row : lines) {
    const long double ordered = std::stold(row["ordered"].as<std::string>());
    const long double recvSoFar = std::stold(row["recv"].as<std::string>());
    const long double rejSoFar = std::stold(row["rej"].as<std::string>());
    const long double accepted = std::stold(row["accepted"].as<std::string>());
    const long double rejected = std::stold(row["rejected"].as<std::string>());
    if (recvSoFar + rejSoFar + accepted + rejected - ordered > 0.0000005L)
      co_return fail("conflict", "This receipt exceeds the open quantity on the order line.");
    bumps.push_back({row["order_line_id"].as<std::string>(),
                     row["accepted"].as<std::string>(), row["rejected"].as<std::string>()});
    if (accepted <= 0)
      continue; // fully rejected: nothing reaches stock
    Json::Value il;
    il["itemId"] = row["item_id"].as<std::string>();
    il["uomId"] = row["uom_id"].as<std::string>();
    il["quantity"] = row["accepted"].as<std::string>();
    il["unitCost"] = row["uc"].as<std::string>();
    if (!row["batch_id"].isNull())
      il["batchId"] = row["batch_id"].as<std::string>();
    il["serialNumbers"] = row["serial_numbers"].isNull()
                              ? Json::Value(Json::arrayValue)
                              : parse(row["serial_numbers"].as<std::string>());
    invLines.append(il);
  }
  std::string stockDocId, journalBatchId;
  if (!invLines.empty()) {
    Json::Value payload;
    payload["accountingUnitId"] = head[0]["accounting_unit_id"].as<std::string>();
    payload["documentType"] = "receipt";
    payload["movementReason"] = "purchase_receipt";
    payload["documentDate"] = head[0]["receipt_date"].as<std::string>();
    payload["sourceWarehouseId"] = head[0]["warehouse_id"].as<std::string>();
    payload["supplierId"] = head[0]["supplier_id"].as<std::string>();
    payload["referenceNumber"] = trim(head[0]["delivery_note_number"].as<std::string>()).empty()
                                     ? head[0]["receipt_number"].as<std::string>()
                                     : trim(head[0]["delivery_note_number"].as<std::string>()).substr(0, 80);
    payload["requestId"] = id; // deterministic: a receipt posts exactly one stock document
    payload["lines"] = invLines;
    const auto posted = co_await InventoryService::postStockDocument(tx, payload, who);
    if (!posted.success)
      co_return posted;
    stockDocId = posted.result["documentId"].asString();
    journalBatchId = posted.result["journalBatchId"].isNull()
                         ? ""
                         : posted.result["journalBatchId"].asString();
  } else {
    co_return fail("validation_error", "At least one receipt line must have an accepted quantity.");
  }
  for (const auto &bump : bumps)
    co_await tx->execSqlCoro(
        "UPDATE scm_purchase_order_lines SET received_quantity=received_quantity+($4::text)::numeric,"
        "rejected_quantity=rejected_quantity+($5::text)::numeric,"
        "status=CASE WHEN received_quantity+($4::text)::numeric+rejected_quantity+($5::text)::numeric>=quantity "
        "THEN 'received' ELSE 'partially_received' END,"
        "version=version+1,last_modified_at=now(),last_modified_by_user_id=$3 "
        "WHERE tenant_id=$1 AND id=$2::uuid",
        who.tenantId, bump.orderLineId, who.userId, bump.accepted, bump.rejected);
  const auto pending = co_await tx->execSqlCoro(
      "SELECT count(*) FILTER (WHERE received_quantity+rejected_quantity<quantity) AS open_lines,"
      "COALESCE(sum(received_quantity+rejected_quantity),0)>0 AS any_received "
      "FROM scm_purchase_order_lines WHERE tenant_id=$1 AND order_id=$2::uuid AND is_deleted=false",
      who.tenantId, head[0]["purchase_order_id"].as<std::string>());
  const char *poNext = pending[0]["open_lines"].as<long long>() == 0
                           ? "received"
                           : (pending[0]["any_received"].as<bool>() ? "partially_received" : poStatus.c_str());
  co_await tx->execSqlCoro(
      "UPDATE scm_purchase_orders SET status=$4,version=version+1,last_modified_at=now(),"
      "last_modified_by_user_id=$3 WHERE tenant_id=$1 AND id=$2::uuid AND "
      "status IN('sent','partially_received') AND $4<>status::text",
      who.tenantId, head[0]["purchase_order_id"].as<std::string>(), who.userId, poNext);
  co_await scmEvent(tx, who, "purchase_order", head[0]["purchase_order_id"].as<std::string>(),
                    "updated", poStatus, poNext, "Goods receipt posted");
  co_await tx->execSqlCoro(
      "UPDATE scm_purchase_receipts SET status='posted',is_posted=true,posted_at=now(),"
      "posted_by_user_id=$3,inv_stock_document_id=$4::uuid,journal_batch_id=NULLIF($5::text,'')::uuid,"
      "version=version+1,last_modified_at=now(),last_modified_by_user_id=$3 "
      "WHERE tenant_id=$1 AND id=$2::uuid AND status='draft' AND is_deleted=false",
      who.tenantId, id, who.userId, stockDocId, journalBatchId);
  co_await scmEvent(tx, who, "receipt", id, "posted", "draft", "posted", "");
  co_return co_await getReceipt(tx, who, id, true);
}
// Reversal: the stock document is reversed; PO receiving counters never
// decrease by schema design, so the order keeps its fulfilment standing.
drogon::Task<dto::BaseApiResponse> reverseReceipt(DbClientPtr tx, const utils::AuditIdentity &who,
                                                  const std::string &id, Json::Value b) {
  if (!b.isObject() || !b["version"].isInt() || b["version"].asInt() < 1)
    co_return fail("validation_error", "A valid record version is required.");
  const std::string reason = b["reason"].isString() ? trim(b["reason"].asString()) : "";
  if (reason.empty() || !text(reason, 500))
    co_return fail("validation_error", "Reversals require a reason (1-500 characters).");
  const auto head = co_await tx->execSqlCoro(
      "SELECT status,inv_stock_document_id FROM scm_purchase_receipts WHERE tenant_id=$1 AND id=$2::uuid "
      "AND is_deleted=false FOR UPDATE",
      who.tenantId, id);
  if (head.empty())
    co_return fail("not_found", "Goods receipt not found.");
  if (!(co_await versionMatches(tx, who, "scm_purchase_receipts", id, b["version"].asInt())))
    co_return fail("conflict", "Receipt changed. Reload before reversing.");
  if (head[0]["status"].as<std::string>() != "posted")
    co_return fail("conflict", "Only posted receipts can be reversed.");
  const auto reversed = co_await InventoryService::reverseStockDocument(
      tx, head[0]["inv_stock_document_id"].as<std::string>(), reason, who);
  if (!reversed.success)
    co_return reversed;
  co_await tx->execSqlCoro(
      "UPDATE scm_purchase_receipts SET status='reversed',version=version+1,last_modified_at=now(),"
      "last_modified_by_user_id=$3 WHERE tenant_id=$1 AND id=$2::uuid AND status='posted'",
      who.tenantId, id, who.userId);
  co_await scmEvent(tx, who, "receipt", id, "reversed", "posted", "reversed", reason);
  co_return co_await getReceipt(tx, who, id, true);
}
drogon::Task<dto::BaseApiResponse> cancelReceipt(DbClientPtr tx, const utils::AuditIdentity &who,
                                                 const std::string &id, Json::Value b) {
  if (!b.isObject() || !b["version"].isInt() || b["version"].asInt() < 1)
    co_return fail("validation_error", "A valid record version is required.");
  const std::string reason = b["reason"].isString() ? trim(b["reason"].asString()) : "";
  if (!text(reason, 500))
    co_return fail("validation_error", "reason: up to 500 characters.");
  const auto head = co_await tx->execSqlCoro(
      "SELECT status FROM scm_purchase_receipts WHERE tenant_id=$1 AND id=$2::uuid AND is_deleted=false "
      "FOR UPDATE",
      who.tenantId, id);
  if (head.empty())
    co_return fail("not_found", "Goods receipt not found.");
  if (!(co_await versionMatches(tx, who, "scm_purchase_receipts", id, b["version"].asInt())))
    co_return fail("conflict", "Receipt changed. Reload before cancelling.");
  if (head[0]["status"].as<std::string>() != "draft")
    co_return fail("conflict", "Only a draft receipt can be cancelled.");
  co_await tx->execSqlCoro(
      "UPDATE scm_purchase_receipts SET status='cancelled',version=version+1,last_modified_at=now(),"
      "last_modified_by_user_id=$3 WHERE tenant_id=$1 AND id=$2::uuid",
      who.tenantId, id, who.userId);
  co_await scmEvent(tx, who, "receipt", id, "cancelled", "draft", "cancelled", reason);
  co_return co_await getReceipt(tx, who, id, true);
}
// ---------------------------------------------------------------------------
// Lists (paged read models) + number previews.
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse> listScm(DbClientPtr db, const std::string &resource,
                                           const utils::AuditIdentity &who, int page, int size,
                                           const std::string &query, const std::string &unit,
                                           Json::Value filters, bool canWrite) {
  std::string select, searchExpr;
  if (resource == "requisitions") {
    select = requisitionHeaderSelect();
    searchExpr = "(strpos(lower(r.requisition_number),lower($2))>0 OR "
                 "strpos(lower(r.purpose),lower($2))>0)";
  } else if (resource == "orders") {
    select = orderHeaderSelect();
    searchExpr = "(strpos(lower(o.order_number),lower($2))>0 OR "
                 "strpos(lower(sp.name),lower($2))>0 OR "
                 "strpos(lower(o.supplier_reference),lower($2))>0)";
  } else {
    select = receiptHeaderSelect();
    searchExpr = "(strpos(lower(r.receipt_number),lower($2))>0 OR "
                 "strpos(lower(o.order_number),lower($2))>0 OR strpos(lower(sp.name),lower($2))>0)";
  }
  const std::string alias = resource == "orders" ? "o" : "r";
  std::string w = " WHERE " + alias + ".tenant_id=$1 AND " + alias + ".is_deleted=false AND " + searchExpr;
  std::vector<std::string> args{who.tenantId, search(query)};
  if (!unit.empty()) {
    args.push_back(unit);
    w += " AND " + alias + ".accounting_unit_id=$" + std::to_string(args.size()) + "::uuid";
  }
  const std::string status = filters.isObject() && filters["status"].isString()
                                 ? lower(trim(filters["status"].asString()))
                                 : "";
  if (!status.empty()) {
    args.push_back(status);
    w += " AND " + alias + ".status=$" + std::to_string(args.size());
  }
  const std::string orderBy = resource == "orders" ? " ORDER BY o.order_date DESC,o.id DESC"
                              : resource == "requisitions" ? " ORDER BY r.request_date DESC,r.id DESC"
                                                           : " ORDER BY r.receipt_date DESC,r.id DESC";
  const int64_t limit = size, offset = (int64_t(page) - 1) * size;
  const std::string sel = select + w + orderBy + " LIMIT $" + std::to_string(args.size() + 1) +
                          "::bigint OFFSET $" + std::to_string(args.size() + 2) + "::bigint";
  std::optional<drogon::orm::Result> rows;
  switch (args.size()) {
  case 2:
    rows = co_await db->execSqlCoro(sel, args[0], args[1], limit, offset);
    break;
  case 3:
    rows = co_await db->execSqlCoro(sel, args[0], args[1], args[2], limit, offset);
    break;
  default:
    rows = co_await db->execSqlCoro(sel, args[0], args[1], args[2], args[3], limit, offset);
    break;
  }
  dto::BaseApiResponse r;
  r.result["data"] = Json::arrayValue;
  for (const auto &row : *rows)
    r.result["data"].append(parse(row["record"].as<std::string>()));
  r.result["totalCount"] = Json::Int64( static_cast<int64_t>(rows->size()) < static_cast<int64_t>(size) ? offset + static_cast<int64_t>(rows->size()) : offset + static_cast<int64_t>(rows->size()) + 1);
  r.result["capabilities"]["canWrite"] = canWrite;
  r.success = true;
  co_return r;
}
drogon::Task<dto::BaseApiResponse> scmNumberPreview(DbClientPtr db, const std::string &resource,
                                                    const utils::AuditIdentity &who,
                                                    const std::string &unit) {
  const char *type = resource == "requisitions" ? "requisition"
                     : resource == "orders"       ? "purchase_order"
                                                  : "receipt";
  const std::string fallback = std::string(resource == "requisitions" ? "REQ"
                                           : resource == "orders"       ? "PO"
                                                                        : "GRN") +
                               "-00001";
  const auto seq = co_await db->execSqlCoro(
      "SELECT prefix,padding,next_number FROM scm_document_sequences WHERE tenant_id=$1 AND "
      "accounting_unit_id=$2::uuid AND document_type=$3",
      who.tenantId, unit, type);
  dto::BaseApiResponse r;
  if (seq.empty()) {
    r.result["documentNumber"] = fallback;
  } else {
    char buf[64];
    std::snprintf(buf, sizeof buf, "%0*lld",
                  std::max(1, seq[0]["padding"].as<int>()),
                  seq[0]["next_number"].as<long long>());
    r.result["documentNumber"] = seq[0]["prefix"].as<std::string>() + "-" + buf;
  }
  r.result["reserved"] = false;
  r.success = true;
  co_return r;
}
} // namespace
// ---------------------------------------------------------------------------
// Dispatcher.
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse>
SupplyChainService::execute(std::string op, std::string id, Json::Value body, int page, int size,
                            std::string query, std::string unitId,
                            utils::AuditIdentity who) {
  const auto dot = op.find('.');
  const std::string resource = dot == std::string::npos ? op : op.substr(0, dot);
  const std::string action = dot == std::string::npos ? "list" : op.substr(dot + 1);
  if (resource != "requisitions" && resource != "orders" && resource != "receipts")
    co_return fail("validation_error", "Unsupported supply chain resource.");
  static const std::set<std::string> readOps{"list", "get", "next-number"};
  static const std::set<std::string> writeOps{"create", "update", "delete", "submit", "approve",
                                              "reject", "send", "cancel", "close", "post", "reverse"};
  if ((!readOps.count(action) && !writeOps.count(action)) || page < 1 || page > 1000000 ||
      size < 1 || size > 100 || !text(query, 200))
    co_return fail("validation_error", "Invalid operation, paging or search.");
  // Resource/action matrix.
  const std::set<std::string> requisitionOps{"create", "update", "delete", "submit", "approve",
                                             "reject", "cancel", "close"};
  const std::set<std::string> orderOps{"create", "update", "delete", "submit", "approve",
                                       "reject", "send", "cancel", "close"};
  const std::set<std::string> receiptOps{"create", "update", "delete", "post", "reverse", "cancel"};
  const bool write = writeOps.count(action) &&
                     ((resource == "requisitions" && requisitionOps.count(action)) ||
                      (resource == "orders" && orderOps.count(action)) ||
                      (resource == "receipts" && receiptOps.count(action)));
  if (writeOps.count(action) && !write)
    co_return fail("validation_error", "Unsupported action for this resource.");
  if ((action == "get" || write) && action != "create" && !uuid(id))
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
        "scm_purchase_requisitions", "scm_purchase_requisition_lines",
        "scm_purchase_orders",       "scm_purchase_order_lines",
        "scm_purchase_receipts",     "scm_purchase_receipt_lines",
        "scm_document_sequences",    "scm_procurement_events"};
    if (!(co_await inventory_internal::schemaReady(db, requiredTables)))
      co_return fail("schema_not_ready",
                     "Supply chain upgrade required: apply migrations 032-035 first.");
    bool canWrite = false;
    if (!write) {
      const auto authz = co_await inventory_internal::authorize(db, who, false, "supply_chain", canWrite);
      if (!authz.success)
        co_return authz;
      if (action == "next-number") {
        if (unit.empty())
          co_return fail("validation_error", "accountingUnitId is required.");
        co_return co_await scmNumberPreview(db, resource, who, unit);
      }
      if (action == "list")
        co_return co_await listScm(db, resource, who, page, size, query, unit, body, canWrite);
      if (resource == "requisitions")
        co_return co_await getRequisition(db, who, id, canWrite);
      if (resource == "orders")
        co_return co_await getOrder(db, who, id, canWrite);
      co_return co_await getReceipt(db, who, id, canWrite);
    }
    auto tx = co_await db->newTransactionCoro();
    dto::BaseApiResponse result;
    try {
      const auto authz = co_await inventory_internal::authorize(tx, who, true, "supply_chain", canWrite);
      if (!authz.success) {
        result = authz;
      } else if (resource == "requisitions") {
        if (action == "create")
          result = co_await createRequisition(tx, who, body);
        else if (action == "update")
          result = co_await updateRequisition(tx, who, id, body);
        else if (action == "delete")
          result = co_await deleteScmDraft(tx, who, "scm_purchase_requisitions", false, "Requisition", id, body);
        else
          result = co_await requisitionTransition(tx, who, id, action, body);
      } else if (resource == "orders") {
        if (action == "create")
          result = co_await createOrder(tx, who, body);
        else if (action == "update")
          result = co_await updateOrder(tx, who, id, body);
        else if (action == "delete")
          result = co_await deleteScmDraft(tx, who, "scm_purchase_orders", false, "Purchase order", id, body);
        else
          result = co_await orderTransition(tx, who, id, action, body);
      } else {
        if (action == "create")
          result = co_await createReceipt(tx, who, body);
        else if (action == "update")
          result = co_await updateReceipt(tx, who, id, body);
        else if (action == "delete")
          result = co_await deleteScmDraft(tx, who, "scm_purchase_receipts", true, "Goods receipt", id, body);
        else if (action == "post")
          result = co_await postReceipt(tx, who, id, body);
        else if (action == "reverse")
          result = co_await reverseReceipt(tx, who, id, body);
        else
          result = co_await cancelReceipt(tx, who, id, body);
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
      co_return fail("database_error", "Unable to commit supply chain changes.");
    co_return result;
  } catch (const drogon::orm::UniqueViolation &) {
    co_return fail("conflict", "A document number or request key is already reserved.");
  } catch (const drogon::orm::Failure &e) {
    const auto message = scmMessage(e.what() ? e.what() : "");
    if (!message.empty())
      co_return fail("conflict", message);
    co_return fail("database_error",
                   "Supply chain service unavailable. Verify migrations 032-035 are installed.");
  } catch (const std::exception &) {
    co_return fail("database_error",
                   "Supply chain service unavailable. Verify migrations 032-035 are installed.");
  }
}
} // namespace business_desk::domain_services
