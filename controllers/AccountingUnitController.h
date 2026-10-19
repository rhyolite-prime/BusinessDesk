#pragma once
#include <drogon/HttpController.h>
class AccountingUnitController : public drogon::HttpController<AccountingUnitController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(AccountingUnitController::currencies,"/api/v1/ledger/accounting-unit-currencies",drogon::Get,drogon::Options,"TenantJwtAuthFilter");
    ADD_METHOD_TO(AccountingUnitController::list,"/api/v1/ledger/accounting-units",drogon::Get,drogon::Options,"TenantJwtAuthFilter");
    ADD_METHOD_TO(AccountingUnitController::create,"/api/v1/ledger/accounting-units",drogon::Post,"TenantJwtAuthFilter");
    ADD_METHOD_TO(AccountingUnitController::get,"/api/v1/ledger/accounting-units/{1}",drogon::Get,drogon::Options,"TenantJwtAuthFilter");
    ADD_METHOD_TO(AccountingUnitController::update,"/api/v1/ledger/accounting-units/{1}",drogon::Put,"TenantJwtAuthFilter");
    ADD_METHOD_TO(AccountingUnitController::remove,"/api/v1/ledger/accounting-units/{1}",drogon::Delete,"TenantJwtAuthFilter");
    METHOD_LIST_END
    drogon::Task<drogon::HttpResponsePtr> currencies(drogon::HttpRequestPtr req);
    drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req);
    drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req);
    drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req,std::string id);
    drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr req,std::string id);
    drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr req,std::string id);
};
