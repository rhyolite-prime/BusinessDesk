#pragma once
#include <drogon/drogon.h>
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"

namespace business_desk::domain_services {
class LedgerDashboardService {
public:
  static drogon::Task<dto::BaseApiResponse> execute(
      std::string operation, Json::Value filters, utils::AuditIdentity who);
};
}
