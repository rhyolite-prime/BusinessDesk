#pragma once
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
#include <drogon/drogon.h>
namespace business_desk::domain_services {
// Shared supplier/employee payment and customer receipt workflow. Retains the existing class name
// and controller routes so supplier clients need no endpoint migration.
class SupplierVoucherService {
public:
  static drogon::Task<dto::BaseApiResponse> execute(std::string op,
                                                    std::string id,
                                                    Json::Value body,
                                                    utils::AuditIdentity who);
};
} // namespace business_desk::domain_services
