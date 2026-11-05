#pragma once
#include <drogon/drogon.h>
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
namespace business_desk::domain_services {
class BudgetService {public:
 static drogon::Task<dto::BaseApiResponse> execute(std::string op,std::string id,std::string unit,Json::Value body,utils::AuditIdentity who);
};
}
