#pragma once
#include <drogon/HttpController.h>
class PreferencesController
    : public drogon::HttpController<PreferencesController> {
public:
  METHOD_LIST_BEGIN
  ADD_METHOD_TO(PreferencesController::get, "/api/v1/preferences", drogon::Get,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(PreferencesController::save, "/api/v1/preferences", drogon::Put,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(PreferencesController::preview,
                "/api/v1/preferences/reset/preview", drogon::Post,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(PreferencesController::reset,
                "/api/v1/preferences/reset/execute", drogon::Post,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(PreferencesController::history,
                "/api/v1/preferences/reset/history", drogon::Get,
                "TenantJwtAuthFilter");
  METHOD_LIST_END
  drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> save(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> preview(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> reset(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> history(drogon::HttpRequestPtr req);
};
