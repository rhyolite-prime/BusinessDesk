#pragma once
#include <drogon/HttpController.h>
class CostCenterController : public drogon::HttpController<CostCenterController> {
public:
 METHOD_LIST_BEGIN
 ADD_METHOD_TO(CostCenterController::list,"/api/v1/shared/cost-centers",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(CostCenterController::get,"/api/v1/shared/cost-centers/{1}",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(CostCenterController::create,"/api/v1/shared/cost-centers",drogon::Post,"TenantJwtAuthFilter");
 ADD_METHOD_TO(CostCenterController::update,"/api/v1/shared/cost-centers/{1}",drogon::Put,"TenantJwtAuthFilter");
 ADD_METHOD_TO(CostCenterController::remove,"/api/v1/shared/cost-centers/{1}",drogon::Delete,"TenantJwtAuthFilter");
 METHOD_LIST_END
 drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr req, std::string id);
};
