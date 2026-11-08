#include "PreferencesController.h"
#include "domain_services/preferences/PreferencesService.h"
namespace {
drogon::Task<drogon::HttpResponsePtr> handle(drogon::HttpRequestPtr req,
                                             std::string op) {
  Json::Value body;
  if (op != "get" && op != "history" && req->getJsonObject())
    body = *req->getJsonObject();
  const auto result =
      co_await business_desk::domain_services::PreferencesService::execute(
          op, body, business_desk::utils::extractAuditIdentity(req));
  auto response = drogon::HttpResponse::newHttpJsonResponse(result.toJson());
  response->addHeader("Cache-Control", "no-store");
  const auto code = result.error["code"].asString();
  response->setStatusCode(
      result.success               ? drogon::k200OK
      : code == "validation_error" ? drogon::k400BadRequest
      : (code == "unauthorized" || code == "reauthentication_failed")
          ? drogon::k401Unauthorized
      : code == "forbidden"    ? drogon::k403Forbidden
      : code == "conflict"     ? drogon::k409Conflict
      : code == "rate_limited" ? drogon::k429TooManyRequests
                               : drogon::k503ServiceUnavailable);
  co_return response;
}
} // namespace
#define PREF_HANDLER(name, op)                                                 \
  drogon::Task<drogon::HttpResponsePtr> PreferencesController::name(           \
      drogon::HttpRequestPtr req) {                                            \
    co_return co_await handle(req, op);                                        \
  }
PREF_HANDLER(get, "get")
PREF_HANDLER(save, "save")
PREF_HANDLER(preview, "preview")
PREF_HANDLER(reset, "reset")
PREF_HANDLER(history, "history")
#undef PREF_HANDLER
