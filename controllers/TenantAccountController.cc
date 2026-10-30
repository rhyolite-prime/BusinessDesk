#include "TenantAccountController.h"
#include "domain_services/permissions/PermissionService.h"
#include "domain_services/tenants/TenantAccountService.h"
namespace {
drogon::Task<drogon::HttpResponsePtr>
handle(drogon::HttpRequestPtr req, std::string op, std::string id, bool host) {
  using namespace business_desk;
  dto::BaseApiResponse result;
  if (host &&
      !domain_services::PermissionService::hasPermission(req,
                                                         "tenants.manage") &&
      !domain_services::PermissionService::hasPermission(
          req,
          op == "get" || op == "list" ? "tenants.read" : "tenants.update")) {
    result.error["code"] = "forbidden";
    result.error["message"] = "Host tenant-management permission required.";
  } else {
    Json::Value b;
    if (req->getJsonObject())
      b = *req->getJsonObject();
    if (op == "list")
      b["search"] = req->getParameter("search");
    result = co_await domain_services::TenantAccountService::execute(
        op, id, b, utils::extractAuditIdentity(req), host);
  }
  auto r = drogon::HttpResponse::newHttpJsonResponse(result.toJson());
  r->addHeader("Cache-Control", "no-store");
  auto code = result.error["code"].asString();
  r->setStatusCode(result.success               ? drogon::k200OK
                   : code == "validation_error" ? drogon::k400BadRequest
                   : code == "unauthorized"     ? drogon::k401Unauthorized
                   : code == "forbidden"        ? drogon::k403Forbidden
                   : code == "not_found"        ? drogon::k404NotFound
                   : code == "conflict" ? drogon::k409Conflict
                                        : drogon::k503ServiceUnavailable);
  co_return r;
}
} // namespace
drogon::Task<drogon::HttpResponsePtr>
TenantAccountController::hostList(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "list", std::string{}, true);
}
drogon::Task<drogon::HttpResponsePtr>
TenantAccountController::hostGet(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "get", id, true);
}
drogon::Task<drogon::HttpResponsePtr>
TenantAccountController::hostUpdate(drogon::HttpRequestPtr req,
                                    std::string id) {
  co_return co_await handle(req, "update", id, true);
}
drogon::Task<drogon::HttpResponsePtr>
TenantAccountController::resolve(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "resolve", id, true);
}
drogon::Task<drogon::HttpResponsePtr>
TenantAccountController::get(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "get", std::string{}, false);
}
drogon::Task<drogon::HttpResponsePtr>
TenantAccountController::request(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "request", std::string{}, false);
}
drogon::Task<drogon::HttpResponsePtr>
TenantAccountController::entitlements(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "entitlements", std::string{}, false);
}
