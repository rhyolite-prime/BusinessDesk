//
// Created by Emmanuel Addo-Odame on 17/10/2026.
//

#ifndef BUSINESSDESKAPI_TENANTSERVICE_H
#define BUSINESSDESKAPI_TENANTSERVICE_H
#include <drogon/drogon.h>

#include "dto/BaseApiResponse.h"
#include "dto/UserDto.h"
#include "utils/AuditUtil.h"

namespace business_desk::domain_services {

    class TenantService {

    public:

        drogon::Task<dto::BaseApiResponse> getAllTenants(int pageNo, int pageSize,  const std::string &query); // if tenantId is empty , it means we query for host users by default

        drogon::Task<dto::BaseApiResponse> createTenant(const dto::TenantDto &dto, const utils::AuditIdentity &identity);

        drogon::Task<dto::BaseApiResponse> updateTenant(const dto::TenantDto &dto, const std::string &tenantId, const utils::AuditIdentity &identity);

        drogon::Task<dto::BaseApiResponse> activateTenant(const std::string &tenantId, const utils::AuditIdentity &identity);

        drogon::Task<dto::BaseApiResponse> deActivateTenant(const std::string &tenantId, const utils::AuditIdentity &identity);

        drogon::Task<dto::BaseApiResponse> deleteTenant(const std::string &tenantId, const utils::AuditIdentity &identity);



    };

}
#endif //BUSINESSDESKAPI_TENANTSERVICE_H
