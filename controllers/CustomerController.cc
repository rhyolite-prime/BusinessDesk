#include "CustomerController.h"
#include "domain_services/shared/CustomerService.h"
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
  if (op == "list" || op == "group-list" || op == "options") {
    for (auto k : {"pageNo", "pageSize"}) {
      auto value = req->getParameter(k);
      if (!value.empty()) {
        if (value.size() > 6 ||
            value.find_first_not_of("0123456789") != std::string::npos) {
          body[k] = -1;
          continue;
        }
        body[k] = std::stoi(value);
      }
    }
  }
  if (op == "list" || op == "group-list" || op == "options")
    body["query"] = req->getParameter("query");
  if (op == "options") {
    body["kind"] = req->getParameter("kind");
    body["accountingUnitId"] = req->getParameter("accountingUnitId");
  }
  const auto result =
      co_await business_desk::domain_services::CustomerService::execute(
          op, id, body, business_desk::utils::extractAuditIdentity(req));
  auto r = drogon::HttpResponse::newHttpJsonResponse(result.toJson());
  r->addHeader("Cache-Control", "no-store");
  const auto code = result.error["code"].asString();
  r->setStatusCode(result.success ? ((op == "create" || op == "group-create")
                                         ? drogon::k201Created
                                         : drogon::k200OK)
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
CustomerController::list(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "list", std::string{});
}
drogon::Task<drogon::HttpResponsePtr>
CustomerController::create(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "create", std::string{});
}
drogon::Task<drogon::HttpResponsePtr>
CustomerController::update(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "update", id);
}
drogon::Task<drogon::HttpResponsePtr>
CustomerController::remove(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "delete", id);
}

drogon::Task<drogon::HttpResponsePtr>
CustomerController::get(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "get", id);
}

drogon::Task<drogon::HttpResponsePtr>
CustomerController::options(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "options", std::string{});
}

drogon::Task<drogon::HttpResponsePtr>
CustomerController::groupList(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "group-list", std::string{});
}

drogon::Task<drogon::HttpResponsePtr>
CustomerController::groupGet(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "group-get", id);
}

drogon::Task<drogon::HttpResponsePtr>
CustomerController::groupCreate(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "group-create", std::string{});
}

drogon::Task<drogon::HttpResponsePtr>
CustomerController::groupUpdate(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "group-update", id);
}

drogon::Task<drogon::HttpResponsePtr>
CustomerController::groupRemove(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "group-delete", id);
}
