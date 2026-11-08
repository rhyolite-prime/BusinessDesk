#pragma once
#include <drogon/HttpController.h>
class SupplyChainController : public drogon::HttpController<SupplyChainController> {
public:
 METHOD_LIST_BEGIN
 ADD_METHOD_TO(SupplyChainController::nextNumber,"/api/v1/scm/{1}/next-number",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(SupplyChainController::list,"/api/v1/scm/{1}",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(SupplyChainController::get,"/api/v1/scm/{1}/{2}",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(SupplyChainController::create,"/api/v1/scm/{1}",drogon::Post,"TenantJwtAuthFilter");
 ADD_METHOD_TO(SupplyChainController::update,"/api/v1/scm/{1}/{2}",drogon::Put,"TenantJwtAuthFilter");
 ADD_METHOD_TO(SupplyChainController::remove,"/api/v1/scm/{1}/{2}",drogon::Delete,"TenantJwtAuthFilter");
 ADD_METHOD_TO(SupplyChainController::action,"/api/v1/scm/{1}/{2}/{3}",drogon::Post,"TenantJwtAuthFilter");
 METHOD_LIST_END
 drogon::Task<drogon::HttpResponsePtr> nextNumber(drogon::HttpRequestPtr req, std::string resource);
 drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req, std::string resource);
 drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req, std::string resource, std::string id);
 drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req, std::string resource);
 drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr req, std::string resource, std::string id);
 drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr req, std::string resource, std::string id);
 drogon::Task<drogon::HttpResponsePtr> action(drogon::HttpRequestPtr req, std::string resource, std::string id, std::string action);
};
