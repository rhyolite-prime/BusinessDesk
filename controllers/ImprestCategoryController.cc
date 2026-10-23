#include "ImprestCategoryController.h"
#include "domain_services/gl/ImprestCategoryService.h"
namespace {
drogon::Task<drogon::HttpResponsePtr> handle(drogon::HttpRequestPtr req,
                                             std::string op, std::string id) {
  if (req->getMethod() == drogon::Options) {
    auto r = drogon::HttpResponse::newHttpResponse();
    r->setStatusCode(drogon::k204NoContent);
    co_return r;
  }
  Json::Value body;
  if (req->getJsonObject())
    body = *req->getJsonObject();
  if (op == "list") {
    body = Json::objectValue;
    body["accountingUnitId"] = req->getParameter("accountingUnitId");
  }
  const auto result =
      co_await business_desk::domain_services::ImprestCategoryService::execute(
          op, id, body, business_desk::utils::extractAuditIdentity(req));
  auto r = drogon::HttpResponse::newHttpJsonResponse(result.toJson());
  r->addHeader("Cache-Control", "no-store");
  const auto code = result.error["code"].asString();
  r->setStatusCode(result.success
                       ? (op == "create" ? drogon::k201Created : drogon::k200OK)
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
ImprestCategoryController::list(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "list", std::string{});
}
drogon::Task<drogon::HttpResponsePtr>
ImprestCategoryController::get(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "get", id);
}
drogon::Task<drogon::HttpResponsePtr>
ImprestCategoryController::create(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "create", std::string{});
}
drogon::Task<drogon::HttpResponsePtr>
ImprestCategoryController::update(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "update", id);
}
drogon::Task<drogon::HttpResponsePtr>
ImprestCategoryController::remove(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "delete", id);
}
