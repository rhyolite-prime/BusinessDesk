#include "EmployeeController.h"
#include "domain_services/hr/EmployeeService.h"
namespace {
int number(const std::string &s, int fallback) {
  if (s.empty())
    return fallback;
  try {
    size_t end;
    auto n = std::stoi(s, &end);
    return end == s.size() && n > 0 ? n : 0;
  } catch (...) {
    return 0;
  }
}
drogon::Task<drogon::HttpResponsePtr> handle(drogon::HttpRequestPtr req,
                                             std::string op, std::string id) {
  Json::Value body;
  if (req->getJsonObject())
    body = *req->getJsonObject();
  const auto result =
      co_await business_desk::domain_services::EmployeeService::execute(
          op, id, body, number(req->getParameter("pageNo"), 1),
          number(req->getParameter("pageSize"), 20), req->getParameter("query"),
          business_desk::utils::extractAuditIdentity(req));
  auto response = drogon::HttpResponse::newHttpJsonResponse(result.toJson());
  response->addHeader("Cache-Control", "no-store");
  const auto code = result.error["code"].asString();
  response->setStatusCode(
      result.success ? (op == "create" ? drogon::k201Created : drogon::k200OK)
      : code == "validation_error" ? drogon::k400BadRequest
      : code == "unauthorized"     ? drogon::k401Unauthorized
      : code == "forbidden"        ? drogon::k403Forbidden
      : code == "not_found"        ? drogon::k404NotFound
      : code == "conflict"         ? drogon::k409Conflict
                                   : drogon::k503ServiceUnavailable);
  co_return response;
}
} // namespace
drogon::Task<drogon::HttpResponsePtr>
EmployeeController::list(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "list", std::string{});
}
drogon::Task<drogon::HttpResponsePtr>
EmployeeController::options(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "options", std::string{});
}
drogon::Task<drogon::HttpResponsePtr>
EmployeeController::get(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "get", id);
}
drogon::Task<drogon::HttpResponsePtr>
EmployeeController::create(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "create", std::string{});
}
drogon::Task<drogon::HttpResponsePtr>
EmployeeController::update(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "update", id);
}
drogon::Task<drogon::HttpResponsePtr>
EmployeeController::remove(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "delete", id);
}
