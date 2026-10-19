#pragma once
#include <drogon/drogon.h>
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
namespace business_desk::domain_services {
class BankService {
public:
    static drogon::Task<dto::BaseApiResponse> execute(std::string operation, bool branch,
        std::string bankId, std::string id, Json::Value input, int page, int size,
        std::string query, utils::AuditIdentity identity);
};
}
