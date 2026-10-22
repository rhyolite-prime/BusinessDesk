#pragma once
#include <drogon/drogon.h>
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
namespace business_desk::domain_services {
class SystemNumberService {
public:
 static drogon::Task<dto::BaseApiResponse> execute(std::string op,std::string id,Json::Value body,
   int page,int size,std::string query,utils::AuditIdentity identity,bool host);
};
}
