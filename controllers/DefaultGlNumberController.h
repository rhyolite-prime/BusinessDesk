#pragma once
#include <drogon/HttpController.h>
class DefaultGlNumberController : public drogon::HttpController<DefaultGlNumberController> {
public:
 METHOD_LIST_BEGIN
 ADD_METHOD_TO(DefaultGlNumberController::list,"/api/v1/ledger/default-gl-numbers",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(DefaultGlNumberController::get,"/api/v1/ledger/default-gl-numbers/{1}",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(DefaultGlNumberController::create,"/api/v1/ledger/default-gl-numbers",drogon::Post,"TenantJwtAuthFilter");
 ADD_METHOD_TO(DefaultGlNumberController::update,"/api/v1/ledger/default-gl-numbers/{1}",drogon::Put,"TenantJwtAuthFilter");
 ADD_METHOD_TO(DefaultGlNumberController::remove,"/api/v1/ledger/default-gl-numbers/{1}",drogon::Delete,"TenantJwtAuthFilter");
 ADD_METHOD_TO(DefaultGlNumberController::options,"/api/v1/ledger/default-gl-numbers/options",drogon::Get,"TenantJwtAuthFilter");
 METHOD_LIST_END
 drogon::Task<drogon::HttpResponsePtr> options(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr req, std::string id);
};
