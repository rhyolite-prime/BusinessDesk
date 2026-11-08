#pragma once
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
#include <drogon/drogon.h>
namespace business_desk::domain_services {
class SupplierService {
public:
  static drogon::Task<dto::BaseApiResponse>
  execute(std::string op, bool group, std::string id, Json::Value body,
          int page, int size, std::string query, std::string kind,
          std::string unitId, utils::AuditIdentity who);
};
} // namespace business_desk::domain_services
