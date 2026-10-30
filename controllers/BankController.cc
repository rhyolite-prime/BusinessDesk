#include "BankController.h"
#include "domain_services/shared/BankService.h"
namespace {
int number(const std::string &s,int fallback){if(s.empty())return fallback;try{size_t end;auto n=std::stoi(s,&end);return end==s.size()&&n>0?n:0;}catch(...){return 0;}}
drogon::Task<drogon::HttpResponsePtr> handle(drogon::HttpRequestPtr req,std::string op,bool branch,std::string bankId,std::string id){
    if(req->getMethod()==drogon::Options){auto r=drogon::HttpResponse::newHttpResponse();r->setStatusCode(drogon::k204NoContent);co_return r;}
    Json::Value body;if(req->getJsonObject())body=*req->getJsonObject();
    const auto result=co_await business_desk::domain_services::BankService::execute(op,branch,bankId,id,body,number(req->getParameter("pageNo"),1),number(req->getParameter("pageSize"),20),req->getParameter("query"),business_desk::utils::extractAuditIdentity(req));
    auto r=drogon::HttpResponse::newHttpJsonResponse(result.toJson());r->addHeader("Cache-Control","no-store");const auto code=result.error["code"].asString();
    r->setStatusCode(result.success?(op=="create"?drogon::k201Created:drogon::k200OK):code=="validation_error"?drogon::k400BadRequest:code=="unauthorized"?drogon::k401Unauthorized:code=="forbidden"?drogon::k403Forbidden:code=="not_found"?drogon::k404NotFound:code=="conflict"?drogon::k409Conflict:drogon::k503ServiceUnavailable);co_return r;
}
}

drogon::Task<drogon::HttpResponsePtr> BankController::bankList(drogon::HttpRequestPtr req) { co_return co_await handle(req,"list",false,std::string{},std::string{}); }
drogon::Task<drogon::HttpResponsePtr> BankController::bankGet(drogon::HttpRequestPtr req, std::string id) { co_return co_await handle(req,"get",false,std::string{},id); }
drogon::Task<drogon::HttpResponsePtr> BankController::bankCreate(drogon::HttpRequestPtr req) { co_return co_await handle(req,"create",false,std::string{},std::string{}); }
drogon::Task<drogon::HttpResponsePtr> BankController::bankUpdate(drogon::HttpRequestPtr req, std::string id) { co_return co_await handle(req,"update",false,std::string{},id); }
drogon::Task<drogon::HttpResponsePtr> BankController::bankRemove(drogon::HttpRequestPtr req, std::string id) { co_return co_await handle(req,"delete",false,std::string{},id); }
drogon::Task<drogon::HttpResponsePtr> BankController::branchList(drogon::HttpRequestPtr req, std::string bankId) { co_return co_await handle(req,"list",true,bankId,std::string{}); }
drogon::Task<drogon::HttpResponsePtr> BankController::branchGet(drogon::HttpRequestPtr req, std::string bankId, std::string id) { co_return co_await handle(req,"get",true,bankId,id); }
drogon::Task<drogon::HttpResponsePtr> BankController::branchCreate(drogon::HttpRequestPtr req, std::string bankId) { co_return co_await handle(req,"create",true,bankId,std::string{}); }
drogon::Task<drogon::HttpResponsePtr> BankController::branchUpdate(drogon::HttpRequestPtr req, std::string bankId, std::string id) { co_return co_await handle(req,"update",true,bankId,id); }
drogon::Task<drogon::HttpResponsePtr> BankController::branchRemove(drogon::HttpRequestPtr req, std::string bankId, std::string id) { co_return co_await handle(req,"delete",true,bankId,id); }
