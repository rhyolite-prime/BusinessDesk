#include "domain_services/dm/DmInternal.h"
#include <map>

namespace business_desk::domain_services::dm_folders {

using namespace business_desk::domain_services::dm_internal;

drogon::Task<dto::BaseApiResponse> listFolders(DbClientPtr db, const std::string &tenantId,
                                              const std::string &unitId) {
  dto::BaseApiResponse r;
  r.success = true;

  const bool hasUnit = !unitId.empty() && uuid(unitId);
  std::string sql =
      "SELECT f.id, f.tenant_id, f.accounting_unit_id, f.parent_id, f.name, f.description, "
      "f.color, f.icon, f.path, f.is_system, f.version, f.created_at, f.last_modified_at, "
      "COUNT(d.id)::int AS document_count "
      "FROM dm_folders f "
      "LEFT JOIN dm_documents d ON d.folder_id=f.id AND d.is_deleted=false "
      "WHERE f.tenant_id=$1 AND f.is_deleted=false ";

  if (hasUnit) {
    sql += "AND (f.accounting_unit_id=$2::uuid OR f.accounting_unit_id IS NULL) ";
  }

  sql += "GROUP BY f.id ORDER BY f.path ASC, lower(f.name) ASC";

  std::optional<drogon::orm::Result> rows;
  if (hasUnit) {
    rows = co_await db->execSqlCoro(sql, tenantId, unitId);
  } else {
    rows = co_await db->execSqlCoro(sql, tenantId);
  }

  Json::Value items(Json::arrayValue);
  if (rows) {
    for (const auto &row : *rows) {
      Json::Value item(Json::objectValue);
      item["id"] = row["id"].as<std::string>();
      item["parentId"] = row["parent_id"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["parent_id"].as<std::string>());
      item["accountingUnitId"] = row["accounting_unit_id"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["accounting_unit_id"].as<std::string>());
      item["name"] = row["name"].as<std::string>();
      item["description"] = row["description"].as<std::string>();
      item["color"] = row["color"].as<std::string>();
      item["icon"] = row["icon"].as<std::string>();
      item["path"] = row["path"].as<std::string>();
      item["isSystem"] = row["is_system"].as<bool>();
      item["documentCount"] = row["document_count"].as<int>();
      item["version"] = row["version"].as<int>();
      item["createdAt"] = row["created_at"].as<std::string>();
      item["lastModifiedAt"] = row["last_modified_at"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["last_modified_at"].as<std::string>());
      items.append(std::move(item));
    }
  }

  r.result["data"] = items;
  r.result["totalCount"] = static_cast<int>(items.size());
  co_return r;
}

drogon::Task<dto::BaseApiResponse> getFolder(DbClientPtr db, const std::string &tenantId,
                                            const std::string &folderId) {
  dto::BaseApiResponse r;
  if (!uuid(folderId))
    co_return fail("validation_error", "A valid folder ID is required.");

  auto rows = co_await db->execSqlCoro(
      "SELECT f.id, f.tenant_id, f.accounting_unit_id, f.parent_id, f.name, f.description, "
      "f.color, f.icon, f.path, f.is_system, f.version, f.created_at, f.last_modified_at, "
      "COUNT(d.id)::int AS document_count "
      "FROM dm_folders f "
      "LEFT JOIN dm_documents d ON d.folder_id=f.id AND d.is_deleted=false "
      "WHERE f.tenant_id=$1 AND f.id=$2 AND f.is_deleted=false "
      "GROUP BY f.id",
      tenantId, folderId);

  if (rows.empty())
    co_return fail("not_found", "Folder not found.");

  const auto &row = rows[0];
  Json::Value item(Json::objectValue);
  item["id"] = row["id"].as<std::string>();
  item["parentId"] = row["parent_id"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["parent_id"].as<std::string>());
  item["accountingUnitId"] = row["accounting_unit_id"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["accounting_unit_id"].as<std::string>());
  item["name"] = row["name"].as<std::string>();
  item["description"] = row["description"].as<std::string>();
  item["color"] = row["color"].as<std::string>();
  item["icon"] = row["icon"].as<std::string>();
  item["path"] = row["path"].as<std::string>();
  item["isSystem"] = row["is_system"].as<bool>();
  item["documentCount"] = row["document_count"].as<int>();
  item["version"] = row["version"].as<int>();
  item["createdAt"] = row["created_at"].as<std::string>();
  item["lastModifiedAt"] = row["last_modified_at"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["last_modified_at"].as<std::string>());

  // Breadcrumbs: follow parent links up to root
  Json::Value crumbs(Json::arrayValue);
  std::string currParent = item["parentId"].isNull() ? "" : item["parentId"].asString();
  int depth = 0;
  while (!currParent.empty() && depth++ < 10) {
    auto pRows = co_await db->execSqlCoro(
        "SELECT id, name, parent_id FROM dm_folders WHERE id=$1 AND tenant_id=$2 AND is_deleted=false",
        currParent, tenantId);
    if (pRows.empty())
      break;
    Json::Value crumb(Json::objectValue);
    crumb["id"] = pRows[0]["id"].as<std::string>();
    crumb["name"] = pRows[0]["name"].as<std::string>();
    crumbs.append(std::move(crumb));
    currParent = pRows[0]["parent_id"].isNull() ? "" : pRows[0]["parent_id"].as<std::string>();
  }
  // Reverse crumbs so root is first
  Json::Value orderedCrumbs(Json::arrayValue);
  for (int i = static_cast<int>(crumbs.size()) - 1; i >= 0; --i)
    orderedCrumbs.append(crumbs[i]);
  item["breadcrumbs"] = orderedCrumbs;

  r.success = true;
  r.result = item;
  co_return r;
}

drogon::Task<dto::BaseApiResponse> createFolder(DbClientPtr db, const std::string &tenantId,
                                               const std::string &unitId, const Json::Value &body,
                                               const utils::AuditIdentity &who) {
  const std::string name = trim(body["name"].asString());
  if (name.empty() || name.size() > 150)
    co_return fail("validation_error", "Folder name is required and must not exceed 150 characters.");

  const std::string description = body["description"].asString();
  const std::string color = body["color"].asString();
  const std::string icon = body["icon"].empty() ? "folder" : body["icon"].asString();
  const std::string parentId = body["parentId"].asString();

  std::string path = "/";
  if (!parentId.empty()) {
    if (!uuid(parentId))
      co_return fail("validation_error", "A valid parent folder ID is required.");
    auto pRows = co_await db->execSqlCoro(
        "SELECT id, path, name FROM dm_folders WHERE id=$1 AND tenant_id=$2 AND is_deleted=false",
        parentId, tenantId);
    if (pRows.empty())
      co_return fail("not_found", "Parent folder not found.");
    path = pRows[0]["path"].as<std::string>() + pRows[0]["name"].as<std::string>() + "/";
  }

  // Duplicate name check under same parent
  auto dup = co_await db->execSqlCoro(
      "SELECT id FROM dm_folders WHERE tenant_id=$1 AND is_deleted=false "
      "AND ((parent_id IS NULL AND $2='') OR parent_id=NULLIF($2, '')::uuid) "
      "AND lower(name)=lower($3)",
      tenantId, parentId, name);
  if (!dup.empty())
    co_return fail("conflict", "A folder with this name already exists in the selected location.");

  auto rows = co_await db->execSqlCoro(
      "INSERT INTO dm_folders "
      "(tenant_id, accounting_unit_id, parent_id, name, description, color, icon, path, created_by_user_id) "
      "VALUES ($1, NULLIF($2, '')::uuid, NULLIF($3, '')::uuid, $4, $5, $6, $7, $8, $9) "
      "RETURNING id, version, created_at",
      tenantId, unitId, parentId, name, description, color, icon, path, who.userId);

  std::string newId = rows[0]["id"].as<std::string>();
  std::string uName = co_await getUserName(db, who.userId);
  Json::Value auditDetails(Json::objectValue);
  auditDetails["name"] = name;
  auditDetails["path"] = path;
  co_await logAudit(db, tenantId, "", newId, "folder.created", who.userId, uName, auditDetails);

  dto::BaseApiResponse r;
  r.success = true;
  r.result["id"] = newId;
  r.result["name"] = name;
  r.result["path"] = path;
  r.result["version"] = rows[0]["version"].as<int>();
  r.result["createdAt"] = rows[0]["created_at"].as<std::string>();
  co_return r;
}

drogon::Task<dto::BaseApiResponse> updateFolder(DbClientPtr db, const std::string &tenantId,
                                               const std::string &folderId, const Json::Value &body,
                                               const utils::AuditIdentity &who) {
  if (!uuid(folderId))
    co_return fail("validation_error", "A valid folder ID is required.");

  auto existing = co_await db->execSqlCoro(
      "SELECT id, name, parent_id, path, version, is_system FROM dm_folders "
      "WHERE id=$1 AND tenant_id=$2 AND is_deleted=false FOR UPDATE",
      folderId, tenantId);
  if (existing.empty())
    co_return fail("not_found", "Folder not found.");

  if (body.isMember("version") && body["version"].isInt()) {
    if (existing[0]["version"].as<int>() != body["version"].asInt())
      co_return fail("conflict", "This folder has been modified by another user. Please refresh.");
  }

  const std::string name = body.isMember("name") ? trim(body["name"].asString()) : existing[0]["name"].as<std::string>();
  if (name.empty() || name.size() > 150)
    co_return fail("validation_error", "Folder name is required and must not exceed 150 characters.");

  const std::string description = body.isMember("description") ? body["description"].asString() : "";
  const std::string color = body.isMember("color") ? body["color"].asString() : "";
  const std::string icon = body.isMember("icon") && !body["icon"].empty() ? body["icon"].asString() : "folder";

  std::string parentId = existing[0]["parent_id"].isNull() ? "" : existing[0]["parent_id"].as<std::string>();
  if (body.isMember("parentId")) {
    parentId = body["parentId"].isNull() ? "" : body["parentId"].asString();
  }

  if (parentId == folderId)
    co_return fail("validation_error", "A folder cannot be its own parent.");

  std::string path = "/";
  if (!parentId.empty()) {
    if (!uuid(parentId))
      co_return fail("validation_error", "A valid parent folder ID is required.");
    auto pRows = co_await db->execSqlCoro(
        "SELECT id, path, name FROM dm_folders WHERE id=$1 AND tenant_id=$2 AND is_deleted=false",
        parentId, tenantId);
    if (pRows.empty())
      co_return fail("not_found", "Parent folder not found.");
    // Cycle check: parent path cannot start with this folder's path + name
    std::string selfPrefix = existing[0]["path"].as<std::string>() + existing[0]["name"].as<std::string>() + "/";
    std::string parentPath = pRows[0]["path"].as<std::string>() + pRows[0]["name"].as<std::string>() + "/";
    if (parentPath.starts_with(selfPrefix))
      co_return fail("validation_error", "Cannot move a folder inside its own subfolder.");
    path = parentPath;
  }

  auto dup = co_await db->execSqlCoro(
      "SELECT id FROM dm_folders WHERE tenant_id=$1 AND is_deleted=false AND id<>$2 "
      "AND ((parent_id IS NULL AND $3='') OR parent_id=NULLIF($3, '')::uuid) "
      "AND lower(name)=lower($4)",
      tenantId, folderId, parentId, name);
  if (!dup.empty())
    co_return fail("conflict", "A folder with this name already exists in the selected location.");

  auto upd = co_await db->execSqlCoro(
      "UPDATE dm_folders SET "
      "name=$1, description=$2, color=$3, icon=$4, parent_id=NULLIF($5, '')::uuid, path=$6, "
      "version=version+1, last_modified_at=now(), last_modified_by_user_id=$7 "
      "WHERE id=$8 AND tenant_id=$9 "
      "RETURNING version, last_modified_at",
      name, description, color, icon, parentId, path, who.userId, folderId, tenantId);

  std::string uName = co_await getUserName(db, who.userId);
  Json::Value auditDetails(Json::objectValue);
  auditDetails["name"] = name;
  auditDetails["path"] = path;
  co_await logAudit(db, tenantId, "", folderId, "folder.updated", who.userId, uName, auditDetails);

  dto::BaseApiResponse r;
  r.success = true;
  r.result["id"] = folderId;
  r.result["name"] = name;
  r.result["path"] = path;
  r.result["version"] = upd[0]["version"].as<int>();
  r.result["lastModifiedAt"] = upd[0]["last_modified_at"].as<std::string>();
  co_return r;
}

drogon::Task<dto::BaseApiResponse> deleteFolder(DbClientPtr db, const std::string &tenantId,
                                               const std::string &folderId,
                                               const utils::AuditIdentity &who) {
  if (!uuid(folderId))
    co_return fail("validation_error", "A valid folder ID is required.");

  auto existing = co_await db->execSqlCoro(
      "SELECT id, is_system, name FROM dm_folders WHERE id=$1 AND tenant_id=$2 AND is_deleted=false FOR UPDATE",
      folderId, tenantId);
  if (existing.empty())
    co_return fail("not_found", "Folder not found.");

  if (existing[0]["is_system"].as<bool>())
    co_return fail("forbidden", "System folders cannot be deleted.");

  // Check child folders
  auto childFolders = co_await db->execSqlCoro(
      "SELECT count(*)::int AS cnt FROM dm_folders WHERE parent_id=$1 AND tenant_id=$2 AND is_deleted=false",
      folderId, tenantId);
  if (!childFolders.empty() && childFolders[0]["cnt"].as<int>() > 0)
    co_return fail("conflict", "Cannot delete folder containing subfolders. Move or delete subfolders first.");

  // Check live documents
  auto childDocs = co_await db->execSqlCoro(
      "SELECT count(*)::int AS cnt FROM dm_documents WHERE folder_id=$1 AND tenant_id=$2 AND is_deleted=false",
      folderId, tenantId);
  if (!childDocs.empty() && childDocs[0]["cnt"].as<int>() > 0)
    co_return fail("conflict", "Cannot delete folder containing documents. Move or delete documents first.");

  co_await db->execSqlCoro(
      "UPDATE dm_folders SET is_deleted=true, deleted_at=now(), deleted_by_user_id=$1 WHERE id=$2 AND tenant_id=$3",
      who.userId, folderId, tenantId);

  std::string uName = co_await getUserName(db, who.userId);
  Json::Value auditDetails(Json::objectValue);
  auditDetails["name"] = existing[0]["name"].as<std::string>();
  co_await logAudit(db, tenantId, "", folderId, "folder.deleted", who.userId, uName, auditDetails);

  dto::BaseApiResponse r;
  r.success = true;
  r.message = "Folder moved to recycle bin.";
  co_return r;
}

// ---------------------------------------------------------------------------
// Document Templates / Types
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse> listTemplates(DbClientPtr db, const std::string &tenantId) {
  dto::BaseApiResponse r;
  r.success = true;

  auto rows = co_await db->execSqlCoro(
      "SELECT t.id, t.name, t.code, t.description, t.schema, t.default_retention_policy_id, "
      "t.is_active, t.version, t.created_at, t.last_modified_at, "
      "p.name AS retention_policy_name "
      "FROM dm_templates t "
      "LEFT JOIN dm_retention_policies p ON p.id=t.default_retention_policy_id AND p.is_deleted=false "
      "WHERE t.tenant_id=$1 AND t.is_deleted=false "
      "ORDER BY lower(t.name) ASC",
      tenantId);

  Json::Value items(Json::arrayValue);
  for (const auto &row : rows) {
    Json::Value item(Json::objectValue);
    item["id"] = row["id"].as<std::string>();
    item["name"] = row["name"].as<std::string>();
    item["code"] = row["code"].as<std::string>();
    item["description"] = row["description"].as<std::string>();
    item["schema"] = parse(row["schema"].as<std::string>());
    item["defaultRetentionPolicyId"] = row["default_retention_policy_id"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["default_retention_policy_id"].as<std::string>());
    item["retentionPolicyName"] = row["retention_policy_name"].isNull() ? Json::Value("") : Json::Value(row["retention_policy_name"].as<std::string>());
    item["isActive"] = row["is_active"].as<bool>();
    item["version"] = row["version"].as<int>();
    item["createdAt"] = row["created_at"].as<std::string>();
    items.append(std::move(item));
  }

  r.result["data"] = items;
  r.result["totalCount"] = static_cast<int>(items.size());
  co_return r;
}

drogon::Task<dto::BaseApiResponse> getTemplate(DbClientPtr db, const std::string &tenantId,
                                              const std::string &templateId) {
  if (!uuid(templateId))
    co_return fail("validation_error", "A valid template ID is required.");

  auto rows = co_await db->execSqlCoro(
      "SELECT t.id, t.name, t.code, t.description, t.schema, t.default_retention_policy_id, "
      "t.is_active, t.version, t.created_at, t.last_modified_at, "
      "p.name AS retention_policy_name "
      "FROM dm_templates t "
      "LEFT JOIN dm_retention_policies p ON p.id=t.default_retention_policy_id AND p.is_deleted=false "
      "WHERE t.tenant_id=$1 AND t.id=$2 AND t.is_deleted=false",
      tenantId, templateId);

  if (rows.empty())
    co_return fail("not_found", "Template not found.");

  const auto &row = rows[0];
  Json::Value item(Json::objectValue);
  item["id"] = row["id"].as<std::string>();
  item["name"] = row["name"].as<std::string>();
  item["code"] = row["code"].as<std::string>();
  item["description"] = row["description"].as<std::string>();
  item["schema"] = parse(row["schema"].as<std::string>());
  item["defaultRetentionPolicyId"] = row["default_retention_policy_id"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["default_retention_policy_id"].as<std::string>());
  item["retentionPolicyName"] = row["retention_policy_name"].isNull() ? Json::Value("") : Json::Value(row["retention_policy_name"].as<std::string>());
  item["isActive"] = row["is_active"].as<bool>();
  item["version"] = row["version"].as<int>();
  item["createdAt"] = row["created_at"].as<std::string>();

  dto::BaseApiResponse r;
  r.success = true;
  r.result = item;
  co_return r;
}

drogon::Task<dto::BaseApiResponse> createTemplate(DbClientPtr db, const std::string &tenantId,
                                                 const Json::Value &body, const utils::AuditIdentity &who) {
  const std::string name = trim(body["name"].asString());
  const std::string code = lower(trim(body["code"].asString()));
  if (name.empty() || name.size() > 120)
    co_return fail("validation_error", "Template name is required (max 120 characters).");
  if (code.empty() || code.size() > 50)
    co_return fail("validation_error", "Template code is required (max 50 characters).");

  const std::string desc = body["description"].asString();
  const std::string retId = body["defaultRetentionPolicyId"].asString();
  std::string schemaStr = "[]";
  if (body.isMember("schema") && body["schema"].isArray())
    schemaStr = json(body["schema"]);

  auto dup = co_await db->execSqlCoro(
      "SELECT id FROM dm_templates WHERE tenant_id=$1 AND lower(code)=$2 AND is_deleted=false",
      tenantId, code);
  if (!dup.empty())
    co_return fail("conflict", "A template with this code already exists.");

  auto rows = co_await db->execSqlCoro(
      "INSERT INTO dm_templates (tenant_id, name, code, description, schema, default_retention_policy_id, created_by_user_id) "
      "VALUES ($1, $2, $3, $4, $5::jsonb, NULLIF($6, '')::uuid, $7) "
      "RETURNING id, version, created_at",
      tenantId, name, code, desc, schemaStr, retId, who.userId);

  dto::BaseApiResponse r;
  r.success = true;
  r.result["id"] = rows[0]["id"].as<std::string>();
  r.result["name"] = name;
  r.result["code"] = code;
  r.result["version"] = rows[0]["version"].as<int>();
  r.result["createdAt"] = rows[0]["created_at"].as<std::string>();
  co_return r;
}

drogon::Task<dto::BaseApiResponse> updateTemplate(DbClientPtr db, const std::string &tenantId,
                                                 const std::string &templateId, const Json::Value &body,
                                                 const utils::AuditIdentity &who) {
  if (!uuid(templateId))
    co_return fail("validation_error", "A valid template ID is required.");

  auto existing = co_await db->execSqlCoro(
      "SELECT id, name, code, description, schema, default_retention_policy_id, is_active, version "
      "FROM dm_templates WHERE id=$1 AND tenant_id=$2 AND is_deleted=false FOR UPDATE",
      templateId, tenantId);
  if (existing.empty())
    co_return fail("not_found", "Template not found.");

  if (body.isMember("version") && body["version"].isInt()) {
    if (existing[0]["version"].as<int>() != body["version"].asInt())
      co_return fail("conflict", "Template has been updated concurrently. Please reload.");
  }

  const std::string name = body.isMember("name") ? trim(body["name"].asString()) : existing[0]["name"].as<std::string>();
  const std::string desc = body.isMember("description") ? body["description"].asString() : existing[0]["description"].as<std::string>();
  const bool isActive = body.isMember("isActive") ? body["isActive"].asBool() : existing[0]["is_active"].as<bool>();
  std::string retId = existing[0]["default_retention_policy_id"].isNull() ? "" : existing[0]["default_retention_policy_id"].as<std::string>();
  if (body.isMember("defaultRetentionPolicyId"))
    retId = body["defaultRetentionPolicyId"].isNull() ? "" : body["defaultRetentionPolicyId"].asString();

  std::string schemaStr = existing[0]["schema"].as<std::string>();
  if (body.isMember("schema") && body["schema"].isArray())
    schemaStr = json(body["schema"]);

  auto upd = co_await db->execSqlCoro(
      "UPDATE dm_templates SET "
      "name=$1, description=$2, schema=$3::jsonb, default_retention_policy_id=NULLIF($4, '')::uuid, "
      "is_active=$5::boolean, version=version+1, last_modified_at=now(), last_modified_by_user_id=$6 "
      "WHERE id=$7 AND tenant_id=$8 "
      "RETURNING version, last_modified_at",
      name, desc, schemaStr, retId, isActive, who.userId, templateId, tenantId);

  dto::BaseApiResponse r;
  r.success = true;
  r.result["id"] = templateId;
  r.result["name"] = name;
  r.result["version"] = upd[0]["version"].as<int>();
  r.result["lastModifiedAt"] = upd[0]["last_modified_at"].as<std::string>();
  co_return r;
}

drogon::Task<dto::BaseApiResponse> deleteTemplate(DbClientPtr db, const std::string &tenantId,
                                                 const std::string &templateId, const utils::AuditIdentity &who) {
  if (!uuid(templateId))
    co_return fail("validation_error", "A valid template ID is required.");

  auto docUsage = co_await db->execSqlCoro(
      "SELECT count(*)::int AS cnt FROM dm_documents WHERE template_id=$1 AND tenant_id=$2 AND is_deleted=false",
      templateId, tenantId);
  if (!docUsage.empty() && docUsage[0]["cnt"].as<int>() > 0)
    co_return fail("conflict", "Cannot delete template in use by live documents.");

  co_await db->execSqlCoro(
      "UPDATE dm_templates SET is_deleted=true, last_modified_at=now(), last_modified_by_user_id=$1 "
      "WHERE id=$2 AND tenant_id=$3",
      who.userId, templateId, tenantId);

  dto::BaseApiResponse r;
  r.success = true;
  r.message = "Template deleted successfully.";
  co_return r;
}

// ---------------------------------------------------------------------------
// Retention Policies
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse> listRetentionPolicies(DbClientPtr db, const std::string &tenantId) {
  dto::BaseApiResponse r;
  r.success = true;

  auto rows = co_await db->execSqlCoro(
      "SELECT id, name, description, retention_days, disposition_action, is_active, version, created_at "
      "FROM dm_retention_policies WHERE tenant_id=$1 AND is_deleted=false ORDER BY lower(name) ASC",
      tenantId);

  Json::Value items(Json::arrayValue);
  for (const auto &row : rows) {
    Json::Value item(Json::objectValue);
    item["id"] = row["id"].as<std::string>();
    item["name"] = row["name"].as<std::string>();
    item["description"] = row["description"].as<std::string>();
    item["retentionDays"] = row["retention_days"].as<int>();
    item["dispositionAction"] = row["disposition_action"].as<std::string>();
    item["isActive"] = row["is_active"].as<bool>();
    item["version"] = row["version"].as<int>();
    item["createdAt"] = row["created_at"].as<std::string>();
    items.append(std::move(item));
  }
  r.result["data"] = items;
  r.result["totalCount"] = static_cast<int>(items.size());
  co_return r;
}

drogon::Task<dto::BaseApiResponse> getRetentionPolicy(DbClientPtr db, const std::string &tenantId,
                                                     const std::string &policyId) {
  if (!uuid(policyId))
    co_return fail("validation_error", "A valid policy ID is required.");

  auto rows = co_await db->execSqlCoro(
      "SELECT id, name, description, retention_days, disposition_action, is_active, version, created_at "
      "FROM dm_retention_policies WHERE id=$1 AND tenant_id=$2 AND is_deleted=false",
      policyId, tenantId);
  if (rows.empty())
    co_return fail("not_found", "Retention policy not found.");

  const auto &row = rows[0];
  Json::Value item(Json::objectValue);
  item["id"] = row["id"].as<std::string>();
  item["name"] = row["name"].as<std::string>();
  item["description"] = row["description"].as<std::string>();
  item["retentionDays"] = row["retention_days"].as<int>();
  item["dispositionAction"] = row["disposition_action"].as<std::string>();
  item["isActive"] = row["is_active"].as<bool>();
  item["version"] = row["version"].as<int>();
  item["createdAt"] = row["created_at"].as<std::string>();

  dto::BaseApiResponse r;
  r.success = true;
  r.result = item;
  co_return r;
}

drogon::Task<dto::BaseApiResponse> createRetentionPolicy(DbClientPtr db, const std::string &tenantId,
                                                        const Json::Value &body, const utils::AuditIdentity &who) {
  const std::string name = trim(body["name"].asString());
  if (name.empty() || name.size() > 120)
    co_return fail("validation_error", "Policy name is required (max 120 characters).");

  const int retentionDays = body.isMember("retentionDays") && body["retentionDays"].isInt() ? body["retentionDays"].asInt() : 365;
  if (retentionDays < 0)
    co_return fail("validation_error", "Retention days must be non-negative.");

  std::string disp = body["dispositionAction"].asString();
  if (disp.empty())
    disp = "archive";
  if (disp != "archive" && disp != "review" && disp != "dispose")
    co_return fail("validation_error", "Invalid disposition action (allowed: archive, review, dispose).");

  const std::string desc = body["description"].asString();

  auto rows = co_await db->execSqlCoro(
      "INSERT INTO dm_retention_policies (tenant_id, name, description, retention_days, disposition_action, created_by_user_id) "
      "VALUES ($1, $2, $3, $4, $5, $6) "
      "RETURNING id, version, created_at",
      tenantId, name, desc, retentionDays, disp, who.userId);

  dto::BaseApiResponse r;
  r.success = true;
  r.result["id"] = rows[0]["id"].as<std::string>();
  r.result["name"] = name;
  r.result["retentionDays"] = retentionDays;
  r.result["dispositionAction"] = disp;
  r.result["version"] = rows[0]["version"].as<int>();
  r.result["createdAt"] = rows[0]["created_at"].as<std::string>();
  co_return r;
}

drogon::Task<dto::BaseApiResponse> updateRetentionPolicy(DbClientPtr db, const std::string &tenantId,
                                                        const std::string &policyId, const Json::Value &body,
                                                        const utils::AuditIdentity &who) {
  if (!uuid(policyId))
    co_return fail("validation_error", "A valid policy ID is required.");

  auto existing = co_await db->execSqlCoro(
      "SELECT id, name, description, retention_days, disposition_action, is_active, version "
      "FROM dm_retention_policies WHERE id=$1 AND tenant_id=$2 AND is_deleted=false FOR UPDATE",
      policyId, tenantId);
  if (existing.empty())
    co_return fail("not_found", "Retention policy not found.");

  const std::string name = body.isMember("name") ? trim(body["name"].asString()) : existing[0]["name"].as<std::string>();
  const std::string desc = body.isMember("description") ? body["description"].asString() : existing[0]["description"].as<std::string>();
  const int retDays = body.isMember("retentionDays") ? body["retentionDays"].asInt() : existing[0]["retention_days"].as<int>();
  std::string disp = body.isMember("dispositionAction") ? body["dispositionAction"].asString() : existing[0]["disposition_action"].as<std::string>();
  if (disp != "archive" && disp != "review" && disp != "dispose")
    disp = "archive";
  const bool isActive = body.isMember("isActive") ? body["isActive"].asBool() : existing[0]["is_active"].as<bool>();

  auto upd = co_await db->execSqlCoro(
      "UPDATE dm_retention_policies SET "
      "name=$1, description=$2, retention_days=$3, disposition_action=$4, is_active=$5::boolean, "
      "version=version+1, last_modified_at=now(), last_modified_by_user_id=$6 "
      "WHERE id=$7 AND tenant_id=$8 RETURNING version, last_modified_at",
      name, desc, retDays, disp, isActive, who.userId, policyId, tenantId);

  dto::BaseApiResponse r;
  r.success = true;
  r.result["id"] = policyId;
  r.result["name"] = name;
  r.result["version"] = upd[0]["version"].as<int>();
  r.result["lastModifiedAt"] = upd[0]["last_modified_at"].as<std::string>();
  co_return r;
}

drogon::Task<dto::BaseApiResponse> deleteRetentionPolicy(DbClientPtr db, const std::string &tenantId,
                                                        const std::string &policyId, const utils::AuditIdentity &who) {
  if (!uuid(policyId))
    co_return fail("validation_error", "A valid policy ID is required.");

  co_await db->execSqlCoro(
      "UPDATE dm_retention_policies SET is_deleted=true, last_modified_at=now(), last_modified_by_user_id=$1 "
      "WHERE id=$2 AND tenant_id=$3",
      who.userId, policyId, tenantId);

  dto::BaseApiResponse r;
  r.success = true;
  r.message = "Retention policy deleted.";
  co_return r;
}

} // namespace business_desk::domain_services::dm_folders
