#include "domain_services/dm/DmInternal.h"

namespace business_desk::domain_services::dm_workflows {

using namespace business_desk::domain_services::dm_internal;

// ---------------------------------------------------------------------------
// Workflows & Approvals
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse> submitWorkflow(DbClientPtr db, const std::string &tenantId,
                                                 const std::string &docId, const Json::Value &body,
                                                 const utils::AuditIdentity &who) {
  if (!uuid(docId))
    co_return fail("validation_error", "A valid document ID is required.");

  auto existing = co_await db->execSqlCoro(
      "SELECT id, status, is_locked, title, document_number FROM dm_documents "
      "WHERE id=$1 AND tenant_id=$2 AND is_deleted=false FOR UPDATE",
      docId, tenantId);
  if (existing.empty())
    co_return fail("not_found", "Document not found.");

  if (existing[0]["is_locked"].as<bool>())
    co_return fail("conflict", "Locked documents cannot be submitted for approval.");

  std::string currStatus = existing[0]["status"].as<std::string>();
  if (currStatus == "under_review")
    co_return fail("conflict", "Document is already under review.");

  std::string stepName = body.isMember("stepName") && !body["stepName"].empty() ? body["stepName"].asString() : "Document Review & Approval";
  std::string assigneeId = body.isMember("assignedToUserId") ? body["assignedToUserId"].asString() : "";
  if (!assigneeId.empty() && !uuid(assigneeId))
    assigneeId = "";

  // Update document status to under_review
  co_await db->execSqlCoro(
      "UPDATE dm_documents SET status='under_review', version=version+1, last_modified_at=now(), last_modified_by_user_id=$1 "
      "WHERE id=$2 AND tenant_id=$3",
      who.userId, docId, tenantId);

  // Insert workflow step
  auto wfRows = co_await db->execSqlCoro(
      "INSERT INTO dm_workflows "
      "(tenant_id, document_id, step_name, status, assigned_to_user_id, created_by_user_id) "
      "VALUES ($1, $2, $3, 'pending', NULLIF($4, '')::uuid, $5) "
      "RETURNING id, created_at",
      tenantId, docId, stepName, assigneeId, who.userId);

  std::string uName = co_await getUserName(db, who.userId);
  Json::Value auditDetails(Json::objectValue);
  auditDetails["stepName"] = stepName;
  auditDetails["assignedTo"] = assigneeId;
  co_await logAudit(db, tenantId, docId, "", "workflow.submitted", who.userId, uName, auditDetails);

  dto::BaseApiResponse r;
  r.success = true;
  r.result["workflowId"] = wfRows[0]["id"].as<std::string>();
  r.result["status"] = "under_review";
  r.message = "Document submitted for review.";
  co_return r;
}

drogon::Task<dto::BaseApiResponse> approveWorkflow(DbClientPtr db, const std::string &tenantId,
                                                  const std::string &docId, const Json::Value &body,
                                                  const utils::AuditIdentity &who) {
  if (!uuid(docId))
    co_return fail("validation_error", "A valid document ID is required.");

  auto existing = co_await db->execSqlCoro(
      "SELECT id, status, title, document_number FROM dm_documents "
      "WHERE id=$1 AND tenant_id=$2 AND is_deleted=false FOR UPDATE",
      docId, tenantId);
  if (existing.empty())
    co_return fail("not_found", "Document not found.");

  if (existing[0]["status"].as<std::string>() != "under_review")
    co_return fail("conflict", "Only documents under review can be approved.");

  const std::string comments = body.isMember("comments") ? body["comments"].asString() : "Approved";
  const bool publish = body.isMember("publish") && body["publish"].asBool();
  const std::string nextStatus = publish ? "published" : "approved";

  // Update pending workflow records
  co_await db->execSqlCoro(
      "UPDATE dm_workflows SET status='approved', decided_by_user_id=$1, decided_at=now(), comments=$2, "
      "last_modified_at=now(), last_modified_by_user_id=$1 WHERE document_id=$3 AND tenant_id=$4 AND status='pending'",
      who.userId, comments, docId, tenantId);

  // Update document status
  co_await db->execSqlCoro(
      "UPDATE dm_documents SET status=$1, version=version+1, last_modified_at=now(), last_modified_by_user_id=$2 "
      "WHERE id=$3 AND tenant_id=$4",
      nextStatus, who.userId, docId, tenantId);

  std::string uName = co_await getUserName(db, who.userId);
  Json::Value auditDetails(Json::objectValue);
  auditDetails["status"] = nextStatus;
  auditDetails["comments"] = comments;
  co_await logAudit(db, tenantId, docId, "", "workflow.approved", who.userId, uName, auditDetails);

  dto::BaseApiResponse r;
  r.success = true;
  r.result["status"] = nextStatus;
  r.message = "Document successfully approved (" + nextStatus + ").";
  co_return r;
}

drogon::Task<dto::BaseApiResponse> rejectWorkflow(DbClientPtr db, const std::string &tenantId,
                                                 const std::string &docId, const Json::Value &body,
                                                 const utils::AuditIdentity &who) {
  if (!uuid(docId))
    co_return fail("validation_error", "A valid document ID is required.");

  auto existing = co_await db->execSqlCoro(
      "SELECT id, status, title, document_number FROM dm_documents "
      "WHERE id=$1 AND tenant_id=$2 AND is_deleted=false FOR UPDATE",
      docId, tenantId);
  if (existing.empty())
    co_return fail("not_found", "Document not found.");

  if (existing[0]["status"].as<std::string>() != "under_review")
    co_return fail("conflict", "Only documents under review can be rejected.");

  const std::string comments = trim(body["comments"].asString());
  if (comments.empty())
    co_return fail("validation_error", "A rejection reason/comment is required.");

  co_await db->execSqlCoro(
      "UPDATE dm_workflows SET status='rejected', decided_by_user_id=$1, decided_at=now(), comments=$2, "
      "last_modified_at=now(), last_modified_by_user_id=$1 WHERE document_id=$3 AND tenant_id=$4 AND status='pending'",
      who.userId, comments, docId, tenantId);

  co_await db->execSqlCoro(
      "UPDATE dm_documents SET status='rejected', version=version+1, last_modified_at=now(), last_modified_by_user_id=$1 "
      "WHERE id=$2 AND tenant_id=$3",
      who.userId, docId, tenantId);

  std::string uName = co_await getUserName(db, who.userId);
  Json::Value auditDetails(Json::objectValue);
  auditDetails["status"] = "rejected";
  auditDetails["comments"] = comments;
  co_await logAudit(db, tenantId, docId, "", "workflow.rejected", who.userId, uName, auditDetails);

  dto::BaseApiResponse r;
  r.success = true;
  r.result["status"] = "rejected";
  r.message = "Document rejected.";
  co_return r;
}

drogon::Task<dto::BaseApiResponse> cancelWorkflow(DbClientPtr db, const std::string &tenantId,
                                                 const std::string &docId, const utils::AuditIdentity &who) {
  if (!uuid(docId))
    co_return fail("validation_error", "A valid document ID is required.");

  co_await db->execSqlCoro(
      "UPDATE dm_workflows SET status='cancelled', decided_by_user_id=$1, decided_at=now(), "
      "last_modified_at=now(), last_modified_by_user_id=$1 WHERE document_id=$2 AND tenant_id=$3 AND status='pending'",
      who.userId, docId, tenantId);

  co_await db->execSqlCoro(
      "UPDATE dm_documents SET status='draft', version=version+1, last_modified_at=now(), last_modified_by_user_id=$1 "
      "WHERE id=$2 AND tenant_id=$3 AND status='under_review'",
      who.userId, docId, tenantId);

  dto::BaseApiResponse r;
  r.success = true;
  r.message = "Review workflow cancelled. Document returned to draft.";
  co_return r;
}

drogon::Task<dto::BaseApiResponse> listWorkflows(DbClientPtr db, const std::string &tenantId,
                                                const std::string &docId, const Json::Value &query,
                                                int page, int size, const utils::AuditIdentity &who) {
  dto::BaseApiResponse r;
  r.success = true;

  const int64_t limit = size > 0 && size <= 100 ? size : 20;
  const int64_t offset = page > 1 ? (page - 1) * limit : 0;

  std::string statusFilter = query.isMember("status") ? query["status"].asString() : "";
  const bool myTasks = query.isMember("myTasks") && query["myTasks"].asBool();

  std::string where = "WHERE w.tenant_id=$1 AND w.is_deleted=false";
  std::vector<std::string> params{tenantId};

  if (!docId.empty() && uuid(docId)) {
    params.push_back(docId);
    where += " AND w.document_id=$" + std::to_string(params.size());
  }
  if (!statusFilter.empty()) {
    params.push_back(statusFilter);
    where += " AND w.status=$" + std::to_string(params.size());
  }
  if (myTasks) {
    params.push_back(who.userId);
    where += " AND w.assigned_to_user_id=$" + std::to_string(params.size());
  }

  std::string sql =
      "SELECT w.id, w.document_id, w.step_name, w.status, w.assigned_to_user_id, "
      "w.decided_by_user_id, w.decided_at, w.comments, w.created_at, w.created_by_user_id, "
      "d.document_number, d.title AS document_title, d.version_label, "
      "u1.user_name AS assignee_name, u2.user_name AS decider_name, u3.user_name AS creator_name "
      "FROM dm_workflows w "
      "JOIN dm_documents d ON d.id=w.document_id AND d.is_deleted=false "
      "LEFT JOIN users u1 ON u1.id=w.assigned_to_user_id "
      "LEFT JOIN users u2 ON u2.id=w.decided_by_user_id "
      "LEFT JOIN users u3 ON u3.id=w.created_by_user_id "
      + where + " ORDER BY w.created_at DESC LIMIT " + std::to_string(limit) + "::bigint OFFSET " + std::to_string(offset) + "::bigint";

  drogon::orm::Result rows;
  if (params.size() == 1) rows = co_await db->execSqlCoro(sql, params[0]);
  else if (params.size() == 2) rows = co_await db->execSqlCoro(sql, params[0], params[1]);
  else if (params.size() == 3) rows = co_await db->execSqlCoro(sql, params[0], params[1], params[2]);
  else rows = co_await db->execSqlCoro(sql, params[0], params[1], params[2], params[3]);

  Json::Value items(Json::arrayValue);
  for (const auto &row : rows) {
    Json::Value item(Json::objectValue);
    item["id"] = row["id"].as<std::string>();
    item["documentId"] = row["document_id"].as<std::string>();
    item["documentNumber"] = row["document_number"].as<std::string>();
    item["documentTitle"] = row["document_title"].as<std::string>();
    item["versionLabel"] = row["version_label"].as<std::string>();
    item["stepName"] = row["step_name"].as<std::string>();
    item["status"] = row["status"].as<std::string>();
    item["assignedToUserId"] = row["assigned_to_user_id"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["assigned_to_user_id"].as<std::string>());
    item["assigneeName"] = row["assignee_name"].isNull() ? Json::Value("") : Json::Value(row["assignee_name"].as<std::string>());
    item["decidedByUserId"] = row["decided_by_user_id"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["decided_by_user_id"].as<std::string>());
    item["deciderName"] = row["decider_name"].isNull() ? Json::Value("") : Json::Value(row["decider_name"].as<std::string>());
    item["decidedAt"] = row["decided_at"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["decided_at"].as<std::string>());
    item["comments"] = row["comments"].as<std::string>();
    item["creatorName"] = row["creator_name"].isNull() ? Json::Value("") : Json::Value(row["creator_name"].as<std::string>());
    item["createdAt"] = row["created_at"].as<std::string>();
    items.append(std::move(item));
  }

  r.result["data"] = items;
  r.result["totalCount"] = static_cast<int>(items.size());
  co_return r;
}

// ---------------------------------------------------------------------------
// Document Notes (Comments / Discussions)
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse> listNotes(DbClientPtr db, const std::string &tenantId,
                                            const std::string &docId) {
  if (!uuid(docId))
    co_return fail("validation_error", "A valid document ID is required.");

  auto rows = co_await db->execSqlCoro(
      "SELECT n.id, n.note_text, n.created_at, n.user_id, u.user_name, u.name, u.surname "
      "FROM dm_document_notes n "
      "LEFT JOIN users u ON u.id=n.user_id "
      "WHERE n.tenant_id=$1 AND n.document_id=$2 AND n.is_deleted=false "
      "ORDER BY n.created_at ASC",
      tenantId, docId);

  Json::Value items(Json::arrayValue);
  for (const auto &row : rows) {
    Json::Value item(Json::objectValue);
    item["id"] = row["id"].as<std::string>();
    item["noteText"] = row["note_text"].as<std::string>();
    item["userId"] = row["user_id"].as<std::string>();
    std::string fullName = row["name"].isNull() ? "" : row["name"].as<std::string>();
    std::string surname = row["surname"].isNull() ? "" : row["surname"].as<std::string>();
    std::string uName = row["user_name"].isNull() ? "User" : row["user_name"].as<std::string>();
    if (!fullName.empty() || !surname.empty())
      item["userName"] = trim(fullName + " " + surname);
    else
      item["userName"] = uName;
    item["createdAt"] = row["created_at"].as<std::string>();
    items.append(std::move(item));
  }

  dto::BaseApiResponse r;
  r.success = true;
  r.result["data"] = items;
  r.result["totalCount"] = static_cast<int>(items.size());
  co_return r;
}

drogon::Task<dto::BaseApiResponse> addNote(DbClientPtr db, const std::string &tenantId,
                                          const std::string &docId, const Json::Value &body,
                                          const utils::AuditIdentity &who) {
  if (!uuid(docId))
    co_return fail("validation_error", "A valid document ID is required.");

  const std::string text = trim(body["noteText"].asString());
  if (text.empty())
    co_return fail("validation_error", "Note text cannot be empty.");

  auto rows = co_await db->execSqlCoro(
      "INSERT INTO dm_document_notes (tenant_id, document_id, user_id, note_text, created_by_user_id) "
      "VALUES ($1, $2, $3, $4, $3) RETURNING id, created_at",
      tenantId, docId, who.userId, text);

  std::string uName = co_await getUserName(db, who.userId);
  Json::Value auditDetails(Json::objectValue);
  auditDetails["noteSnippet"] = text.substr(0, 100);
  co_await logAudit(db, tenantId, docId, "", "document.note_added", who.userId, uName, auditDetails);

  dto::BaseApiResponse r;
  r.success = true;
  r.result["id"] = rows[0]["id"].as<std::string>();
  r.result["noteText"] = text;
  r.result["userName"] = uName;
  r.result["createdAt"] = rows[0]["created_at"].as<std::string>();
  co_return r;
}

// ---------------------------------------------------------------------------
// Document Relations (Cross-document links)
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse> listRelations(DbClientPtr db, const std::string &tenantId,
                                                const std::string &docId) {
  if (!uuid(docId))
    co_return fail("validation_error", "A valid document ID is required.");

  auto rows = co_await db->execSqlCoro(
      "SELECT r.id, r.source_document_id, r.target_document_id, r.relation_type, r.notes, r.created_at, "
      "d.document_number, d.title, d.status, d.version_label "
      "FROM dm_document_relations r "
      "JOIN dm_documents d ON (d.id = CASE WHEN r.source_document_id=$1 THEN r.target_document_id ELSE r.source_document_id END) AND d.is_deleted=false "
      "WHERE r.tenant_id=$2 AND (r.source_document_id=$1 OR r.target_document_id=$1) AND r.is_deleted=false "
      "ORDER BY r.created_at DESC",
      docId, tenantId);

  Json::Value items(Json::arrayValue);
  for (const auto &row : rows) {
    Json::Value item(Json::objectValue);
    item["id"] = row["id"].as<std::string>();
    std::string srcId = row["source_document_id"].as<std::string>();
    std::string tgtId = row["target_document_id"].as<std::string>();
    item["isOutbound"] = srcId == docId;
    item["relatedDocumentId"] = srcId == docId ? tgtId : srcId;
    item["relatedDocumentNumber"] = row["document_number"].as<std::string>();
    item["relatedDocumentTitle"] = row["title"].as<std::string>();
    item["relatedDocumentStatus"] = row["status"].as<std::string>();
    item["relatedDocumentVersion"] = row["version_label"].as<std::string>();
    item["relationType"] = row["relation_type"].as<std::string>();
    item["notes"] = row["notes"].as<std::string>();
    item["createdAt"] = row["created_at"].as<std::string>();
    items.append(std::move(item));
  }

  dto::BaseApiResponse r;
  r.success = true;
  r.result["data"] = items;
  r.result["totalCount"] = static_cast<int>(items.size());
  co_return r;
}

drogon::Task<dto::BaseApiResponse> addRelation(DbClientPtr db, const std::string &tenantId,
                                              const std::string &docId, const Json::Value &body,
                                              const utils::AuditIdentity &who) {
  if (!uuid(docId))
    co_return fail("validation_error", "A valid source document ID is required.");

  const std::string targetId = body["targetDocumentId"].asString();
  if (!uuid(targetId))
    co_return fail("validation_error", "A valid target document ID is required.");

  if (docId == targetId)
    co_return fail("validation_error", "A document cannot be linked to itself.");

  std::string relType = body["relationType"].asString();
  if (relType.empty())
    relType = "relates_to";
  if (relType != "relates_to" && relType != "supersedes" && relType != "supports" && relType != "amends")
    co_return fail("validation_error", "Invalid relation type (allowed: relates_to, supersedes, supports, amends).");

  const std::string notes = body["notes"].asString();

  auto dup = co_await db->execSqlCoro(
      "SELECT id FROM dm_document_relations WHERE tenant_id=$1 AND source_document_id=$2 AND target_document_id=$3 AND relation_type=$4 AND is_deleted=false",
      tenantId, docId, targetId, relType);
  if (!dup.empty())
    co_return fail("conflict", "This document relation already exists.");

  auto rows = co_await db->execSqlCoro(
      "INSERT INTO dm_document_relations "
      "(tenant_id, source_document_id, target_document_id, relation_type, notes, created_by_user_id) "
      "VALUES ($1, $2, $3, $4, $5, $6) "
      "RETURNING id, created_at",
      tenantId, docId, targetId, relType, notes, who.userId);

  std::string uName = co_await getUserName(db, who.userId);
  Json::Value auditDetails(Json::objectValue);
  auditDetails["targetDocumentId"] = targetId;
  auditDetails["relationType"] = relType;
  co_await logAudit(db, tenantId, docId, "", "document.relation_added", who.userId, uName, auditDetails);

  dto::BaseApiResponse r;
  r.success = true;
  r.result["id"] = rows[0]["id"].as<std::string>();
  r.result["relationType"] = relType;
  r.result["createdAt"] = rows[0]["created_at"].as<std::string>();
  co_return r;
}

drogon::Task<dto::BaseApiResponse> removeRelation(DbClientPtr db, const std::string &tenantId,
                                                 const std::string &docId, const std::string &relationId) {
  if (!uuid(docId) || !uuid(relationId))
    co_return fail("validation_error", "Valid document and relation IDs are required.");

  co_await db->execSqlCoro(
      "UPDATE dm_document_relations SET is_deleted=true WHERE id=$1 AND tenant_id=$2 AND (source_document_id=$3 OR target_document_id=$3)",
      relationId, tenantId, docId);

  dto::BaseApiResponse r;
  r.success = true;
  r.message = "Document relation removed.";
  co_return r;
}

// ---------------------------------------------------------------------------
// Recycle Bin (Trash)
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse> listTrash(DbClientPtr db, const std::string &tenantId,
                                            const std::string &unitId) {
  dto::BaseApiResponse r;
  r.success = true;

  // Deleted documents
  auto docRows = co_await db->execSqlCoro(
      "SELECT d.id, d.document_number, d.title, d.file_name, d.version_label, d.file_size, "
      "d.deleted_at, u.user_name AS deleted_by "
      "FROM dm_documents d "
      "LEFT JOIN users u ON u.id=d.deleted_by_user_id "
      "WHERE d.tenant_id=$1 AND d.is_deleted=true AND (d.accounting_unit_id=$2 OR d.accounting_unit_id IS NULL) "
      "ORDER BY d.deleted_at DESC LIMIT 100::bigint",
      tenantId, unitId);

  Json::Value docs(Json::arrayValue);
  for (const auto &row : docRows) {
    Json::Value item(Json::objectValue);
    item["id"] = row["id"].as<std::string>();
    item["type"] = "document";
    item["documentNumber"] = row["document_number"].as<std::string>();
    item["title"] = row["title"].as<std::string>();
    item["fileName"] = row["file_name"].as<std::string>();
    item["versionLabel"] = row["version_label"].as<std::string>();
    item["fileSize"] = Json::Int64(row["file_size"].as<int64_t>());
    item["deletedAt"] = row["deleted_at"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["deleted_at"].as<std::string>());
    item["deletedBy"] = row["deleted_by"].isNull() ? Json::Value("System") : Json::Value(row["deleted_by"].as<std::string>());
    docs.append(std::move(item));
  }

  // Deleted folders
  auto folderRows = co_await db->execSqlCoro(
      "SELECT f.id, f.name, f.path, f.deleted_at, u.user_name AS deleted_by "
      "FROM dm_folders f "
      "LEFT JOIN users u ON u.id=f.deleted_by_user_id "
      "WHERE f.tenant_id=$1 AND f.is_deleted=true AND (f.accounting_unit_id=$2 OR f.accounting_unit_id IS NULL) "
      "ORDER BY f.deleted_at DESC LIMIT 100::bigint",
      tenantId, unitId);

  Json::Value folders(Json::arrayValue);
  for (const auto &row : folderRows) {
    Json::Value item(Json::objectValue);
    item["id"] = row["id"].as<std::string>();
    item["type"] = "folder";
    item["title"] = row["name"].as<std::string>();
    item["path"] = row["path"].as<std::string>();
    item["deletedAt"] = row["deleted_at"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["deleted_at"].as<std::string>());
    item["deletedBy"] = row["deleted_by"].isNull() ? Json::Value("System") : Json::Value(row["deleted_by"].as<std::string>());
    folders.append(std::move(item));
  }

  r.result["documents"] = docs;
  r.result["folders"] = folders;
  r.result["totalCount"] = static_cast<int>(docs.size() + folders.size());
  co_return r;
}

drogon::Task<dto::BaseApiResponse> restoreTrash(DbClientPtr db, std::string tenantId,
                                               std::string itemId, std::string itemType,
                                               utils::AuditIdentity who) {
  if (!uuid(itemId))
    co_return fail("validation_error", "A valid item ID is required.");

  if (itemType == "folder") {
    co_await db->execSqlCoro(
        "UPDATE dm_folders SET is_deleted=false, deleted_at=NULL, deleted_by_user_id=NULL, "
        "last_modified_at=now(), last_modified_by_user_id=$1 WHERE id=$2 AND tenant_id=$3",
        who.userId, itemId, tenantId);
  } else {
    co_await db->execSqlCoro(
        "UPDATE dm_documents SET is_deleted=false, deleted_at=NULL, deleted_by_user_id=NULL, "
        "last_modified_at=now(), last_modified_by_user_id=$1 WHERE id=$2 AND tenant_id=$3",
        who.userId, itemId, tenantId);
  }

  std::string uName = co_await getUserName(db, who.userId);
  std::string docId = (itemType == "document" ? itemId : std::string(""));
  std::string fldId = (itemType == "folder" ? itemId : std::string(""));
  std::string evType = itemType + ".restored";
  Json::Value det(Json::objectValue);
  co_await logAudit(db, tenantId, docId, fldId, evType, who.userId, uName, det);

  dto::BaseApiResponse r;
  r.success = true;
  r.message = "Item successfully restored from recycle bin.";
  co_return r;
}

drogon::Task<dto::BaseApiResponse> purgeTrash(DbClientPtr db, std::string tenantId,
                                             std::string itemId,
                                             utils::AuditIdentity who) {
  if (!uuid(itemId))
    co_return fail("validation_error", "A valid item ID is required.");

  // Check if it's a document
  auto doc = co_await db->execSqlCoro("SELECT id FROM dm_documents WHERE id=$1 AND tenant_id=$2 AND is_deleted=true", itemId, tenantId);
  if (!doc.empty()) {
    co_await db->execSqlCoro("DELETE FROM dm_document_versions WHERE document_id=$1 AND tenant_id=$2", itemId, tenantId);
    co_await db->execSqlCoro("DELETE FROM dm_workflows WHERE document_id=$1 AND tenant_id=$2", itemId, tenantId);
    co_await db->execSqlCoro("DELETE FROM dm_document_relations WHERE (source_document_id=$1 OR target_document_id=$1) AND tenant_id=$2", itemId, tenantId);
    co_await db->execSqlCoro("DELETE FROM dm_document_notes WHERE document_id=$1 AND tenant_id=$2", itemId, tenantId);
    co_await db->execSqlCoro("DELETE FROM dm_bookmarks WHERE document_id=$1 AND tenant_id=$2", itemId, tenantId);
    co_await db->execSqlCoro("DELETE FROM dm_documents WHERE id=$1 AND tenant_id=$2", itemId, tenantId);
  } else {
    // Check if it's a folder
    co_await db->execSqlCoro("DELETE FROM dm_folders WHERE id=$1 AND tenant_id=$2 AND is_deleted=true", itemId, tenantId);
  }

  std::string uName = co_await getUserName(db, who.userId);
  co_await logAudit(db, tenantId, "", "", "trash.purged", who.userId, uName, Json::Value(Json::objectValue));

  dto::BaseApiResponse r;
  r.success = true;
  r.message = "Item permanently purged.";
  co_return r;
}

// ---------------------------------------------------------------------------
// Global Audit Trail
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse> listAudit(DbClientPtr db, const std::string &tenantId,
                                            const Json::Value &query, int page, int size) {
  dto::BaseApiResponse r;
  r.success = true;

  const int64_t limit = size > 0 && size <= 100 ? size : 20;
  const int64_t offset = page > 1 ? (page - 1) * limit : 0;

  const std::string docId = query.isMember("documentId") ? query["documentId"].asString() : "";
  const std::string folderId = query.isMember("folderId") ? query["folderId"].asString() : "";
  const std::string eventType = query.isMember("eventType") ? query["eventType"].asString() : "";

  std::string where = "WHERE a.tenant_id=$1";
  std::vector<std::string> params{tenantId};

  if (!docId.empty() && uuid(docId)) {
    params.push_back(docId);
    where += " AND a.document_id=$" + std::to_string(params.size());
  }
  if (!folderId.empty() && uuid(folderId)) {
    params.push_back(folderId);
    where += " AND a.folder_id=$" + std::to_string(params.size());
  }
  if (!eventType.empty()) {
    params.push_back(eventType);
    where += " AND a.event_type=$" + std::to_string(params.size());
  }

  std::string sql =
      "SELECT a.id, a.document_id, a.folder_id, a.event_type, a.user_id, a.user_name, "
      "a.details, a.created_at, d.document_number, d.title AS document_title "
      "FROM dm_audit_events a "
      "LEFT JOIN dm_documents d ON d.id=a.document_id "
      + where + " ORDER BY a.created_at DESC LIMIT " + std::to_string(limit) + "::bigint OFFSET " + std::to_string(offset) + "::bigint";

  drogon::orm::Result rows;
  if (params.size() == 1) rows = co_await db->execSqlCoro(sql, params[0]);
  else if (params.size() == 2) rows = co_await db->execSqlCoro(sql, params[0], params[1]);
  else if (params.size() == 3) rows = co_await db->execSqlCoro(sql, params[0], params[1], params[2]);
  else rows = co_await db->execSqlCoro(sql, params[0], params[1], params[2], params[3]);

  Json::Value items(Json::arrayValue);
  for (const auto &row : rows) {
    Json::Value item(Json::objectValue);
    item["id"] = row["id"].as<std::string>();
    item["documentId"] = row["document_id"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["document_id"].as<std::string>());
    item["folderId"] = row["folder_id"].isNull() ? Json::Value(Json::nullValue) : Json::Value(row["folder_id"].as<std::string>());
    item["documentNumber"] = row["document_number"].isNull() ? Json::Value("") : Json::Value(row["document_number"].as<std::string>());
    item["documentTitle"] = row["document_title"].isNull() ? Json::Value("") : Json::Value(row["document_title"].as<std::string>());
    item["eventType"] = row["event_type"].as<std::string>();
    item["userId"] = row["user_id"].as<std::string>();
    item["userName"] = row["user_name"].as<std::string>();
    item["details"] = parse(row["details"].as<std::string>());
    item["createdAt"] = row["created_at"].as<std::string>();
    items.append(std::move(item));
  }

  r.result["data"] = items;
  r.result["totalCount"] = static_cast<int>(items.size());
  co_return r;
}

// ---------------------------------------------------------------------------
// Dashboard Overview & Metrics
// ---------------------------------------------------------------------------
drogon::Task<dto::BaseApiResponse> getSummary(DbClientPtr db, const std::string &tenantId,
                                             const std::string &unitId) {
  dto::BaseApiResponse r;
  r.success = true;

  std::string unitFilter = "";
  if (!unitId.empty() && uuid(unitId))
    unitFilter = " AND accounting_unit_id='" + unitId + "'";

  // Counts & stats
  auto stats = co_await db->execSqlCoro(
      "SELECT "
      "COUNT(id)::int AS total_documents, "
      "COALESCE(SUM(file_size), 0)::bigint AS total_storage_bytes, "
      "COUNT(CASE WHEN status='under_review' THEN 1 END)::int AS pending_approvals, "
      "COUNT(CASE WHEN is_checked_out=true THEN 1 END)::int AS active_checkouts, "
      "COUNT(CASE WHEN is_expired=true THEN 1 END)::int AS expired_documents "
      "FROM dm_documents WHERE tenant_id=$1 AND is_deleted=false" + unitFilter,
      tenantId);

  auto folderStats = co_await db->execSqlCoro(
      "SELECT COUNT(id)::int AS total_folders FROM dm_folders WHERE tenant_id=$1 AND is_deleted=false" + unitFilter,
      tenantId);

  // Status breakdown
  auto statusRows = co_await db->execSqlCoro(
      "SELECT status, COUNT(id)::int AS count FROM dm_documents WHERE tenant_id=$1 AND is_deleted=false" + unitFilter +
      " GROUP BY status ORDER BY count DESC",
      tenantId);
  Json::Value statusObj(Json::objectValue);
  for (const auto &row : statusRows) {
    statusObj[row["status"].as<std::string>()] = row["count"].as<int>();
  }

  // Template breakdown
  auto tmplRows = co_await db->execSqlCoro(
      "SELECT COALESCE(t.name, 'General') AS template_name, COUNT(d.id)::int AS count "
      "FROM dm_documents d LEFT JOIN dm_templates t ON t.id=d.template_id "
      "WHERE d.tenant_id=$1 AND d.is_deleted=false" + unitFilter +
      " GROUP BY template_name ORDER BY count DESC LIMIT 8::bigint",
      tenantId);
  Json::Value tmplObj(Json::objectValue);
  for (const auto &row : tmplRows) {
    tmplObj[row["template_name"].as<std::string>()] = row["count"].as<int>();
  }

  // Recent activity (latest 10 audit events)
  auto actRows = co_await db->execSqlCoro(
      "SELECT a.id, a.event_type, a.user_name, a.created_at, d.document_number, d.title AS document_title "
      "FROM dm_audit_events a "
      "LEFT JOIN dm_documents d ON d.id=a.document_id "
      "WHERE a.tenant_id=$1 ORDER BY a.created_at DESC LIMIT 10::bigint",
      tenantId);
  Json::Value recents(Json::arrayValue);
  for (const auto &row : actRows) {
    Json::Value act(Json::objectValue);
    act["id"] = row["id"].as<std::string>();
    act["eventType"] = row["event_type"].as<std::string>();
    act["userName"] = row["user_name"].as<std::string>();
    act["documentNumber"] = row["document_number"].isNull() ? Json::Value("") : Json::Value(row["document_number"].as<std::string>());
    act["documentTitle"] = row["document_title"].isNull() ? Json::Value("") : Json::Value(row["document_title"].as<std::string>());
    act["createdAt"] = row["created_at"].as<std::string>();
    recents.append(std::move(act));
  }

  r.result["totalDocuments"] = stats.empty() ? 0 : stats[0]["total_documents"].as<int>();
  r.result["totalFolders"] = folderStats.empty() ? 0 : folderStats[0]["total_folders"].as<int>();
  r.result["totalStorageBytes"] = stats.empty() ? Json::Int64(0) : Json::Int64(stats[0]["total_storage_bytes"].as<int64_t>());
  r.result["pendingApprovals"] = stats.empty() ? 0 : stats[0]["pending_approvals"].as<int>();
  r.result["activeCheckouts"] = stats.empty() ? 0 : stats[0]["active_checkouts"].as<int>();
  r.result["expiredDocuments"] = stats.empty() ? 0 : stats[0]["expired_documents"].as<int>();
  r.result["statusBreakdown"] = statusObj;
  r.result["templateBreakdown"] = tmplObj;
  r.result["recentActivity"] = recents;

  co_return r;
}

} // namespace business_desk::domain_services::dm_workflows
