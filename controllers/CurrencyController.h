#pragma once
#include <drogon/HttpController.h>
class CurrencyController : public drogon::HttpController<CurrencyController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(CurrencyController::tenantList,"/api/v1/shared/currencies",drogon::Get,drogon::Options,"TenantJwtAuthFilter");
    ADD_METHOD_TO(CurrencyController::tenantGet,"/api/v1/shared/currencies/{1}",drogon::Get,drogon::Options,"TenantJwtAuthFilter");
    ADD_METHOD_TO(CurrencyController::session,"/api/v1/host/currency-session",drogon::Get,drogon::Options,"HostJwtAuthFilter");
    ADD_METHOD_TO(CurrencyController::list,"/api/v1/host/currencies",drogon::Get,drogon::Options,"HostJwtAuthFilter");
    ADD_METHOD_TO(CurrencyController::get,"/api/v1/host/currencies/{1}",drogon::Get,drogon::Options,"HostJwtAuthFilter");
    ADD_METHOD_TO(CurrencyController::create,"/api/v1/host/currencies",drogon::Post,"HostJwtAuthFilter");
    ADD_METHOD_TO(CurrencyController::update,"/api/v1/host/currencies/{1}",drogon::Put,"HostJwtAuthFilter");
    ADD_METHOD_TO(CurrencyController::remove,"/api/v1/host/currencies/{1}",drogon::Delete,"HostJwtAuthFilter");
    METHOD_LIST_END
    drogon::Task<drogon::HttpResponsePtr> tenantList(drogon::HttpRequestPtr req);
    drogon::Task<drogon::HttpResponsePtr> tenantGet(drogon::HttpRequestPtr req,std::string id);
    drogon::Task<drogon::HttpResponsePtr> session(drogon::HttpRequestPtr req);
    drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req);
    drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req,std::string id);
    drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req);
    drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr req,std::string id);
    drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr req,std::string id);
};
