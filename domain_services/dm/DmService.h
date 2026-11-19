#pragma once
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
#include <drogon/drogon.h>
#include <string>

namespace business_desk::domain_services {

// Document Management Service (LogicalDOC enterprise DMS specification).
// Provides hierarchical folder taxonomy, template-driven custom metadata,
// strict version control with check-in/check-out locking, full-text and
// parametric search, approval workflows, cross-document relations, collaboration
// notes, retention policies, recycle bin, and immutable audit logging.
class DmService {
public:
  static drogon::Task<dto::BaseApiResponse>
  execute(std::string op, std::string id, std::string subId, Json::Value body,
          int page, int size, std::string query, std::string unitId,
          utils::AuditIdentity who);
};

} // namespace business_desk::domain_services
