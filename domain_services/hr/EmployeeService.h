#pragma once
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
#include <drogon/drogon.h>
namespace business_desk::domain_services {
class EmployeeService {
public:
  static drogon::Task<dto::BaseApiResponse>
  execute(std::string op, std::string id, Json::Value body, int page, int size,
          std::string query, utils::AuditIdentity who);
};
} // namespace business_desk::domain_services
