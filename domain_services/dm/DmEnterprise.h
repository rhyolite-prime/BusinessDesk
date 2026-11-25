#pragma once

#include "domain_services/dm/DmInternal.h"
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
#include <drogon/drogon.h>

namespace business_desk::domain_services::dm_enterprise {

using dm_internal::DbClientPtr;

// Collections
drogon::Task<dto::BaseApiResponse> listCollections(DbClientPtr db, const std::string &tenantId, const std::string &unitId);
drogon::Task<dto::BaseApiResponse> getCollection(DbClientPtr db, const std::string &tenantId, const std::string &collId);
drogon::Task<dto::BaseApiResponse> createCollection(DbClientPtr db, const std::string &tenantId, const std::string &unitId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> updateCollection(DbClientPtr db, const std::string &tenantId, const std::string &collId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> deleteCollection(DbClientPtr db, const std::string &tenantId, const std::string &collId, const utils::AuditIdentity &who);

// Tags
drogon::Task<dto::BaseApiResponse> listTags(DbClientPtr db, const std::string &tenantId);
drogon::Task<dto::BaseApiResponse> createTag(DbClientPtr db, const std::string &tenantId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> deleteTag(DbClientPtr db, const std::string &tenantId, const std::string &tagId, const utils::AuditIdentity &who);

// Custom Attributes & Metadata
drogon::Task<dto::BaseApiResponse> listCustomAttributes(DbClientPtr db, const std::string &tenantId);
drogon::Task<dto::BaseApiResponse> createCustomAttribute(DbClientPtr db, const std::string &tenantId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> deleteCustomAttribute(DbClientPtr db, const std::string &tenantId, const std::string &attrId, const utils::AuditIdentity &who);

// Custom Identifiers
drogon::Task<dto::BaseApiResponse> listCustomIdentifiers(DbClientPtr db, const std::string &tenantId);
drogon::Task<dto::BaseApiResponse> createCustomIdentifier(DbClientPtr db, const std::string &tenantId, const std::string &unitId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> generateIdentifier(DbClientPtr db, const std::string &tenantId, const std::string &idId);

// ACL
drogon::Task<dto::BaseApiResponse> listAclEntries(DbClientPtr db, const std::string &tenantId, const std::string &entityType, const std::string &entityId);
drogon::Task<dto::BaseApiResponse> createAclEntry(DbClientPtr db, const std::string &tenantId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> deleteAclEntry(DbClientPtr db, const std::string &tenantId, const std::string &aclId, const utils::AuditIdentity &who);
drogon::Task<bool> checkPermission(DbClientPtr db, const std::string &tenantId, const std::string &entityType, const std::string &entityId, const std::string &userId, const std::string &perm);

// Shares
drogon::Task<dto::BaseApiResponse> listShares(DbClientPtr db, const std::string &tenantId, const std::string &docId);
drogon::Task<dto::BaseApiResponse> createShare(DbClientPtr db, const std::string &tenantId, const std::string &docId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> revokeShare(DbClientPtr db, const std::string &tenantId, const std::string &shareId, const utils::AuditIdentity &who);

// Legal Holds
drogon::Task<dto::BaseApiResponse> listLegalHolds(DbClientPtr db, const std::string &tenantId);
drogon::Task<dto::BaseApiResponse> createLegalHold(DbClientPtr db, const std::string &tenantId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> releaseLegalHold(DbClientPtr db, const std::string &tenantId, const std::string &holdId, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> applyLegalHold(DbClientPtr db, const std::string &tenantId, const std::string &holdId, const std::string &docId, const utils::AuditIdentity &who);
drogon::Task<bool> isDocUnderLegalHold(DbClientPtr db, const std::string &tenantId, const std::string &docId);

// E-Signatures
drogon::Task<dto::BaseApiResponse> listSignatures(DbClientPtr db, const std::string &tenantId, const std::string &docId);
drogon::Task<dto::BaseApiResponse> requestSignature(DbClientPtr db, const std::string &tenantId, const std::string &docId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> signDocument(DbClientPtr db, const std::string &tenantId, const std::string &sigId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> verifySignature(DbClientPtr db, const std::string &tenantId, const std::string &sigId);

// ERP Entity Links
drogon::Task<dto::BaseApiResponse> listEntityLinks(DbClientPtr db, const std::string &tenantId, const std::string &docId);
drogon::Task<dto::BaseApiResponse> createEntityLink(DbClientPtr db, const std::string &tenantId, const std::string &docId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> deleteEntityLink(DbClientPtr db, const std::string &tenantId, const std::string &linkId, const utils::AuditIdentity &who);

// Quotas & Settings
drogon::Task<dto::BaseApiResponse> getQuotas(DbClientPtr db, const std::string &tenantId);
drogon::Task<dto::BaseApiResponse> updateQuotas(DbClientPtr db, const std::string &tenantId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> getSettings(DbClientPtr db, const std::string &tenantId);
drogon::Task<dto::BaseApiResponse> updateSettings(DbClientPtr db, const std::string &tenantId, const Json::Value &body, const utils::AuditIdentity &who);

// Workflow Templates, Instances & Tasks
drogon::Task<dto::BaseApiResponse> listWorkflowTemplates(DbClientPtr db, const std::string &tenantId);
drogon::Task<dto::BaseApiResponse> createWorkflowTemplate(DbClientPtr db, const std::string &tenantId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> deleteWorkflowTemplate(DbClientPtr db, const std::string &tenantId, const std::string &tplId, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> listWorkflowInstances(DbClientPtr db, const std::string &tenantId, const std::string &docId);
drogon::Task<dto::BaseApiResponse> startWorkflowInstance(DbClientPtr db, const std::string &tenantId, const std::string &docId, const std::string &tplId, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> listWorkflowTasks(DbClientPtr db, const std::string &tenantId, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> completeWorkflowTask(DbClientPtr db, const std::string &tenantId, const std::string &taskId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> sweepWorkflowTasks(DbClientPtr db, const std::string &tenantId, const utils::AuditIdentity &who);

// Annotations
drogon::Task<dto::BaseApiResponse> listAnnotations(DbClientPtr db, const std::string &tenantId, const std::string &docId);
drogon::Task<dto::BaseApiResponse> createAnnotation(DbClientPtr db, const std::string &tenantId, const std::string &docId, const Json::Value &body, const utils::AuditIdentity &who);
drogon::Task<dto::BaseApiResponse> deleteAnnotation(DbClientPtr db, const std::string &tenantId, const std::string &annotId, const utils::AuditIdentity &who);

// Tamper-evident Audit Verification
drogon::Task<dto::BaseApiResponse> verifyAuditChain(DbClientPtr db, const std::string &tenantId, const std::string &docId);

// AI & Ingestion
drogon::Task<dto::BaseApiResponse> classifyDocument(DbClientPtr db, const std::string &tenantId, const std::string &docId);
drogon::Task<dto::BaseApiResponse> ragSearch(DbClientPtr db, const std::string &tenantId, const std::string &query);

} // namespace business_desk::domain_services::dm_enterprise
