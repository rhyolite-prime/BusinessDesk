#pragma once
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
#include <drogon/drogon.h>
namespace business_desk::domain_services {
class PreferencesService {
public:
  static drogon::Task<dto::BaseApiResponse>
  execute(std::string op, Json::Value body, utils::AuditIdentity who);
};
} // namespace business_desk::domain_services
