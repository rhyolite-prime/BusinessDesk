#include "FinancialReportController.h"
#include "domain_services/reports/FinancialReportService.h"
namespace {
drogon::Task<drogon::HttpResponsePtr> run(drogon::HttpRequestPtr req,bool write){
 Json::Value body;if(req->getJsonObject())body=*req->getJsonObject();
 auto result=co_await business_desk::domain_services::FinancialReportService::execute(req->getParameter("accountingUnitId"),req->getParameter("through"),write?body:Json::Value{},business_desk::utils::extractAuditIdentity(req),write);
 auto response=drogon::HttpResponse::newHttpJsonResponse(result.toJson());response->addHeader("Cache-Control","no-store");const auto code=result.error["code"].asString();
 response->setStatusCode(result.success?drogon::k200OK:code=="unauthorized"?drogon::k401Unauthorized:code=="forbidden"?drogon::k403Forbidden:code=="not_found"?drogon::k404NotFound:code=="validation_error"?drogon::k400BadRequest:drogon::k503ServiceUnavailable);co_return response;
}
}
drogon::Task<drogon::HttpResponsePtr> FinancialReportController::snapshot(drogon::HttpRequestPtr req){co_return co_await run(req,false);}
drogon::Task<drogon::HttpResponsePtr> FinancialReportController::mappings(drogon::HttpRequestPtr req){co_return co_await run(req,true);}
