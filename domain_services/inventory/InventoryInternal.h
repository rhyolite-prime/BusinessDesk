#pragma once
// File-local helpers shared by the InventoryService translation units. Every
// function has internal linkage; including this header in more than one .cc is
// intentional and safe.
#include "domain_services/permissions/PermissionService.h"
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
#include <drogon/drogon.h>
#include <algorithm>
#include <cctype>
#include <regex>
#include <set>
#include <string>
#include <vector>
namespace business_desk::domain_services::inventory_internal {
using drogon::orm::DbClientPtr;
struct Field {
  const char *key;
  const char *column;
  const char *kind; // text|uuid|decimal|factor|rate|boolean|integer|date
  bool required = false;
  unsigned max = 200;
  bool createOnly = false;
};
static dto::BaseApiResponse fail(const char *code, const std::string &message) {
  dto::BaseApiResponse r;
  r.error["code"] = code;
  r.error["message"] = message;
  return r;
}
static bool uuid(const std::string &s) {
  static const std::regex re(
      "^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$");
  return std::regex_match(s, re) &&
         s != "00000000-0000-0000-0000-000000000000";
}
static std::string trim(const std::string &s) {
  const auto a = s.find_first_not_of(" \t\r\n"), b = s.find_last_not_of(" \t\r\n");
  return a == std::string::npos ? "" : s.substr(a, b - a + 1);
}
static std::string lower(std::string s) {
  std::transform(s.begin(), s.end(), s.begin(),
                 [](unsigned char c) { return std::tolower(c); });
  return s;
}
static bool text(const std::string &s, unsigned max) {
  return s.find('\0') == std::string::npos &&
         std::count_if(s.begin(), s.end(), [](unsigned char c) {
           return (c & 0xc0) != 0x80;
         }) <= max;
}
static bool date(const std::string &s) {
  if (!std::regex_match(s, std::regex("^[12][0-9]{3}-[0-9]{2}-[0-9]{2}$")))
    return false;
  const int y = std::stoi(s.substr(0, 4)), m = std::stoi(s.substr(5, 2)),
            d = std::stoi(s.substr(8, 2));
  if (y < 1900 || m < 1 || m > 12 || d < 1)
    return false;
  static const int days[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
  const bool leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
  return d <= days[m - 1] + (m == 2 && leap ? 1 : 0);
}
// Exact decimal strings: up to 14 integer digits and 6 fraction digits,
// optionally signed. Rates use 6 fraction digits within [0,1].
static bool decimal(const std::string &s, bool signedAllowed = false) {
  static const std::regex plain("^(0|[1-9][0-9]{0,13})(\\.[0-9]{1,6})?$");
  static const std::regex sig("^-?(0|[1-9][0-9]{0,13})(\\.[0-9]{1,6})?$");
  return std::regex_match(s, signedAllowed ? sig : plain);
}
static bool rate(const std::string &s) {
  static const std::regex re("^(0(\\.[0-9]{1,6})?|1(\\.0{1,6})?)$");
  return std::regex_match(s, re);
}
// UoM conversion factors: positive, up to 10 integer + 10 fraction digits.
static bool factor(const std::string &s) {
  static const std::regex re(
      "^(0\\.[0-9]{0,9}[1-9]|[0-9]{1,10}(\\.[0-9]{1,10})?)$");
  return std::regex_match(s, re);
}
static Json::Value parse(const std::string &s) {
  Json::Value v;
  Json::Reader r;
  if (!r.parse(s, v))
    throw std::runtime_error("Invalid database JSON");
  return v;
}
static std::string json(const Json::Value &v) {
  return Json::FastWriter().write(v);
}
// Strict whitelist validation of a body against a field table. Normalizes in
// place: nulls become defaults, UUIDs lowercased, decimals validated as exact
// strings. Returns an empty string when valid.
static std::string validate(Json::Value &b, const std::vector<Field> &fields,
                            bool update,
                            const std::set<std::string> &extra = {}) {
  if (!b.isObject())
    return "Expected a JSON object.";
  std::set<std::string> allowed(extra);
  for (const auto &f : fields)
    allowed.insert(f.key);
  if (update)
    allowed.insert("version");
  for (const auto &key : b.getMemberNames())
    if (!allowed.count(key))
      return "Unknown or server-owned field: " + key;
  if (update && (!b["version"].isInt() || b["version"].asInt() < 1 ||
                 b["version"].asInt() == 2147483647))
    return "A valid record version is required.";
  for (const auto &f : fields) {
    const std::string key = f.key, kind = f.kind;
    auto &v = b[key];
    if (kind == "boolean") {
      if (v.isNull())
        v = false;
      if (!v.isBool())
        return key + ": true or false required.";
      continue;
    }
    if (kind == "integer") {
      if (v.isNull())
        v = 0;
      if (!v.isInt() || v.asInt() < 0 || v.asInt() > 36500)
        return key + ": invalid integer range.";
      continue;
    }
    if ((kind == "uuid" || (kind == "date" && !f.required)) &&
        (v.isNull() || (v.isString() && trim(v.asString()).empty()))) {
      v = Json::nullValue;
      continue;
    }
    if ((kind == "decimal" || kind == "rate" || kind == "factor") && v.isNull()) {
      v = kind == "factor" ? "1" : "0";
      continue;
    }
    if (kind == "text" && !f.required && v.isNull()) {
      v = "";
      continue;
    }
    if (!v.isString())
      return key + ": a value is required.";
    auto s = trim(v.asString());
    if (kind == "uuid") {
      if (!uuid(s))
        return key + ": a UUID is required.";
      v = lower(s);
    } else if (kind == "date") {
      if (!date(s))
        return key + ": use a valid ISO date (1900-2999).";
      v = s;
    } else if (kind == "decimal") {
      if (!decimal(s))
        return key + ": use an exact non-negative decimal string (6dp max).";
      v = s;
    } else if (kind == "factor") {
      if (!factor(s))
        return key + ": use a positive factor with up to 10 decimal places.";
      v = s;
    } else if (kind == "rate") {
      if (!rate(s))
        return key + ": use a rate between 0 and 1 (6dp max).";
      v = s;
    } else {
      if (!text(s, f.max) || (f.required && s.empty()))
        return key + ": check required text and maximum length.";
      v = s;
    }
  }
  return {};
}
// Identity + permission gate mirroring the module services: tenant admin or a
// grant of <module>.manage/.write for writes, <module>.read for reads. Sets
// canWrite so list responses can advertise capabilities.
static drogon::Task<dto::BaseApiResponse>
authorize(DbClientPtr db, const utils::AuditIdentity &who, bool write,
          const char *module, bool &canWrite) {
  if (!uuid(who.tenantId) || !uuid(who.userId))
    co_return fail("unauthorized", "A signed-in tenant user is required.");
  if (write) {
    co_await db->execSqlCoro("SET LOCAL lock_timeout='5s'");
    co_await db->execSqlCoro("SET LOCAL statement_timeout='15s'");
  }
  const std::string actorSql =
      "SELECT u.is_tenant_admin_user FROM users u JOIN tenants t ON "
      "t.id=u.tenant_id AND t.is_deleted=false AND t.is_active=true WHERE "
      "u.id=$1 AND u.tenant_id=$2 AND u.is_deleted=false AND u.is_active=true "
      "AND u.is_locked_out=false AND u.is_host_admin_user=false" +
      std::string(write ? " FOR SHARE OF u,t" : "");
  auto actor = co_await db->execSqlCoro(actorSql, who.userId, who.tenantId);
  if (actor.empty())
    co_return fail("forbidden", "A live tenant user is required.");
  canWrite = actor[0]["is_tenant_admin_user"].as<bool>();
  if (!canWrite) {
    const auto grants =
        co_await PermissionService::getUserPermissions(who.userId);
    const std::string base = std::string(module) + ".";
    canWrite =
        grants.count("*") || grants.count(base + "manage") || grants.count(base + "write");
    if ((write && !canWrite) ||
        (!write && !canWrite && !grants.count(base + "read")))
      co_return fail("forbidden", std::string(module) +
                                      " permission or tenant administrator "
                                      "access required.");
  }
  dto::BaseApiResponse ok;
  ok.success = true;
  co_return ok;
}
// Migration probes keyed on the tables each area depends on; callers wrap the
// message naming the exact migration to apply.
static drogon::Task<bool> schemaReady(DbClientPtr db,
                                      std::initializer_list<const char *> tables) {
  for (const auto *table : tables) {
    auto probe = co_await db->execSqlCoro("SELECT to_regclass($1) IS NOT NULL AS ok",
                                          table);
    if (probe.empty() || !probe[0]["ok"].as<bool>())
      co_return false;
  }
  co_return true;
}
static std::string search(const std::string &raw) { return trim(raw).substr(0, 120); }
// Error text from our own migration-authored RAISE statements is safe to show
// (it contains no SQL); anything else stays generic to avoid leaking details.
static std::string knownMessage(const std::string &raw) {
  static const char *known[] = {
      "Negative stock is not allowed in this warehouse",
      "Select live warehouses in this accounting unit",
      "Select a live warehouse in this accounting unit",
      "Select a live active warehouse",
      "Post stock documents only into an open accounting period",
      "The inventory period for this document date is closed",
      "Posted stock documents are immutable; post a reversal instead",
      "Stock documents are never hard-deleted",
      "A posted document can only be reversed",
      "Record the reversing document before marking a document reversed",
      "Lines of a posted stock document are immutable",
      "Lines lock when a document is submitted; cancel it to rework",
      "Inventory ledger rows are immutable; post a reversing document instead",
      "Cost layers are never hard-deleted",
      "Cost layer quantities are consumed only; post a receipt to add stock",
      "Cost layer receipt facts are immutable",
      "Item has batches or serial numbers; remove that stock history first",
      "Item has stock history; set it inactive instead of deleting it",
      "Costing, tracking, base unit and item code are fixed once inventory records exist",
      "Standard cost changes must be posted through a revaluation adjustment",
      "Warehouse is referenced by live inventory configuration or stock",
      "Warehouse holds stock history and cannot be removed or rescoped",
      "Shipment warehouses must be live and in this accounting unit",
      "A category cannot be its own ancestor",
      "Category hierarchy is deeper than 32 levels",
      "Item codes are permanent",
      "Invalid requisition status transition",
      "Invalid quotation status transition",
      "Invalid purchase order status transition",
      "Invalid receipt status transition",
      "Invalid shipment status transition",
      "Rejections require a reason",
      "Cancellations require a reason",
      "Record the submission", "Record the approval", "Record the send",
      "Record the award", "Record the delivery",
      "Submitted requisitions are locked; cancel and raise a new one to change scope",
      "Submitted orders are locked; cancel and re-issue to change terms",
      "Sent quotations are locked; issue a revision as a new quotation",
      "Only draft requisitions can be deleted",
      "Only draft quotations can be deleted",
      "Only draft orders can be deleted",
      "Only planned, booked or cancelled shipments can be deleted",
      "Lines of a submitted requisition are locked",
      "Lines of a submitted order are locked",
      "Lines of a sent quotation are locked",
      "Lines are locked once a shipment is in transit",
      "Lines can only be added to a draft requisition",
      "Lines can only be added to a draft order",
      "Purchase requisitions are never hard-deleted",
      "Purchase orders are never hard-deleted",
      "Purchase quotations are never hard-deleted",
      "Purchase receipts are never hard-deleted",
      "Shipments are never hard-deleted",
      "Posted receipts cannot be deleted; reverse them instead",
      "Posted receipts are immutable; reverse the receipt to correct it",
      "Delivered shipments are closed history",
      "Procurement events are immutable audit records",
      "Shipment tracking events are immutable",
      "Receipts must target an open order for this supplier, warehouse and unit",
      "Receipt line must target an open line of this order for the same item",
      "Posting a receipt requires its stock document and posting stamp",
      "The quotation must belong to this supplier",
      "The purchase order must belong to this accounting unit",
      "Requisition line must be approved, open and for this item and unit",
      "Select a live active supplier",
      "Select a live purchasable catalog item",
      "Carrier is referenced by live orders or shipments",
      "Resolve the listed blockers before closing the inventory period",
      "Closed inventory periods are immutable",
      "Closed inventory periods cannot be deleted",
      "Select an accounting period of this accounting unit",
      "Valuation snapshot facts are fixed once posted",
      "The valuation journal link cannot change",
      "Posted valuation snapshots cannot be deleted",
      "Valuation snapshot lines are immutable",
      "Ordered quantity is set by purchase orders and never decreases here",
      "Receiving counters are set by goods receipts and never decrease here",
      "Count lines require a non-negative counted quantity",
      "Stock movement lines require a non-zero quantity",
      "Only count documents record counted quantities",
      "Receipts, issues and transfers use positive quantities",
      "Converted quantity must keep the movement direction",
      "Unknown stock document for this line",
      "Unknown purchase requisition for this line",
      "Unknown purchase order for this line",
      "Unknown purchase receipt for this line",
      "Unknown warehouse for this stock balance",
      "Unknown batch for this line",
      "Duplicate rows for the same batch scope"};
  for (const char *k : known)
    if (raw.find(k) != std::string::npos)
      return k;
  return {};
}
} // namespace business_desk::domain_services::inventory_internal
