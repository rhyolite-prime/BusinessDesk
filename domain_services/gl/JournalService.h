#pragma once
#include <drogon/drogon.h>
#include <drogon/orm/CoroMapper.h>
#include "dto/BaseApiResponse.h"
#include "utils/AuditUtil.h"
namespace business_desk::domain_services {
class JournalService {public:
 // Internal atomic integration: caller owns commit/rollback; never exposed as HTTP input.
 static drogon::Task<dto::BaseApiResponse> createAndPost(drogon::orm::DbClientPtr transaction,Json::Value payload,utils::AuditIdentity who);
 static drogon::Task<dto::BaseApiResponse> execute(std::string op,std::string id,std::string unit,Json::Value body,utils::AuditIdentity who);
};
}
