#include "SupplierVoucherController.h"
#include "domain_services/gl/SupplierVoucherService.h"
namespace {
drogon::Task<drogon::HttpResponsePtr> handle(drogon::HttpRequestPtr req,
                                             std::string op, std::string id) {
  Json::Value body;
  if (req->getJsonObject())
    body = *req->getJsonObject();
  if (op == "list")
    for (auto k : {"search", "type", "status"})
      body[k] = req->getParameter(k);
  if (op == "delete") {
    const auto v = req->getParameter("version");
    if (!v.empty() && v.size() < 11 &&
        v.find_first_not_of("0123456789") == std::string::npos) {
      auto n = std::stoll(v);
      if (n > 0 && n <= 2147483647)
        body["version"] = int(n);
    }
  }
  auto result =
      co_await business_desk::domain_services::SupplierVoucherService::execute(
          op, id, body, business_desk::utils::extractAuditIdentity(req));
  auto r = drogon::HttpResponse::newHttpJsonResponse(result.toJson());
  r->addHeader("Cache-Control", "no-store");
  auto code = result.error["code"].asString();
  r->setStatusCode(result.success
                       ? (op == "create" ? drogon::k201Created : drogon::k200OK)
                   : code == "validation_error" ? drogon::k400BadRequest
                   : code == "unauthorized"     ? drogon::k401Unauthorized
                   : code == "forbidden"        ? drogon::k403Forbidden
                   : code == "not_found"        ? drogon::k404NotFound
                   : (code == "conflict" || code == "approval_required")
                       ? drogon::k409Conflict
                       : drogon::k503ServiceUnavailable);
  co_return r;
}
} // namespace
drogon::Task<drogon::HttpResponsePtr>
SupplierVoucherController::list(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "list", std::string{});
}
drogon::Task<drogon::HttpResponsePtr>
SupplierVoucherController::get(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "get", id);
}
drogon::Task<drogon::HttpResponsePtr>
SupplierVoucherController::create(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "create", std::string{});
}
drogon::Task<drogon::HttpResponsePtr>
SupplierVoucherController::update(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "update", id);
}
drogon::Task<drogon::HttpResponsePtr>
SupplierVoucherController::remove(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "delete", id);
}
drogon::Task<drogon::HttpResponsePtr>
SupplierVoucherController::preview(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "preview", std::string{});
}
drogon::Task<drogon::HttpResponsePtr>
SupplierVoucherController::submit(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "submit", id);
}
drogon::Task<drogon::HttpResponsePtr>
SupplierVoucherController::approve(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "approve", id);
}
drogon::Task<drogon::HttpResponsePtr>
SupplierVoucherController::post(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "post", id);
}
