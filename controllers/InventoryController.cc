#include "InventoryController.h"
#include "domain_services/inventory/InventoryService.h"
namespace {
int bounded(const std::string &v, int fallback, int max) {
  if (v.empty() || v.size() > 9 || v.find_first_not_of("0123456789") != std::string::npos)
    return fallback;
  const auto n = std::stoll(v);
  if (n < 1 || n > max)
    return fallback;
  return static_cast<int>(n);
}
void mergeVersion(drogon::HttpRequestPtr req, Json::Value &body) {
  const auto version = req->getParameter("version");
  if (body.isObject() && !body.isMember("version") && !version.empty() && version.size() <= 10 &&
      version.find_first_not_of("0123456789") == std::string::npos) {
    const auto v = std::stoll(version);
    if (v > 0 && v <= 2147483647)
      body["version"] = static_cast<int>(v);
  }
}
void mergeListParams(drogon::HttpRequestPtr req, Json::Value &body) {
  if (!body.isObject())
    body = Json::Value(Json::objectValue);
  for (const char *key : {"itemId", "warehouseId", "status", "documentType", "dateFrom", "dateTo"}) {
    const auto v = req->getParameter(key);
    if (!v.empty() && v.size() <= 80 && !body.isMember(key))
      body[key] = v;
  }
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
  const bool list = op.size() > 5 && op.substr(op.size() - 5) == ".list";
  const bool remove = op.size() > 7 && op.substr(op.size() - 7) == ".delete";
  const bool nextNumber = op.size() > 12 && op.substr(op.size() - 12) == ".next-number";
  if (list || nextNumber)
    mergeListParams(req, body);
  if (remove)
    mergeVersion(req, body);
  const int page = bounded(req->getParameter("page"), 1, 1000000);
  const int size = bounded(req->getParameter("size"), 20, 100);
  const std::string query = req->getParameter("q").substr(0, 200);
  std::string unit = req->getParameter("accountingUnitId").substr(0, 40);
  if (body.isObject() && body["accountingUnitId"].isString())
    unit = body["accountingUnitId"].asString();
  const auto who = business_desk::utils::extractAuditIdentity(req);
  const bool documents = op.rfind("documents.", 0) == 0;
  const auto result = documents
                          ? co_await business_desk::domain_services::InventoryService::documents(
                                op, id, body, page, size, query, unit, who)
                          : co_await business_desk::domain_services::InventoryService::execute(
                                op, id, body, page, size, query, unit, who);
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
drogon::Task<drogon::HttpResponsePtr> InventoryController::dashboard(drogon::HttpRequestPtr req) {
  co_return co_await run(req, "dashboard.summary", std::string{});
}
drogon::Task<drogon::HttpResponsePtr> InventoryController::nextNumber(drogon::HttpRequestPtr req,
                                                                      std::string resource) {
  co_return co_await run(req, resource + ".next-number", std::string{});
}
drogon::Task<drogon::HttpResponsePtr> InventoryController::itemCard(drogon::HttpRequestPtr req,
                                                                    std::string id) {
  co_return co_await run(req, "items.card", id);
}
drogon::Task<drogon::HttpResponsePtr> InventoryController::list(drogon::HttpRequestPtr req,
                                                                std::string resource) {
  co_return co_await run(req, resource + ".list", std::string{});
}
drogon::Task<drogon::HttpResponsePtr> InventoryController::get(drogon::HttpRequestPtr req,
                                                               std::string resource,
                                                               std::string id) {
  co_return co_await run(req, resource + ".get", id);
}
drogon::Task<drogon::HttpResponsePtr> InventoryController::create(drogon::HttpRequestPtr req,
                                                                  std::string resource) {
  co_return co_await run(req, resource + ".create", std::string{});
}
drogon::Task<drogon::HttpResponsePtr> InventoryController::update(drogon::HttpRequestPtr req,
                                                                  std::string resource,
                                                                  std::string id) {
  co_return co_await run(req, resource + ".update", id);
}
drogon::Task<drogon::HttpResponsePtr> InventoryController::remove(drogon::HttpRequestPtr req,
                                                                  std::string resource,
                                                                  std::string id) {
  co_return co_await run(req, resource + ".delete", id);
}
drogon::Task<drogon::HttpResponsePtr> InventoryController::action(drogon::HttpRequestPtr req,
                                                                  std::string resource,
                                                                  std::string id,
                                                                  std::string action) {
  co_return co_await run(req, resource + "." + action, id);
}
