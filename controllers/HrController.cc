#include "HrController.h"
#include "domain_services/hr/HrService.h"
#include "domain_services/hr/HrWorkflowService.h"
#include "domain_services/hr/HrProfileService.h"
namespace {
drogon::Task<drogon::HttpResponsePtr> handle(drogon::HttpRequestPtr req, const std::string &op, const std::string &id = {}) {
  Json::Value body;
  if (req->getJsonObject()) body = *req->getJsonObject();
  auto result = co_await business_desk::domain_services::HrService::execute(op, id, body, (op == "balance" ? req->getParameter("year") : req->getParameter("page")), business_desk::utils::extractAuditIdentity(req));
  auto response = drogon::HttpResponse::newHttpJsonResponse(result.toJson());
  response->addHeader("Cache-Control", "no-store");
  const auto code = result.error["code"].asString();
  response->setStatusCode(result.success ? (op == "create" ? drogon::k201Created : drogon::k200OK) :
    code == "validation_error" ? drogon::k400BadRequest : code == "unauthorized" ? drogon::k401Unauthorized :
    code == "forbidden" ? drogon::k403Forbidden : code == "not_found" ? drogon::k404NotFound :
    code == "conflict" ? drogon::k409Conflict : drogon::k503ServiceUnavailable);
  co_return response;
}
}
drogon::Task<drogon::HttpResponsePtr> HrController::list(drogon::HttpRequestPtr req) { co_return co_await handle(req, "list"); }
drogon::Task<drogon::HttpResponsePtr> HrController::create(drogon::HttpRequestPtr req) { co_return co_await handle(req, "create"); }
drogon::Task<drogon::HttpResponsePtr> HrController::decision(drogon::HttpRequestPtr req, std::string id, std::string action) { co_return co_await handle(req, action, id); }

namespace {
drogon::Task<drogon::HttpResponsePtr> workHandle(drogon::HttpRequestPtr req, std::string kind, std::string op, std::string id = {}) {
  Json::Value body;
  if (req->getJsonObject()) body = *req->getJsonObject();
  auto result = co_await business_desk::domain_services::HrWorkflowService::execute(kind, op, id, body, req->getParameter("page"), business_desk::utils::extractAuditIdentity(req));
  auto response = drogon::HttpResponse::newHttpJsonResponse(result.toJson());
  response->addHeader("Cache-Control", "no-store");
  const auto code = result.error["code"].asString();
  response->setStatusCode(result.success ? (op == "create" ? drogon::k201Created : drogon::k200OK) :
    code == "validation_error" ? drogon::k400BadRequest : code == "unauthorized" ? drogon::k401Unauthorized :
    code == "forbidden" ? drogon::k403Forbidden : code == "not_found" ? drogon::k404NotFound :
    code == "conflict" ? drogon::k409Conflict : drogon::k503ServiceUnavailable);
  co_return response;
}
}
drogon::Task<drogon::HttpResponsePtr> HrController::workList(drogon::HttpRequestPtr req, std::string kind) { co_return co_await workHandle(req, kind, "list"); }
drogon::Task<drogon::HttpResponsePtr> HrController::workCreate(drogon::HttpRequestPtr req, std::string kind) { co_return co_await workHandle(req, kind, "create"); }
drogon::Task<drogon::HttpResponsePtr> HrController::workUpdate(drogon::HttpRequestPtr req, std::string kind, std::string id) { co_return co_await workHandle(req, kind, "update", id); }
drogon::Task<drogon::HttpResponsePtr> HrController::workTransition(drogon::HttpRequestPtr req, std::string kind, std::string id) { co_return co_await workHandle(req, kind, "transition", id); }

drogon::Task<drogon::HttpResponsePtr> HrController::balance(drogon::HttpRequestPtr req, std::string id) { co_return co_await handle(req, "balance", id); }

namespace {
drogon::Task<drogon::HttpResponsePtr> profileHandle(drogon::HttpRequestPtr req, std::string op, std::string id = {}) {
  Json::Value body;
  if (req->getJsonObject()) body = *req->getJsonObject();
  auto result = co_await business_desk::domain_services::HrProfileService::execute(op, id, body, req->getParameter("page"), business_desk::utils::extractAuditIdentity(req));
  auto response = drogon::HttpResponse::newHttpJsonResponse(result.toJson());
  response->addHeader("Cache-Control", "no-store");
  const auto code = result.error["code"].asString();
  response->setStatusCode(result.success ? (op == "submit" ? drogon::k201Created : drogon::k200OK) :
    code == "validation_error" ? drogon::k400BadRequest : code == "unauthorized" ? drogon::k401Unauthorized :
    code == "forbidden" ? drogon::k403Forbidden : code == "not_found" ? drogon::k404NotFound :
    code == "conflict" ? drogon::k409Conflict : drogon::k503ServiceUnavailable);
  co_return response;
}
}
drogon::Task<drogon::HttpResponsePtr> HrController::employeeProfile(drogon::HttpRequestPtr req, std::string id) { co_return co_await profileHandle(req, "get", id); }
drogon::Task<drogon::HttpResponsePtr> HrController::profileRequests(drogon::HttpRequestPtr req) { co_return co_await profileHandle(req, "list"); }
drogon::Task<drogon::HttpResponsePtr> HrController::profileSubmit(drogon::HttpRequestPtr req) { co_return co_await profileHandle(req, "submit"); }
drogon::Task<drogon::HttpResponsePtr> HrController::profileDecision(drogon::HttpRequestPtr req, std::string id, std::string action) { if (action != "approve" && action != "reject") action = "invalid"; co_return co_await profileHandle(req, action, id); }
