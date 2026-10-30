#pragma once
#include <drogon/drogon.h>
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
namespace business_desk::domain_services {
class CompanyProfileService {
public:
 static drogon::Task<dto::BaseApiResponse> execute(std::string op,Json::Value body,utils::AuditIdentity identity);
};
}
