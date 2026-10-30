#pragma once
#include <drogon/HttpController.h>
class CompanyProfileController : public drogon::HttpController<CompanyProfileController> {
public:
 METHOD_LIST_BEGIN
 ADD_METHOD_TO(CompanyProfileController::get,"/api/v1/shared/company-profile",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(CompanyProfileController::create,"/api/v1/shared/company-profile",drogon::Post,"TenantJwtAuthFilter");
 ADD_METHOD_TO(CompanyProfileController::update,"/api/v1/shared/company-profile",drogon::Put,"TenantJwtAuthFilter");
 ADD_METHOD_TO(CompanyProfileController::remove,"/api/v1/shared/company-profile",drogon::Delete,"TenantJwtAuthFilter");
 METHOD_LIST_END
 drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr req);
};
