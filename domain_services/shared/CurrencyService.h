#pragma once
#include <drogon/drogon.h>
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
namespace business_desk::domain_services {
class CurrencyService {
public:
    // hostScope is selected by a HostJwtAuthFilter-protected route, never JSON.
    static drogon::Task<dto::BaseApiResponse> execute(std::string operation,std::string id,
        Json::Value input,int page,int size,std::string query,utils::AuditIdentity identity,bool hostScope);
};
}
