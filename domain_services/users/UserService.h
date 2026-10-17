//
// Created by Emmanuel Addo-Odame on 17/10/2026.
//

#ifndef BUSINESSDESKAPI_USERSERVICE_H
#define BUSINESSDESKAPI_USERSERVICE_H
#include "dto/BaseApiResponse.h"
#include <drogon/drogon.h>

#include "dto/PasskeyLoginDto.h"
#include "dto/UserDto.h"
#include "dto/UserGroupDto.h"
#include "utils/AuditUtil.h"

namespace business_desk::domain_services {

    class UserService {

    public:

        drogon::Task<dto::BaseApiResponse> getAllUsers(int pageNo, int pageSize, const std::string &tenantId, const std::string &query); // if tenantId is empty , it means we query for host users by default

        drogon::Task<dto::BaseApiResponse> createUser(const dto::UserDto &dto, const utils::AuditIdentity &identity);

        drogon::Task<dto::BaseApiResponse> updateUser(const dto::UserDto &dto, const std::string &roleId, const utils::AuditIdentity &identity);

        drogon::Task<dto::BaseApiResponse> deleteUser(const std::string &userId, const utils::AuditIdentity &identity);

        // user groups
        drogon::Task<dto::BaseApiResponse> getAllUserGroups(int pageNo, int pageSize, const std::string &tenantId, const std::string &query);

        drogon::Task<dto::BaseApiResponse> createUserGroup(const dto::UserGroupDto &dto, const utils::AuditIdentity &identity);

        drogon::Task<dto::BaseApiResponse> updateUserGroup(const dto::UserGroupDto &dto, const std::string &userGroupId, const utils::AuditIdentity &identity);

        drogon::Task<dto::BaseApiResponse> deleteUserGroup(const std::string &userGroupId, const utils::AuditIdentity &identity);

        // auth

        drogon::Task<dto::BaseApiResponse> validateUserPasskeys(const dto::PasskeyLoginDto &dto);

        drogon::Task<dto::BaseApiResponse> validateHostUserCredentials(const dto::SigninDto &dto);

        drogon::Task<dto::BaseApiResponse> validateTenantUserCredentials(const dto::SigninDto &dto);


    };
}
#endif //BUSINESSDESKAPI_USERSERVICE_H
