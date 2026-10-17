/**
 *
 *  TenantJwtAuthFilter.cc
 *
 */

#include "TenantJwtAuthFilter.h"
#include <jwt-cpp/jwt.h>
#include <drogon/HttpAppFramework.h>
#include "dto/BaseApiResponse.h"

using namespace drogon;


void TenantJwtAuthFilter::doFilter(const HttpRequestPtr &req,
                         FilterCallback &&fcb,
                         FilterChainCallback &&fccb)
{
  LOG_DEBUG << "TenantJwtAuthFilter::doFilter called";
  LOG_DEBUG << "Method: " << req->getMethodString();

  if (req->getMethod() == Options) {
    LOG_DEBUG << "OPTIONS request, bypassing auth";
    fccb();
    return;
  }


  // Extract the Authorization header
  auto authHeader = req->getHeader("Authorization");
  LOG_DEBUG << "Authorization header (capitalized): '" << authHeader << "'";

  if (authHeader.empty()) {
    authHeader = req->getHeader("authorization");
    LOG_DEBUG << "Authorization header (lowercase): '" << authHeader << "'";
  }

  if (authHeader.empty() || authHeader.substr(0, 7) != "Bearer ") {
    LOG_WARN << "Authorization header is missing or invalid. Header value: '" << authHeader << "'";
    business_desk::dto::BaseApiResponse response;
    response.success = false;
    response.error["message"] = "Authorization header is missing or invalid";
    auto resp = HttpResponse::newHttpJsonResponse(response.toJson());
    resp->setStatusCode(k401Unauthorized);
    fcb(resp);
    return;
  }

  // Extract the token
  std::string token = authHeader.substr(7);
  //LOG_DEBUG << "Extracted token: " << token.substr(0, 20) << "...";

  try {
    // Get JWT config
    auto &app = drogon::app();
    auto customConfig = app.getCustomConfig();
    std::string jwtSecurityKey = customConfig["JwtBearer"]["JwtSecurityKey"].asString();
    std::string jwtIssuer = customConfig["JwtBearer"]["JwtIssuer"].asString();

    LOG_DEBUG << "JWT Issuer from config: " << jwtIssuer;

    // Verify token
    auto verifier = jwt::verify()
                        .allow_algorithm(jwt::algorithm::hs256{jwtSecurityKey})
                        .with_issuer(jwtIssuer);

    auto decoded = jwt::decode(token);
    verifier.verify(decoded);

    LOG_DEBUG << "Token verified successfully";

    // Extract claims and store in request attributes
    if (decoded.has_payload_claim("tenantId")) {
      auto tenantId = decoded.get_payload_claim("tenantId").as_string();
      req->attributes()->insert("tenantId", tenantId);
      LOG_DEBUG << "Extracted tenantId: " << tenantId;
    }

    if (decoded.has_payload_claim("tenantEmail")) {
      auto tenantEmail = decoded.get_payload_claim("tenantEmail").as_string();
      req->attributes()->insert("tenantEmail", tenantEmail);
      LOG_DEBUG << "Extracted tenantEmail: " << tenantEmail;
    }

    if (decoded.has_payload_claim("tenantName")) {
      auto tenantName = decoded.get_payload_claim("tenantName").as_string();
      req->attributes()->insert("tenantName", tenantName);
    }

    if (decoded.has_payload_claim("tenantUserId")) {
      auto tenantUserId = decoded.get_payload_claim("tenantUserId").as_string();
      req->attributes()->insert("tenantUserId", tenantUserId);
    }

    if (decoded.has_payload_claim("tenantUserEmail")) {
      auto tenantUserEmail = decoded.get_payload_claim("tenantUserEmail").as_string();
      req->attributes()->insert("tenantUserEmail", tenantUserEmail);
    }

    if (decoded.has_payload_claim("permissions")) {
      auto permissionsStr = decoded.get_payload_claim("permissions").as_string();
      std::unordered_set<std::string> permissionsSet;
      Json::Value permissionsJson;
      Json::Reader reader;
      if (!permissionsStr.empty() && reader.parse(permissionsStr, permissionsJson) && permissionsJson.isArray()) {
        for (const auto& perm : permissionsJson) {
          if (perm.isString()) {
            permissionsSet.insert(perm.asString());
          }
        }
      }
      req->attributes()->insert("permissions", permissionsSet);
      LOG_DEBUG << "Extracted " << permissionsSet.size() << " permissions";
    }

    // Token is valid, continue to the next filter or handler
    LOG_DEBUG << "Calling next filter/handler";
    fccb();

  } catch (const std::exception &e) {
    LOG_ERROR << "Token validation failed: " << e.what();
    business_desk::dto::BaseApiResponse response;
    response.success = false;
    response.error["message"] = std::string("Token validation failed: ") + e.what();
    auto resp = HttpResponse::newHttpJsonResponse(response.toJson());
    resp->setStatusCode(k401Unauthorized);
    fcb(resp);
  }
}
