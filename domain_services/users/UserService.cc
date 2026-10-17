//
// Created by Emmanuel Addo-Odame on 17/10/2026.
//
#include "UserService.h"
#include "Users.h"
#include <bcrypt.h>
#include "UserGroups.h"
#include <drogon/orm/CoroMapper.h>
#include <jwt-cpp/traits/kazuho-picojson/defaults.h>

#include "constants/ErrorCodes.h"
#include "domain_services/permissions/PermissionService.h"
#include "utils/AuditUtil.h"

using namespace drogon::orm;
using drogon_model::BusinessDesk::UserGroups;
using drogon_model::BusinessDesk::Users;

namespace business_desk::domain_services {


  drogon::Task<dto::BaseApiResponse> UserService::getAllUsers(int pageNo, int pageSize, const std::string &tenantId, const std::string &query) {

        auto dbClient = drogon::app().getDbClient();
        auto mp = CoroMapper<Users>(dbClient);

    // 1. Build the search criteria
      Criteria searchCriteria ;
      if (!query.empty()) {
        std::string likeQuery = "%" + query + "%";
        searchCriteria =
            Criteria(Users::Cols::_first_name, CompareOperator::Like, likeQuery) ||
            Criteria(Users::Cols::_email, CompareOperator::Like, likeQuery) ||
            Criteria(Users::Cols::_last_name, CompareOperator::Like, likeQuery);
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
        int offset = (pageNo - 1) * pageSize;
        auto users =
            co_await mp.limit(pageSize).offset(offset).findBy(searchCriteria);

        auto totalPages = (totalCount + pageSize - 1) / pageSize;

        // 4. Build the final response
        response.success = true;
        response.result["totalCount"] = (Json::UInt64)totalCount;
        response.result["pageNo"] = pageNo;
        response.result["pageSize"] = pageSize;
        response.result["totalPages"] =
            (int)((totalCount + pageSize - 1) / pageSize);
        response.result["lowerBound"] = pageSize * (pageNo - 1) + 1;
        response.result["upperBound"] = (int)totalPages == pageNo
                                            ? (Json::UInt64)totalCount
                                            : (Json::UInt64)(pageNo * pageSize);

        Json::Value data = Json::arrayValue;

        for (const auto &role : users) {
          Json::Value roleJson = role.toJson();
          Json::Value camelCaseRole;
          camelCaseRole["id"] = roleJson["id"];
          camelCaseRole["firstName"] = roleJson["first_name"];
          camelCaseRole["lastName"] = roleJson["last_name"];
          camelCaseRole["email"] = roleJson["email"];
          camelCaseRole["phoneNumber"] = roleJson["phone_number"];
          camelCaseRole["country"] = roleJson["country"];
          camelCaseRole["profileImageUrl"] = roleJson["profile_image_url"];
          camelCaseRole["isLockedOut"] = roleJson["is_locked_out"];
          camelCaseRole["isActive"] = roleJson["is_active"];
          camelCaseRole["createdAt"] = roleJson["created_at"];
          camelCaseRole["updatedAt"] = roleJson["updated_at"];
          data.append(camelCaseRole);
        }
        response.result["data"] = data;

      } catch (const drogon::orm::DrogonDbException &e) {
        response.success = false;
        response.error["message"] = "Database error while fetching users.";
        response.error["detail"] = e.base().what();
      }
    co_return response;


    }


    drogon::Task<dto::BaseApiResponse> UserService::createUser(const dto::UserDto &dto, const utils::AuditIdentity &identity) {

    auto dbClient = drogon::app().getDbClient();
    CoroMapper<Users> mp(dbClient);

    Users newUser;
    newUser.setFirstName(dto.getFirstName());
    newUser.setLastName(dto.getLastName());
    std::string standardEmail = dto.getEmail();
    std::transform(standardEmail.begin(), standardEmail.end(),
                   standardEmail.begin(),
                   [](unsigned char c) { return std::tolower(c); });

    newUser.setEmail(standardEmail);
    newUser.setUsername(dto.getUsername());
    newUser.setTenantId(identity.tenantId);
    newUser.setPhoneNumber(dto.getPhoneNumber());
    newUser.setCountry(dto.getCountry());
    newUser.setPasswordHash(bcrypt::generateHash(dto.getPassword()));
    newUser.setIsActive(true);
    newUser.setIsLockedOut(false);
    newUser.setCreatedAt(trantor::Date::now());

    dto::BaseApiResponse response;
    try {

      utils::applyCreateAudit(newUser, identity);
      Users publication = co_await mp.insert(newUser);
      response.success = true;
      response.message = "User created successfully";
      response.result["id"] = publication.getValueOfId();
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

      Criteria criteria = Criteria(Users::Cols::_id, CompareOperator::EQ, userId);

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
        user.setUsername(dto.getUsername());
      }

      if (!dto.getPassword().empty()) {
        user.setPasswordHash(bcrypt::generateHash(dto.getPassword()));
      }

      user.setUpdatedAt(trantor::Date::now());

      utils::applyCreateAudit(user, identity);
      co_await mp.update(user);

      response.success = true;
      response.message = "User updated successfully";
    } catch (const DrogonDbException &e) {
      response.success = false;
      response.message = "User not found or database error";
      response.error["code"] = constants::ERR_DB_QUERY;
      response.error["detail"] = e.base().what();
    }

    co_return response;

    }

    drogon::Task<dto::BaseApiResponse> UserService::deleteUser(const std::string &userId, const utils::AuditIdentity &identity) {



    }


    drogon::Task<dto::BaseApiResponse> UserService::getAllUserGroups(int pageNo, int pageSize, const std::string &tenantId, const std::string &query) {

      auto dbClient = drogon::app().getDbClient();
  auto mp = CoroMapper<UserGroups>(dbClient);

  Criteria searchCriteria;
  if (!query.empty()) {
    std::string likeQuery = "%" + query + "%";
    searchCriteria =
        Criteria(UserGroups::Cols::_title, CompareOperator::Like, likeQuery);
  }

  dto::BaseApiResponse response;
  try {
    size_t totalCount = co_await mp.count(searchCriteria);
    if (totalCount == 0) {
      response.success = true;
      response.result["data"] = Json::arrayValue;
      response.result["totalCount"] = 0;
      co_return response;
    }

    int offset = (pageNo - 1) * pageSize;
    auto groups =
        co_await mp.limit(pageSize).offset(offset).findBy(searchCriteria);

    auto totalPages = (totalCount + pageSize - 1) / pageSize;

    response.success = true;
    response.result["totalCount"] = (Json::UInt64)totalCount;
    response.result["pageNo"] = pageNo;
    response.result["pageSize"] = pageSize;
    response.result["totalPages"] =
        (int)((totalCount + pageSize - 1) / pageSize);
    response.result["lowerBound"] = pageSize * (pageNo - 1) + 1;
    response.result["upperBound"] = (int)totalPages == pageNo
                                        ? (Json::UInt64)totalCount
                                        : (Json::UInt64)(pageNo * pageSize);

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

    auto dbClient = drogon::app().getDbClient();
    auto mp = CoroMapper<UserGroups>(dbClient);

    dto::BaseApiResponse response;
    try {
      size_t count = co_await mp.count(Criteria(UserGroups::Cols::_title,
                                                CompareOperator::EQ,
                                                dto.getTitle()));
      if (count > 0) {
        response.success = false;
        response.message = "User group with this name already exists";
        response.error["code"] = constants::ERR_DUPLICATE_RESOURCE;
        co_return response;
      }

      UserGroups group;
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

    auto dbClient = drogon::app().getDbClient();
    auto mp = CoroMapper<UserGroups>(dbClient);

    dto::BaseApiResponse response;
    try {
      auto group = co_await mp.findOne(
          Criteria(UserGroups::Cols::_id, CompareOperator::EQ, userGroupId));

      if (!dto.getTitle().empty() &&
          dto.getTitle() != group.getValueOfTitle()) {
        size_t nameCount = co_await mp.count(Criteria(UserGroups::Cols::_title,
                                                      CompareOperator::EQ,
                                                      dto.getTitle()));
        if (nameCount > 0) {
          response.success = false;
          response.message = "User group with this name already exists";
          response.error["code"] = constants::ERR_DUPLICATE_RESOURCE;
          co_return response;
        }
        group.setTitle(dto.getTitle());
        group.setDescription(dto.getDescription());
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



    }

  //auth

  drogon::Task<dto::BaseApiResponse> UserService::validateUserPasskeys(const dto::PasskeyLoginDto &dto) {

    //check the account id against the tenancy name
    //if account id is null or empty string , it means its a host login via pass keys

    auto dbClient = drogon::app().getDbClient();
  CoroMapper<Users> mp(dbClient);

  auto toStandardBase64 = [](std::string s) {
    for (char &c : s) {
      if (c == '-')
        c = '+';
      else if (c == '_')
        c = '/';
    }
    while (s.length() % 4 != 0)
      s += '=';
    return s;
  };

  std::string credIdStr = toStandardBase64(dto.getCredentialId());
  std::vector<char> credIdBytes =
      drogon::utils::base64DecodeToVector(credIdStr);

  std::string userId = dto.getUserHandle();

  Criteria userCriteria;
  bool hasUserHandle = !userId.empty();

  dto::BaseApiResponse response;
  if (hasUserHandle) {
    if (userId.length() > 36) { // rudimentary check
      std::string handleStr = toStandardBase64(userId);
      auto handleBytes = drogon::utils::base64DecodeToVector(handleStr);
      userId = std::string(handleBytes.begin(), handleBytes.end());
    }
    userCriteria = Criteria(Users::Cols::_id, CompareOperator::EQ, userId);
  } else {
    response.success = false;
    response.message = "User Handle is required for passkey login.";
    co_return response;
  }

  try {
    Users user = co_await mp.findOne(userCriteria);
    // Found user. Now verify passkey.

    // 1. Verify Credential ID matches (if we found by userHandle)
    auto storedCredId = user.getValueOfCredentialId();
    if (credIdBytes != storedCredId) {
      // Passkey doesn't belong to this user or changed
      response.success = false;
      response.message = "Invalid credential ID.";
      co_return response;
    }

    // 2. Cryptographic Verification
    // SignedData = authenticatorData + sha256(clientDataJSON)

    std::string authDataStr =
        toStandardBase64(dto.getAuthenticatorData());
    std::vector<char> authData =
        drogon::utils::base64DecodeToVector(authDataStr);

    std::string clientDataStr =
        toStandardBase64(dto.getClientDataJSON());
    std::vector<char> clientData =
        drogon::utils::base64DecodeToVector(clientDataStr);

    unsigned char clientDataHash[SHA256_DIGEST_LENGTH];
    SHA256((const unsigned char *)clientData.data(), clientData.size(),
           clientDataHash);

    std::vector<unsigned char> signedData;
    signedData.reserve(authData.size() + SHA256_DIGEST_LENGTH);
    signedData.insert(signedData.end(), authData.begin(), authData.end());
    signedData.insert(signedData.end(), clientDataHash,
                      clientDataHash + SHA256_DIGEST_LENGTH);

    // Public Key from DB
    auto pubKeyBytes = user.getValueOfPublicKey();

    const unsigned char *p = (const unsigned char *)pubKeyBytes.data();
    EVP_PKEY *pkey = d2i_PUBKEY(NULL, &p, pubKeyBytes.size());

    if (!pkey) {
      response.success = false;
      response.message = "Failed to load stored public key.";
      co_return response;
    }

    EVP_MD_CTX *ctx = EVP_MD_CTX_new();
    EVP_DigestVerifyInit(ctx, NULL, EVP_sha256(), NULL, pkey);

    // Verification
    // signature from DTO
    std::string sigStr = toStandardBase64(dto.getSignature());
    std::vector<char> sigBytes = drogon::utils::base64DecodeToVector(sigStr);

    int verifyResult =
        EVP_DigestVerify(ctx, (const unsigned char *)sigBytes.data(),
                         sigBytes.size(), signedData.data(), signedData.size());

    EVP_MD_CTX_free(ctx);
    EVP_PKEY_free(pkey);

    if (verifyResult != 1) {
      response.success = false;
      response.message = "Signature verification failed.";
      co_return response;
    }

    // 3. Clone Check (Sign Count)
    // Extract signCount from authData (bytes 33-36)
    if (authData.size() < 37) {
      response.success = false;
      response.message = "Authenticator data too short.";
      co_return response;
    }

    uint32_t newSignCount =
        ((uint8_t)authData[33] << 24) | ((uint8_t)authData[34] << 16) |
        ((uint8_t)authData[35] << 8) | (uint8_t)authData[36];

    int64_t storedCount = user.getValueOfSignCount();

    if (newSignCount > 0 && newSignCount <= storedCount) {
      // Potential clone attack!
      response.success = false;
      response.message = "Invalid sign count (possible clone detected).";
      co_return response;
    }

    // 4. Update Sign Count & Issue Token
    Users userToUpdate = user;
    userToUpdate.setSignCount(newSignCount);

    co_await mp.update(userToUpdate);

    // Issue Token
    auto &app = drogon::app();
    auto customConfig = app.getCustomConfig();
    std::string jwtSecurityKey =
        customConfig["JwtBearer"]["JwtSecurityKey"].asString();
    std::string jwtIssuer = customConfig["JwtBearer"]["JwtIssuer"].asString();

    auto token =
        jwt::create()
            .set_issuer(jwtIssuer)
            .set_type("JWT")
            .set_issued_at(std::chrono::system_clock::now())
            .set_expires_at(std::chrono::system_clock::now() +
                            std::chrono::hours(24 * 366))
            .set_payload_claim("userId", jwt::claim(user.getValueOfId()))
            .set_payload_claim("username",
                               jwt::claim(user.getValueOfUsername()))
            .set_payload_claim("email", jwt::claim(user.getValueOfEmail()))
            .sign(jwt::algorithm::hs256{jwtSecurityKey});

    response.success = true;
    response.message = "Authentication successful";
    response.result["token"] = token;
    response.result["userId"] = user.getValueOfId();
    response.result["username"] = user.getValueOfUsername();
    response.result["fullName"] =
        user.getValueOfFirstName() + " " + user.getValueOfLastName();
    response.result["email"] = user.getValueOfEmail();

  } catch (const DrogonDbException &e) {
    response.success = false;
    response.message = "User not found or invalid credentials.";
  }
  co_return response;

  }

  drogon::Task<dto::BaseApiResponse> UserService::validateHostUserCredentials(const dto::SigninDto &signin_dto) {

    auto dbClient = drogon::app().getDbClient();
  CoroMapper<Users> mapper(dbClient);

  std::string normalizedInput = signin_dto.getUsernameOrEmail();
  std::transform(normalizedInput.begin(), normalizedInput.end(),
                 normalizedInput.begin(),
                 [](unsigned char c) { return std::tolower(c); });

  Criteria criteria =
      (Criteria(Users::Cols::_username, CompareOperator::EQ, normalizedInput) ||
       Criteria(Users::Cols::_email, CompareOperator::EQ, normalizedInput)) &&
      Criteria(Users::Cols::_is_active, CompareOperator::EQ, true) &&
      Criteria(Users::Cols::_is_host_admin_user, CompareOperator::EQ, true) &&
      Criteria(Users::Cols::_is_locked_out, CompareOperator::EQ, false);

    dto::BaseApiResponse response;
  try {
    Users user = co_await mapper.findOne(criteria);
    bool passwordMatches = bcrypt::validatePassword(
        signin_dto.getPassword(), user.getValueOfPasswordHash());

    if (passwordMatches) {

      Users userToUpdate = user;
      userToUpdate.setLastActive(trantor::Date::now());
      co_await mapper.update(userToUpdate);

      std::unordered_set<std::string> allPermissions =
          co_await PermissionService::getUserPermissions(user.getValueOfId());

      Json::Value permissionsArray = Json::arrayValue;
      for (const auto &perm : allPermissions) {
        permissionsArray.append(perm);
      }
      response.result["permissions"] = permissionsArray;

      // Add permissions to JWT token payload
      Json::FastWriter writer;
      std::string permissionsStr = writer.write(permissionsArray);

      // Password is correct, generate JWT token
      auto &app = drogon::app();
      auto customConfig = app.getCustomConfig();
      std::string jwtSecurityKey =
          customConfig["JwtBearer"]["JwtSecurityKey"].asString();
      std::string jwtIssuer = customConfig["JwtBearer"]["JwtIssuer"].asString();

      auto token =
          jwt::create()
              .set_issuer(jwtIssuer)
              .set_type("JWT")
              .set_issued_at(std::chrono::system_clock::now())
              .set_expires_at(std::chrono::system_clock::now() +
                              std::chrono::hours(24 * 3660))
              .set_payload_claim("userId", jwt::claim(user.getValueOfId()))
              .set_payload_claim("username",
                                 jwt::claim(user.getValueOfUsername()))
              .set_payload_claim("email", jwt::claim(user.getValueOfEmail()))
              .sign(jwt::algorithm::hs256{jwtSecurityKey});

      response.success = true;
      response.message = "Authentication successful";
      response.result["token"] = token;
      response.result["userId"] = user.getValueOfId();
      response.result["username"] = user.getValueOfUsername();
      response.result["fullName"] =
          user.getValueOfFirstName() + " " + user.getValueOfLastName();
      response.result["email"] = user.getValueOfEmail();
    } else {
      // Password is incorrect
      response.success = false;
      response.message = "Invalid credentials";
      response.error["code"] = constants::ERR_AUTH_INVALID_CREDENTIALS;
    }
  } catch (const DrogonDbException &e) {
    // Database error or user not found
    response.success = false;
    response.message = "User not found";
    response.error["code"] = constants::ERR_RESOURCE_NOT_FOUND;
    response.error["message"] = "User not found";
  }
  co_return response;


  }

  drogon::Task<dto::BaseApiResponse> UserService::validateTenantUserCredentials(const dto::SigninDto &dto) {

    auto dbClient = drogon::app().getDbClient();
  CoroMapper<Users> mapper(dbClient);

  std::string normalizedInput = dto.getUsernameOrEmail();
  std::transform(normalizedInput.begin(), normalizedInput.end(),
                 normalizedInput.begin(),
                 [](unsigned char c) { return std::tolower(c); });

  Criteria criteria =
      (Criteria(Users::Cols::_username, CompareOperator::EQ, normalizedInput) ||
       Criteria(Users::Cols::_email, CompareOperator::EQ, normalizedInput)) &&
      Criteria(Users::Cols::_is_active, CompareOperator::EQ, true) &&
      Criteria(Users::Cols::_is_tenant_admin_user, CompareOperator::EQ, true) &&
      Criteria(Users::Cols::_is_locked_out, CompareOperator::EQ, false);

    dto::BaseApiResponse response;
  try {
    Users user = co_await mapper.findOne(criteria);
    bool passwordMatches = bcrypt::validatePassword(
        dto.getPassword(), user.getValueOfPasswordHash());

    if (passwordMatches) {

      Users userToUpdate = user;
      userToUpdate.setLastActive(trantor::Date::now());
      co_await mapper.update(userToUpdate);

      std::unordered_set<std::string> allPermissions = co_await PermissionService::getUserPermissions(user.getValueOfId());

      Json::Value permissionsArray = Json::arrayValue;
      for (const auto &perm : allPermissions) {
        permissionsArray.append(perm);
      }
      response.result["permissions"] = permissionsArray;

      // Add permissions to JWT token payload
      Json::FastWriter writer;
      std::string permissionsStr = writer.write(permissionsArray);

      // Password is correct, generate JWT token
      auto &app = drogon::app();
      auto customConfig = app.getCustomConfig();
      std::string jwtSecurityKey = customConfig["JwtBearer"]["JwtSecurityKey"].asString();
      std::string jwtIssuer = customConfig["JwtBearer"]["JwtIssuer"].asString();

      auto token =
          jwt::create()
              .set_issuer(jwtIssuer)
              .set_type("JWT")
              .set_issued_at(std::chrono::system_clock::now())
              .set_expires_at(std::chrono::system_clock::now() +
                              std::chrono::hours(24 * 3660))
              .set_payload_claim("userId", jwt::claim(user.getValueOfId()))
              .set_payload_claim("username",
                                 jwt::claim(user.getValueOfUsername()))
              .set_payload_claim("email", jwt::claim(user.getValueOfEmail()))
              .sign(jwt::algorithm::hs256{jwtSecurityKey});

      response.success = true;
      response.message = "Authentication successful";
      response.result["token"] = token;
      response.result["userId"] = user.getValueOfId();
      response.result["username"] = user.getValueOfUsername();
      response.result["fullName"] =
          user.getValueOfFirstName() + " " + user.getValueOfLastName();
      response.result["email"] = user.getValueOfEmail();
    } else {
      // Password is incorrect
      response.success = false;
      response.message = "Invalid credentials";
      response.error["code"] = constants::ERR_AUTH_INVALID_CREDENTIALS;
    }
  } catch (const DrogonDbException &e) {
    // Database error or user not found
    response.success = false;
    response.message = "User not found";
    response.error["code"] = constants::ERR_RESOURCE_NOT_FOUND;
    response.error["message"] = "User not found";
  }
  co_return response;


  }






}