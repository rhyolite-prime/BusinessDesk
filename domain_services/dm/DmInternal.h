#pragma once
#include "domain_services/inventory/InventoryInternal.h"
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
#include <drogon/drogon.h>
#include <drogon/orm/CoroMapper.h>
#include <cstdio>
#include <iomanip>
#include <optional>
#include <set>
#include <sstream>
#include <string>
#include <vector>

namespace business_desk::domain_services::dm_internal {

using drogon::orm::DbClientPtr;
using inventory_internal::date;
using inventory_internal::decimal;
using inventory_internal::fail;
using inventory_internal::json;
using inventory_internal::lower;
using inventory_internal::parse;
using inventory_internal::schemaReady;
using inventory_internal::search;
using inventory_internal::text;
using inventory_internal::trim;
using inventory_internal::uuid;

inline drogon::Task<bool> checkDmSchemaReady(DbClientPtr db) {
  static const std::vector<std::string> tables{
      "dm_document_sequences", "dm_folders",         "dm_templates",
      "dm_retention_policies", "dm_documents",       "dm_document_versions",
      "dm_workflows",          "dm_document_relations", "dm_document_notes",
      "dm_bookmarks",          "dm_saved_searches",   "dm_audit_events"};
  for (const auto &table : tables) {
    auto probe = co_await db->execSqlCoro("SELECT to_regclass($1) IS NOT NULL AS ok", table);
    if (probe.empty() || !probe[0]["ok"].as<bool>())
      co_return false;
  }
  co_return true;
}

inline drogon::Task<std::string> getUserName(DbClientPtr db, std::string userId) {
  if (!uuid(userId))
    co_return "";
  auto rows = co_await db->execSqlCoro("SELECT username, first_name, last_name FROM users WHERE id=$1", userId);
  if (rows.empty())
    co_return "";
  std::string first = rows[0]["first_name"].isNull() ? "" : rows[0]["first_name"].as<std::string>();
  std::string last = rows[0]["last_name"].isNull() ? "" : rows[0]["last_name"].as<std::string>();
  std::string uname = rows[0]["username"].isNull() ? "" : rows[0]["username"].as<std::string>();
  std::string fullName = trim(first + " " + last);
  if (!fullName.empty())
    co_return fullName;
  co_return uname;
}

inline drogon::Task<void> logAudit(DbClientPtr db, std::string tenantId,
                                   std::string documentId, std::string folderId,
                                   std::string eventType, std::string userId,
                                   std::string userName, Json::Value details) {
  try {
    std::string detStr = details.isObject() ? json(details) : "{}";
    co_await db->execSqlCoro(
        "INSERT INTO dm_audit_events "
        "(tenant_id, document_id, folder_id, event_type, user_id, user_name, details) "
        "VALUES ($1, NULLIF($2, '')::uuid, NULLIF($3, '')::uuid, $4, $5, $6, $7::jsonb)",
        tenantId, documentId, folderId, eventType, userId, userName, detStr);
  } catch (...) {
    // Audit logging is best-effort and must not abort user transactions.
  }
}

inline std::string nextVersionLabel(const std::string &current, bool major) {
  int maj = 1, min = 0;
  auto dot = current.find('.');
  if (dot != std::string::npos) {
    try {
      maj = std::stoi(current.substr(0, dot));
      min = std::stoi(current.substr(dot + 1));
    } catch (...) {}
  }
  if (major) {
    maj += 1;
    min = 0;
  } else {
    min += 1;
  }
  return std::to_string(maj) + "." + std::to_string(min);
}

inline drogon::Task<std::string> generateDocNumber(DbClientPtr db, const std::string &tenantId,
                                                   const std::string &unitId, const std::string &userId) {
  const bool hasUnit = !unitId.empty() && uuid(unitId);
  std::string seqSql =
      "SELECT id, prefix, next_number, padding FROM dm_document_sequences "
      "WHERE tenant_id=$1 AND sequence_type='DOC' AND is_deleted=false ";
  if (hasUnit) {
    seqSql += "AND (accounting_unit_id=$2::uuid OR accounting_unit_id IS NULL) ";
  } else {
    seqSql += "AND accounting_unit_id IS NULL ";
  }
  seqSql += "ORDER BY accounting_unit_id NULLS LAST LIMIT 1::bigint FOR UPDATE";

  std::optional<drogon::orm::Result> seqs;
  if (hasUnit) {
    seqs = co_await db->execSqlCoro(seqSql, tenantId, unitId);
  } else {
    seqs = co_await db->execSqlCoro(seqSql, tenantId);
  }

  std::string prefix = "DOC-";
  int nextNum = 1;
  int pad = 4;

  if (!seqs || seqs->empty()) {
    std::string unitParam = hasUnit ? unitId : "";
    co_await db->execSqlCoro(
        "INSERT INTO dm_document_sequences (tenant_id, accounting_unit_id, sequence_type, prefix, next_number, padding, created_by_user_id) "
        "VALUES ($1, NULLIF($2, '')::uuid, 'DOC', 'DOC-', 2, ($3::int)::smallint, $4)",
        tenantId, unitParam, pad, userId);
  } else {
    prefix = (*seqs)[0]["prefix"].as<std::string>();
    nextNum = (*seqs)[0]["next_number"].as<int>();
    pad = (*seqs)[0]["padding"].as<int>();
    std::string seqId = (*seqs)[0]["id"].as<std::string>();
    co_await db->execSqlCoro(
        "UPDATE dm_document_sequences SET next_number=next_number+1, last_modified_at=now(), last_modified_by_user_id=$1 "
        "WHERE id=$2",
        userId, seqId);
  }

  std::ostringstream ss;
  ss << prefix << std::setw(pad) << std::setfill('0') << nextNum;
  co_return ss.str();
}

} // namespace business_desk::domain_services::dm_internal
