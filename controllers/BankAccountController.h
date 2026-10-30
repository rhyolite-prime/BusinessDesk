#pragma once
#include <drogon/HttpController.h>
class BankAccountController : public drogon::HttpController<BankAccountController> {
public:
 METHOD_LIST_BEGIN
 ADD_METHOD_TO(BankAccountController::list,"/api/v1/ledger/bank-accounts",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(BankAccountController::get,"/api/v1/ledger/bank-accounts/{1}",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(BankAccountController::create,"/api/v1/ledger/bank-accounts",drogon::Post,"TenantJwtAuthFilter");
 ADD_METHOD_TO(BankAccountController::update,"/api/v1/ledger/bank-accounts/{1}",drogon::Put,"TenantJwtAuthFilter");
 ADD_METHOD_TO(BankAccountController::remove,"/api/v1/ledger/bank-accounts/{1}",drogon::Delete,"TenantJwtAuthFilter");
 ADD_METHOD_TO(BankAccountController::options,"/api/v1/ledger/bank-accounts/options",drogon::Get,"TenantJwtAuthFilter");
 METHOD_LIST_END
 drogon::Task<drogon::HttpResponsePtr> options(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr req, std::string id);
};
