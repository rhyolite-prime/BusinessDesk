//
// Created by Emmanuel Addo-Odame on 17/10/2026.
//

#ifndef BUSINESSDESKAPI_ROLESERVICE_H
#define BUSINESSDESKAPI_ROLESERVICE_H
#include "dto/BaseApiResponse.h"
#include <drogon/drogon.h>
#include "dto/RoleDto.h"

namespace business_desk::domain_services {

    class RoleService {

    public:

        drogon::Task<dto::BaseApiResponse> getAllPermissions();

        drogon::Task<dto::BaseApiResponse> getAll(int pageNo, int pageSize, const std::string &tenantId, const std::string &query);

        drogon::Task<dto::BaseApiResponse> create(const dto::RoleDto &roleDto);

        drogon::Task<dto::BaseApiResponse> update(const dto::RoleDto &roleDto, const std::string &roleId);

        drogon::Task<dto::BaseApiResponse> deleteRole(const std::string &roleId);

    };
    
}
#endif //BUSINESSDESKAPI_ROLESERVICE_H
