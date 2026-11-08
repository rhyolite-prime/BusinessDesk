#include "AccountingPeriodController.h"
#include "domain_services/gl/AccountingPeriodService.h"
namespace {
drogon::Task<drogon::HttpResponsePtr> handle(drogon::HttpRequestPtr req,
                                             std::string op, std::string id) {
  if (req->getMethod() == drogon::Options) {
    auto r = drogon::HttpResponse::newHttpResponse();
    r->setStatusCode(drogon::k204NoContent);
    co_return r;
  }
  Json::Value body;
  if ((op == "create" || op == "open" || op == "close") && req->getJsonObject())
    body = *req->getJsonObject();
  std::string unit = req->getParameter("accountingUnitId");
  if (op == "list") {
    const auto year = req->getParameter("year");
    if (!year.empty()) {
      if (year.size() == 4 &&
          year.find_first_not_of("0123456789") == std::string::npos)
        body["year"] = std::stoi(year);
      else
        body["year"] = year;
    }
  } else if ((op == "create" || op == "open" || op == "close") &&
             body.isObject() && body["accountingUnitId"].isString()) {
    if (!unit.empty() && unit != body["accountingUnitId"].asString())
      body["scopeMismatch"] = true;
    unit = body["accountingUnitId"].asString();
  }
  const auto result =
      co_await business_desk::domain_services::AccountingPeriodService::execute(
          op, id, unit, body, business_desk::utils::extractAuditIdentity(req));
  auto r = drogon::HttpResponse::newHttpJsonResponse(result.toJson());
  r->addHeader("Cache-Control", "no-store");
  const auto code = result.error["code"].asString();
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
AccountingPeriodController::list(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "list", std::string{});
}

drogon::Task<drogon::HttpResponsePtr>
AccountingPeriodController::create(drogon::HttpRequestPtr req) {
  co_return co_await handle(req, "create", std::string{});
}

drogon::Task<drogon::HttpResponsePtr>
AccountingPeriodController::open(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "open", id);
}

drogon::Task<drogon::HttpResponsePtr>
AccountingPeriodController::close(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await handle(req, "close", id);
}

drogon::Task<drogon::HttpResponsePtr>
AccountingPeriodController::history(drogon::HttpRequestPtr req,
                                    std::string id) {
  co_return co_await handle(req, "history", id);
}
