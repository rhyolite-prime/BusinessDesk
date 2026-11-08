#pragma once
#include <drogon/HttpController.h>
class AccountDetailController : public drogon::HttpController<AccountDetailController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(AccountDetailController::list,"/api/v1/ledger/accounts",drogon::Get,drogon::Options,"TenantJwtAuthFilter");
    ADD_METHOD_TO(AccountDetailController::create,"/api/v1/ledger/accounts",drogon::Post,"TenantJwtAuthFilter");
    ADD_METHOD_TO(AccountDetailController::get,"/api/v1/ledger/accounts/{1}",drogon::Get,drogon::Options,"TenantJwtAuthFilter");
    ADD_METHOD_TO(AccountDetailController::update,"/api/v1/ledger/accounts/{1}",drogon::Put,"TenantJwtAuthFilter");
    ADD_METHOD_TO(AccountDetailController::remove,"/api/v1/ledger/accounts/{1}",drogon::Delete,"TenantJwtAuthFilter");
    METHOD_LIST_END
    drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req);
    drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req);
    drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req,std::string id);
    drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr req,std::string id);
    drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr req,std::string id);
};
