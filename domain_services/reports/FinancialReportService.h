#pragma once
#include <drogon/drogon.h>
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
namespace business_desk::domain_services {
class FinancialReportService {public:
 static drogon::Task<dto::BaseApiResponse> execute(std::string unit,std::string through,Json::Value mappings,utils::AuditIdentity who,bool write=false);
};
}
