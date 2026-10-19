#include "AccountingUnitController.h"
#include "domain_services/gl/AccountingUnitService.h"
namespace {
int number(const std::string &value,int fallback) {try{size_t end;auto n=std::stoi(value,&end);return end==value.size()&&n>0?n:fallback;}catch(...){return fallback;}}
drogon::Task<drogon::HttpResponsePtr> handle(drogon::HttpRequestPtr req,std::string op,std::string id={}) {
    if(req->getMethod()==drogon::Options){auto response=drogon::HttpResponse::newHttpResponse();response->setStatusCode(drogon::k204NoContent);co_return response;}
    Json::Value input;if(req->getJsonObject())input=*req->getJsonObject();
    auto result=co_await business_desk::domain_services::AccountingUnitService::execute(op,id,input,
        number(req->getParameter("pageNo"),1),number(req->getParameter("pageSize"),20),req->getParameter("query"),business_desk::utils::extractAuditIdentity(req));
    const auto code=result.error["code"].asString();
    auto response=drogon::HttpResponse::newHttpJsonResponse(result.toJson());response->addHeader("Cache-Control","no-store");
    response->setStatusCode(result.success?(op=="create"?drogon::k201Created:drogon::k200OK):code=="validation_error"?drogon::k400BadRequest:
        code=="not_found"?drogon::k404NotFound:code=="conflict"?drogon::k409Conflict:code=="unauthorized"?drogon::k401Unauthorized:drogon::k503ServiceUnavailable);
    co_return response;
}
}
drogon::Task<drogon::HttpResponsePtr> AccountingUnitController::currencies(drogon::HttpRequestPtr req){co_return co_await handle(req,"currencies");}
drogon::Task<drogon::HttpResponsePtr> AccountingUnitController::list(drogon::HttpRequestPtr req){co_return co_await handle(req,"list");}
drogon::Task<drogon::HttpResponsePtr> AccountingUnitController::create(drogon::HttpRequestPtr req){co_return co_await handle(req,"create");}
drogon::Task<drogon::HttpResponsePtr> AccountingUnitController::get(drogon::HttpRequestPtr req,std::string id){co_return co_await handle(req,"get",id);}
drogon::Task<drogon::HttpResponsePtr> AccountingUnitController::update(drogon::HttpRequestPtr req,std::string id){co_return co_await handle(req,"update",id);}
drogon::Task<drogon::HttpResponsePtr> AccountingUnitController::remove(drogon::HttpRequestPtr req,std::string id){co_return co_await handle(req,"delete",id);}
