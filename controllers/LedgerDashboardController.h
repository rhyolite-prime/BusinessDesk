#pragma once
#include <drogon/HttpController.h>

class LedgerDashboardController : public drogon::HttpController<LedgerDashboardController> {
public:
  METHOD_LIST_BEGIN
  ADD_METHOD_TO(LedgerDashboardController::dashboard, "/api/v1/ledger/dashboard", drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(LedgerDashboardController::options, "/api/v1/ledger/dashboard/options", drogon::Get, "TenantJwtAuthFilter");
  METHOD_LIST_END
  drogon::Task<drogon::HttpResponsePtr> dashboard(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> options(drogon::HttpRequestPtr req);
};
