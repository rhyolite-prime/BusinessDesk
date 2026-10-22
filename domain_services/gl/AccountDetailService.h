#pragma once
#include <drogon/drogon.h>
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
namespace business_desk::domain_services {
class AccountDetailService {
public:
    static drogon::Task<dto::BaseApiResponse> execute(std::string operation, std::string id,
        std::string unitId, Json::Value input, int pageNo, int pageSize, std::string query,
        utils::AuditIdentity identity);
};
}
