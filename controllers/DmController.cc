#include "DmController.h"
#include "domain_services/dm/DmService.h"

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

void mergeQueryParams(drogon::HttpRequestPtr req, Json::Value &body) {
  if (!body.isObject())
    body = Json::Value(Json::objectValue);
  for (const char *key : {"q", "folderId", "templateId", "status", "tag", "documentId",
                          "eventType", "checkedOutByMe", "bookmarkedByMe", "myTasks", "type"}) {
    const auto v = req->getParameter(key);
    if (!v.empty() && v.size() <= 120 && !body.isMember(key)) {
      if (std::string(key) == "checkedOutByMe" || std::string(key) == "bookmarkedByMe" || std::string(key) == "myTasks")
        body[key] = (v == "true" || v == "1");
      else
        body[key] = v;
    }
  }
}

drogon::Task<drogon::HttpResponsePtr> run(drogon::HttpRequestPtr req, std::string op,
                                          std::string id = {}, std::string subId = {}) {
  if (req->getMethod() == drogon::Options) {
    auto r = drogon::HttpResponse::newHttpResponse();
    r->setStatusCode(drogon::k204NoContent);
    co_return r;
  }
  Json::Value body;
  if (req->getJsonObject())
    body = *req->getJsonObject();
  if (req->getMethod() == drogon::Get)
    mergeQueryParams(req, body);
  if (req->getMethod() == drogon::Delete) {
    if (!body.isObject())
      body = Json::Value(Json::objectValue);
    mergeVersion(req, body);
  }
  const int page = bounded(req->getParameter("page"), 1, 1000000);
  const int size = bounded(req->getParameter("size"), 20, 100);
  const std::string query = req->getParameter("q").substr(0, 200);
  std::string unit = req->getParameter("accountingUnitId").substr(0, 40);
  if (body.isObject() && body.isMember("accountingUnitId") && body["accountingUnitId"].isString())
    unit = body["accountingUnitId"].asString();

  const auto result = co_await business_desk::domain_services::DmService::execute(
      op, id, subId, body, page, size, query, unit, business_desk::utils::extractAuditIdentity(req));

  auto r = drogon::HttpResponse::newHttpJsonResponse(result.toJson());
  r->addHeader("Cache-Control", "no-store");
  const auto code = result.error["code"].asString();
  const bool created = op.ends_with(".create") || op.ends_with(".add") || op.ends_with(".submit");
  r->setStatusCode(result.success ? (created ? drogon::k201Created : drogon::k200OK)
                   : code == "validation_error" ? drogon::k400BadRequest
                   : code == "unauthorized"     ? drogon::k401Unauthorized
                   : code == "forbidden"        ? drogon::k403Forbidden
                   : code == "not_found"        ? drogon::k404NotFound
                   : (code == "conflict" || code == "approval_required") ? drogon::k409Conflict
                   : drogon::k503ServiceUnavailable);
  co_return r;
}
} // namespace

drogon::Task<drogon::HttpResponsePtr> DmController::dashboard(drogon::HttpRequestPtr req) {
  co_return co_await run(req, "dashboard.summary");
}

drogon::Task<drogon::HttpResponsePtr> DmController::nextNumber(drogon::HttpRequestPtr req) {
  co_return co_await run(req, "next-number");
}

drogon::Task<drogon::HttpResponsePtr> DmController::audit(drogon::HttpRequestPtr req) {
  co_return co_await run(req, "audit.list");
}

drogon::Task<drogon::HttpResponsePtr> DmController::trash(drogon::HttpRequestPtr req) {
  co_return co_await run(req, "trash.list");
}

drogon::Task<drogon::HttpResponsePtr> DmController::trashAction(drogon::HttpRequestPtr req, std::string id, std::string act) {
  co_return co_await run(req, "trash." + act, id);
}

drogon::Task<drogon::HttpResponsePtr> DmController::trashPurge(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await run(req, "trash.purge", id);
}

drogon::Task<drogon::HttpResponsePtr> DmController::savedSearchesList(drogon::HttpRequestPtr req) {
  co_return co_await run(req, "saved-searches.list");
}

drogon::Task<drogon::HttpResponsePtr> DmController::savedSearchesCreate(drogon::HttpRequestPtr req) {
  co_return co_await run(req, "saved-searches.create");
}

drogon::Task<drogon::HttpResponsePtr> DmController::savedSearchesDelete(drogon::HttpRequestPtr req, std::string id) {
  co_return co_await run(req, "saved-searches.delete", id);
}

drogon::Task<drogon::HttpResponsePtr> DmController::subSubAction(drogon::HttpRequestPtr req, std::string resource, std::string id, std::string sub, std::string subId, std::string act) {
  co_return co_await run(req, resource + "." + sub + "." + act, id, subId);
}

drogon::Task<drogon::HttpResponsePtr> DmController::subDelete(drogon::HttpRequestPtr req, std::string resource, std::string id, std::string sub, std::string subId) {
  co_return co_await run(req, resource + "." + sub + ".remove", id, subId);
}

drogon::Task<drogon::HttpResponsePtr> DmController::subGet(drogon::HttpRequestPtr req, std::string resource, std::string id, std::string sub) {
  co_return co_await run(req, resource + "." + sub + ".list", id);
}

drogon::Task<drogon::HttpResponsePtr> DmController::subPost(drogon::HttpRequestPtr req, std::string resource, std::string id, std::string sub) {
  co_return co_await run(req, resource + "." + sub + ".add", id);
}

drogon::Task<drogon::HttpResponsePtr> DmController::action(drogon::HttpRequestPtr req, std::string resource, std::string id, std::string act) {
  co_return co_await run(req, resource + "." + act, id);
}

drogon::Task<drogon::HttpResponsePtr> DmController::list(drogon::HttpRequestPtr req, std::string resource) {
  co_return co_await run(req, resource + ".list");
}

drogon::Task<drogon::HttpResponsePtr> DmController::get(drogon::HttpRequestPtr req, std::string resource, std::string id) {
  co_return co_await run(req, resource + ".get", id);
}

drogon::Task<drogon::HttpResponsePtr> DmController::create(drogon::HttpRequestPtr req, std::string resource) {
  co_return co_await run(req, resource + ".create");
}

drogon::Task<drogon::HttpResponsePtr> DmController::update(drogon::HttpRequestPtr req, std::string resource, std::string id) {
  co_return co_await run(req, resource + ".update", id);
}

drogon::Task<drogon::HttpResponsePtr> DmController::remove(drogon::HttpRequestPtr req, std::string resource, std::string id) {
  co_return co_await run(req, resource + ".delete", id);
}
