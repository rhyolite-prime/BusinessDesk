#pragma once
#include <drogon/HttpController.h>

class FleetWorkshopController : public drogon::HttpController<FleetWorkshopController> {
public:
  METHOD_LIST_BEGIN
  // Static and specialized sub-routes before generic wildcard resource routes.
  ADD_METHOD_TO(FleetWorkshopController::dashboard,
                "/api/v1/fleet-workshop-management/dashboard/summary",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(FleetWorkshopController::reports,
                "/api/v1/fleet-workshop-management/reports",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(FleetWorkshopController::getGlSettings,
                "/api/v1/fleet-workshop-management/gl-settings",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(FleetWorkshopController::putGlSettings,
                "/api/v1/fleet-workshop-management/gl-settings",
                drogon::Put, "TenantJwtAuthFilter");
  ADD_METHOD_TO(FleetWorkshopController::generateSchedules,
                "/api/v1/fleet-workshop-management/schedules/generate",
                drogon::Post, "TenantJwtAuthFilter");
  ADD_METHOD_TO(FleetWorkshopController::options,
                "/api/v1/fleet-workshop-management/{1}/options",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(FleetWorkshopController::nextNumber,
                "/api/v1/fleet-workshop-management/{1}/next-number",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(FleetWorkshopController::subGet,
                "/api/v1/fleet-workshop-management/{1}/{2}/{3}",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(FleetWorkshopController::subPut,
                "/api/v1/fleet-workshop-management/{1}/{2}/{3}",
                drogon::Put, "TenantJwtAuthFilter");
  ADD_METHOD_TO(FleetWorkshopController::subPutItem,
                "/api/v1/fleet-workshop-management/{1}/{2}/{3}/{4}",
                drogon::Put, "TenantJwtAuthFilter");
  ADD_METHOD_TO(FleetWorkshopController::subDeleteItem,
                "/api/v1/fleet-workshop-management/{1}/{2}/{3}/{4}",
                drogon::Delete, "TenantJwtAuthFilter");
  ADD_METHOD_TO(FleetWorkshopController::list,
                "/api/v1/fleet-workshop-management/{1}",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(FleetWorkshopController::get,
                "/api/v1/fleet-workshop-management/{1}/{2}",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(FleetWorkshopController::create,
                "/api/v1/fleet-workshop-management/{1}",
                drogon::Post, "TenantJwtAuthFilter");
  ADD_METHOD_TO(FleetWorkshopController::update,
                "/api/v1/fleet-workshop-management/{1}/{2}",
                drogon::Put, "TenantJwtAuthFilter");
  ADD_METHOD_TO(FleetWorkshopController::remove,
                "/api/v1/fleet-workshop-management/{1}/{2}",
                drogon::Delete, "TenantJwtAuthFilter");
  ADD_METHOD_TO(FleetWorkshopController::action,
                "/api/v1/fleet-workshop-management/{1}/{2}/{3}",
                drogon::Post, "TenantJwtAuthFilter");
  METHOD_LIST_END

  drogon::Task<drogon::HttpResponsePtr> dashboard(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> reports(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> getGlSettings(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> putGlSettings(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> generateSchedules(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> options(drogon::HttpRequestPtr req, std::string resource);
  drogon::Task<drogon::HttpResponsePtr> nextNumber(drogon::HttpRequestPtr req, std::string resource);
  drogon::Task<drogon::HttpResponsePtr> subGet(drogon::HttpRequestPtr req, std::string resource,
                                               std::string id, std::string sub);
  drogon::Task<drogon::HttpResponsePtr> subPut(drogon::HttpRequestPtr req, std::string resource,
                                               std::string id, std::string sub);
  drogon::Task<drogon::HttpResponsePtr> subPutItem(drogon::HttpRequestPtr req, std::string resource,
                                                   std::string id, std::string sub,
                                                   std::string subId);
  drogon::Task<drogon::HttpResponsePtr> subDeleteItem(drogon::HttpRequestPtr req,
                                                      std::string resource, std::string id,
                                                      std::string sub, std::string subId);
  drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req, std::string resource);
  drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req, std::string resource,
                                            std::string id);
  drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req, std::string resource);
  drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr req, std::string resource,
                                               std::string id);
  drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr req, std::string resource,
                                               std::string id);
  drogon::Task<drogon::HttpResponsePtr> action(drogon::HttpRequestPtr req, std::string resource,
                                               std::string id, std::string act);
};
