#pragma once
#include "domain_services/inventory/InventoryInternal.h"
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
#include <drogon/drogon.h>
#include <drogon/orm/CoroMapper.h>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <set>
#include <string>
#include <vector>

namespace business_desk::domain_services::fwm_internal {

using drogon::orm::DbClientPtr;
using inventory_internal::date;
using inventory_internal::decimal;
using inventory_internal::fail;
using inventory_internal::json;
using inventory_internal::lower;
using inventory_internal::parse;
using inventory_internal::rate;
using inventory_internal::schemaReady;
using inventory_internal::search;
using inventory_internal::text;
using inventory_internal::trim;
using inventory_internal::uuid;

constexpr long long SCALE = 1000000;

inline long long dec6(const std::string &s) {
  if (s.empty())
    return 0;
  const bool neg = s[0] == '-';
  const std::string t = neg ? s.substr(1) : s;
  const auto dot = t.find('.');
  const auto whole = dot == std::string::npos ? t : t.substr(0, dot);
  const auto frac = dot == std::string::npos ? "" : t.substr(dot + 1);
  long long v = whole.empty() ? 0 : std::stoll(whole);
  long long f = 0;
  for (size_t i = 0; i < 6; ++i)
    f = f * 10 + (i < frac.size() && frac[i] >= '0' && frac[i] <= '9' ? frac[i] - '0' : 0);
  v = v * SCALE + f;
  return neg ? -v : v;
}

inline std::string dec6str(long long v) {
  if (v == 0)
    return "0";
  const bool neg = v < 0;
  const unsigned long long a = neg ? static_cast<unsigned long long>(-(v + 1)) + 1ULL
                                   : static_cast<unsigned long long>(v);
  char buf[48];
  if (a % SCALE == 0)
    std::snprintf(buf, sizeof buf, "%s%llu", neg ? "-" : "",
                  static_cast<unsigned long long>(a / SCALE));
  else
    std::snprintf(buf, sizeof buf, "%s%llu.%06llu", neg ? "-" : "",
                  static_cast<unsigned long long>(a / SCALE),
                  static_cast<unsigned long long>(a % SCALE));
  return buf;
}

inline std::string mulDec6(const std::string &a, const std::string &b) {
  const long double prod = std::stold(a) * std::stold(b);
  const long long scaled = prod >= 0 ? static_cast<long long>(std::floor(prod * SCALE + 0.5L))
                                     : static_cast<long long>(std::ceil(prod * SCALE - 0.5L));
  return dec6str(scaled);
}

inline std::string decParam(const Json::Value &v, const std::string &fallback = "0") {
  if (v.isNull())
    return fallback;
  if (v.isString()) {
    const auto s = trim(v.asString());
    return s.empty() ? fallback : s;
  }
  if (v.isNumeric()) {
    char buf[48];
    const long double d = v.asDouble();
    std::snprintf(buf, sizeof buf, "%.6Lf", d);
    std::string out(buf);
    if (out.find('.') != std::string::npos) {
      while (!out.empty() && out.back() == '0')
        out.pop_back();
      if (!out.empty() && out.back() == '.')
        out.pop_back();
    }
    return out.empty() ? fallback : out;
  }
  return "";
}

inline std::string optStr(const Json::Value &obj, const char *key) {
  return obj[key].isNull() ? std::string{} : obj[key].asString();
}

inline std::string optCol(const drogon::orm::Row &row, const char *col) {
  return row[col].isNull() ? std::string{} : row[col].as<std::string>();
}

inline std::string uuidOrEmpty(const std::string &s) {
  return uuid(s) ? s : std::string{};
}

inline bool validUuidOpt(Json::Value &obj, const char *key, std::string &err, bool required = false) {
  auto &v = obj[key];
  if (v.isNull() || (v.isString() && trim(v.asString()).empty())) {
    if (required) {
      err = std::string(key) + ": a valid UUID is required.";
      return false;
    }
    v = Json::nullValue;
    return true;
  }
  if (!v.isString()) {
    err = std::string(key) + ": must be a UUID string.";
    return false;
  }
  const auto s = lower(trim(v.asString()));
  if (!uuid(s)) {
    err = std::string(key) + ": invalid UUID.";
    return false;
  }
  v = s;
  return true;
}

inline bool validText(Json::Value &obj, const char *key, unsigned max, std::string &err,
                      bool required = false, const std::string &fallback = "") {
  auto &v = obj[key];
  if (v.isNull()) {
    if (required) {
      err = std::string(key) + ": required.";
      return false;
    }
    v = fallback;
    return true;
  }
  if (!v.isString()) {
    err = std::string(key) + ": string expected.";
    return false;
  }
  const auto s = trim(v.asString());
  if (!text(s, max) || (required && s.empty())) {
    err = std::string(key) + ": check required value and max length (" + std::to_string(max) + ").";
    return false;
  }
  v = s;
  return true;
}

inline bool validDate(Json::Value &obj, const char *key, std::string &err, bool required = false) {
  auto &v = obj[key];
  if (v.isNull() || (v.isString() && trim(v.asString()).empty())) {
    if (required) {
      err = std::string(key) + ": ISO date (YYYY-MM-DD) is required.";
      return false;
    }
    v = Json::nullValue;
    return true;
  }
  if (!v.isString()) {
    err = std::string(key) + ": ISO date string expected.";
    return false;
  }
  const auto s = trim(v.asString());
  if (!date(s)) {
    err = std::string(key) + ": invalid ISO date (YYYY-MM-DD, 1900-2999).";
    return false;
  }
  v = s;
  return true;
}

inline bool validDec(Json::Value &obj, const char *key, std::string &err,
                     const std::string &fallback = "0", bool positive = false) {
  const auto s = decParam(obj[key], fallback);
  if (s.empty() || !decimal(s)) {
    err = std::string(key) + ": non-negative decimal (up to 6dp) required.";
    return false;
  }
  if (positive && dec6(s) <= 0) {
    err = std::string(key) + ": must be greater than zero.";
    return false;
  }
  obj[key] = s;
  return true;
}

inline bool validBool(Json::Value &obj, const char *key, std::string &err, bool fallback = false) {
  auto &v = obj[key];
  if (v.isNull()) {
    v = fallback;
    return true;
  }
  if (!v.isBool()) {
    err = std::string(key) + ": boolean required.";
    return false;
  }
  return true;
}

inline bool validEnum(Json::Value &obj, const char *key, const std::set<std::string> &allowed,
                      std::string &err, const std::string &fallback = "") {
  auto &v = obj[key];
  if (v.isNull() || (v.isString() && trim(v.asString()).empty())) {
    if (fallback.empty()) {
      err = std::string(key) + ": required.";
      return false;
    }
    v = fallback;
    return true;
  }
  if (!v.isString()) {
    err = std::string(key) + ": string expected.";
    return false;
  }
  const auto s = trim(v.asString());
  if (!allowed.count(s)) {
    err = std::string(key) + ": invalid choice.";
    return false;
  }
  v = s;
  return true;
}

inline bool allowedFields(const Json::Value &obj, const std::set<std::string> &allowed,
                          std::string &err) {
  if (!obj.isObject()) {
    err = "Expected a JSON object.";
    return false;
  }
  for (const auto &k : obj.getMemberNames()) {
    if (!allowed.count(k)) {
      err = "Unknown or server-owned field: " + k;
      return false;
    }
  }
  return true;
}

inline drogon::Task<dto::BaseApiResponse>
authorize(DbClientPtr db, const utils::AuditIdentity &who, bool write, bool &canWrite) {
  if (!uuid(who.tenantId) || !uuid(who.userId))
    co_return fail("unauthorized", "A signed-in tenant user is required.");
  if (write) {
    co_await db->execSqlCoro("SET LOCAL lock_timeout='5s'");
    co_await db->execSqlCoro("SET LOCAL statement_timeout='15s'");
  }
  const std::string sql =
      "SELECT u.is_tenant_admin_user FROM users u JOIN tenants t ON t.id=u.tenant_id "
      "AND t.is_deleted=false AND t.is_active=true "
      "WHERE u.id=$1 AND u.tenant_id=$2 AND u.is_deleted=false AND u.is_active=true "
      "AND u.is_locked_out=false AND u.is_host_admin_user=false" +
      std::string(write ? " FOR SHARE OF u,t" : "");
  const auto actor = co_await db->execSqlCoro(sql, who.userId, who.tenantId);
  if (actor.empty())
    co_return fail("forbidden", "A live tenant user is required.");
  canWrite = actor[0]["is_tenant_admin_user"].as<bool>();
  if (!canWrite) {
    const auto grants = co_await PermissionService::getUserPermissions(who.userId);
    canWrite = grants.count("*") || grants.count("fleet_workshop.manage") ||
               grants.count("fleet_workshop.write") ||
               grants.count("fleet_workshop_management.manage") ||
               grants.count("fleet_workshop_management.write");
    const bool canRead = canWrite || grants.count("fleet_workshop.read") ||
                         grants.count("fleet_workshop_management.read");
    if ((write && !canWrite) || (!write && !canRead))
      co_return fail("forbidden",
                     "Fleet & Workshop Management permission or tenant administrator access required.");
  }
  dto::BaseApiResponse ok;
  ok.success = true;
  co_return ok;
}

inline drogon::Task<std::string>
nextNumber(DbClientPtr tx, const utils::AuditIdentity &who, const std::string &unitId,
           const std::string &docType, const std::string &defaultPrefix, int padding = 5) {
  const auto seq = co_await tx->execSqlCoro(
      "INSERT INTO fwm_document_sequences(tenant_id,accounting_unit_id,document_type,prefix,padding,"
      "next_number,created_by_user_id) VALUES($1::uuid,$2::uuid,$3,$4,$5,2,$6::uuid) "
      "ON CONFLICT (tenant_id,accounting_unit_id,document_type) DO UPDATE "
      "SET next_number=fwm_document_sequences.next_number+1,last_modified_at=now(),"
      "last_modified_by_user_id=$6::uuid "
      "RETURNING (next_number-1) AS issued, prefix, padding",
      who.tenantId, unitId, docType, defaultPrefix, padding, who.userId);
  const auto issued = seq[0]["issued"].as<long long>();
  const std::string prefix = seq[0]["prefix"].as<std::string>();
  const int pad = seq[0]["padding"].as<int>();
  std::string num = std::to_string(issued);
  if (static_cast<int>(num.size()) < pad)
    num = std::string(static_cast<size_t>(pad - static_cast<int>(num.size())), '0') + num;
  co_return prefix + (prefix.empty() ? "" : "-") + num;
}

inline drogon::Task<std::string>
resolveUnitCurrency(DbClientPtr db, const utils::AuditIdentity &who, const std::string &unitId) {
  const auto rows = co_await db->execSqlCoro(
      "SELECT u.base_currency_id FROM core_accounting_units u "
      "WHERE u.tenant_id=$1 AND u.id=$2::uuid AND u.is_deleted=false AND u.is_active=true",
      who.tenantId, unitId);
  if (rows.empty())
    co_return "";
  co_return rows[0]["base_currency_id"].as<std::string>();
}

inline drogon::Task<std::string>
upsertCrossModuleLink(DbClientPtr tx, const utils::AuditIdentity &who,
                      const std::string &unitId, const std::string &sourceType,
                      const std::string &sourceId, const std::string &targetModule,
                      const std::string &linkKind, const std::string &targetEntityId,
                      const std::string &targetReference, const std::string &handoffStatus,
                      const std::string &amount, const std::string &currencyId,
                      const std::string &journalBatchId, const Json::Value &payload,
                      const std::string &idempotencyKey) {
  const auto saved = co_await tx->execSqlCoro(
      "INSERT INTO fwm_cross_module_links(tenant_id,accounting_unit_id,source_entity_type,"
      "source_entity_id,target_module,link_kind,target_entity_id,target_reference,"
      "handoff_status,amount,currency_id,journal_batch_id,payload,idempotency_key,"
      "posted_at,posted_by_user_id,created_by_user_id) "
      "VALUES($1::uuid,$2::uuid,$3,$4::uuid,$5,$6,NULLIF($7,'')::uuid,$8,$9,"
      "($10::text)::numeric,NULLIF($11,'')::uuid,NULLIF($12,'')::uuid,$13::jsonb,$14,"
      "CASE WHEN $9 IN('posted','synced') THEN now() ELSE NULL END,"
      "CASE WHEN $9 IN('posted','synced') THEN $15::uuid ELSE NULL END,$15::uuid) "
      "ON CONFLICT (tenant_id,target_module,idempotency_key) "
      "WHERE is_deleted=false AND idempotency_key<>'' DO UPDATE "
      "SET target_entity_id=COALESCE(EXCLUDED.target_entity_id,fwm_cross_module_links.target_entity_id),"
      "target_reference=CASE WHEN EXCLUDED.target_reference<>'' THEN EXCLUDED.target_reference "
      "ELSE fwm_cross_module_links.target_reference END,"
      "handoff_status=EXCLUDED.handoff_status,amount=EXCLUDED.amount,"
      "journal_batch_id=COALESCE(EXCLUDED.journal_batch_id,fwm_cross_module_links.journal_batch_id),"
      "payload=EXCLUDED.payload,last_modified_at=now(),last_modified_by_user_id=$15::uuid,"
      "version=fwm_cross_module_links.version+1 "
      "RETURNING id",
      who.tenantId, unitId, sourceType, sourceId, targetModule, linkKind, targetEntityId,
      targetReference, handoffStatus, amount, currencyId, journalBatchId,
      Json::writeString(Json::StreamWriterBuilder{}, payload), idempotencyKey, who.userId);
  co_return saved[0]["id"].as<std::string>();
}

inline std::string knownFwmMessage(const std::string &raw) {
  static const char *known[] = {
      "Select a live active warehouse in this accounting unit",
      "Selected GL accounts must be active in this accounting unit",
      "Fleet workshop audit events are immutable",
      "duplicate key value violates unique constraint",
  };
  for (const char *k : known)
    if (raw.find(k) != std::string::npos)
      return k;
  const auto invMsg = inventory_internal::knownMessage(raw);
  if (!invMsg.empty())
    return invMsg;
  return {};
}

// Forward declarations of the 3 cohesive domain translation units.
drogon::Task<dto::BaseApiResponse>
handleMasterOps(DbClientPtr db, const std::string &resource, const std::string &action,
                const std::string &id, Json::Value body, int page, int size,
                const std::string &query, const std::string &unitId,
                const utils::AuditIdentity &who, bool write, bool canWrite);

drogon::Task<dto::BaseApiResponse>
handleOperationsOps(DbClientPtr db, const std::string &resource, const std::string &action,
                    const std::string &id, Json::Value body, int page, int size,
                    const std::string &query, const std::string &unitId,
                    const utils::AuditIdentity &who, bool write, bool canWrite);

drogon::Task<dto::BaseApiResponse>
handleJobAndReportOps(DbClientPtr db, const std::string &resource, const std::string &action,
                      const std::string &id, const std::string &subId, Json::Value body,
                      int page, int size, const std::string &query, const std::string &unitId,
                      const utils::AuditIdentity &who, bool write, bool canWrite);

} // namespace business_desk::domain_services::fwm_internal
