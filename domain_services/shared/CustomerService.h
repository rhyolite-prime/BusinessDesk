#pragma once
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
#include <drogon/drogon.h>
namespace business_desk::domain_services {
class CustomerService {
public:
  static drogon::Task<dto::BaseApiResponse>
  execute(std::string op, std::string id, Json::Value body,
          utils::AuditIdentity identity);
};
} // namespace business_desk::domain_services
