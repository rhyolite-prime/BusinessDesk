#pragma once
#include <drogon/HttpController.h>
class HrController : public drogon::HttpController<HrController> {
public:
  METHOD_LIST_BEGIN
  ADD_METHOD_TO(HrController::list, "/api/v1/hr/leave-requests", drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(HrController::create, "/api/v1/hr/leave-requests", drogon::Post, "TenantJwtAuthFilter");
  ADD_METHOD_TO(HrController::decision, "/api/v1/hr/leave-requests/{1}/{2}", drogon::Post, "TenantJwtAuthFilter");
  ADD_METHOD_TO(HrController::balance, "/api/v1/hr/leave-balances/{1}", drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(HrController::workList, "/api/v1/hr/work-items/{1}", drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(HrController::workCreate, "/api/v1/hr/work-items/{1}", drogon::Post, "TenantJwtAuthFilter");
  ADD_METHOD_TO(HrController::workUpdate, "/api/v1/hr/work-items/{1}/{2}", drogon::Put, "TenantJwtAuthFilter");
  ADD_METHOD_TO(HrController::workTransition, "/api/v1/hr/work-items/{1}/{2}/transition", drogon::Post, "TenantJwtAuthFilter");
  ADD_METHOD_TO(HrController::myProfile, "/api/v1/hr/profile/me", drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(HrController::profileRequests, "/api/v1/hr/profile/requests", drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(HrController::profileSubmit, "/api/v1/hr/profile/requests", drogon::Post, "TenantJwtAuthFilter");
  ADD_METHOD_TO(HrController::profileDecision, "/api/v1/hr/profile/requests/{1}/{2}", drogon::Post, "TenantJwtAuthFilter");
  METHOD_LIST_END
  drogon::Task<drogon::HttpResponsePtr> myProfile(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> profileRequests(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> profileSubmit(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> profileDecision(drogon::HttpRequestPtr req, std::string id, std::string action);
  drogon::Task<drogon::HttpResponsePtr> balance(drogon::HttpRequestPtr req, std::string id);
  drogon::Task<drogon::HttpResponsePtr> workList(drogon::HttpRequestPtr req, std::string kind);
  drogon::Task<drogon::HttpResponsePtr> workCreate(drogon::HttpRequestPtr req, std::string kind);
  drogon::Task<drogon::HttpResponsePtr> workUpdate(drogon::HttpRequestPtr req, std::string kind, std::string id);
  drogon::Task<drogon::HttpResponsePtr> workTransition(drogon::HttpRequestPtr req, std::string kind, std::string id);
  drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> decision(drogon::HttpRequestPtr req, std::string id, std::string action);
};
