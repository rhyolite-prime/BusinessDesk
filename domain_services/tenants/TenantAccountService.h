#pragma once
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
#include <drogon/drogon.h>
namespace business_desk::domain_services {
class TenantAccountService {
public:
  static drogon::Task<dto::BaseApiResponse>
  execute(std::string op, std::string id, Json::Value body,
          utils::AuditIdentity who, bool host);
  static std::string moduleForPath(const std::string &path);
  static drogon::Task<bool> moduleAllowed(std::string tenant,
                                          std::string module);
};
} // namespace business_desk::domain_services
