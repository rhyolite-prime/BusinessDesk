#pragma once
#include <drogon/HttpController.h>
class AccountHeadController : public drogon::HttpController<AccountHeadController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(AccountHeadController::units,"/api/v1/ledger/account-head-units",drogon::Get,drogon::Options,"TenantJwtAuthFilter");
    ADD_METHOD_TO(AccountHeadController::list,"/api/v1/ledger/account-heads",drogon::Get,drogon::Options,"TenantJwtAuthFilter");
    ADD_METHOD_TO(AccountHeadController::create,"/api/v1/ledger/account-heads",drogon::Post,"TenantJwtAuthFilter");
    ADD_METHOD_TO(AccountHeadController::get,"/api/v1/ledger/account-heads/{1}",drogon::Get,drogon::Options,"TenantJwtAuthFilter");
    ADD_METHOD_TO(AccountHeadController::update,"/api/v1/ledger/account-heads/{1}",drogon::Put,"TenantJwtAuthFilter");
    ADD_METHOD_TO(AccountHeadController::remove,"/api/v1/ledger/account-heads/{1}",drogon::Delete,"TenantJwtAuthFilter");
    METHOD_LIST_END
    drogon::Task<drogon::HttpResponsePtr> units(drogon::HttpRequestPtr req);
    drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req);
    drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req);
    drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req,std::string id);
    drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr req,std::string id);
    drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr req,std::string id);
};
