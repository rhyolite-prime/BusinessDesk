#include "SupplyChainController.h"
#include "domain_services/supply_chain/SupplyChainService.h"
namespace {
int bounded(const std::string &v, int fallback, int max) {
  if (v.empty() || v.size() > 9 || v.find_first_not_of("0123456789") != std::string::npos)
    return fallback;
  const auto n = std::stoll(v);
  if (n < 1 || n > max)
    return fallback;
  return static_cast<int>(n);
}
drogon::Task<drogon::HttpResponsePtr> run(drogon::HttpRequestPtr req, std::string op,
                                          std::string id) {
  if (req->getMethod() == drogon::Options) {
    auto r = drogon::HttpResponse::newHttpResponse();
    r->setStatusCode(drogon::k204NoContent);
    co_return r;
  }
  Json::Value body;
  if (req->getJsonObject())
    body = *req->getJsonObject();
  const bool remove = op.size() > 7 && op.substr(op.size() - 7) == ".delete";
  const bool nextNumber = op.size() > 12 && op.substr(op.size() - 12) == ".next-number";
  if (nextNumber || op.size() > 5 && op.substr(op.size() - 5) == ".list") {
    if (!body.isObject())
      body = Json::Value(Json::objectValue);
    const auto status = req->getParameter("status");
    if (!status.empty() && status.size() <= 40 && !body.isMember("status"))
      body["status"] = status;
  }
  if (remove) {
    const auto version = req->getParameter("version");
    if (body.isObject() && !body.isMember("version") && !version.empty() && version.size() <= 10 &&
        version.find_first_not_of("0123456789") == std::string::npos) {
      const auto v = std::stoll(version);
      if (v > 0 && v <= 2147483647)
        body["version"] = static_cast<int>(v);
    }
  }
  const int page = bounded(req->getParameter("page"), 1, 1000000);
  const int size = bounded(req->getParameter("size"), 20, 100);
  const std::string query = req->getParameter("q").substr(0, 200);
  std::string unit = req->getParameter("accountingUnitId").substr(0, 40);
  if (body.isObject() && body["accountingUnitId"].isString())
    unit = body["accountingUnitId"].asString();
  const auto result = co_await business_desk::domain_services::SupplyChainService::execute(
      op, id, body, page, size, query, unit, business_desk::utils::extractAuditIdentity(req));
  auto r = drogon::HttpResponse::newHttpJsonResponse(result.toJson());
  r->addHeader("Cache-Control", "no-store");
  const auto code = result.error["code"].asString();
  const bool created = op.size() > 7 && op.substr(op.size() - 7) == ".create";
  r->setStatusCode(result.success      ? (created ? drogon::k201Created : drogon::k200OK)
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
drogon::Task<drogon::HttpResponsePtr> SupplyChainController::nextNumber(drogon::HttpRequestPtr req,
                                                                        std::string resource) {
  co_return co_await run(req, resource + ".next-number", std::string{});
}
drogon::Task<drogon::HttpResponsePtr> SupplyChainController::list(drogon::HttpRequestPtr req,
                                                                  std::string resource) {
  co_return co_await run(req, resource + ".list", std::string{});
}
drogon::Task<drogon::HttpResponsePtr> SupplyChainController::get(drogon::HttpRequestPtr req,
                                                                 std::string resource,
                                                                 std::string id) {
  co_return co_await run(req, resource + ".get", id);
}
drogon::Task<drogon::HttpResponsePtr> SupplyChainController::create(drogon::HttpRequestPtr req,
                                                                    std::string resource) {
  co_return co_await run(req, resource + ".create", std::string{});
}
drogon::Task<drogon::HttpResponsePtr> SupplyChainController::update(drogon::HttpRequestPtr req,
                                                                    std::string resource,
                                                                    std::string id) {
  co_return co_await run(req, resource + ".update", id);
}
drogon::Task<drogon::HttpResponsePtr> SupplyChainController::remove(drogon::HttpRequestPtr req,
                                                                    std::string resource,
                                                                    std::string id) {
  co_return co_await run(req, resource + ".delete", id);
}
drogon::Task<drogon::HttpResponsePtr> SupplyChainController::action(drogon::HttpRequestPtr req,
                                                                    std::string resource,
                                                                    std::string id,
                                                                    std::string action) {
  co_return co_await run(req, resource + "." + action, id);
}
