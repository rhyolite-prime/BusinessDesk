#pragma once
#include <drogon/HttpController.h>

class DmController : public drogon::HttpController<DmController> {
public:
  METHOD_LIST_BEGIN
  // Specialized static routes before wildcard resource routes
  ADD_METHOD_TO(DmController::dashboard, "/api/v1/dm/dashboard/summary", drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(DmController::nextNumber, "/api/v1/dm/next-number", drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(DmController::audit, "/api/v1/dm/audit", drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(DmController::trash, "/api/v1/dm/trash", drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(DmController::trashAction, "/api/v1/dm/trash/{1}/{2}", drogon::Post, "TenantJwtAuthFilter");
  ADD_METHOD_TO(DmController::trashPurge, "/api/v1/dm/trash/{1}", drogon::Delete, "TenantJwtAuthFilter");
  ADD_METHOD_TO(DmController::savedSearchesList, "/api/v1/dm/saved-searches", drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(DmController::savedSearchesCreate, "/api/v1/dm/saved-searches", drogon::Post, "TenantJwtAuthFilter");
  ADD_METHOD_TO(DmController::savedSearchesDelete, "/api/v1/dm/saved-searches/{1}", drogon::Delete, "TenantJwtAuthFilter");
  ADD_METHOD_TO(DmController::subSubAction, "/api/v1/dm/{1}/{2}/{3}/{4}/{5}", drogon::Post, "TenantJwtAuthFilter");
  ADD_METHOD_TO(DmController::subDelete, "/api/v1/dm/{1}/{2}/{3}/{4}", drogon::Delete, "TenantJwtAuthFilter");
  ADD_METHOD_TO(DmController::subGet, "/api/v1/dm/{1}/{2}/{3}", drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(DmController::subPost, "/api/v1/dm/{1}/{2}/{3}", drogon::Post, "TenantJwtAuthFilter");
  ADD_METHOD_TO(DmController::action, "/api/v1/dm/{1}/{2}/{3}", drogon::Post, "TenantJwtAuthFilter");
  ADD_METHOD_TO(DmController::list, "/api/v1/dm/{1}", drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(DmController::get, "/api/v1/dm/{1}/{2}", drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(DmController::create, "/api/v1/dm/{1}", drogon::Post, "TenantJwtAuthFilter");
  ADD_METHOD_TO(DmController::update, "/api/v1/dm/{1}/{2}", drogon::Put, "TenantJwtAuthFilter");
  ADD_METHOD_TO(DmController::remove, "/api/v1/dm/{1}/{2}", drogon::Delete, "TenantJwtAuthFilter");
  METHOD_LIST_END

  drogon::Task<drogon::HttpResponsePtr> dashboard(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> nextNumber(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> audit(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> trash(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> trashAction(drogon::HttpRequestPtr req, std::string id, std::string act);
  drogon::Task<drogon::HttpResponsePtr> trashPurge(drogon::HttpRequestPtr req, std::string id);
  drogon::Task<drogon::HttpResponsePtr> savedSearchesList(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> savedSearchesCreate(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> savedSearchesDelete(drogon::HttpRequestPtr req, std::string id);
  drogon::Task<drogon::HttpResponsePtr> subSubAction(drogon::HttpRequestPtr req, std::string resource, std::string id, std::string sub, std::string subId, std::string act);
  drogon::Task<drogon::HttpResponsePtr> subDelete(drogon::HttpRequestPtr req, std::string resource, std::string id, std::string sub, std::string subId);
  drogon::Task<drogon::HttpResponsePtr> subGet(drogon::HttpRequestPtr req, std::string resource, std::string id, std::string sub);
  drogon::Task<drogon::HttpResponsePtr> subPost(drogon::HttpRequestPtr req, std::string resource, std::string id, std::string sub);
  drogon::Task<drogon::HttpResponsePtr> action(drogon::HttpRequestPtr req, std::string resource, std::string id, std::string act);
  drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req, std::string resource);
  drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req, std::string resource, std::string id);
  drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req, std::string resource);
  drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr req, std::string resource, std::string id);
  drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr req, std::string resource, std::string id);
};
