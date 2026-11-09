#pragma once
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
#include <drogon/drogon.h>
namespace business_desk::domain_services {
class HrProfileService {
public:
  static drogon::Task<dto::BaseApiResponse> execute(std::string op, std::string id, Json::Value body, std::string page, utils::AuditIdentity who);
};
}
