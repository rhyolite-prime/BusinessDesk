#include "domain_services/dm/DmService.h"
#include "domain_services/dm/DmInternal.h"
#include "domain_services/dm/DmEnterprise.h"
#include "utils/TransactionUtil.h"

namespace business_desk::domain_services {

namespace dm_folders {
drogon::Task<dto::BaseApiResponse> listFolders(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &unitId);
drogon::Task<dto::BaseApiResponse> getFolder(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &folderId);
drogon::Task<dto::BaseApiResponse> createFolder(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &unitId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> updateFolder(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &folderId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> deleteFolder(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &folderId, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> listTemplates(dm_internal::DbClientPtr db, const std::string &tenantId);
drogon::Task<dto::BaseApiResponse> getTemplate(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &templateId);
drogon::Task<dto::BaseApiResponse> createTemplate(dm_internal::DbClientPtr db, const std::string &tenantId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> updateTemplate(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &templateId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> deleteTemplate(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &templateId, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> listRetentionPolicies(dm_internal::DbClientPtr db, const std::string &tenantId);
drogon::Task<dto::BaseApiResponse> getRetentionPolicy(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &policyId);
drogon::Task<dto::BaseApiResponse> createRetentionPolicy(dm_internal::DbClientPtr db, const std::string &tenantId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> updateRetentionPolicy(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &policyId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> deleteRetentionPolicy(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &policyId, const utils::AuditIdentity &who);
} // namespace dm_folders

namespace dm_documents {
drogon::Task<dto::BaseApiResponse> listDocuments(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &unitId, const Json::Value &query, int page, int size, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> getDocument(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> createDocument(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &unitId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> updateDocument(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> deleteDocument(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> checkoutDocument(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> checkinDocument(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> lockDocument(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> unlockDocument(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> bookmarkDocument(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> listVersions(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId);
drogon::Task<dto::BaseApiResponse> revertVersion(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId, const std::string &versionId, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> listSavedSearches(dm_internal::DbClientPtr db, const std::string &tenantId, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> createSavedSearch(dm_internal::DbClientPtr db, const std::string &tenantId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> deleteSavedSearch(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &searchId, const utils::AuditIdentity &who);
} // namespace dm_documents

namespace dm_workflows {
drogon::Task<dto::BaseApiResponse> submitWorkflow(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> approveWorkflow(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> rejectWorkflow(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> cancelWorkflow(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> listWorkflows(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId, const Json::Value &query, int page, int size, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> listNotes(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId);
drogon::Task<dto::BaseApiResponse> addNote(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> listRelations(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId);
drogon::Task<dto::BaseApiResponse> addRelation(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> removeRelation(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &docId, const std::string &relationId);
drogon::Task<dto::BaseApiResponse> listTrash(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &unitId);
drogon::Task<dto::BaseApiResponse> restoreTrash(dm_internal::DbClientPtr db, std::string tenantId, std::string itemId, std::string itemType, utils::AuditIdentity who);
drogon::Task<dto::BaseApiResponse> purgeTrash(dm_internal::DbClientPtr db, std::string tenantId, std::string itemId, utils::AuditIdentity who);
drogon::Task<dto::BaseApiResponse> listAudit(dm_internal::DbClientPtr db, const std::string &tenantId, const Json::Value &query, int page, int size);
drogon::Task<dto::BaseApiResponse> getSummary(dm_internal::DbClientPtr db, const std::string &tenantId, const std::string &unitId);
} // namespace dm_workflows

drogon::Task<dto::BaseApiResponse>
DmService::execute(std::string op, std::string id, std::string subId, Json::Value body,
                   int page, int size, std::string query, std::string unitId,
                   utils::AuditIdentity who) {
  using namespace dm_internal;

  if (!body.isObject())
    body = Json::Value(Json::objectValue);
  if (!query.empty() && (!body.isMember("q") || body["q"].asString().empty()))
    body["q"] = query;

  auto db = drogon::app().getDbClient();
  if (!(co_await checkDmSchemaReady(db)))
    co_return fail("schema_not_ready",
                   "Document Management schema upgrade required. Apply 042_document_management.sql.");

  const bool isWrite = op.ends_with(".create") || op.ends_with(".update") || op.ends_with(".delete") ||
                       op.ends_with(".checkout") || op.ends_with(".checkin") || op.ends_with(".lock") ||
                       op.ends_with(".unlock") || op.ends_with(".bookmark") || op.ends_with(".revert") ||
                       op.ends_with(".submit") || op.ends_with(".approve") || op.ends_with(".reject") ||
                       op.ends_with(".cancel") || op.ends_with(".add") || op.ends_with(".remove") ||
                       op.ends_with(".restore") || op.ends_with(".purge") || op.ends_with(".sign") ||
                       op.ends_with(".complete") || op.ends_with(".sweep") || op.ends_with(".generate") ||
                       op.ends_with(".apply");

  bool canWrite = false;
  auto authz = co_await inventory_internal::authorize(db, who, isWrite, "dm", canWrite);
  if (!authz.success)
    co_return authz;

  const std::string tenantId = who.tenantId;

  // Reads: executed directly on db connection
  if (!isWrite) {
    try {
      if (op == "dashboard.summary")
        co_return co_await dm_workflows::getSummary(db, tenantId, unitId);
      if (op == "next-number") {
        dto::BaseApiResponse r;
        r.success = true;
        r.result["nextNumber"] = co_await generateDocNumber(db, tenantId, unitId, who.userId);
        co_return r;
      }
      if (op == "folders.list")
        co_return co_await dm_folders::listFolders(db, tenantId, unitId);
      if (op == "folders.get")
        co_return co_await dm_folders::getFolder(db, tenantId, id);
      if (op == "templates.list")
        co_return co_await dm_folders::listTemplates(db, tenantId);
      if (op == "templates.get")
        co_return co_await dm_folders::getTemplate(db, tenantId, id);
      if (op == "retention-policies.list")
        co_return co_await dm_folders::listRetentionPolicies(db, tenantId);
      if (op == "retention-policies.get")
        co_return co_await dm_folders::getRetentionPolicy(db, tenantId, id);
      if (op == "documents.list")
        co_return co_await dm_documents::listDocuments(db, tenantId, unitId, body, page, size, who);
      if (op == "documents.get")
        co_return co_await dm_documents::getDocument(db, tenantId, id, who);
      if (op == "documents.versions.list")
        co_return co_await dm_documents::listVersions(db, tenantId, id);
      if (op == "workflows.list")
        co_return co_await dm_workflows::listWorkflows(db, tenantId, id, body, page, size, who);
      if (op == "documents.notes.list")
        co_return co_await dm_workflows::listNotes(db, tenantId, id);
      if (op == "documents.relations.list")
        co_return co_await dm_workflows::listRelations(db, tenantId, id);
      if (op == "saved-searches.list")
        co_return co_await dm_documents::listSavedSearches(db, tenantId, who);
      if (op == "trash.list")
        co_return co_await dm_workflows::listTrash(db, tenantId, unitId);
      if (op == "audit.list")
        co_return co_await dm_workflows::listAudit(db, tenantId, body, page, size);

      // Enterprise DMS Reads
      if (op == "collections.list")
        co_return co_await dm_enterprise::listCollections(db, tenantId, unitId);
      if (op == "collections.get")
        co_return co_await dm_enterprise::getCollection(db, tenantId, id);
      if (op == "tags.list")
        co_return co_await dm_enterprise::listTags(db, tenantId);
      if (op == "custom-attributes.list")
        co_return co_await dm_enterprise::listCustomAttributes(db, tenantId);
      if (op == "custom-identifiers.list")
        co_return co_await dm_enterprise::listCustomIdentifiers(db, tenantId);
      if (op == "acl.list")
        co_return co_await dm_enterprise::listAclEntries(db, tenantId, body["entityType"].asString(), body["entityId"].asString());
      if (op == "shares.list")
        co_return co_await dm_enterprise::listShares(db, tenantId, id);
      if (op == "legal-holds.list")
        co_return co_await dm_enterprise::listLegalHolds(db, tenantId);
      if (op == "signatures.list")
        co_return co_await dm_enterprise::listSignatures(db, tenantId, id);
      if (op == "signatures.verify")
        co_return co_await dm_enterprise::verifySignature(db, tenantId, id);
      if (op == "entity-links.list")
        co_return co_await dm_enterprise::listEntityLinks(db, tenantId, id);
      if (op == "quotas.get")
        co_return co_await dm_enterprise::getQuotas(db, tenantId);
      if (op == "settings.get")
        co_return co_await dm_enterprise::getSettings(db, tenantId);
      if (op == "workflow-templates.list")
        co_return co_await dm_enterprise::listWorkflowTemplates(db, tenantId);
      if (op == "workflow-instances.list")
        co_return co_await dm_enterprise::listWorkflowInstances(db, tenantId, id);
      if (op == "workflow-tasks.list")
        co_return co_await dm_enterprise::listWorkflowTasks(db, tenantId, who);
      if (op == "documents.annotations.list")
        co_return co_await dm_enterprise::listAnnotations(db, tenantId, id);
      if (op == "audit.verify")
        co_return co_await dm_enterprise::verifyAuditChain(db, tenantId, id);
      if (op == "ai.classify")
        co_return co_await dm_enterprise::classifyDocument(db, tenantId, id);
      if (op == "ai.rag")
        co_return co_await dm_enterprise::ragSearch(db, tenantId, body["q"].asString());

      co_return fail("not_found", "Unknown Document Management read operation: " + op);
    } catch (const std::exception &e) {
      co_return fail("database_error", std::string("Database error: ") + e.what());
    }
  }

  // Writes: run within transaction
  auto tx = co_await db->newTransactionCoro();
  dto::BaseApiResponse r;
  try {
    if (op == "folders.create")
      r = co_await dm_folders::createFolder(tx, tenantId, unitId, body, who);
    else if (op == "folders.update")
      r = co_await dm_folders::updateFolder(tx, tenantId, id, body, who);
    else if (op == "folders.delete")
      r = co_await dm_folders::deleteFolder(tx, tenantId, id, who);
    else if (op == "templates.create")
      r = co_await dm_folders::createTemplate(tx, tenantId, body, who);
    else if (op == "templates.update")
      r = co_await dm_folders::updateTemplate(tx, tenantId, id, body, who);
    else if (op == "templates.delete")
      r = co_await dm_folders::deleteTemplate(tx, tenantId, id, who);
    else if (op == "retention-policies.create")
      r = co_await dm_folders::createRetentionPolicy(tx, tenantId, body, who);
    else if (op == "retention-policies.update")
      r = co_await dm_folders::updateRetentionPolicy(tx, tenantId, id, body, who);
    else if (op == "retention-policies.delete")
      r = co_await dm_folders::deleteRetentionPolicy(tx, tenantId, id, who);
    else if (op == "documents.create")
      r = co_await dm_documents::createDocument(tx, tenantId, unitId, body, who);
    else if (op == "documents.update")
      r = co_await dm_documents::updateDocument(tx, tenantId, id, body, who);
    else if (op == "documents.delete")
      r = co_await dm_documents::deleteDocument(tx, tenantId, id, who);
    else if (op == "documents.checkout")
      r = co_await dm_documents::checkoutDocument(tx, tenantId, id, who);
    else if (op == "documents.checkin")
      r = co_await dm_documents::checkinDocument(tx, tenantId, id, body, who);
    else if (op == "documents.lock")
      r = co_await dm_documents::lockDocument(tx, tenantId, id, who);
    else if (op == "documents.unlock")
      r = co_await dm_documents::unlockDocument(tx, tenantId, id, who);
    else if (op == "documents.bookmark")
      r = co_await dm_documents::bookmarkDocument(tx, tenantId, id, who);
    else if (op == "documents.versions.revert")
      r = co_await dm_documents::revertVersion(tx, tenantId, id, subId, who);
    else if (op == "documents.workflow.submit")
      r = co_await dm_workflows::submitWorkflow(tx, tenantId, id, body, who);
    else if (op == "documents.workflow.approve")
      r = co_await dm_workflows::approveWorkflow(tx, tenantId, id, body, who);
    else if (op == "documents.workflow.reject")
      r = co_await dm_workflows::rejectWorkflow(tx, tenantId, id, body, who);
    else if (op == "documents.workflow.cancel")
      r = co_await dm_workflows::cancelWorkflow(tx, tenantId, id, who);
    else if (op == "documents.notes.add")
      r = co_await dm_workflows::addNote(tx, tenantId, id, body, who);
    else if (op == "documents.relations.add")
      r = co_await dm_workflows::addRelation(tx, tenantId, id, body, who);
    else if (op == "documents.relations.remove")
      r = co_await dm_workflows::removeRelation(tx, tenantId, id, subId);
    else if (op == "saved-searches.create")
      r = co_await dm_documents::createSavedSearch(tx, tenantId, body, who);
    else if (op == "saved-searches.delete")
      r = co_await dm_documents::deleteSavedSearch(tx, tenantId, id, who);
    else if (op == "trash.restore")
      r = co_await dm_workflows::restoreTrash(tx, tenantId, id, body["type"].asString(), who);
    else if (op == "trash.purge")
      r = co_await dm_workflows::purgeTrash(tx, tenantId, id, who);

    // Enterprise DMS Writes
    else if (op == "collections.create")
      r = co_await dm_enterprise::createCollection(tx, tenantId, unitId, body, who);
    else if (op == "collections.update")
      r = co_await dm_enterprise::updateCollection(tx, tenantId, id, body, who);
    else if (op == "collections.delete")
      r = co_await dm_enterprise::deleteCollection(tx, tenantId, id, who);
    else if (op == "tags.create")
      r = co_await dm_enterprise::createTag(tx, tenantId, body, who);
    else if (op == "tags.delete")
      r = co_await dm_enterprise::deleteTag(tx, tenantId, id, who);
    else if (op == "custom-attributes.create")
      r = co_await dm_enterprise::createCustomAttribute(tx, tenantId, body, who);
    else if (op == "custom-attributes.delete")
      r = co_await dm_enterprise::deleteCustomAttribute(tx, tenantId, id, who);
    else if (op == "custom-identifiers.create")
      r = co_await dm_enterprise::createCustomIdentifier(tx, tenantId, unitId, body, who);
    else if (op == "custom-identifiers.generate")
      r = co_await dm_enterprise::generateIdentifier(tx, tenantId, id);
    else if (op == "acl.create")
      r = co_await dm_enterprise::createAclEntry(tx, tenantId, body, who);
    else if (op == "acl.delete")
      r = co_await dm_enterprise::deleteAclEntry(tx, tenantId, id, who);
    else if (op == "shares.create")
      r = co_await dm_enterprise::createShare(tx, tenantId, id, body, who);
    else if (op == "shares.delete")
      r = co_await dm_enterprise::revokeShare(tx, tenantId, id, who);
    else if (op == "legal-holds.create")
      r = co_await dm_enterprise::createLegalHold(tx, tenantId, body, who);
    else if (op == "legal-holds.delete")
      r = co_await dm_enterprise::releaseLegalHold(tx, tenantId, id, who);
    else if (op == "legal-holds.apply")
      r = co_await dm_enterprise::applyLegalHold(tx, tenantId, id, subId, who);
    else if (op == "signatures.create")
      r = co_await dm_enterprise::requestSignature(tx, tenantId, id, body, who);
    else if (op == "signatures.sign")
      r = co_await dm_enterprise::signDocument(tx, tenantId, id, body, who);
    else if (op == "entity-links.create")
      r = co_await dm_enterprise::createEntityLink(tx, tenantId, id, body, who);
    else if (op == "entity-links.delete")
      r = co_await dm_enterprise::deleteEntityLink(tx, tenantId, id, who);
    else if (op == "quotas.update")
      r = co_await dm_enterprise::updateQuotas(tx, tenantId, body, who);
    else if (op == "settings.update")
      r = co_await dm_enterprise::updateSettings(tx, tenantId, body, who);
    else if (op == "workflow-templates.create")
      r = co_await dm_enterprise::createWorkflowTemplate(tx, tenantId, body, who);
    else if (op == "workflow-templates.delete")
      r = co_await dm_enterprise::deleteWorkflowTemplate(tx, tenantId, id, who);
    else if (op == "workflow-instances.create")
      r = co_await dm_enterprise::startWorkflowInstance(tx, tenantId, id, body["templateId"].asString(), who);
    else if (op == "workflow-tasks.complete")
      r = co_await dm_enterprise::completeWorkflowTask(tx, tenantId, id, body, who);
    else if (op == "workflow-tasks.sweep")
      r = co_await dm_enterprise::sweepWorkflowTasks(tx, tenantId, who);
    else if (op == "documents.annotations.add")
      r = co_await dm_enterprise::createAnnotation(tx, tenantId, id, body, who);
    else if (op == "documents.annotations.remove")
      r = co_await dm_enterprise::deleteAnnotation(tx, tenantId, subId, who);
    else
      r = fail("not_found", "Unknown Document Management write operation: " + op);

    if (r.success) {
      if (!(co_await utils::CommitTransaction{std::move(tx)}))
        co_return fail("database_error", "Failed to commit Document Management transaction.");
    }
  } catch (const std::exception &e) {
    co_return fail("database_error", std::string("Database error: ") + e.what());
  }

  co_return r;
}

} // namespace business_desk::domain_services
