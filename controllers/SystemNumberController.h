#pragma once
#include <drogon/HttpController.h>
class SystemNumberController : public drogon::HttpController<SystemNumberController> {
public:
 METHOD_LIST_BEGIN
 ADD_METHOD_TO(SystemNumberController::hostSync,"/api/v1/host/system-numbers/sync",drogon::Post,"HostJwtAuthFilter");
 ADD_METHOD_TO(SystemNumberController::hostList,"/api/v1/host/system-numbers",drogon::Get,"HostJwtAuthFilter");
 ADD_METHOD_TO(SystemNumberController::hostGet,"/api/v1/host/system-numbers/{1}",drogon::Get,"HostJwtAuthFilter");
 ADD_METHOD_TO(SystemNumberController::hostCreate,"/api/v1/host/system-numbers",drogon::Post,"HostJwtAuthFilter");
 ADD_METHOD_TO(SystemNumberController::hostUpdate,"/api/v1/host/system-numbers/{1}",drogon::Put,"HostJwtAuthFilter");
 ADD_METHOD_TO(SystemNumberController::hostRemove,"/api/v1/host/system-numbers/{1}",drogon::Delete,"HostJwtAuthFilter");
 ADD_METHOD_TO(SystemNumberController::sharedList,"/api/v1/shared/system-numbers",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(SystemNumberController::sharedGet,"/api/v1/shared/system-numbers/{1}",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(SystemNumberController::sharedCreate,"/api/v1/shared/system-numbers",drogon::Post,"TenantJwtAuthFilter");
 ADD_METHOD_TO(SystemNumberController::sharedUpdate,"/api/v1/shared/system-numbers/{1}",drogon::Put,"TenantJwtAuthFilter");
 ADD_METHOD_TO(SystemNumberController::sharedRemove,"/api/v1/shared/system-numbers/{1}",drogon::Delete,"TenantJwtAuthFilter");
 METHOD_LIST_END
 drogon::Task<drogon::HttpResponsePtr> hostSync(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> hostList(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> hostGet(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> hostCreate(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> hostUpdate(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> hostRemove(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> sharedList(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> sharedGet(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> sharedCreate(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> sharedUpdate(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> sharedRemove(drogon::HttpRequestPtr req, std::string id);
};
