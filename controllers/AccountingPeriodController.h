#pragma once
#include <drogon/HttpController.h>
class AccountingPeriodController
    : public drogon::HttpController<AccountingPeriodController> {
public:
  METHOD_LIST_BEGIN
  ADD_METHOD_TO(AccountingPeriodController::list,
                "/api/v1/ledger/accounting-periods", drogon::Get,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(AccountingPeriodController::create,
                "/api/v1/ledger/accounting-periods", drogon::Post,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(AccountingPeriodController::open,
                "/api/v1/ledger/accounting-periods/{1}/open", drogon::Post,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(AccountingPeriodController::close,
                "/api/v1/ledger/accounting-periods/{1}/close", drogon::Post,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(AccountingPeriodController::history,
                "/api/v1/ledger/accounting-periods/{1}/history", drogon::Get,
                "TenantJwtAuthFilter");
  METHOD_LIST_END
  drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> open(drogon::HttpRequestPtr req,
                                             std::string id);
  drogon::Task<drogon::HttpResponsePtr> close(drogon::HttpRequestPtr req,
                                              std::string id);
  drogon::Task<drogon::HttpResponsePtr> history(drogon::HttpRequestPtr req,
                                                std::string id);
};
