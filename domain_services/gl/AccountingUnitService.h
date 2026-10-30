#pragma once
#include "GlService.h"
namespace business_desk::domain_services {
class AccountingUnitService {
public:
    static drogon::Task<dto::BaseApiResponse> execute(std::string operation, std::string id,
        Json::Value input, int pageNo, int pageSize, std::string query, utils::AuditIdentity identity);
};
}
