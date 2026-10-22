#include "SupplierController.h"
#include "domain_services/shared/SupplierService.h"
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
drogon::Task<drogon::HttpResponsePtr>
handle(drogon::HttpRequestPtr req, std::string op, bool group, std::string id) {
  if (req->getMethod() == drogon::Options) {
    auto r = drogon::HttpResponse::newHttpResponse();
    r->setStatusCode(drogon::k204NoContent);
    co_return r;
  }
  Json::Value body;
  if (req->getJsonObject())
    body = *req->getJsonObject();
  const auto result =
      co_await business_desk::domain_services::SupplierService::execute(
          op, group, id, body, number(req->getParameter("pageNo"), 1),
          number(req->getParameter("pageSize"), 20), req->getParameter("query"),
          req->getParameter("kind"), req->getParameter("accountingUnitId"),
          business_desk::utils::extractAuditIdentity(req));
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
SupplierController::groupList(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "list", true, std::string{});
}

drogon::Task<drogon::HttpResponsePtr>
SupplierController::groupGet(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "get", true, id);
}

drogon::Task<drogon::HttpResponsePtr>
SupplierController::groupCreate(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "create", true, std::string{});
}

drogon::Task<drogon::HttpResponsePtr>
SupplierController::groupUpdate(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "update", true, id);
}

drogon::Task<drogon::HttpResponsePtr>
SupplierController::groupRemove(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "delete", true, id);
}

drogon::Task<drogon::HttpResponsePtr>
SupplierController::supplierList(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "list", false, std::string{});
}

drogon::Task<drogon::HttpResponsePtr>
SupplierController::supplierGet(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "get", false, id);
}

drogon::Task<drogon::HttpResponsePtr>
SupplierController::supplierCreate(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "create", false, std::string{});
}

drogon::Task<drogon::HttpResponsePtr>
SupplierController::supplierUpdate(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "update", false, id);
}

drogon::Task<drogon::HttpResponsePtr>
SupplierController::supplierRemove(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "delete", false, id);
}

drogon::Task<drogon::HttpResponsePtr>
SupplierController::supplierOptions(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "options", false, std::string{});
}
