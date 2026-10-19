#pragma once
#include <drogon/drogon.h>
#include <drogon/utils/coroutine.h>
#include <string>
#include "dto/BaseApiResponse.h"
namespace business_desk::domain_services {
struct VerifiedTotpIdentity { std::string userId, tenantId; };
class TotpService {
public:
    static drogon::Task<dto::BaseApiResponse> begin(std::string userId, std::string tenantId, std::string accountLabel, std::string passwordHash);
    // Empty identity means expired/consumed/invalid/rate-limited. DB/config errors propagate.
    static drogon::Task<VerifiedTotpIdentity> verify(std::string challenge, std::string code);
};
}
