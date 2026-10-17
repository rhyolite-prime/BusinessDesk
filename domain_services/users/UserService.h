//
// Created by Emmanuel Addo-Odame on 17/10/2026.
//

#ifndef BUSINESSDESKAPI_USERSERVICE_H
#define BUSINESSDESKAPI_USERSERVICE_H
#include "dto/BaseApiResponse.h"
#include <drogon/drogon.h>
#include "dto/UserDto.h"
#include "dto/UserGroupDto.h"

namespace business_desk::domain_services {

    class UserService {

    public:

        drogon::Task<dto::BaseApiResponse> getAllUsers(int pageNo, int pageSize, const std::string &tenantId, const std::string &query);

        drogon::Task<dto::BaseApiResponse> createUser(const dto::UserDto &roleDto);

        drogon::Task<dto::BaseApiResponse> updateUser(const dto::UserDto &roleDto, const std::string &roleId);

        drogon::Task<dto::BaseApiResponse> deleteUser(const std::string &roleId);

        // user groups
        drogon::Task<dto::BaseApiResponse> getAllUserGroups(int pageNo, int pageSize, const std::string &tenantId, const std::string &query);

        drogon::Task<dto::BaseApiResponse> createUserGroup(const dto::UserGroupDto &userGroupDto);

        drogon::Task<dto::BaseApiResponse> updateUserGroup(const dto::UserGroupDto &userGroupDto, const std::string &userGroupId);

        drogon::Task<dto::BaseApiResponse> deleteUserGroup(const std::string &userGroupId);


    };
}
#endif //BUSINESSDESKAPI_USERSERVICE_H
