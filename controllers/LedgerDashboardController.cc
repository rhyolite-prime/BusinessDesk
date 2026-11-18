#include "LedgerDashboardController.h"
#include "domain_services/gl/LedgerDashboardService.h"

namespace {
drogon::Task<drogon::HttpResponsePtr> run(drogon::HttpRequestPtr req, std::string operation) {
  Json::Value filters(Json::objectValue);
  for (const auto &[key, value] : req->getParameters()) {
    if (key == "includeChildCostCenters" && (value == "true" || value == "false"))
      filters[key] = value == "true";
    else
      filters[key] = value;
  }
  auto result = co_await business_desk::domain_services::LedgerDashboardService::execute(
      operation, filters, business_desk::utils::extractAuditIdentity(req));
  auto response = drogon::HttpResponse::newHttpJsonResponse(result.toJson());
  response->addHeader("Cache-Control", "no-store");
  const auto code = result.error["code"].asString();
  response->setStatusCode(result.success ? drogon::k200OK
      : code == "unauthorized" ? drogon::k401Unauthorized
      : code == "forbidden" ? drogon::k403Forbidden
      : code == "not_found" ? drogon::k404NotFound
      : code == "validation_error" ? drogon::k400BadRequest
      : drogon::k503ServiceUnavailable);
  co_return response;
}
}

drogon::Task<drogon::HttpResponsePtr> LedgerDashboardController::dashboard(drogon::HttpRequestPtr req) {
  co_return co_await run(req, "dashboard");
}

drogon::Task<drogon::HttpResponsePtr> LedgerDashboardController::options(drogon::HttpRequestPtr req) {
  co_return co_await run(req, "options");
}
