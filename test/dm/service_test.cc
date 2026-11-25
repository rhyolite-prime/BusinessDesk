#include "controllers/DmController.h"
#include "domain_services/dm/DmService.h"
#include "domain_services/permissions/PermissionService.h"
#include <cassert>
#include <cstdio>
#include <iostream>
#include <map>
#include <set>
#include <string>
#include <unordered_set>
#include <vector>

using business_desk::domain_services::DmService;
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
  const std::string folderId = "40000000-0000-4000-8000-000000000001";
  const std::string templateId = "50000000-0000-4000-8000-000000000001";
  const std::string policyId = "60000000-0000-4000-8000-000000000001";
  const std::string docId = "70000000-0000-4000-8000-000000000001";
  const std::string targetDocId = "70000000-0000-4000-8000-000000000002";
  const std::string versionId = "80000000-0000-4000-8000-000000000001";
  const std::string searchId = "90000000-0000-4000-8000-000000000001";
  const std::string relationId = "a0000000-0000-4000-8000-000000000001";

  AuditIdentity who{tenant, actor};
  bool schemaOk = true;
  bool isAdmin = true;
  bool isCheckedOut = false;
  bool isLocked = false;
  std::string docStatus = "draft";
  std::string checkedOutUserId = "";
  std::vector<std::string> sqlLog;

  auto db = drogon::app().getDbClient();
  db->execute = [&](const std::string &sql,
                    const std::vector<Json::Value> &args) -> drogon::TestResult {
    (void)args;
    sqlLog.push_back(sql);

    if (sql.find("UPDATE dm_documents SET status='under_review'") != std::string::npos) {
      docStatus = "under_review";
      return drogon::TestResult{};
    }
    if (sql.find("UPDATE dm_documents SET status='approved'") != std::string::npos ||
        sql.find("UPDATE dm_documents SET status='published'") != std::string::npos) {
      docStatus = "published";
      return drogon::TestResult{};
    }

    if (sql.find("UPDATE dm_documents SET is_checked_out=true") != std::string::npos) {
      isCheckedOut = true;
      checkedOutUserId = actor;
      return drogon::TestResult{};
    }
    if (sql.find("UPDATE dm_documents SET is_checked_out=false") != std::string::npos) {
      isCheckedOut = false;
      checkedOutUserId = "";
      return drogon::TestResult{};
    }
    if (sql.find("UPDATE dm_documents SET is_locked=true") != std::string::npos) {
      isLocked = true;
      return drogon::TestResult{};
    }
    if (sql.find("UPDATE dm_documents SET is_locked=false") != std::string::npos) {
      isLocked = false;
      return drogon::TestResult{};
    }

    if (sql.find("to_regclass($1) IS NOT NULL AS ok") != std::string::npos) {
      return {{rowObj({{"ok", schemaOk}})}};
    }

    if (sql.find("FROM users u JOIN tenants t") != std::string::npos) {
      return {{rowObj({{"is_tenant_admin_user", isAdmin}})}};
    }

    if (sql.find("SELECT username, first_name, last_name FROM users") != std::string::npos) {
      return {{rowObj({{"username", "admin"}, {"first_name", "Admin"}, {"last_name", "User"}})}};
    }

    // Sequences
    if (sql.find("FROM dm_document_sequences") != std::string::npos && sql.find("FOR UPDATE") != std::string::npos) {
      return {{rowObj({{"id", "seq-1"}, {"prefix", "DOC-"}, {"next_number", 42}, {"padding", 4}})}};
    }

    // Folders
    if (sql.find("SELECT f.id, f.tenant_id, f.accounting_unit_id, f.parent_id, f.name") != std::string::npos) {
      if (sql.find("WHERE f.tenant_id=$1 AND f.id=$2") != std::string::npos) {
        return {{rowObj({
            {"id", folderId}, {"parent_id", Json::Value(Json::nullValue)},
            {"accounting_unit_id", unit}, {"name", "Finance"}, {"description", "Financial records"},
            {"color", "blue"}, {"icon", "folder"}, {"path", "/"}, {"is_system", false},
            {"document_count", 5}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"},
            {"last_modified_at", Json::Value(Json::nullValue)}
        })}};
      }
      return {{
          rowObj({
              {"id", folderId}, {"parent_id", Json::Value(Json::nullValue)},
              {"accounting_unit_id", unit}, {"name", "Finance"}, {"description", "Financial records"},
              {"color", "blue"}, {"icon", "folder"}, {"path", "/"}, {"is_system", false},
              {"document_count", 5}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"},
              {"last_modified_at", Json::Value(Json::nullValue)}
          })
      }};
    }
    if (sql.find("INSERT INTO dm_folders") != std::string::npos) {
      return {{rowObj({{"id", folderId}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("UPDATE dm_folders SET") != std::string::npos && sql.find("RETURNING version") != std::string::npos) {
      return {{rowObj({{"version", 2}, {"last_modified_at", "2026-11-18 10:05:00"}})}};
    }
    if (sql.find("FROM dm_folders WHERE id=$1 AND tenant_id=$2") != std::string::npos) {
      return {{rowObj({{"id", folderId}, {"name", "Finance"}, {"parent_id", Json::Value(Json::nullValue)}, {"path", "/"}, {"version", 1}, {"is_system", false}})}};
    }
    if (sql.find("SELECT count(*)::int AS cnt FROM dm_folders WHERE parent_id=$1") != std::string::npos) {
      return {{rowObj({{"cnt", 0}})}};
    }
    if (sql.find("SELECT count(*)::int AS cnt FROM dm_documents WHERE folder_id=$1") != std::string::npos) {
      return {{rowObj({{"cnt", 0}})}};
    }

    // Duplicate checks (return empty for creation)
    if (sql.find("SELECT id FROM dm_templates WHERE tenant_id=$1 AND lower(code)=$2") != std::string::npos) {
      return drogon::TestResult{};
    }
    if (sql.find("SELECT id FROM dm_retention_policies WHERE tenant_id=$1 AND lower(name)=$2") != std::string::npos) {
      return drogon::TestResult{};
    }
    if (sql.find("SELECT id FROM dm_folders WHERE tenant_id=$1 AND is_deleted=false") != std::string::npos &&
        sql.find("lower(name)=lower(") != std::string::npos) {
      return drogon::TestResult{};
    }
    if (sql.find("SELECT id FROM dm_document_relations WHERE tenant_id=$1 AND source_document_id=$2") != std::string::npos) {
      return drogon::TestResult{};
    }
    if (sql.find("SELECT id FROM dm_collections WHERE tenant_id=$1 AND lower(name)=lower(") != std::string::npos) {
      return drogon::TestResult{};
    }
    if (sql.find("SELECT id FROM dm_tags WHERE tenant_id=$1 AND lower(name)=lower(") != std::string::npos) {
      return drogon::TestResult{};
    }

    // Templates
    if (sql.find("INSERT INTO dm_templates") != std::string::npos) {
      return {{rowObj({{"id", templateId}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("UPDATE dm_templates SET") != std::string::npos && sql.find("RETURNING version") != std::string::npos) {
      return {{rowObj({{"version", 2}, {"last_modified_at", "2026-11-18 10:05:00"}})}};
    }
    if (sql.find("FROM dm_templates") != std::string::npos) {
      return {{rowObj({
          {"id", templateId}, {"name", "Contract"}, {"code", "contract"},
          {"description", "Standard legal contracts"}, {"schema", "[{\"name\":\"refNo\",\"label\":\"Reference\",\"type\":\"string\"}]"},
          {"default_retention_policy_id", policyId}, {"retention_policy_name", "Statutory 7 Years"},
          {"is_active", true}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"},
          {"last_modified_at", Json::Value(Json::nullValue)}
      })}};
    }

    // Retention Policies
    if (sql.find("INSERT INTO dm_retention_policies") != std::string::npos) {
      return {{rowObj({{"id", policyId}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("UPDATE dm_retention_policies SET") != std::string::npos && sql.find("RETURNING version") != std::string::npos) {
      return {{rowObj({{"version", 2}, {"last_modified_at", "2026-11-18 10:05:00"}})}};
    }
    if (sql.find("FROM dm_retention_policies") != std::string::npos) {
      return {{rowObj({
          {"id", policyId}, {"name", "Statutory 7 Years"}, {"description", "7-year financial audit retention"},
          {"retention_days", 2555}, {"disposition_action", "archive"}, {"is_active", true},
          {"version", 1}, {"created_at", "2026-11-18 10:00:00"}
      })}};
    }

    // Dashboard summary
    if (sql.find("AS total_documents") != std::string::npos) {
      return {{rowObj({
          {"total_documents", 120}, {"total_storage_bytes", Json::Int64(1073741824)},
          {"pending_approvals", 4}, {"active_checkouts", 2}, {"expired_documents", 1}
      })}};
    }
    if (sql.find("AS total_folders") != std::string::npos) {
      return {{rowObj({{"total_folders", 15}})}};
    }
    if (sql.find("GROUP BY status") != std::string::npos) {
      return {{rowObj({{"status", "published"}, {"count", 80}})}, {rowObj({{"status", "draft"}, {"count", 40}})}};
    }
    if (sql.find("GROUP BY template_name") != std::string::npos) {
      return {{rowObj({{"template_name", "Contract"}, {"count", 50}})}, {rowObj({{"template_name", "Invoice"}, {"count", 70}})}};
    }

    // Documents
    if (sql.find("SELECT COUNT(d.id)::int AS total FROM dm_documents") != std::string::npos) {
      return {{rowObj({{"total", 1}})}};
    }
    if (sql.find("FROM dm_documents") != std::string::npos) {
      return {{rowObj({
          {"id", docId}, {"accounting_unit_id", unit}, {"folder_id", folderId}, {"template_id", templateId},
          {"document_number", "DOC-0042"}, {"title", "Service Agreement 2026"}, {"file_name", "agreement.pdf"},
          {"description", "Signed contract"}, {"language", "en"}, {"mime_type", "application/pdf"},
          {"file_size", Json::Int64(1048576)}, {"file_hash", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"},
          {"content_text", "Service agreement terms between parties"}, {"storage_path", "dm/docs/doc1.pdf"},
          {"version_label", "1.0"}, {"status", docStatus}, {"is_checked_out", isCheckedOut},
          {"checked_out_by_user_id", isCheckedOut ? Json::Value(checkedOutUserId) : Json::Value(Json::nullValue)},
          {"checked_out_at", isCheckedOut ? Json::Value("2026-11-18 10:00:00") : Json::Value(Json::nullValue)},
          {"is_locked", isLocked},
          {"locked_by_user_id", isLocked ? Json::Value(actor) : Json::Value(Json::nullValue)},
          {"locked_at", isLocked ? Json::Value("2026-11-18 10:00:00") : Json::Value(Json::nullValue)},
          {"tags", "[\"legal\",\"2026\"]"}, {"attributes", "{\"refNo\":\"AGR-2026-001\"}"},
          {"retention_policy_id", policyId}, {"retention_date", "2033-11-18"}, {"is_expired", false},
          {"version", 1}, {"created_at", "2026-11-18 10:00:00"}, {"created_by_user_id", actor},
          {"last_modified_at", Json::Value(Json::nullValue)},
          {"folder_name", "Finance"}, {"folder_path", "/Finance/"},
          {"template_name", "Contract"}, {"template_schema", "[{\"name\":\"refNo\",\"label\":\"Reference\",\"type\":\"string\"}]"},
          {"retention_policy_name", "Statutory 7 Years"},
          {"is_bookmarked", 1}
      })}};
    }
    if (sql.find("INSERT INTO dm_documents") != std::string::npos) {
      return {{rowObj({
          {"id", docId}, {"document_number", "DOC-0042"}, {"version_label", "1.0"},
          {"version", 1}, {"created_at", "2026-11-18 10:00:00"}
      })}};
    }
    if (sql.find("UPDATE dm_documents SET") != std::string::npos && sql.find("RETURNING version") != std::string::npos) {
      return {{rowObj({{"version", 2}, {"last_modified_at", "2026-11-18 10:05:00"}})}};
    }

    // Versions
    if (sql.find("FROM dm_document_versions") != std::string::npos) {
      return {{
          rowObj({
              {"id", versionId}, {"version_label", "1.0"}, {"file_name", "agreement.pdf"},
              {"file_size", Json::Int64(1048576)}, {"file_hash", "abc123hash"},
              {"mime_type", "application/pdf"}, {"comment", "Initial upload"},
              {"created_at", "2026-11-18 10:00:00"}, {"created_by_user_id", actor},
              {"user_name", "admin"}
          })
      }};
    }

    // Workflows
    if (sql.find("INSERT INTO dm_workflows") != std::string::npos) {
      return {{rowObj({{"id", "wf-1"}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("FROM dm_workflows") != std::string::npos) {
      return {{rowObj({
          {"id", "wf-1"}, {"document_id", docId}, {"document_number", "DOC-0042"},
          {"document_title", "Service Agreement 2026"}, {"version_label", "1.0"},
          {"step_name", "Review & Approval"}, {"status", "pending"},
          {"assigned_to_user_id", actor}, {"assignee_name", "admin"},
          {"decided_by_user_id", Json::Value(Json::nullValue)}, {"decider_name", Json::Value(Json::nullValue)},
          {"decided_at", Json::Value(Json::nullValue)}, {"comments", ""},
          {"creator_name", "admin"}, {"created_at", "2026-11-18 10:00:00"}
      })}};
    }

    // Notes
    if (sql.find("INSERT INTO dm_document_notes") != std::string::npos) {
      return {{rowObj({{"id", "note-1"}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("FROM dm_document_notes") != std::string::npos) {
      return {{rowObj({
          {"id", "note-1"}, {"note_text", "Please review section 4"}, {"created_at", "2026-11-18 10:00:00"},
          {"user_id", actor}, {"user_name", "admin"}, {"name", "Admin"}, {"surname", "User"}
      })}};
    }

    // Relations
    if (sql.find("INSERT INTO dm_document_relations") != std::string::npos) {
      return {{rowObj({{"id", relationId}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("FROM dm_document_relations") != std::string::npos) {
      return {{rowObj({
          {"id", relationId}, {"source_document_id", docId}, {"target_document_id", targetDocId},
          {"relation_type", "relates_to"}, {"notes", "Addendum to contract"}, {"created_at", "2026-11-18 10:00:00"},
          {"document_number", "DOC-0043"}, {"title", "Addendum 1"}, {"status", "draft"}, {"version_label", "1.0"}
      })}};
    }

    // Saved Searches
    if (sql.find("INSERT INTO dm_saved_searches") != std::string::npos) {
      return {{rowObj({{"id", searchId}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("FROM dm_saved_searches") != std::string::npos) {
      return {{rowObj({
          {"id", searchId}, {"name", "Q4 Invoices"}, {"description", "Search for 2026 Q4 invoices"},
          {"criteria", "{\"q\":\"invoice\"}"}, {"created_at", "2026-11-18 10:00:00"}
      })}};
    }

    // Trash
    if (sql.find("FROM dm_documents d WHERE d.tenant_id=$1 AND d.is_deleted=true") != std::string::npos) {
      return {{rowObj({
          {"id", docId}, {"document_number", "DOC-0042"}, {"title", "Service Agreement 2026"},
          {"file_name", "agreement.pdf"}, {"version_label", "1.0"}, {"file_size", Json::Int64(1048576)},
          {"deleted_at", "2026-11-18 10:00:00"}, {"deleted_by", "admin"}
      })}};
    }
    if (sql.find("FROM dm_folders f WHERE f.tenant_id=$1 AND f.is_deleted=true") != std::string::npos) {
      return {{rowObj({
          {"id", folderId}, {"name", "Archived 2025"}, {"path", "/Archived 2025/"},
          {"deleted_at", "2026-11-18 10:00:00"}, {"deleted_by", "admin"}
      })}};
    }

    // Audit Events
    if (sql.find("FROM dm_audit_events") != std::string::npos) {
      return {{rowObj({
          {"id", "audit-1"}, {"document_id", docId}, {"folder_id", Json::Value(Json::nullValue)},
          {"event_type", "document.created"}, {"user_id", actor}, {"user_name", "admin"},
          {"details", "{\"title\":\"Service Agreement 2026\"}"}, {"created_at", "2026-11-18 10:00:00"},
          {"document_number", "DOC-0042"}, {"document_title", "Service Agreement 2026"},
          {"prev_hash", "0000000000000000000000000000000000000000000000000000000000000000"},
          {"curr_hash", "a1b2c3d4e5f60000000000000000000000000000000000000000000000000000"}
      })}};
    }

    // Enterprise Mocks
    if (sql.find("FROM dm_collections") != std::string::npos) {
      return {{rowObj({
          {"id", "col-1"}, {"name", "Executive Briefs"}, {"description", "Board docs"},
          {"color", "gold"}, {"icon", "collection"}, {"is_public", true}, {"version", 1},
          {"created_at", "2026-11-18 10:00:00"}, {"document_count", 3}
      })}};
    }
    if (sql.find("INSERT INTO dm_collections") != std::string::npos) {
      return {{rowObj({{"id", "col-1"}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("FROM dm_tags") != std::string::npos) {
      return {{rowObj({{"id", "tag-1"}, {"name", "finance"}, {"color", "#6366f1"}, {"category", "department"}, {"usage_count", 5}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("INSERT INTO dm_tags") != std::string::npos) {
      return {{rowObj({{"id", "tag-1"}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("FROM dm_custom_attributes") != std::string::npos) {
      return {{rowObj({{"id", "attr-1"}, {"template_id", templateId}, {"attribute_key", "costCenter"}, {"label", "Cost Center"}, {"data_type", "string"}, {"is_required", false}, {"default_value", "HQ"}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("INSERT INTO dm_custom_attributes") != std::string::npos) {
      return {{rowObj({{"id", "attr-1"}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("FROM dm_custom_identifiers") != std::string::npos) {
      return {{rowObj({{"id", "cid-1"}, {"name", "Finance Doc"}, {"pattern", "FIN-{YEAR}-{SEQ}"}, {"prefix", "FIN"}, {"suffix", ""}, {"next_seq", 10}, {"padding", 4}, {"reset_cycle", "yearly"}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("INSERT INTO dm_custom_identifiers") != std::string::npos) {
      return {{rowObj({{"id", "cid-1"}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("FROM dm_acl_entries") != std::string::npos) {
      return {{rowObj({{"id", "acl-1"}, {"entity_type", "document"}, {"entity_id", docId}, {"principal_type", "user"}, {"principal_id", actor}, {"permission", "read"}, {"access_type", "allow"}, {"is_inherited", false}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("INSERT INTO dm_acl_entries") != std::string::npos) {
      return {{rowObj({{"id", "acl-1"}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("FROM dm_shares") != std::string::npos) {
      return {{rowObj({{"id", "sh-1"}, {"share_token", "sh_token_123"}, {"recipient_email", "partner@example.com"}, {"can_download", true}, {"can_comment", false}, {"expires_at", Json::Value(Json::nullValue)}, {"max_access_count", 10}, {"access_count", 1}, {"is_revoked", false}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("INSERT INTO dm_shares") != std::string::npos) {
      return {{rowObj({{"id", "sh-1"}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("FROM dm_legal_holds") != std::string::npos) {
      return {{rowObj({{"id", "lh-1"}, {"matter_number", "CASE-2026-001"}, {"title", "Audit 2026"}, {"description", "Litigation freeze"}, {"custodian_name", "Legal Dept"}, {"status", "active"}, {"applied_at", "2026-11-18 10:00:00"}, {"attached_document_count", 2}})}};
    }
    if (sql.find("INSERT INTO dm_legal_holds") != std::string::npos) {
      return {{rowObj({{"id", "lh-1"}, {"version", 1}, {"applied_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("FROM dm_signatures") != std::string::npos) {
      return {{rowObj({{"id", "sig-1"}, {"signer_name", "John Doe"}, {"signer_email", "john@example.com"}, {"signature_type", "electronic"}, {"status", "signed"}, {"signature_hash", "sig_hash_abc"}, {"signed_at", "2026-11-18 10:00:00"}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("INSERT INTO dm_signatures") != std::string::npos) {
      return {{rowObj({{"id", "sig-1"}, {"status", "pending"}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("FROM dm_entity_links") != std::string::npos) {
      return {{rowObj({{"id", "el-1"}, {"entity_type", "gl_journal"}, {"entity_id", "00000000-0000-0000-0000-000000000001"}, {"reference_number", "JRN-001"}, {"link_category", "attachment"}, {"notes", "Backup voucher"}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("INSERT INTO dm_entity_links") != std::string::npos) {
      return {{rowObj({{"id", "el-1"}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("FROM dm_quotas") != std::string::npos) {
      return {{rowObj({{"id", "q-1"}, {"max_storage_bytes", Json::Int64(5368709120LL)}, {"used_storage_bytes", Json::Int64(104857600LL)}, {"max_documents", 50000}, {"document_count", 120}, {"max_file_size_bytes", Json::Int64(104857600LL)}})}};
    }
    if (sql.find("FROM dm_settings") != std::string::npos) {
      return {{rowObj({{"id", "s-1"}, {"storage_provider", "local"}, {"clamav_enabled", false}, {"clamav_host", "127.0.0.1"}, {"clamav_port", 3310}, {"pii_detection_enabled", true}, {"ocr_enabled", false}, {"ocr_language", "eng"}, {"ai_classification_enabled", true}, {"ai_rag_enabled", true}, {"default_retention_days", 365}})}};
    }
    if (sql.find("FROM dm_workflow_templates") != std::string::npos) {
      return {{rowObj({{"id", "wt-1"}, {"name", "Standard Approval"}, {"description", "Two step approval"}, {"trigger_type", "manual"}, {"steps", "[{\"name\":\"Review\",\"taskType\":\"approval\",\"executionMode\":\"sequential\"}]"}, {"is_active", true}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("INSERT INTO dm_workflow_templates") != std::string::npos) {
      return {{rowObj({{"id", "wt-1"}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("FROM dm_workflow_tasks") != std::string::npos) {
      return {{rowObj({{"id", "task-1"}, {"instance_id", "wi-1"}, {"step_name", "Review"}, {"task_type", "approval"}, {"execution_mode", "sequential"}, {"status", "pending"}, {"due_date", "2026-12-01"}, {"created_at", "2026-11-18 10:00:00"}, {"document_id", docId}, {"document_title", "Agreement"}, {"document_number", "DOC-001"}})}};
    }
    if (sql.find("FROM dm_annotations") != std::string::npos) {
      return {{rowObj({{"id", "an-1"}, {"page_number", 1}, {"annotation_type", "highlight"}, {"rect_x", 10.0}, {"rect_y", 20.0}, {"rect_w", 100.0}, {"rect_h", 20.0}, {"color", "#ffeb3b"}, {"content", "Review clause"}, {"is_resolved", false}, {"created_at", "2026-11-18 10:00:00"}})}};
    }
    if (sql.find("INSERT INTO dm_annotations") != std::string::npos) {
      return {{rowObj({{"id", "an-1"}, {"version", 1}, {"created_at", "2026-11-18 10:00:00"}})}};
    }

    // Generic fallback for updates/deletes/inserts
    return drogon::TestResult{};
  };

  auto call = [&](std::string op, std::string id = "", Json::Value body = Json::Value(Json::objectValue),
                  std::string subId = "", AuditIdentity identity = {}) {
    if (identity.tenantId.empty())
      identity = who;
    return DmService::execute(op, id, subId, body, 1, 20, "", unit, identity).get();
  };

  // 1. Schema probe failure check
  std::cerr << "[TEST] 1. Schema probe\n" << std::flush;
  schemaOk = false;
  auto failRes = call("dashboard.summary");
  assert(!failRes.success);
  assert(failRes.error["code"].asString() == "schema_not_ready");
  schemaOk = true;

  // 2. Next Number Sequence
  std::cerr << "[TEST] 2. Next Number Sequence\n" << std::flush;
  auto numRes = call("next-number");
  assert(numRes.success);
  assert(numRes.result["nextNumber"].asString() == "DOC-0042");

  // 3. Folders CRUD
  std::cerr << "[TEST] 3. Folders CRUD\n" << std::flush;
  Json::Value fBody(Json::objectValue);
  fBody["name"] = "Finance";
  fBody["description"] = "Invoices and financial statements";
  auto fCreate = call("folders.create", "", fBody);
  assert(fCreate.success);
  assert(fCreate.result["id"].asString() == folderId);

  auto fList = call("folders.list");
  assert(fList.success);
  assert(fList.result["data"].size() == 1);

  auto fGet = call("folders.get", folderId);
  assert(fGet.success);
  assert(fGet.result["name"].asString() == "Finance");

  fBody["version"] = 1;
  fBody["description"] = "Updated desc";
  auto fUpdate = call("folders.update", folderId, fBody);
  assert(fUpdate.success);

  auto fDel = call("folders.delete", folderId);
  assert(fDel.success);

  // 4. Templates CRUD
  std::cerr << "[TEST] 4. Templates CRUD\n" << std::flush;
  Json::Value tBody(Json::objectValue);
  tBody["name"] = "Contract";
  tBody["code"] = "contract";
  tBody["description"] = "Legal contracts";
  Json::Value tSchema(Json::arrayValue);
  Json::Value tField(Json::objectValue);
  tField["name"] = "refNo";
  tField["label"] = "Reference";
  tField["type"] = "string";
  tSchema.append(tField);
  tBody["schema"] = tSchema;
  auto tCreate = call("templates.create", "", tBody);
  assert(tCreate.success);

  auto tList = call("templates.list");
  assert(tList.success);
  assert(tList.result["data"].size() == 1);

  auto tGet = call("templates.get", templateId);
  assert(tGet.success);
  assert(tGet.result["code"].asString() == "contract");

  // 5. Retention Policies
  std::cerr << "[TEST] 5. Retention Policies\n" << std::flush;
  Json::Value rBody(Json::objectValue);
  rBody["name"] = "Tax Records (7 years)";
  rBody["retentionDays"] = 2555;
  rBody["dispositionAction"] = "archive";
  auto rCreate = call("retention-policies.create", "", rBody);
  assert(rCreate.success);

  auto rList = call("retention-policies.list");
  assert(rList.success);

  // 6. Documents CRUD
  std::cerr << "[TEST] 6. Documents CRUD\n" << std::flush;
  Json::Value dBody(Json::objectValue);
  dBody["title"] = "Service Agreement 2026";
  dBody["fileName"] = "agreement.pdf";
  dBody["folderId"] = folderId;
  dBody["templateId"] = templateId;
  dBody["description"] = "Signed MSA";
  Json::Value dTags(Json::arrayValue);
  dTags.append("legal");
  dTags.append("2026");
  dBody["tags"] = dTags;
  auto dCreate = call("documents.create", "", dBody);
  assert(dCreate.success);
  assert(dCreate.result["versionLabel"].asString() == "1.0");

  auto dGet = call("documents.get", docId);
  assert(dGet.success);
  assert(dGet.result["documentNumber"].asString() == "DOC-0042");

  auto dList = call("documents.list");
  assert(dList.success);
  assert(dList.result["totalCount"].asInt() == 1);

  // 7. Versioning & Check-in / Check-out
  std::cerr << "[TEST] 7. Versioning & Check-in / Check-out\n" << std::flush;
  auto chkOut = call("documents.checkout", docId);
  assert(chkOut.success);

  Json::Value chkInBody(Json::objectValue);
  chkInBody["fileName"] = "agreement_v2.pdf";
  chkInBody["isMajor"] = false;
  chkInBody["comment"] = "Minor amendments to clause 3";
  auto chkIn = call("documents.checkin", docId, chkInBody);
  assert(chkIn.success);

  auto vList = call("documents.versions.list", docId);
  assert(vList.success);
  assert(vList.result["data"].size() == 1);

  auto vRev = call("documents.versions.revert", docId, Json::Value(Json::objectValue), versionId);
  assert(vRev.success);

  // Locking & Bookmarks
  std::cerr << "[TEST] 7b. Locking & Bookmarks\n" << std::flush;
  auto lck = call("documents.lock", docId);
  assert(lck.success);
  auto unlck = call("documents.unlock", docId);
  assert(unlck.success);

  auto bm = call("documents.bookmark", docId);
  assert(bm.success);

  // 8. Workflows
  std::cerr << "[TEST] 8. Workflows\n" << std::flush;
  Json::Value wfSubmit(Json::objectValue);
  wfSubmit["stepName"] = "Legal Review";
  auto wfSub = call("documents.workflow.submit", docId, wfSubmit);
  assert(wfSub.success);

  auto wfList = call("workflows.list");
  assert(wfList.success);

  Json::Value wfApprove(Json::objectValue);
  wfApprove["comments"] = "Reviewed and approved by Legal";
  wfApprove["publish"] = true;
  auto wfApp = call("documents.workflow.approve", docId, wfApprove);
  assert(wfApp.success);

  // 9. Collaboration (Notes & Relations)
  std::cerr << "[TEST] 9. Collaboration\n" << std::flush;
  Json::Value noteBody(Json::objectValue);
  noteBody["noteText"] = "Please review section 4";
  auto nAdd = call("documents.notes.add", docId, noteBody);
  assert(nAdd.success);

  auto nList = call("documents.notes.list", docId);
  assert(nList.success);

  Json::Value relBody(Json::objectValue);
  relBody["targetDocumentId"] = targetDocId;
  relBody["relationType"] = "relates_to";
  relBody["notes"] = "Addendum to contract";
  auto rAdd = call("documents.relations.add", docId, relBody);
  assert(rAdd.success);

  auto relList = call("documents.relations.list", docId);
  assert(relList.success);

  auto rRem = call("documents.relations.remove", docId, Json::Value(Json::objectValue), relationId);
  assert(rRem.success);

  // 10. Saved Searches
  std::cerr << "[TEST] 10. Saved Searches\n" << std::flush;
  Json::Value sBody(Json::objectValue);
  sBody["name"] = "Q4 Invoices";
  sBody["criteria"] = Json::Value(Json::objectValue);
  sBody["criteria"]["q"] = "invoice";
  auto sCreate = call("saved-searches.create", "", sBody);
  assert(sCreate.success);

  auto sList = call("saved-searches.list");
  assert(sList.success);

  auto sDel = call("saved-searches.delete", searchId);
  assert(sDel.success);

  // 11. Recycle Bin (Trash)
  std::cerr << "[TEST] 11. Recycle Bin\n" << std::flush;
  auto trashList = call("trash.list");
  assert(trashList.success);

  Json::Value restBody(Json::objectValue);
  restBody["type"] = "document";
  auto trashRest = call("trash.restore", docId, restBody);
  assert(trashRest.success);

  auto trashPurg = call("trash.purge", docId);
  assert(trashPurg.success);

  // 12. Audit Trail
  std::cerr << "[TEST] 12. Audit Trail\n" << std::flush;
  auto audList = call("audit.list");
  assert(audList.success);

  // 13. Dashboard Summary
  std::cerr << "[TEST] 13. Dashboard Summary\n" << std::flush;
  auto sumRes = call("dashboard.summary");
  assert(sumRes.success);
  assert(sumRes.result["totalDocuments"].asInt() == 120);

  // 14. DmController HTTP Seam Tests
  std::cerr << "[TEST] 14. DmController HTTP Seam Tests\n" << std::flush;
  DmController controller;
  auto cReq = makeReq(drogon::Get, tenant, actor, nullptr, {{"accountingUnitId", unit}});
  auto cResp = controller.dashboard(cReq).get();
  assert(cResp->status == drogon::k200OK);

  auto numReq = makeReq(drogon::Get, tenant, actor);
  auto numResp = controller.nextNumber(numReq).get();
  assert(numResp->status == drogon::k200OK);

  auto audReq = makeReq(drogon::Get, tenant, actor);
  auto audResp = controller.audit(audReq).get();
  assert(audResp->status == drogon::k200OK);

  auto trashReq = makeReq(drogon::Get, tenant, actor);
  auto trashResp = controller.trash(trashReq).get();
  assert(trashResp->status == drogon::k200OK);

  auto listReq = makeReq(drogon::Get, tenant, actor);
  auto listResp = controller.list(listReq, "folders").get();
  assert(listResp->status == drogon::k200OK);

  auto getReq = makeReq(drogon::Get, tenant, actor);
  auto getResp = controller.get(getReq, "folders", folderId).get();
  assert(getResp->status == drogon::k200OK);

  // Regression tests for empty ?accountingUnitId and unit-filtered summary
  auto fReqEmpty = makeReq(drogon::Get, tenant, actor, nullptr, {{"accountingUnitId", ""}});
  auto fRespEmpty = controller.list(fReqEmpty, "folders").get();
  assert(fRespEmpty->status == drogon::k200OK);

  auto dashReqUnit = makeReq(drogon::Get, tenant, actor, nullptr, {{"accountingUnitId", unit}});
  auto dashRespUnit = controller.dashboard(dashReqUnit).get();
  assert(dashRespUnit->status == drogon::k200OK);

  auto fListNoUnit = DmService::execute("folders.list", "", "", Json::Value(Json::objectValue), 1, 20, "", "", who).get();
  assert(fListNoUnit.success);

  auto trashNoUnit = DmService::execute("trash.list", "", "", Json::Value(Json::objectValue), 1, 20, "", "", who).get();
  assert(trashNoUnit.success);

  auto numNoUnit = DmService::execute("next-number", "", "", Json::Value(Json::objectValue), 1, 20, "", "", who).get();
  assert(numNoUnit.success);

  // 15. Collections CRUD
  std::cerr << "[TEST] 15. Collections CRUD\n" << std::flush;
  auto colList = call("collections.list");
  assert(colList.success);
  Json::Value colBody(Json::objectValue);
  colBody["name"] = "Board Materials";
  colBody["description"] = "Board meetings and minutes";
  auto colCreate = call("collections.create", "", colBody);
  assert(colCreate.success);

  // 16. Tags CRUD
  std::cerr << "[TEST] 16. Tags CRUD\n" << std::flush;
  auto tagList = call("tags.list");
  assert(tagList.success);
  Json::Value tagBody(Json::objectValue);
  tagBody["name"] = "audit-2026";
  auto tagCreate = call("tags.create", "", tagBody);
  assert(tagCreate.success);

  // 17. Custom Attributes & Identifiers
  std::cerr << "[TEST] 17. Custom Attributes & Identifiers\n" << std::flush;
  auto attrList = call("custom-attributes.list");
  assert(attrList.success);
  auto idList = call("custom-identifiers.list");
  assert(idList.success);

  // 18. ACL & Shares
  std::cerr << "[TEST] 18. ACL & Shares\n" << std::flush;
  auto aclList = call("acl.list", "", rowObj({{"entityType", "document"}, {"entityId", docId}}));
  assert(aclList.success);
  auto shareList = call("shares.list", docId);
  assert(shareList.success);

  // 19. Legal Holds & E-Signatures
  std::cerr << "[TEST] 19. Legal Holds & E-Signatures\n" << std::flush;
  auto lhList = call("legal-holds.list");
  assert(lhList.success);
  auto sigList = call("signatures.list", docId);
  assert(sigList.success);

  // 20. ERP Entity Links
  std::cerr << "[TEST] 20. ERP Entity Links\n" << std::flush;
  auto elList = call("entity-links.list", docId);
  assert(elList.success);

  // 21. Quotas & Settings
  std::cerr << "[TEST] 21. Quotas & Settings\n" << std::flush;
  auto qGet = call("quotas.get");
  assert(qGet.success);
  auto sGet = call("settings.get");
  assert(sGet.success);

  // 22. Workflow Templates & Tasks
  std::cerr << "[TEST] 22. Advanced Workflows\n" << std::flush;
  auto wtList = call("workflow-templates.list");
  assert(wtList.success);
  auto taskList = call("workflow-tasks.list");
  assert(taskList.success);

  // 23. Annotations, Tamper-evident Audit & Deterministic AI
  std::cerr << "[TEST] 23. Annotations, Audit Verification & AI\n" << std::flush;
  auto anList = call("documents.annotations.list", docId);
  assert(anList.success);
  auto auditVer = call("audit.verify", docId);
  assert(auditVer.success);
  assert(auditVer.result["verified"].asBool() == true);
  auto ragRes = call("ai.rag", "", rowObj({{"q", "agreement invoice"}}));
  assert(ragRes.success);

  std::cout << "All Document Management service, repository & controller seam tests passed ("
            << sqlLog.size() << " SQL statements exercised)\n";
  return 0;
}
