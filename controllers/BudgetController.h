#pragma once
#include <drogon/HttpController.h>
class BudgetController : public drogon::HttpController<BudgetController> {
public:
 METHOD_LIST_BEGIN
 ADD_METHOD_TO(BudgetController::list,"/api/v1/ledger/budgets",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(BudgetController::get,"/api/v1/ledger/budgets/{1}",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(BudgetController::create,"/api/v1/ledger/budgets",drogon::Post,"TenantJwtAuthFilter");
 ADD_METHOD_TO(BudgetController::update,"/api/v1/ledger/budgets/{1}",drogon::Put,"TenantJwtAuthFilter");
 ADD_METHOD_TO(BudgetController::remove,"/api/v1/ledger/budgets/{1}",drogon::Delete,"TenantJwtAuthFilter");
 ADD_METHOD_TO(BudgetController::options,"/api/v1/ledger/budgets/options",drogon::Get,"TenantJwtAuthFilter");
 METHOD_LIST_END
 drogon::Task<drogon::HttpResponsePtr> options(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr req, std::string id);
};
