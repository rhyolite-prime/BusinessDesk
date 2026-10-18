//
// Created by Emmanuel Addo-Odame on 17/10/2026.
//
#include "UserService.h"
#include "Users.h"
#include "Tenants.h"
#include "Roles.h"
#include <unordered_set>
#include <algorithm>
#include <cctype>
#include <chrono>
#include <stdexcept>
#include <bcrypt.h>
#include "UserGroups.h"
#include <drogon/orm/CoroMapper.h>
#include <jwt-cpp/jwt.h>

#include "constants/ErrorCodes.h"
#include "constants/TenantConstants.h"
#include "domain_services/permissions/PermissionService.h"
#include "utils/AuditUtil.h"

using namespace drogon::orm;
using drogon_model::BusinessDesk::UserGroups;
using drogon_model::BusinessDesk::Users;

namespace business_desk::domain_services {

namespace {
dto::BaseApiResponse failure(int code, const std::string &message) {
    dto::BaseApiResponse r;
    r.message = message;
    r.error["code"] = code;
    r.error["message"] = message;
    return r;
}
Criteria userScope(const std::string &tenantId) {
    const auto scope = tenantId.empty()
        ? (Criteria(Users::Cols::_tenant_id, CompareOperator::IsNull) ||
           Criteria(Users::Cols::_tenant_id, CompareOperator::EQ, std::string(constants::kHostTenantId)))
        : Criteria(Users::Cols::_tenant_id, CompareOperator::EQ, tenantId);
    // Keep deletion independent of activation: inactive, non-deleted users
    // remain manageable, but deleted users never enter a service query.
    return scope && Criteria(Users::Cols::_is_deleted, CompareOperator::EQ, false);
}
std::string normalize(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(),
                   [](unsigned char c) { return std::tolower(c); });
    return value;
}
drogon::Task<bool> validGroupReferences(const dto::UserGroupDto &input, const std::string &selfId) {
    auto db = drogon::app().getDbClient();
    try {
        CoroMapper<UserGroups> groups(db);
        std::unordered_set<std::string> seen;
        if (!selfId.empty()) seen.insert(selfId);
        auto parent = input.getParentId();
        while (!parent.empty()) {
            if (!seen.insert(parent).second) co_return false;
            auto group = co_await groups.findOne(Criteria(UserGroups::Cols::_id, CompareOperator::EQ, parent) &&
                Criteria(UserGroups::Cols::_is_deleted, CompareOperator::EQ, false));
            parent = group.getValueOfParentId();
        }
        using Role = drogon_model::BusinessDesk::Roles;
        CoroMapper<Role> roles(db);
        for (const auto &role : input.getRoles()) {
            if (role.id.empty()) co_return false;
            co_await roles.findOne(Criteria(Role::Cols::_id, CompareOperator::EQ, role.id) &&
                Criteria(Role::Cols::_tenant_id, CompareOperator::IsNull));
        }
        co_return true;
    } catch (const UnexpectedRows &) { co_return false; }
}
// One issuer for both credential flows; claim names match the JWT filters.
drogon::Task<dto::BaseApiResponse> issueToken(Users user, bool host,
                                              std::string tenantName = "") {
    const auto config = drogon::app().getCustomConfig()["JwtBearer"];
    const auto key = config["JwtSecurityKey"].asString();
    const auto issuer = config["JwtIssuer"].asString();
    const int lifetime = config.get("JwtExpirationTime", 3600).asInt();
    if (key.empty() || issuer.empty() || lifetime <= 0)
        co_return failure(constants::ERR_INTERNAL, "JWT configuration is invalid.");
    auto permissions = co_await PermissionService::getUserPermissions(user.getValueOfId());
    Json::Value array(Json::arrayValue);
    for (const auto &permission : permissions) array.append(permission);
    Json::FastWriter writer;
    const auto now = std::chrono::system_clock::now();
    auto builder = jwt::create().set_issuer(issuer).set_type("JWT")
        .set_subject(user.getValueOfId()).set_issued_at(now)
        .set_expires_at(now + std::chrono::seconds(lifetime))
        .set_payload_claim("permissions", jwt::claim(writer.write(array)));
    if (!config["JwtAudience"].asString().empty())
        builder.set_audience(config["JwtAudience"].asString());
    if (host) {
        builder.set_payload_claim("hostUserId", jwt::claim(user.getValueOfId()))
            .set_payload_claim("hostUserEmail", jwt::claim(user.getValueOfEmail()))
            .set_payload_claim("hostUserName", jwt::claim(user.getValueOfUsername().empty() ? user.getValueOfEmail() : user.getValueOfUsername()));
    } else {
        builder.set_payload_claim("tenantId", jwt::claim(user.getValueOfTenantId()))
            .set_payload_claim("tenantName", jwt::claim(tenantName))
            .set_payload_claim("tenantUserId", jwt::claim(user.getValueOfId()))
            .set_payload_claim("tenantUserEmail", jwt::claim(user.getValueOfEmail()));
    }
    dto::BaseApiResponse response;
    response.result["token"] = builder.sign(jwt::algorithm::hs256{key});
    user.setLastActive(trantor::Date::now());
    utils::applyUpdateAudit(user, utils::AuditIdentity{user.getValueOfTenantId(), user.getValueOfId()});
    CoroMapper<Users> mapper(drogon::app().getDbClient());
    co_await mapper.update(user);
    response.success = true;
    response.message = "Authentication successful";
    response.result["expiresIn"] = lifetime;
    response.result["permissions"] = array;
    response.result["userId"] = user.getValueOfId();
    response.result["username"] = user.getValueOfUsername();
    response.result["email"] = user.getValueOfEmail();
    response.result["fullName"] = user.getValueOfFirstName() + " " + user.getValueOfLastName();
    if (!host) response.result["tenantId"] = user.getValueOfTenantId();
    co_return response;
}
}


  drogon::Task<dto::BaseApiResponse> UserService::getAllUsers(int pageNo, int pageSize, const std::string &tenantId, const std::string &query) {

        auto dbClient = drogon::app().getDbClient();
        auto mp = CoroMapper<Users>(dbClient);

    // 1. Build the search criteria
      pageNo = std::max(pageNo, 1);
      pageSize = std::clamp(pageSize, 1, 200);
      Criteria searchCriteria = userScope(tenantId);
      if (!query.empty()) {
        std::string likeQuery = "%" + query + "%";
        searchCriteria = searchCriteria && (
            Criteria(Users::Cols::_first_name, CompareOperator::Like, likeQuery) ||
            Criteria(Users::Cols::_email, CompareOperator::Like, likeQuery) ||
            Criteria(Users::Cols::_username, CompareOperator::Like, likeQuery) ||
            Criteria(Users::Cols::_last_name, CompareOperator::Like, likeQuery));
      }

      dto::BaseApiResponse response;

      try {
        // 2. Get the total count matching the criteria
        size_t totalCount = co_await mp.count(searchCriteria);

        if (totalCount == 0) {
          response.success = true;
          response.result["data"] = Json::arrayValue;
          response.result["totalCount"] = 0;
          response.result["pageNo"] = pageNo;
          response.result["pageSize"] = pageSize;
          response.result["totalPages"] = 0;
          response.result["lowerBound"] = 0;
          response.result["upperBound"] = 0;

          co_return response;
        }

        // 3. Find the paginated data
        const size_t offset = static_cast<size_t>(pageNo - 1) * pageSize;
        auto users =
            co_await mp.orderBy(Users::Cols::_id).limit(pageSize).offset(offset).findBy(searchCriteria);



        // 4. Build the final response
        response.success = true;
        response.result["totalCount"] = (Json::UInt64)totalCount;
        response.result["pageNo"] = pageNo;
        response.result["pageSize"] = pageSize;
        response.result["totalPages"] =
            (int)((totalCount + pageSize - 1) / pageSize);
        response.result["lowerBound"] = users.empty() ? Json::UInt64(0) : Json::UInt64(offset + 1);
        response.result["upperBound"] = users.empty() ? Json::UInt64(0) : Json::UInt64(offset + users.size());

        Json::Value data = Json::arrayValue;

        for (const auto &role : users) {
          Json::Value roleJson = role.toJson();
          Json::Value camelCaseRole;
          camelCaseRole["id"] = roleJson["id"];
          camelCaseRole["firstName"] = roleJson["first_name"];
          camelCaseRole["lastName"] = roleJson["last_name"];
          camelCaseRole["email"] = roleJson["email"];
          camelCaseRole["username"] = roleJson["username"];
          camelCaseRole["phoneNumber"] = roleJson["phone_number"];
          camelCaseRole["country"] = roleJson["country"];
          camelCaseRole["profileImageUrl"] = roleJson["profile_image"];
          camelCaseRole["isLockedOut"] = roleJson["is_locked_out"];
          camelCaseRole["isActive"] = roleJson["is_active"];
          camelCaseRole["createdAt"] = roleJson["created_at"];
          camelCaseRole["lastModifiedAt"] = roleJson["last_modified_at"];
          camelCaseRole["updatedAt"] = roleJson["last_modified_at"]; // Legacy response alias.
          data.append(camelCaseRole);
        }
        response.result["data"] = data;

      } catch (const drogon::orm::DrogonDbException &e) {
        response.success = false;
        response.error["code"] = constants::ERR_DB_QUERY;
        response.error["message"] = "Database error while fetching users.";
        response.error["detail"] = e.base().what();
      }
    co_return response;


    }


    drogon::Task<dto::BaseApiResponse> UserService::createUser(const dto::UserDto &dto, const utils::AuditIdentity &identity) {

    auto dbClient = drogon::app().getDbClient();
    CoroMapper<Users> mp(dbClient);

    if (!identity.hasUser()) co_return failure(constants::ERR_UNAUTHORIZED, "Authenticated identity required.");
    if (dto.getEmail().empty() || dto.getPassword().empty())
        co_return failure(constants::ERR_VALIDATION, "Email and password are required.");
    Users newUser;
    newUser.setFirstName(dto.getFirstName());
    newUser.setLastName(dto.getLastName());
    std::string standardEmail = dto.getEmail();
    std::transform(standardEmail.begin(), standardEmail.end(),
                   standardEmail.begin(),
                   [](unsigned char c) { return std::tolower(c); });

    newUser.setEmail(standardEmail);
    if (dto.getUsername().empty()) newUser.setUsernameToNull();
    else newUser.setUsername(normalize(dto.getUsername()));
    if (!identity.tenantId.empty()) newUser.setTenantId(identity.tenantId);
    else newUser.setTenantIdToNull();
    newUser.setIsHostAdminUser(identity.tenantId.empty());
    newUser.setIsTenantAdminUser(false);
    newUser.setPhoneNumber(dto.getPhoneNumber());
    newUser.setCountry(dto.getCountry());
    newUser.setPasswordHash(bcrypt::generateHash(dto.getPassword()));
    newUser.setIsActive(true);
    newUser.setIsLockedOut(false);
    newUser.setIsDeleted(false);

    dto::BaseApiResponse response;
    try {

      auto identifiers = Criteria(Users::Cols::_email, CompareOperator::EQ, standardEmail);
      if (!dto.getUsername().empty()) identifiers = identifiers ||
          Criteria(Users::Cols::_username, CompareOperator::EQ, normalize(dto.getUsername()));
      auto duplicate = userScope(identity.tenantId) && identifiers;
      if (co_await mp.count(duplicate))
          co_return failure(constants::ERR_DUPLICATE_RESOURCE, "Email or username already exists.");
      utils::applyCreateAudit(newUser, identity);
      Users publication = co_await mp.insert(newUser);
      response.success = true;
      response.message = "User created successfully";
      response.result["id"] = publication.getValueOfId();
    } catch (const UniqueViolation &) {
      co_return failure(constants::ERR_DUPLICATE_RESOURCE, "Email or username already exists.");
    } catch (const drogon::orm::DrogonDbException &e) {
      response.success = false;
      response.message = "Database error while creating user";
      response.error["code"] = constants::ERR_DB_QUERY;
    }
    co_return response;

    }


    drogon::Task<dto::BaseApiResponse> UserService::updateUser(const dto::UserDto &dto, const std::string &userId, const utils::AuditIdentity &identity) {

    auto dbClient = drogon::app().getDbClient();
    CoroMapper<Users> mp(dbClient);

    dto::BaseApiResponse response;

    try {

      if (!identity.hasUser()) co_return failure(constants::ERR_UNAUTHORIZED, "Authenticated identity required.");
      Criteria criteria = userScope(identity.tenantId) && Criteria(Users::Cols::_id, CompareOperator::EQ, userId);

      Users user = co_await mp.findOne(criteria);

      if (!dto.getFirstName().empty()) {
        user.setFirstName(dto.getFirstName());
      }

      if (!dto.getLastName().empty()) {
        user.setLastName(dto.getLastName());
      }

      if (!dto.getEmail().empty()) {
        std::string standardEmail = dto.getEmail();
        std::transform(standardEmail.begin(), standardEmail.end(),
                       standardEmail.begin(),
                       [](unsigned char c) { return std::tolower(c); });
        user.setEmail(standardEmail);
      }

      if (!dto.getPhoneNumber().empty()) {
        user.setPhoneNumber(dto.getPhoneNumber());
      }

      if (!dto.getCountry().empty()) {
        user.setCountry(dto.getCountry());
      }

      if (!dto.getUsername().empty()) {
        user.setUsername(normalize(dto.getUsername()));
      }

      if (!dto.getPassword().empty()) {
        user.setPasswordHash(bcrypt::generateHash(dto.getPassword()));
      }

      utils::applyUpdateAudit(user, identity);
      auto identifiers = Criteria(Users::Cols::_email, CompareOperator::EQ, user.getValueOfEmail());
      if (!user.getValueOfUsername().empty()) identifiers = identifiers ||
          Criteria(Users::Cols::_username, CompareOperator::EQ, user.getValueOfUsername());
      auto duplicate = userScope(identity.tenantId) &&
          Criteria(Users::Cols::_id, CompareOperator::NE, userId) && identifiers;
      if (co_await mp.count(duplicate))
          co_return failure(constants::ERR_DUPLICATE_RESOURCE, "Email or username already exists.");
      co_await mp.update(user);

      response.success = true;
      response.message = "User updated successfully";
    } catch (const UnexpectedRows &) {
      co_return failure(constants::ERR_RESOURCE_NOT_FOUND, "User not found.");
    } catch (const UniqueViolation &) {
      co_return failure(constants::ERR_DUPLICATE_RESOURCE, "Email or username already exists.");
    } catch (const DrogonDbException &e) {
      response.success = false;
      response.message = "Database error while updating user";
      response.error["code"] = constants::ERR_DB_QUERY;
      response.error["detail"] = e.base().what();
    }

    co_return response;

    }

    drogon::Task<dto::BaseApiResponse> UserService::deleteUser(const std::string &userId, const utils::AuditIdentity &identity) {
        if (!identity.hasUser()) co_return failure(constants::ERR_UNAUTHORIZED, "Authenticated identity required.");
        if (userId == identity.userId) co_return failure(constants::ERR_VALIDATION, "Cannot delete your own account.");
        try {
            CoroMapper<Users> mapper(drogon::app().getDbClient());
            auto user = co_await mapper.findOne(userScope(identity.tenantId) && Criteria(Users::Cols::_id, CompareOperator::EQ, userId));
            // Retain the row and its references; stamp the actor and deletion time.
            user.setIsDeleted(true);
            user.setIsActive(false);
            user.setIsLockedOut(true);
            utils::applyDeleteAudit(user, identity);
            utils::applyUpdateAudit(user, identity);
            co_await mapper.update(user);
            dto::BaseApiResponse response;
            response.success = true;
            response.result["id"] = userId;
            response.result["deleted"] = true;
            co_return response;
        } catch (const UnexpectedRows &) {
            co_return failure(constants::ERR_RESOURCE_NOT_FOUND, "User not found.");
        } catch (const DrogonDbException &) {
            co_return failure(constants::ERR_DB_QUERY, "Failed to delete user.");
        }
    }

    drogon::Task<dto::BaseApiResponse> UserService::getAllUserGroups(int pageNo, int pageSize, const std::string &tenantId, const std::string &query) {

      auto dbClient = drogon::app().getDbClient();
  auto mp = CoroMapper<UserGroups>(dbClient);

  if (!tenantId.empty()) co_return failure(constants::ERR_PERMISSION_DENIED, "User groups are host-managed in the current schema.");
  pageNo = std::max(pageNo, 1);
  pageSize = std::clamp(pageSize, 1, 200);
  Criteria searchCriteria(UserGroups::Cols::_is_deleted, CompareOperator::EQ, false);
  if (!query.empty()) {
    std::string likeQuery = "%" + query + "%";
    searchCriteria = searchCriteria &&
        Criteria(UserGroups::Cols::_title, CompareOperator::Like, likeQuery);
  }

  dto::BaseApiResponse response;
  try {
    size_t totalCount = co_await mp.count(searchCriteria);
    if (totalCount == 0) {
      response.success = true;
      response.result["data"] = Json::arrayValue;
      response.result["totalCount"] = 0;
      response.result["pageNo"] = pageNo;
      response.result["pageSize"] = pageSize;
      response.result["totalPages"] = 0;
      response.result["lowerBound"] = 0;
      response.result["upperBound"] = 0;
      co_return response;
    }

    const size_t offset = static_cast<size_t>(pageNo - 1) * pageSize;
    auto groups =
        co_await mp.limit(pageSize).offset(offset).findBy(searchCriteria);



    response.success = true;
    response.result["totalCount"] = (Json::UInt64)totalCount;
    response.result["pageNo"] = pageNo;
    response.result["pageSize"] = pageSize;
    response.result["totalPages"] =
        (int)((totalCount + pageSize - 1) / pageSize);
    response.result["lowerBound"] = groups.empty() ? Json::UInt64(0) : Json::UInt64(offset + 1);
    response.result["upperBound"] = groups.empty() ? Json::UInt64(0) : Json::UInt64(offset + groups.size());

    Json::Value data = Json::arrayValue;

    for (const auto &group : groups) {
      Json::Value groupJson = group.toJson();
      Json::Value camelCaseGroup;
      camelCaseGroup["id"] = groupJson["id"];
      camelCaseGroup["title"] = groupJson["title"];
      camelCaseGroup["parentId"] = groupJson["parent_id"];

      if (group.getRoles()) {
        Json::Value rolesJson;
        Json::Reader reader;
        if (reader.parse(group.getValueOfRoles(), rolesJson)) {
          camelCaseGroup["roles"] = rolesJson;
        } else {
          camelCaseGroup["roles"] = group.getValueOfRoles();
        }
      } else {
        camelCaseGroup["roles"] = Json::arrayValue;
      }

      camelCaseGroup["activeUsers"] = groupJson["active_users"];
      camelCaseGroup["blockedUsers"] = groupJson["blocked_users"];
      camelCaseGroup["createdAt"] = groupJson["created_at"];

      data.append(camelCaseGroup);
    }
    response.result["data"] = data;

  } catch (const DrogonDbException &e) {
    response.success = false;
    response.error["message"] = "Database error while fetching user groups.";
    response.error["detail"] = e.base().what();
  }
  co_return response;

    }

    drogon::Task<dto::BaseApiResponse> UserService::createUserGroup(const dto::UserGroupDto &dto, const utils::AuditIdentity &identity) {

    if (!identity.hasUser() || !identity.tenantId.empty())
        co_return failure(constants::ERR_PERMISSION_DENIED, "User groups are host-managed in the current schema.");
    auto dbClient = drogon::app().getDbClient();
    auto mp = CoroMapper<UserGroups>(dbClient);

    dto::BaseApiResponse response;
    try {
      size_t count = co_await mp.count(Criteria(UserGroups::Cols::_title,
                                                CompareOperator::EQ,
                                                dto.getTitle()) &&
                                    Criteria(UserGroups::Cols::_is_deleted, CompareOperator::EQ, false));
      if (count > 0) {
        response.success = false;
        response.message = "User group with this name already exists";
        response.error["code"] = constants::ERR_DUPLICATE_RESOURCE;
        co_return response;
      }

      if (!(co_await validGroupReferences(dto, "")))
          co_return failure(constants::ERR_VALIDATION, "Invalid group parent, cycle, or role.");
      UserGroups group;
      if (dto.getTitle().empty()) co_return failure(constants::ERR_VALIDATION, "Group title is required.");
      group.setTitle(dto.getTitle());
      group.setDescription(dto.getDescription());

      if (dto.hasParentId() && !dto.getParentId().empty()) {
        group.setParentId(dto.getParentId());
      }

      if (dto.hasRoles() && !dto.getRoles().empty()) {
        Json::Value rolesJson = Json::arrayValue;
        for (const auto &item : dto.getRoles()) {
          Json::Value r;
          r["id"] = item.id;
          r["name"] = item.name;
          rolesJson.append(r);
        }
        Json::FastWriter writer;
        group.setRoles(writer.write(rolesJson));
      }

      group.setActiveUsers(0);
      group.setBlockedUsers(0);
      auto now = trantor::Date::now();
      group.setCreatedAt(now);

      utils::applyCreateAudit(group, identity);
      group.setIsDeleted(false);
      auto inserted = co_await mp.insert(group);

      response.success = true;
      response.message = "User group created successfully";
      response.result["userGroupId"] = inserted.getValueOfId();

    } catch (const DrogonDbException &e) {
      response.success = false;
      response.message = "Failed to create user group";
      response.error["detail"] = e.base().what();
    }
    co_return response;


    }

    drogon::Task<dto::BaseApiResponse> UserService::updateUserGroup(const dto::UserGroupDto &dto, const std::string &userGroupId, const utils::AuditIdentity &identity) {

    if (!identity.hasUser() || !identity.tenantId.empty())
        co_return failure(constants::ERR_PERMISSION_DENIED, "User groups are host-managed in the current schema.");
    auto dbClient = drogon::app().getDbClient();
    auto mp = CoroMapper<UserGroups>(dbClient);

    dto::BaseApiResponse response;
    try {
      auto group = co_await mp.findOne(
          Criteria(UserGroups::Cols::_id, CompareOperator::EQ, userGroupId) &&
          Criteria(UserGroups::Cols::_is_deleted, CompareOperator::EQ, false));

      if (!(co_await validGroupReferences(dto, userGroupId)))
          co_return failure(constants::ERR_VALIDATION, "Invalid group parent, cycle, or role.");
      if (!dto.getTitle().empty() &&
          dto.getTitle() != group.getValueOfTitle()) {
        size_t nameCount = co_await mp.count(Criteria(UserGroups::Cols::_title,
                                                      CompareOperator::EQ,
                                                      dto.getTitle()) &&
                                            Criteria(UserGroups::Cols::_is_deleted, CompareOperator::EQ, false));
        if (nameCount > 0) {
          response.success = false;
          response.message = "User group with this name already exists";
          response.error["code"] = constants::ERR_DUPLICATE_RESOURCE;
          co_return response;
        }
        group.setTitle(dto.getTitle());

      }

      if (dto.hasRoles()) {
        if (!dto.getRoles().empty()) {
          Json::Value rolesJson = Json::arrayValue;
          for (const auto &item : dto.getRoles()) {
            Json::Value r;
            r["id"] = item.id;
            r["name"] = item.name;
            rolesJson.append(r);
          }
          Json::FastWriter writer;
          group.setRoles(writer.write(rolesJson));
        } else {
          group.setRolesToNull();
        }
      }

      if (dto.hasParentId()) {
        if (!dto.getParentId().empty()) {
          group.setParentId(dto.getParentId());
        } else {
          group.setParentIdToNull();
        }
      }

      group.setDescription(dto.getDescription());
      utils::applyUpdateAudit(group, identity);
      co_await mp.update(group);

      response.success = true;
      response.message = "User group updated successfully";

    } catch (const UnexpectedRows &e) {
      response.success = false;
      response.message = "User group not found";
      response.error["code"] = constants::ERR_RESOURCE_NOT_FOUND;
    } catch (const DrogonDbException &e) {
      response.success = false;
      response.message = "Failed to update user group";
      response.error["detail"] = e.base().what();
    }
    co_return response;


    }


    drogon::Task<dto::BaseApiResponse> UserService::deleteUserGroup(const std::string &userGroupId, const utils::AuditIdentity &identity) {
        if (!identity.hasUser() || !identity.tenantId.empty())
            co_return failure(constants::ERR_PERMISSION_DENIED, "User groups are host-managed in the current schema.");
        try {
            CoroMapper<UserGroups> mapper(drogon::app().getDbClient());
            auto group = co_await mapper.findOne(Criteria(UserGroups::Cols::_id, CompareOperator::EQ, userGroupId) &&
                Criteria(UserGroups::Cols::_is_deleted, CompareOperator::EQ, false));
            if (co_await mapper.count(Criteria(UserGroups::Cols::_parent_id, CompareOperator::EQ, userGroupId) &&
                Criteria(UserGroups::Cols::_is_deleted, CompareOperator::EQ, false)))
                co_return failure(constants::ERR_VALIDATION, "Remove child groups first.");
            group.setIsDeleted(true);
            utils::applyDeleteAudit(group, identity);
            co_await mapper.update(group);
            dto::BaseApiResponse response;
            response.success = true;
            response.result["id"] = userGroupId;
            response.result["deleted"] = true;
            co_return response;
        } catch (const UnexpectedRows &) {
            co_return failure(constants::ERR_RESOURCE_NOT_FOUND, "User group not found.");
        } catch (const DrogonDbException &) {
            co_return failure(constants::ERR_DB_QUERY, "Failed to delete user group.");
        }
    }

    drogon::Task<dto::BaseApiResponse> UserService::validateUserPasskeys(const dto::PasskeyLoginDto &) {
        // No challenge store, RP/origin policy or registration ceremony exists yet.
        // Signature verification alone is replayable and must never mint a JWT.
        co_return failure(constants::ERR_UNSUPPORTED_OPERATION,
            "Passkey authentication requires a server-verified WebAuthn challenge ceremony; use password sign-in.");
    }

namespace {
drogon::Task<dto::BaseApiResponse> authenticate(const dto::SigninDto &input, bool host) {
    if (input.getUsernameOrEmail().empty() || input.getPassword().empty() ||
        (!host && input.getAccountId().empty()) || (host && !input.getAccountId().empty()))
        co_return failure(constants::ERR_AUTH_INVALID_CREDENTIALS, "Invalid credentials.");
    try {
        auto db = drogon::app().getDbClient();
        std::string tenantId, tenantName;
        if (!host) {
            CoroMapper<drogon_model::BusinessDesk::Tenants> tenants(db);
            using Tenant = drogon_model::BusinessDesk::Tenants;
            auto tenant = co_await tenants.findOne(
                Criteria(Tenant::Cols::_tenancy_name, CompareOperator::EQ, input.getAccountId()) &&
                Criteria(Tenant::Cols::_is_active, CompareOperator::EQ, true) &&
                Criteria(Tenant::Cols::_is_deleted, CompareOperator::EQ, false));
            tenantId = tenant.getValueOfId();
            tenantName = tenant.getValueOfName().empty() ? tenant.getValueOfTenancyName() : tenant.getValueOfName();
        }
        CoroMapper<Users> mapper(db);
        const auto login = normalize(input.getUsernameOrEmail());
        auto criteria = userScope(tenantId) &&
            (Criteria(Users::Cols::_username, CompareOperator::EQ, login) ||
             Criteria(Users::Cols::_email, CompareOperator::EQ, login)) &&
            Criteria(Users::Cols::_is_active, CompareOperator::EQ, true) &&
            Criteria(Users::Cols::_is_locked_out, CompareOperator::EQ, false) &&
            Criteria(Users::Cols::_is_host_admin_user, CompareOperator::EQ, host);
        auto user = co_await mapper.findOne(criteria);
        // The bootstrap host administrator belongs to the protected default tenant.
        // Keep legacy NULL-tenant host users compatible, but never admit arbitrary
        // tenant users to the host scope.
        if (host && !user.getValueOfTenantId().empty()) {
            using Tenant = drogon_model::BusinessDesk::Tenants;
            CoroMapper<Tenant> tenants(db);
            co_await tenants.findOne(Criteria(Tenant::Cols::_id, CompareOperator::EQ, user.getValueOfTenantId()) &&
                Criteria(Tenant::Cols::_is_active, CompareOperator::EQ, true) &&
                Criteria(Tenant::Cols::_is_deleted, CompareOperator::EQ, false));
        }
        if (user.getValueOfPasswordHash().empty() ||
            !bcrypt::validatePassword(input.getPassword(), user.getValueOfPasswordHash()))
            co_return failure(constants::ERR_AUTH_INVALID_CREDENTIALS, "Invalid credentials.");
        co_return co_await issueToken(user, host, tenantName);
    } catch (const UnexpectedRows &) {
        co_return failure(constants::ERR_AUTH_INVALID_CREDENTIALS, "Invalid credentials.");
    } catch (const DrogonDbException &) {
        co_return failure(constants::ERR_DB_QUERY, "Authentication service unavailable.");
    } catch (const std::exception &) {
        co_return failure(constants::ERR_INTERNAL, "Authentication service unavailable.");
    }
}
}
drogon::Task<dto::BaseApiResponse> UserService::validateHostUserCredentials(const dto::SigninDto &input) {
    co_return co_await authenticate(input, true);
}
drogon::Task<dto::BaseApiResponse> UserService::validateTenantUserCredentials(const dto::SigninDto &input) {
    co_return co_await authenticate(input, false);
}
}
