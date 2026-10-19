#include "CurrencyController.h"
#include "domain_services/shared/CurrencyService.h"
namespace {
int number(const std::string &s,int fallback){try{size_t end;auto n=std::stoi(s,&end);return end==s.size()&&n>0?n:fallback;}catch(...){return fallback;}}
drogon::Task<drogon::HttpResponsePtr> handle(drogon::HttpRequestPtr req,std::string op,bool host,std::string id={}){
    if(req->getMethod()==drogon::Options){auto r=drogon::HttpResponse::newHttpResponse();r->setStatusCode(drogon::k204NoContent);co_return r;}
    Json::Value body;if(req->getJsonObject())body=*req->getJsonObject();
    const auto result=co_await business_desk::domain_services::CurrencyService::execute(op,id,body,number(req->getParameter("pageNo"),1),number(req->getParameter("pageSize"),20),req->getParameter("query"),business_desk::utils::extractAuditIdentity(req),host);
    auto r=drogon::HttpResponse::newHttpJsonResponse(result.toJson());r->addHeader("Cache-Control","no-store");const auto code=result.error["code"].asString();
    r->setStatusCode(result.success?(op=="create"?drogon::k201Created:drogon::k200OK):code=="validation_error"?drogon::k400BadRequest:code=="unauthorized"?drogon::k401Unauthorized:code=="forbidden"?drogon::k403Forbidden:code=="not_found"?drogon::k404NotFound:code=="conflict"?drogon::k409Conflict:drogon::k503ServiceUnavailable);co_return r;
}
}
drogon::Task<drogon::HttpResponsePtr> CurrencyController::tenantList(drogon::HttpRequestPtr req){co_return co_await handle(req,"list",false);}
drogon::Task<drogon::HttpResponsePtr> CurrencyController::tenantGet(drogon::HttpRequestPtr req,std::string id){co_return co_await handle(req,"get",false,id);}
drogon::Task<drogon::HttpResponsePtr> CurrencyController::session(drogon::HttpRequestPtr req){co_return co_await handle(req,"session",true);}
drogon::Task<drogon::HttpResponsePtr> CurrencyController::list(drogon::HttpRequestPtr req){co_return co_await handle(req,"list",true);}
drogon::Task<drogon::HttpResponsePtr> CurrencyController::get(drogon::HttpRequestPtr req,std::string id){co_return co_await handle(req,"get",true,id);}
drogon::Task<drogon::HttpResponsePtr> CurrencyController::create(drogon::HttpRequestPtr req){co_return co_await handle(req,"create",true);}
drogon::Task<drogon::HttpResponsePtr> CurrencyController::update(drogon::HttpRequestPtr req,std::string id){co_return co_await handle(req,"update",true,id);}
drogon::Task<drogon::HttpResponsePtr> CurrencyController::remove(drogon::HttpRequestPtr req,std::string id){co_return co_await handle(req,"delete",true,id);}
