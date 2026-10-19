#pragma once
#include <drogon/HttpController.h>
class BankController : public drogon::HttpController<BankController> {
public:
 METHOD_LIST_BEGIN
 ADD_METHOD_TO(BankController::bankList,"/api/v1/shared/banks",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(BankController::bankGet,"/api/v1/shared/banks/{1}",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(BankController::bankCreate,"/api/v1/shared/banks",drogon::Post,"TenantJwtAuthFilter");
 ADD_METHOD_TO(BankController::bankUpdate,"/api/v1/shared/banks/{1}",drogon::Put,"TenantJwtAuthFilter");
 ADD_METHOD_TO(BankController::bankRemove,"/api/v1/shared/banks/{1}",drogon::Delete,"TenantJwtAuthFilter");
 ADD_METHOD_TO(BankController::branchList,"/api/v1/shared/banks/{1}/branches",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(BankController::branchGet,"/api/v1/shared/banks/{1}/branches/{2}",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(BankController::branchCreate,"/api/v1/shared/banks/{1}/branches",drogon::Post,"TenantJwtAuthFilter");
 ADD_METHOD_TO(BankController::branchUpdate,"/api/v1/shared/banks/{1}/branches/{2}",drogon::Put,"TenantJwtAuthFilter");
 ADD_METHOD_TO(BankController::branchRemove,"/api/v1/shared/banks/{1}/branches/{2}",drogon::Delete,"TenantJwtAuthFilter");
 METHOD_LIST_END
 drogon::Task<drogon::HttpResponsePtr> bankList(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> bankGet(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> bankCreate(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> bankUpdate(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> bankRemove(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> branchList(drogon::HttpRequestPtr req, std::string bankId);
 drogon::Task<drogon::HttpResponsePtr> branchGet(drogon::HttpRequestPtr req, std::string bankId, std::string id);
 drogon::Task<drogon::HttpResponsePtr> branchCreate(drogon::HttpRequestPtr req, std::string bankId);
 drogon::Task<drogon::HttpResponsePtr> branchUpdate(drogon::HttpRequestPtr req, std::string bankId, std::string id);
 drogon::Task<drogon::HttpResponsePtr> branchRemove(drogon::HttpRequestPtr req, std::string bankId, std::string id);
};
