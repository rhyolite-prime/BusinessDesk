#pragma once
#include <drogon/HttpController.h>
class AccountControlController : public drogon::HttpController<AccountControlController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(AccountControlController::list,"/api/v1/ledger/account-controls",drogon::Get,drogon::Options,"TenantJwtAuthFilter");
    ADD_METHOD_TO(AccountControlController::create,"/api/v1/ledger/account-controls",drogon::Post,"TenantJwtAuthFilter");
    ADD_METHOD_TO(AccountControlController::get,"/api/v1/ledger/account-controls/{1}",drogon::Get,drogon::Options,"TenantJwtAuthFilter");
    ADD_METHOD_TO(AccountControlController::update,"/api/v1/ledger/account-controls/{1}",drogon::Put,"TenantJwtAuthFilter");
    ADD_METHOD_TO(AccountControlController::remove,"/api/v1/ledger/account-controls/{1}",drogon::Delete,"TenantJwtAuthFilter");
    METHOD_LIST_END
    drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req);
    drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req);
    drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req,std::string id);
    drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr req,std::string id);
    drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr req,std::string id);
};
