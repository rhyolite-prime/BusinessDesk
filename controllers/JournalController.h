#pragma once
#include <drogon/HttpController.h>
class JournalController : public drogon::HttpController<JournalController> {
public:
 METHOD_LIST_BEGIN
 ADD_METHOD_TO(JournalController::list,"/api/v1/ledger/journals",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(JournalController::get,"/api/v1/ledger/journals/{1}",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(JournalController::create,"/api/v1/ledger/journals",drogon::Post,"TenantJwtAuthFilter");
 ADD_METHOD_TO(JournalController::update,"/api/v1/ledger/journals/{1}",drogon::Put,"TenantJwtAuthFilter");
 ADD_METHOD_TO(JournalController::remove,"/api/v1/ledger/journals/{1}",drogon::Delete,"TenantJwtAuthFilter");
 ADD_METHOD_TO(JournalController::options,"/api/v1/ledger/journals/options",drogon::Get,"TenantJwtAuthFilter");
 ADD_METHOD_TO(JournalController::post,"/api/v1/ledger/journals/{1}/post",drogon::Post,"TenantJwtAuthFilter");
 ADD_METHOD_TO(JournalController::validate,"/api/v1/ledger/journals/validate",drogon::Post,"TenantJwtAuthFilter");
 ADD_METHOD_TO(JournalController::nextNumber,"/api/v1/ledger/journals/next-number",drogon::Get,"TenantJwtAuthFilter");
 METHOD_LIST_END
 drogon::Task<drogon::HttpResponsePtr> post(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> validate(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> nextNumber(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> options(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req);
 drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr req, std::string id);
 drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr req, std::string id);
};
