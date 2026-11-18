#include "domain_services/dm/DmInternal.h"

namespace business_desk::domain_services::dm_documents {

using namespace business_desk::domain_services::dm_internal;

drogon::Task<dto::BaseApiResponse> listDocuments(DbClientPtr db, const std::string &tenantId,
                                                const std::string &unitId, const Json::Value &query,
                                                int page, int size, const utils::AuditIdentity &who) {
  dto::BaseApiResponse r;
  r.success = true;

  const int64_t limit = size > 0 && size <= 100 ? size : 20;
  const int64_t offset = page > 1 ? (page - 1) * limit : 0;

  const std::string q = query.isMember("q") ? trim(query["q"].asString()) : "";
  const std::string folderId = query.isMember("folderId") ? query["folderId"].asString() : "";
  const std::string templateId = query.isMember("templateId") ? query["templateId"].asString() : "";
  const std::string status = query.isMember("status") ? query["status"].asString() : "";
  const std::string tag = query.isMember("tag") ? trim(query["tag"].asString()) : "";
  const bool checkedOutByMe = query.isMember("checkedOutByMe") && query["checkedOutByMe"].asBool();
  const bool bookmarkedByMe = query.isMember("bookmarkedByMe") && query["bookmarkedByMe"].asBool();

  std::string where = "WHERE d.tenant_id=$1 AND d.is_deleted=false";
  std::vector<std::string> params{tenantId};

  if (!unitId.empty() && uuid(unitId)) {
    params.push_back(unitId);
    where += " AND d.accounting_unit_id=$" + std::to_string(params.size());
  }
  if (!folderId.empty() && uuid(folderId)) {
    params.push_back(folderId);
    where += " AND d.folder_id=$" + std::to_string(params.size());
  }
  if (!templateId.empty() && uuid(templateId)) {
    params.push_back(templateId);
    where += " AND d.template_id=$" + std::to_string(params.size());
  }
  if (!status.empty()) {
    params.push_back(status);
    where += " AND d.status=$" + std::to_string(params.size());
  }
  if (checkedOutByMe) {
    params.push_back(who.userId);
    where += " AND d.is_checked_out=true AND d.checked_out_by_user_id=$" + std::to_string(params.size());
  }
  if (bookmarkedByMe) {
    params.push_back(who.userId);
    where += " AND EXISTS (SELECT 1 FROM dm_bookmarks bm WHERE bm.document_id=d.id AND bm.user_id=$" + std::to_string(params.size()) + " AND bm.is_deleted=false)";
  }
  if (!tag.empty()) {
    params.push_back("%\"" + tag + "\"%");
    where += " AND d.tags::text ILIKE $" + std::to_string(params.size());
  }
  if (!q.empty()) {
    params.push_back("%" + q + "%");
    const std::string paramRef = "$" + std::to_string(params.size());
    where += " AND (d.title ILIKE " + paramRef + " OR d.file_name ILIKE " + paramRef +
             " OR d.document_number ILIKE " + paramRef + " OR d.description ILIKE " + paramRef +
             " OR d.content_text ILIKE " + paramRef + ")";
  }

  // Count query
  std::string countSql = "SELECT COUNT(d.id)::int AS total FROM dm_documents d " + where;
  drogon::orm::Result countRows;
  if (params.size() == 1) countRows = co_await db->execSqlCoro(countSql, params[0]);
  else if (params.size() == 2) countRows = co_await db->execSqlCoro(countSql, params[0], params[1]);
  else if (params.size() == 3) countRows = co_await db->execSqlCoro(countSql, params[0], params[1], params[2]);
  else if (params.size() == 4) countRows = co_await db->execSqlCoro(countSql, params[0], params[1], params[2], params[3]);
  else if (params.size() == 5) countRows = co_await db->execSqlCoro(countSql, params[0], params[1], params[2], params[3], params[4]);
  else countRows = co_await db->execSqlCoro(countSql, params[0], params[1], params[2], params[3], params[4], params[5]);

  int totalCount = countRows.empty() ? 0 : countRows[0]["total"].as<int>();

  // Data query
  std::string dataSql =
      "SELECT d.id, d.accounting_unit_id, d.folder_id, d.template_id, d.document_number, "
      "d.title, d.file_name, d.description, d.language, d.mime_type, d.file_size, d.file_hash, "
      "d.version_label, d.status, d.is_checked_out, d.checked_out_by_user_id, d.checked_out_at, "
      "d.is_locked, d.locked_by_user_id, d.locked_at, d.tags, d.attributes, d.retention_date, "
      "d.is_expired, d.version, d.created_at, d.created_by_user_id, "
      "f.name AS folder_name, t.name AS template_name, "
      "(SELECT COUNT(1)::int FROM dm_bookmarks bm WHERE bm.document_id=d.id AND bm.user_id='" + who.userId + "' AND bm.is_deleted=false) AS is_bookmarked "
      "FROM dm_documents d "
      "LEFT JOIN dm_folders f ON f.id=d.folder_id AND f.is_deleted=false "
      "LEFT JOIN dm_templates t ON t.id=d.template_id AND t.is_deleted=false "
      + where + " ORDER BY d.created_at DESC LIMIT " + std::to_string(limit) + "::bigint OFFSET " + std::to_string(offset) + "::bigint";

  drogon::orm::Result rows;
  if (params.size() == 1) rows = co_await db->execSqlCoro(dataSql, params[0]);
  else if (params.size() == 2) rows = co_await db->execSqlCoro(dataSql, params[0], params[1]);
  else if (params.size() == 3) rows = co_await db->execSqlCoro(dataSql, params[0], params[1], params[2]);
  else if (params.size() == 4) rows = co_await db->execSqlCoro(dataSql, params[0], params[1], params[2], params[3]);
  else if (params.size() == 5) rows = co_await db->execSqlCoro(dataSql, params[0], params[1], params[2], params[3], params[4]);
  else rows = co_await db->execSqlCoro(dataSql, params[0], params[1], params[2], params[3], params[4], params[5]);

  Json::Value items(Json::arrayValue);
  for (const auto &row : rows) {
    Json::Value item(Json::objectValue);
    item["id"] = row["id"].as<std::string>();
    item["accountingUnitId"] = row["accounting_unit_id"].as<std::string>();
    item["folderId"] = row["folder_id"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["folder_id"].as<std::string>());
    item["folderName"] = row["folder_name"].isNull() ? Json::Value("") : Json::Value(row["folder_name"].as<std::string>());
    item["templateId"] = row["template_id"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["template_id"].as<std::string>());
    item["templateName"] = row["template_name"].isNull() ? Json::Value("") : Json::Value(row["template_name"].as<std::string>());
    item["documentNumber"] = row["document_number"].as<std::string>();
    item["title"] = row["title"].as<std::string>();
    item["fileName"] = row["file_name"].as<std::string>();
    item["description"] = row["description"].as<std::string>();
    item["language"] = row["language"].as<std::string>();
    item["mimeType"] = row["mime_type"].as<std::string>();
    item["fileSize"] = Json::Int64(row["file_size"].as<int64_t>());
    item["fileHash"] = row["file_hash"].as<std::string>();
    item["versionLabel"] = row["version_label"].as<std::string>();
    item["status"] = row["status"].as<std::string>();
    item["isCheckedOut"] = row["is_checked_out"].as<bool>();
    item["checkedOutByUserId"] = row["checked_out_by_user_id"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["checked_out_by_user_id"].as<std::string>());
    item["checkedOutAt"] = row["checked_out_at"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["checked_out_at"].as<std::string>());
    item["isLocked"] = row["is_locked"].as<bool>();
    item["lockedByUserId"] = row["locked_by_user_id"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["locked_by_user_id"].as<std::string>());
    item["lockedAt"] = row["locked_at"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["locked_at"].as<std::string>());
    item["tags"] = parse(row["tags"].as<std::string>());
    item["attributes"] = parse(row["attributes"].as<std::string>());
    item["isExpired"] = row["is_expired"].as<bool>();
    item["isBookmarked"] = row["is_bookmarked"].as<int>() > 0;
    item["version"] = row["version"].as<int>();
    item["createdAt"] = row["created_at"].as<std::string>();
    items.append(std::move(item));
  }

  r.result["data"] = items;
  r.result["totalCount"] = totalCount;
  r.result["page"] = page;
  r.result["pageSize"] = static_cast<int>(limit);
  co_return r;
}

drogon::Task<dto::BaseApiResponse> getDocument(DbClientPtr db, const std::string &tenantId,
                                              const std::string &docId, const utils::AuditIdentity &who) {
  if (!uuid(docId))
    co_return fail("validation_error", "A valid document ID is required.");

  auto rows = co_await db->execSqlCoro(
      "SELECT d.id, d.accounting_unit_id, d.folder_id, d.template_id, d.document_number, "
      "d.title, d.file_name, d.description, d.language, d.mime_type, d.file_size, d.file_hash, "
      "d.content_text, d.storage_path, d.version_label, d.status, d.is_checked_out, "
      "d.checked_out_by_user_id, d.checked_out_at, d.is_locked, d.locked_by_user_id, d.locked_at, "
      "d.tags, d.attributes, d.retention_policy_id, d.retention_date, d.is_expired, "
      "d.version, d.created_at, d.created_by_user_id, d.last_modified_at, "
      "f.name AS folder_name, f.path AS folder_path, "
      "t.name AS template_name, t.schema AS template_schema, "
      "rp.name AS retention_policy_name "
      "FROM dm_documents d "
      "LEFT JOIN dm_folders f ON f.id=d.folder_id AND f.is_deleted=false "
      "LEFT JOIN dm_templates t ON t.id=d.template_id AND t.is_deleted=false "
      "LEFT JOIN dm_retention_policies rp ON rp.id=d.retention_policy_id AND rp.is_deleted=false "
      "WHERE d.tenant_id=$1 AND d.id=$2 AND d.is_deleted=false",
      tenantId, docId);

  if (rows.empty())
    co_return fail("not_found", "Document not found.");

  const auto &row = rows[0];
  Json::Value item(Json::objectValue);
  item["id"] = row["id"].as<std::string>();
  item["accountingUnitId"] = row["accounting_unit_id"].as<std::string>();
  item["folderId"] = row["folder_id"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["folder_id"].as<std::string>());
  item["folderName"] = row["folder_name"].isNull() ? Json::Value("") : Json::Value(row["folder_name"].as<std::string>());
  item["folderPath"] = row["folder_path"].isNull() ? Json::Value("/") : Json::Value(row["folder_path"].as<std::string>());
  item["templateId"] = row["template_id"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["template_id"].as<std::string>());
  item["templateName"] = row["template_name"].isNull() ? Json::Value("") : Json::Value(row["template_name"].as<std::string>());
  item["templateSchema"] = row["template_schema"].isNull() ? Json::Value(Json::arrayValue) : parse(row["template_schema"].as<std::string>());
  item["documentNumber"] = row["document_number"].as<std::string>();
  item["title"] = row["title"].as<std::string>();
  item["fileName"] = row["file_name"].as<std::string>();
  item["description"] = row["description"].as<std::string>();
  item["language"] = row["language"].as<std::string>();
  item["mimeType"] = row["mime_type"].as<std::string>();
  item["fileSize"] = Json::Int64(row["file_size"].as<int64_t>());
  item["fileHash"] = row["file_hash"].as<std::string>();
  item["contentText"] = row["content_text"].as<std::string>();
  item["storagePath"] = row["storage_path"].as<std::string>();
  item["versionLabel"] = row["version_label"].as<std::string>();
  item["status"] = row["status"].as<std::string>();
  item["isCheckedOut"] = row["is_checked_out"].as<bool>();
  item["checkedOutByUserId"] = row["checked_out_by_user_id"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["checked_out_by_user_id"].as<std::string>());
  item["checkedOutAt"] = row["checked_out_at"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["checked_out_at"].as<std::string>());
  item["isLocked"] = row["is_locked"].as<bool>();
  item["lockedByUserId"] = row["locked_by_user_id"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["locked_by_user_id"].as<std::string>());
  item["lockedAt"] = row["locked_at"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["locked_at"].as<std::string>());
  item["tags"] = parse(row["tags"].as<std::string>());
  item["attributes"] = parse(row["attributes"].as<std::string>());
  item["retentionPolicyId"] = row["retention_policy_id"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["retention_policy_id"].as<std::string>());
  item["retentionPolicyName"] = row["retention_policy_name"].isNull() ? Json::Value("") : Json::Value(row["retention_policy_name"].as<std::string>());
  item["retentionDate"] = row["retention_date"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["retention_date"].as<std::string>());
  item["isExpired"] = row["is_expired"].as<bool>();
  item["version"] = row["version"].as<int>();
  item["createdAt"] = row["created_at"].as<std::string>();
  item["lastModifiedAt"] = row["last_modified_at"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["last_modified_at"].as<std::string>());

  // User flags
  const std::string checkoutUid = item["checkedOutByUserId"].isNull() ? "" : item["checkedOutByUserId"].asString();
  item["canCheckIn"] = item["isCheckedOut"].asBool() && checkoutUid == who.userId;
  item["canCheckOut"] = !item["isCheckedOut"].asBool() && !item["isLocked"].asBool();

  // Check if bookmarked
  auto bmRows = co_await db->execSqlCoro(
      "SELECT id FROM dm_bookmarks WHERE document_id=$1 AND user_id=$2 AND tenant_id=$3 AND is_deleted=false",
      docId, who.userId, tenantId);
  item["isBookmarked"] = !bmRows.empty();

  // Check out user name if checked out
  if (!checkoutUid.empty()) {
    item["checkedOutByUserName"] = co_await getUserName(db, checkoutUid);
  }

  dto::BaseApiResponse r;
  r.success = true;
  r.result = item;
  co_return r;
}

drogon::Task<dto::BaseApiResponse> createDocument(DbClientPtr db, const std::string &tenantId,
                                                 const std::string &unitId, const Json::Value &body,
                                                 const utils::AuditIdentity &who) {
  const std::string title = trim(body["title"].asString());
  if (title.empty() || title.size() > 255)
    co_return fail("validation_error", "Document title is required (max 255 characters).");

  std::string fileName = trim(body["fileName"].asString());
  if (fileName.empty())
    fileName = title;
  if (fileName.size() > 255)
    fileName = fileName.substr(0, 255);

  const std::string description = body.isMember("description") ? body["description"].asString() : "";
  const std::string language = body.isMember("language") && !body["language"].empty() ? body["language"].asString() : "en";
  const std::string mimeType = body.isMember("mimeType") && !body["mimeType"].empty() ? body["mimeType"].asString() : "application/octet-stream";
  const int64_t fileSize = body.isMember("fileSize") && body["fileSize"].isInt64() ? body["fileSize"].asInt64() : 0;
  const std::string fileHash = body.isMember("fileHash") ? body["fileHash"].asString() : "";
  const std::string contentText = body.isMember("contentText") ? body["contentText"].asString() : "";
  const std::string storagePath = body.isMember("storagePath") ? body["storagePath"].asString() : "";

  std::string folderId = body.isMember("folderId") ? body["folderId"].asString() : "";
  if (!folderId.empty()) {
    if (!uuid(folderId))
      co_return fail("validation_error", "A valid folder ID is required.");
    auto fRows = co_await db->execSqlCoro("SELECT id FROM dm_folders WHERE id=$1 AND tenant_id=$2 AND is_deleted=false", folderId, tenantId);
    if (fRows.empty())
      co_return fail("not_found", "Target folder not found.");
  }

  std::string templateId = body.isMember("templateId") ? body["templateId"].asString() : "";
  std::string retPolicyId = body.isMember("retentionPolicyId") ? body["retentionPolicyId"].asString() : "";

  if (!templateId.empty()) {
    if (!uuid(templateId))
      co_return fail("validation_error", "A valid template ID is required.");
    auto tRows = co_await db->execSqlCoro("SELECT id, default_retention_policy_id FROM dm_templates WHERE id=$1 AND tenant_id=$2 AND is_deleted=false", templateId, tenantId);
    if (tRows.empty())
      co_return fail("not_found", "Template not found.");
    if (retPolicyId.empty() && !tRows[0]["default_retention_policy_id"].isNull())
      retPolicyId = tRows[0]["default_retention_policy_id"].as<std::string>();
  }

  std::string documentNumber = body.isMember("documentNumber") ? trim(body["documentNumber"].asString()) : "";
  if (documentNumber.empty()) {
    documentNumber = co_await generateDocNumber(db, tenantId, unitId, who.userId);
  }

  std::string tagsStr = "[]";
  if (body.isMember("tags") && body["tags"].isArray())
    tagsStr = json(body["tags"]);

  std::string attrStr = "{}";
  if (body.isMember("attributes") && body["attributes"].isObject())
    attrStr = json(body["attributes"]);

  // Calculate retention date if retention policy applies
  std::string retDateClause = "NULL";
  if (!retPolicyId.empty() && uuid(retPolicyId)) {
    auto rpRows = co_await db->execSqlCoro("SELECT retention_days FROM dm_retention_policies WHERE id=$1 AND tenant_id=$2 AND is_deleted=false", retPolicyId, tenantId);
    if (!rpRows.empty()) {
      int days = rpRows[0]["retention_days"].as<int>();
      retDateClause = "now() + interval '" + std::to_string(days) + " days'";
    }
  }

  std::string insertSql =
      "INSERT INTO dm_documents "
      "(tenant_id, accounting_unit_id, folder_id, template_id, document_number, title, file_name, "
      "description, language, mime_type, file_size, file_hash, content_text, storage_path, version_label, "
      "status, tags, attributes, retention_policy_id, retention_date, created_by_user_id) "
      "VALUES ($1, $2, NULLIF($3, '')::uuid, NULLIF($4, '')::uuid, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, '1.0', "
      "'draft', $15::jsonb, $16::jsonb, NULLIF($17, '')::uuid, " + retDateClause + ", $18) "
      "RETURNING id, document_number, version_label, version, created_at";

  auto rows = co_await db->execSqlCoro(insertSql, tenantId, unitId, folderId, templateId,
                                       documentNumber, title, fileName, description, language,
                                       mimeType, fileSize, fileHash, contentText, storagePath,
                                       tagsStr, attrStr, retPolicyId, who.userId);

  std::string newDocId = rows[0]["id"].as<std::string>();

  // Insert initial version 1.0 into dm_document_versions
  co_await db->execSqlCoro(
      "INSERT INTO dm_document_versions "
      "(tenant_id, document_id, version_label, file_name, file_size, file_hash, mime_type, comment, content_text, storage_path, created_by_user_id) "
      "VALUES ($1, $2, '1.0', $3, $4, $5, $6, 'Initial upload', $7, $8, $9)",
      tenantId, newDocId, fileName, fileSize, fileHash, mimeType, contentText, storagePath, who.userId);

  std::string uName = co_await getUserName(db, who.userId);
  Json::Value auditDetails(Json::objectValue);
  auditDetails["documentNumber"] = documentNumber;
  auditDetails["title"] = title;
  auditDetails["fileName"] = fileName;
  auditDetails["version"] = "1.0";
  co_await logAudit(db, tenantId, newDocId, folderId, "document.created", who.userId, uName, auditDetails);

  dto::BaseApiResponse r;
  r.success = true;
  r.result["id"] = newDocId;
  r.result["documentNumber"] = rows[0]["document_number"].as<std::string>();
  r.result["title"] = title;
  r.result["fileName"] = fileName;
  r.result["versionLabel"] = "1.0";
  r.result["version"] = rows[0]["version"].as<int>();
  r.result["createdAt"] = rows[0]["created_at"].as<std::string>();
  co_return r;
}

drogon::Task<dto::BaseApiResponse> updateDocument(DbClientPtr db, const std::string &tenantId,
                                                 const std::string &docId, const Json::Value &body,
                                                 const utils::AuditIdentity &who) {
  if (!uuid(docId))
    co_return fail("validation_error", "A valid document ID is required.");

  auto existing = co_await db->execSqlCoro(
      "SELECT id, title, description, language, tags, attributes, folder_id, template_id, "
      "retention_policy_id, version, is_locked FROM dm_documents "
      "WHERE id=$1 AND tenant_id=$2 AND is_deleted=false FOR UPDATE",
      docId, tenantId);
  if (existing.empty())
    co_return fail("not_found", "Document not found.");

  if (existing[0]["is_locked"].as<bool>())
    co_return fail("conflict", "Document is locked and cannot be updated.");

  if (body.isMember("version") && body["version"].isInt()) {
    if (existing[0]["version"].as<int>() != body["version"].asInt())
      co_return fail("conflict", "Document was modified by another user. Please reload.");
  }

  const std::string title = body.isMember("title") ? trim(body["title"].asString()) : existing[0]["title"].as<std::string>();
  if (title.empty() || title.size() > 255)
    co_return fail("validation_error", "Document title is required (max 255 characters).");

  const std::string description = body.isMember("description") ? body["description"].asString() : existing[0]["description"].as<std::string>();
  const std::string language = body.isMember("language") ? body["language"].asString() : existing[0]["language"].as<std::string>();

  std::string folderId = existing[0]["folder_id"].isNull() ? "" : existing[0]["folder_id"].as<std::string>();
  if (body.isMember("folderId"))
    folderId = body["folderId"].isNull() ? "" : body["folderId"].asString();

  std::string retPolicyId = existing[0]["retention_policy_id"].isNull() ? "" : existing[0]["retention_policy_id"].as<std::string>();
  if (body.isMember("retentionPolicyId"))
    retPolicyId = body["retentionPolicyId"].isNull() ? "" : body["retentionPolicyId"].asString();

  std::string tagsStr = existing[0]["tags"].as<std::string>();
  if (body.isMember("tags") && body["tags"].isArray())
    tagsStr = json(body["tags"]);

  std::string attrStr = existing[0]["attributes"].as<std::string>();
  if (body.isMember("attributes") && body["attributes"].isObject())
    attrStr = json(body["attributes"]);

  auto upd = co_await db->execSqlCoro(
      "UPDATE dm_documents SET "
      "title=$1, description=$2, language=$3, folder_id=NULLIF($4, '')::uuid, "
      "retention_policy_id=NULLIF($5, '')::uuid, tags=$6::jsonb, attributes=$7::jsonb, "
      "version=version+1, last_modified_at=now(), last_modified_by_user_id=$8 "
      "WHERE id=$9 AND tenant_id=$10 "
      "RETURNING version, last_modified_at",
      title, description, language, folderId, retPolicyId, tagsStr, attrStr, who.userId, docId, tenantId);

  std::string uName = co_await getUserName(db, who.userId);
  Json::Value auditDetails(Json::objectValue);
  auditDetails["title"] = title;
  co_await logAudit(db, tenantId, docId, folderId, "document.updated", who.userId, uName, auditDetails);

  dto::BaseApiResponse r;
  r.success = true;
  r.result["id"] = docId;
  r.result["title"] = title;
  r.result["version"] = upd[0]["version"].as<int>();
  r.result["lastModifiedAt"] = upd[0]["last_modified_at"].as<std::string>();
  co_return r;
}

drogon::Task<dto::BaseApiResponse> deleteDocument(DbClientPtr db, const std::string &tenantId,
                                                 const std::string &docId, const utils::AuditIdentity &who) {
  if (!uuid(docId))
    co_return fail("validation_error", "A valid document ID is required.");

  auto existing = co_await db->execSqlCoro(
      "SELECT id, title, document_number, folder_id, is_locked FROM dm_documents "
      "WHERE id=$1 AND tenant_id=$2 AND is_deleted=false FOR UPDATE",
      docId, tenantId);
  if (existing.empty())
    co_return fail("not_found", "Document not found.");

  if (existing[0]["is_locked"].as<bool>())
    co_return fail("conflict", "Locked documents cannot be deleted.");

  co_await db->execSqlCoro(
      "UPDATE dm_documents SET is_deleted=true, deleted_at=now(), deleted_by_user_id=$1 "
      "WHERE id=$2 AND tenant_id=$3",
      who.userId, docId, tenantId);

  std::string uName = co_await getUserName(db, who.userId);
  Json::Value auditDetails(Json::objectValue);
  auditDetails["documentNumber"] = existing[0]["document_number"].as<std::string>();
  auditDetails["title"] = existing[0]["title"].as<std::string>();
  std::string fId = existing[0]["folder_id"].isNull() ? "" : existing[0]["folder_id"].as<std::string>();
  co_await logAudit(db, tenantId, docId, fId, "document.deleted", who.userId, uName, auditDetails);

  dto::BaseApiResponse r;
  r.success = true;
  r.message = "Document moved to recycle bin.";
  co_return r;
}

drogon::Task<dto::BaseApiResponse> checkoutDocument(DbClientPtr db, const std::string &tenantId,
                                                   const std::string &docId, const utils::AuditIdentity &who) {
  if (!uuid(docId))
    co_return fail("validation_error", "A valid document ID is required.");

  auto existing = co_await db->execSqlCoro(
      "SELECT id, is_checked_out, checked_out_by_user_id, is_locked, title, document_number "
      "FROM dm_documents WHERE id=$1 AND tenant_id=$2 AND is_deleted=false FOR UPDATE",
      docId, tenantId);
  if (existing.empty())
    co_return fail("not_found", "Document not found.");

  if (existing[0]["is_locked"].as<bool>())
    co_return fail("conflict", "Document is locked and cannot be checked out.");

  if (existing[0]["is_checked_out"].as<bool>()) {
    std::string uid = existing[0]["checked_out_by_user_id"].as<std::string>();
    if (uid == who.userId)
      co_return fail("conflict", "Document is already checked out by you.");
    co_return fail("conflict", "Document is currently checked out by another user.");
  }

  co_await db->execSqlCoro(
      "UPDATE dm_documents SET is_checked_out=true, checked_out_by_user_id=$1, checked_out_at=now(), "
      "last_modified_at=now(), last_modified_by_user_id=$1, version=version+1 WHERE id=$2 AND tenant_id=$3",
      who.userId, docId, tenantId);

  std::string uName = co_await getUserName(db, who.userId);
  Json::Value auditDetails(Json::objectValue);
  auditDetails["action"] = "check_out";
  co_await logAudit(db, tenantId, docId, "", "document.checked_out", who.userId, uName, auditDetails);

  dto::BaseApiResponse r;
  r.success = true;
  r.message = "Document successfully checked out.";
  co_return r;
}

drogon::Task<dto::BaseApiResponse> checkinDocument(DbClientPtr db, const std::string &tenantId,
                                                  const std::string &docId, const Json::Value &body,
                                                  const utils::AuditIdentity &who) {
  if (!uuid(docId))
    co_return fail("validation_error", "A valid document ID is required.");

  auto existing = co_await db->execSqlCoro(
      "SELECT id, is_checked_out, checked_out_by_user_id, version_label, file_name, mime_type, title, document_number "
      "FROM dm_documents WHERE id=$1 AND tenant_id=$2 AND is_deleted=false FOR UPDATE",
      docId, tenantId);
  if (existing.empty())
    co_return fail("not_found", "Document not found.");

  if (!existing[0]["is_checked_out"].as<bool>())
    co_return fail("conflict", "Document is not checked out. Check out the document before checking in a new revision.");

  std::string chkUid = existing[0]["checked_out_by_user_id"].as<std::string>();
  if (chkUid != who.userId)
    co_return fail("forbidden", "Only the user who checked out the document can check in a new version.");

  const bool isMajor = body.isMember("isMajor") && body["isMajor"].asBool();
  const std::string currentLabel = existing[0]["version_label"].as<std::string>();
  const std::string newLabel = nextVersionLabel(currentLabel, isMajor);

  std::string fileName = body.isMember("fileName") && !body["fileName"].empty() ? body["fileName"].asString() : existing[0]["file_name"].as<std::string>();
  const int64_t fileSize = body.isMember("fileSize") && body["fileSize"].isInt64() ? body["fileSize"].asInt64() : 0;
  const std::string fileHash = body.isMember("fileHash") ? body["fileHash"].asString() : "";
  const std::string mimeType = body.isMember("mimeType") && !body["mimeType"].empty() ? body["mimeType"].asString() : existing[0]["mime_type"].as<std::string>();
  const std::string comment = body.isMember("comment") ? body["comment"].asString() : "Checked in revision " + newLabel;
  const std::string contentText = body.isMember("contentText") ? body["contentText"].asString() : "";
  const std::string storagePath = body.isMember("storagePath") ? body["storagePath"].asString() : "";

  // Insert into dm_document_versions
  co_await db->execSqlCoro(
      "INSERT INTO dm_document_versions "
      "(tenant_id, document_id, version_label, file_name, file_size, file_hash, mime_type, comment, content_text, storage_path, created_by_user_id) "
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      tenantId, docId, newLabel, fileName, fileSize, fileHash, mimeType, comment, contentText, storagePath, who.userId);

  // Update dm_documents: release checkout and set new version
  co_await db->execSqlCoro(
      "UPDATE dm_documents SET "
      "version_label=$1, file_name=$2, file_size=$3, file_hash=$4, mime_type=$5, "
      "content_text=$6, storage_path=$7, is_checked_out=false, checked_out_by_user_id=NULL, checked_out_at=NULL, "
      "version=version+1, last_modified_at=now(), last_modified_by_user_id=$8 "
      "WHERE id=$9 AND tenant_id=$10",
      newLabel, fileName, fileSize, fileHash, mimeType, contentText, storagePath, who.userId, docId, tenantId);

  std::string uName = co_await getUserName(db, who.userId);
  Json::Value auditDetails(Json::objectValue);
  auditDetails["oldVersion"] = currentLabel;
  auditDetails["newVersion"] = newLabel;
  auditDetails["comment"] = comment;
  co_await logAudit(db, tenantId, docId, "", "document.checked_in", who.userId, uName, auditDetails);

  dto::BaseApiResponse r;
  r.success = true;
  r.result["id"] = docId;
  r.result["versionLabel"] = newLabel;
  r.message = "Document checked in successfully as version " + newLabel;
  co_return r;
}

drogon::Task<dto::BaseApiResponse> lockDocument(DbClientPtr db, const std::string &tenantId,
                                               const std::string &docId, const utils::AuditIdentity &who) {
  if (!uuid(docId))
    co_return fail("validation_error", "A valid document ID is required.");

  co_await db->execSqlCoro(
      "UPDATE dm_documents SET is_locked=true, locked_by_user_id=$1, locked_at=now(), "
      "version=version+1, last_modified_at=now(), last_modified_by_user_id=$1 "
      "WHERE id=$2 AND tenant_id=$3 AND is_deleted=false",
      who.userId, docId, tenantId);

  std::string uName = co_await getUserName(db, who.userId);
  co_await logAudit(db, tenantId, docId, "", "document.locked", who.userId, uName, Json::Value(Json::objectValue));

  dto::BaseApiResponse r;
  r.success = true;
  r.message = "Document locked.";
  co_return r;
}

drogon::Task<dto::BaseApiResponse> unlockDocument(DbClientPtr db, const std::string &tenantId,
                                                 const std::string &docId, const utils::AuditIdentity &who) {
  if (!uuid(docId))
    co_return fail("validation_error", "A valid document ID is required.");

  co_await db->execSqlCoro(
      "UPDATE dm_documents SET is_locked=false, locked_by_user_id=NULL, locked_at=NULL, "
      "version=version+1, last_modified_at=now(), last_modified_by_user_id=$1 "
      "WHERE id=$2 AND tenant_id=$3 AND is_deleted=false",
      who.userId, docId, tenantId);

  std::string uName = co_await getUserName(db, who.userId);
  co_await logAudit(db, tenantId, docId, "", "document.unlocked", who.userId, uName, Json::Value(Json::objectValue));

  dto::BaseApiResponse r;
  r.success = true;
  r.message = "Document unlocked.";
  co_return r;
}

drogon::Task<dto::BaseApiResponse> bookmarkDocument(DbClientPtr db, const std::string &tenantId,
                                                   const std::string &docId, const utils::AuditIdentity &who) {
  if (!uuid(docId))
    co_return fail("validation_error", "A valid document ID is required.");

  auto existing = co_await db->execSqlCoro(
      "SELECT id FROM dm_bookmarks WHERE document_id=$1 AND user_id=$2 AND tenant_id=$3 AND is_deleted=false",
      docId, who.userId, tenantId);

  bool isBookmarked = false;
  if (!existing.empty()) {
    co_await db->execSqlCoro("DELETE FROM dm_bookmarks WHERE id=$1", existing[0]["id"].as<std::string>());
    isBookmarked = false;
  } else {
    co_await db->execSqlCoro(
        "INSERT INTO dm_bookmarks (tenant_id, user_id, document_id, created_by_user_id) "
        "VALUES ($1, $2, $3, $2)",
        tenantId, who.userId, docId);
    isBookmarked = true;
  }

  dto::BaseApiResponse r;
  r.success = true;
  r.result["isBookmarked"] = isBookmarked;
  r.message = isBookmarked ? "Bookmark added." : "Bookmark removed.";
  co_return r;
}

drogon::Task<dto::BaseApiResponse> listVersions(DbClientPtr db, const std::string &tenantId,
                                               const std::string &docId) {
  if (!uuid(docId))
    co_return fail("validation_error", "A valid document ID is required.");

  auto rows = co_await db->execSqlCoro(
      "SELECT v.id, v.version_label, v.file_name, v.file_size, v.file_hash, v.mime_type, "
      "v.comment, v.created_at, v.created_by_user_id, u.user_name "
      "FROM dm_document_versions v "
      "LEFT JOIN users u ON u.id=v.created_by_user_id "
      "WHERE v.tenant_id=$1 AND v.document_id=$2 AND v.is_deleted=false "
      "ORDER BY v.created_at DESC",
      tenantId, docId);

  Json::Value items(Json::arrayValue);
  for (const auto &row : rows) {
    Json::Value item(Json::objectValue);
    item["id"] = row["id"].as<std::string>();
    item["versionLabel"] = row["version_label"].as<std::string>();
    item["fileName"] = row["file_name"].as<std::string>();
    item["fileSize"] = Json::Int64(row["file_size"].as<int64_t>());
    item["fileHash"] = row["file_hash"].as<std::string>();
    item["mimeType"] = row["mime_type"].as<std::string>();
    item["comment"] = row["comment"].as<std::string>();
    item["userName"] = row["user_name"].isNull() ? Json::Value("System") : Json::Value(row["user_name"].as<std::string>());
    item["createdAt"] = row["created_at"].as<std::string>();
    items.append(std::move(item));
  }

  dto::BaseApiResponse r;
  r.success = true;
  r.result["data"] = items;
  r.result["totalCount"] = static_cast<int>(items.size());
  co_return r;
}

drogon::Task<dto::BaseApiResponse> revertVersion(DbClientPtr db, const std::string &tenantId,
                                                const std::string &docId, const std::string &versionId,
                                                const utils::AuditIdentity &who) {
  if (!uuid(docId) || !uuid(versionId))
    co_return fail("validation_error", "Valid document and version IDs are required.");

  auto targetVer = co_await db->execSqlCoro(
      "SELECT version_label, file_name, file_size, file_hash, mime_type, content_text, storage_path "
      "FROM dm_document_versions WHERE id=$1 AND document_id=$2 AND tenant_id=$3 AND is_deleted=false",
      versionId, docId, tenantId);
  if (targetVer.empty())
    co_return fail("not_found", "Target version not found.");

  auto docRows = co_await db->execSqlCoro(
      "SELECT version_label FROM dm_documents WHERE id=$1 AND tenant_id=$2 AND is_deleted=false FOR UPDATE",
      docId, tenantId);
  if (docRows.empty())
    co_return fail("not_found", "Document not found.");

  const std::string currentLabel = docRows[0]["version_label"].as<std::string>();
  const std::string newLabel = nextVersionLabel(currentLabel, false);
  const std::string restoredLabel = targetVer[0]["version_label"].as<std::string>();
  const std::string comment = "Reverted to version " + restoredLabel;

  // Insert new version reflecting the revert
  co_await db->execSqlCoro(
      "INSERT INTO dm_document_versions "
      "(tenant_id, document_id, version_label, file_name, file_size, file_hash, mime_type, comment, content_text, storage_path, created_by_user_id) "
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      tenantId, docId, newLabel, targetVer[0]["file_name"].as<std::string>(),
      targetVer[0]["file_size"].as<int64_t>(), targetVer[0]["file_hash"].as<std::string>(),
      targetVer[0]["mime_type"].as<std::string>(), comment,
      targetVer[0]["content_text"].as<std::string>(), targetVer[0]["storage_path"].as<std::string>(), who.userId);

  // Update document
  co_await db->execSqlCoro(
      "UPDATE dm_documents SET "
      "version_label=$1, file_name=$2, file_size=$3, file_hash=$4, mime_type=$5, "
      "content_text=$6, storage_path=$7, is_checked_out=false, checked_out_by_user_id=NULL, "
      "version=version+1, last_modified_at=now(), last_modified_by_user_id=$8 "
      "WHERE id=$9 AND tenant_id=$10",
      newLabel, targetVer[0]["file_name"].as<std::string>(), targetVer[0]["file_size"].as<int64_t>(),
      targetVer[0]["file_hash"].as<std::string>(), targetVer[0]["mime_type"].as<std::string>(),
      targetVer[0]["content_text"].as<std::string>(), targetVer[0]["storage_path"].as<std::string>(),
      who.userId, docId, tenantId);

  std::string uName = co_await getUserName(db, who.userId);
  Json::Value auditDetails(Json::objectValue);
  auditDetails["revertedTo"] = restoredLabel;
  auditDetails["newVersion"] = newLabel;
  co_await logAudit(db, tenantId, docId, "", "document.reverted", who.userId, uName, auditDetails);

  dto::BaseApiResponse r;
  r.success = true;
  r.result["id"] = docId;
  r.result["versionLabel"] = newLabel;
  r.message = "Successfully reverted to version " + restoredLabel + " (new revision " + newLabel + ")";
  co_return r;
}

// ---------------------------------------------------------------------------
// Saved Searches
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse> listSavedSearches(DbClientPtr db, const std::string &tenantId,
                                                    const utils::AuditIdentity &who) {
  dto::BaseApiResponse r;
  r.success = true;

  auto rows = co_await db->execSqlCoro(
      "SELECT id, name, description, criteria, created_at "
      "FROM dm_saved_searches WHERE tenant_id=$1 AND user_id=$2 AND is_deleted=false "
      "ORDER BY lower(name) ASC",
      tenantId, who.userId);

  Json::Value items(Json::arrayValue);
  for (const auto &row : rows) {
    Json::Value item(Json::objectValue);
    item["id"] = row["id"].as<std::string>();
    item["name"] = row["name"].as<std::string>();
    item["description"] = row["description"].as<std::string>();
    item["criteria"] = parse(row["criteria"].as<std::string>());
    item["createdAt"] = row["created_at"].as<std::string>();
    items.append(std::move(item));
  }

  r.result["data"] = items;
  r.result["totalCount"] = static_cast<int>(items.size());
  co_return r;
}

drogon::Task<dto::BaseApiResponse> createSavedSearch(DbClientPtr db, const std::string &tenantId,
                                                    const Json::Value &body, const utils::AuditIdentity &who) {
  const std::string name = trim(body["name"].asString());
  if (name.empty() || name.size() > 120)
    co_return fail("validation_error", "Search name is required (max 120 characters).");

  const std::string desc = body["description"].asString();
  std::string critStr = "{}";
  if (body.isMember("criteria") && body["criteria"].isObject())
    critStr = json(body["criteria"]);

  auto rows = co_await db->execSqlCoro(
      "INSERT INTO dm_saved_searches (tenant_id, user_id, name, description, criteria, created_by_user_id) "
      "VALUES ($1, $2, $3, $4, $5::jsonb, $2) "
      "RETURNING id, created_at",
      tenantId, who.userId, name, desc, critStr);

  dto::BaseApiResponse r;
  r.success = true;
  r.result["id"] = rows[0]["id"].as<std::string>();
  r.result["name"] = name;
  r.result["createdAt"] = rows[0]["created_at"].as<std::string>();
  co_return r;
}

drogon::Task<dto::BaseApiResponse> deleteSavedSearch(DbClientPtr db, const std::string &tenantId,
                                                    const std::string &searchId, const utils::AuditIdentity &who) {
  if (!uuid(searchId))
    co_return fail("validation_error", "A valid search ID is required.");

  co_await db->execSqlCoro(
      "UPDATE dm_saved_searches SET is_deleted=true WHERE id=$1 AND tenant_id=$2 AND user_id=$3",
      searchId, tenantId, who.userId);

  dto::BaseApiResponse r;
  r.success = true;
  r.message = "Saved search deleted.";
  co_return r;
}

} // namespace business_desk::domain_services::dm_documents
